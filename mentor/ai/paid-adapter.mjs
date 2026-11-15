/**
 * Server-side adapter for the optional paid model of the ATLA chat Worker.
 * Pure functions: the key is passed in by the Worker from its secret binding, is never logged,
 * never returned to a caller and never reaches the browser. Not imported by any page.
 */
export const PAID_API_URL="https://api.anthropic.com/v1/messages";
export const PAID_API_VERSION="2023-06-01";
/** Allowlist: the smallest/cheapest model only. Anything else falls back to the first entry. */
export const PAID_MODELS=Object.freeze(["claude-haiku-5-5"]);
/** Hard ceilings that no variable can raise. */
export const HARD_MAX_TOKENS=400;
export const HARD_MAX_INPUT_CHARS=4000;

export function pickModel(requested){return PAID_MODELS.includes(requested)?requested:PAID_MODELS[0];}
export function clampMaxTokens(value){
 const n=Math.floor(Number(value));
 return Number.isFinite(n)&&n>0?Math.min(n,HARD_MAX_TOKENS):300;
}

/** Splits OpenAI-style {role,content} messages into {system, messages}. */
export function toApiMessages(messages){
 const system=messages.filter(m=>m.role==="system").map(m=>m.content).join("\n");
 const turns=[];
 for(const m of messages){
  if(m.role==="system")continue;
  const role=m.role==="user"?"user":"assistant";
  const text=String(m.content||"");
  if(!text)continue;
  if(turns.length&&turns.at(-1).role===role)turns.at(-1).content+="\n"+text;
  else turns.push({role,content:text});
 }
 while(turns.length&&turns[0].role!=="user")turns.shift();
 return {system,messages:turns};
}

/** Conservative token estimate for Greek (≈ 1 token per 2 characters) used to reserve budget. */
export function estimateInputTokens(messages){
 return Math.ceil(messages.reduce((n,m)=>n+String(m.content||"").length,0)/2);
}

export function buildPaidRequest({messages,model,maxTokens}){
 const {system,messages:turns}=toApiMessages(messages);
 const chars=system.length+turns.reduce((n,m)=>n+m.content.length,0);
 if(!turns.length||chars>HARD_MAX_INPUT_CHARS)throw Error("input-out-of-bounds");
 // The paid model uses adaptive thinking by default and does not accept temperature with thinking enabled.
 return {model:pickModel(model),max_tokens:clampMaxTokens(maxTokens),stream:true,system,messages:turns};
}

/** Removes any occurrence of the secret from text that might be logged or returned. */
export function redact(text,secret){
 const s=String(text??"");
 return secret?s.split(secret).join("[redacted]"):s;
}

/** Paid-model SSE → the `data: {"token":"…"}` lines the browser adapter already parses. */
export function apiStreamToTokens(body){
 const dec=new TextDecoder(),enc=new TextEncoder();
 let buf="";
 const emit=(line,ctl)=>{
  if(!line.startsWith("data:"))return;
  let j;try{j=JSON.parse(line.slice(5).trim());}catch{return;}
  if(j.type==="content_block_delta"&&j.delta?.type==="text_delta"&&j.delta.text)
   ctl.enqueue(enc.encode("data: "+JSON.stringify({token:j.delta.text})+"\n\n"));
  else if(j.type==="message_stop")ctl.enqueue(enc.encode("data: [DONE]\n\n"));
 };
 return body.pipeThrough(new TransformStream({
  transform(chunk,ctl){
   buf+=dec.decode(chunk,{stream:true});
   let nl;
   while((nl=buf.indexOf("\n"))>=0){emit(buf.slice(0,nl).trimEnd(),ctl);buf=buf.slice(nl+1);}
  },
  flush(ctl){emit(buf.trim(),ctl);}
 }));
}

/**
 * One Messages API call. Returns {ok:true,stream} or {ok:false,status}. Error bodies are never
 * forwarded: they could echo request details.
 */
export async function callPaid({apiKey,request,fetchImpl=globalThis.fetch,signal}){
 if(!apiKey||typeof apiKey!=="string")return {ok:false,status:503};
 let res;
 try{
  res=await fetchImpl(PAID_API_URL,{method:"POST",signal,
   headers:{"content-type":"application/json","x-api-key":apiKey,"anthropic-version":PAID_API_VERSION},
   body:JSON.stringify(request)});
 }catch{return {ok:false,status:503};}
 if(!res.ok||!res.body)return {ok:false,status:res.status===429?429:503};
 return {ok:true,stream:apiStreamToTokens(res.body)};
}
