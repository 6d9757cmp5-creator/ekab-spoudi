/**
 * Browser adapter for the MENTOR chat Worker. Sends only the question, up to four cited library
 * passages, the study level and a short text history. Never sends notes, grades, page text or ids.
 */
import {LEVELS} from "../student/memory.mjs";
import {auditAssistantReply} from "./teaching-policy.mjs";

/** Removes [Τ1]-style markers and the space they leave before punctuation. */
export const stripCitations=text=>String(text).replace(/\s*\[(?:[ΤT][1-9][0-9]?)(?:\s*,\s*[ΤT][1-9][0-9]?)*\]/g,'').replace(/[ \t]+([.,;·!?])/g,'$1').replace(/[ \t]{2,}/g,' ').trim();
export const LIMIT_MESSAGE="Έχω πολλές ερωτήσεις αυτή τη στιγμή. Δοκίμασε ξανά σε λίγο· τους βασικούς ορισμούς μπορώ να σου τους πω κανονικά.";
export const UNAVAILABLE_MESSAGE="Δεν μπορώ να το αναλύσω περισσότερο αυτή τη στιγμή, αλλά σου λέω ό,τι ξέρω σίγουρα.";

/** Only locally pinned direct-section sources may be sent to the generative
 * Worker. The Worker independently rechecks canonical term, text and ranking.
 * Non-verified EOPPEP/SAEK/category passages remain available locally.
 */
export function eligibleAiPassages(passages,glossaryItems){
 if(!Array.isArray(passages)||!Array.isArray(glossaryItems))return [];
 const approved=new Set(glossaryItems.filter(item=>
  item?.sourceType==='direct-section'&&
  item.sourceCrosscheck==='2026-11-04-primary-section'&&
  typeof item.sourceSection==='string'&&item.sourceSection.length>0&&
  typeof item.sourceVersion==='string'&&item.sourceVersion.length>0&&
  typeof item.source==='string'&&item.source.startsWith('https://')
 ).map(item=>item.term+'\u0000'+item.definition));
 return passages.slice(0,4).filter(p=>
  p&&/^T[1-4]$/.test(p.id)&&
  approved.has(p.term+'\u0000'+p.definition));
}

export function buildPayload({question,passages,level,history}){
 const q=String(question||"").trim().slice(0,300);
 const ps=(Array.isArray(passages)?passages:[]).slice(0,4).map(p=>({
  id:String(p.id).slice(0,8),term:String(p.term).slice(0,120),definition:String(p.definition).slice(0,400)
 }));
 return {
  question:q,
  passages:ps,
  level:LEVELS.includes(level)?level:"student",
  history:(Array.isArray(history)?history:[]).slice(-4).map(h=>({role:h.role==="user"?"user":"assistant",text:String(h.text).slice(0,300)}))
 };
}

/** Extracts a text delta from one SSE data line (Worker format or Workers AI native format). */
export function parseSseLine(line){
 if(!line.startsWith("data:"))return null;
 const body=line.slice(5).trim();
 if(!body||body==="[DONE]")return {done:body==="[DONE]",token:""};
 try{
  const j=JSON.parse(body);
  const token=typeof j.token==="string"?j.token:typeof j.response==="string"?j.response:"";
  return {done:false,token};
 }catch{return null;}
}

/**
 * @returns {Promise<{ok:true,text:string}|{ok:false,reason:"disabled"|"limit"|"unavailable",message:string}>}
 */
export async function askAi({endpoint,payload,fetchImpl=globalThis.fetch,onToken=()=>{},timeoutMs=20000,signal,headers={}}){
 if(!endpoint||typeof fetchImpl!=="function")return {ok:false,reason:"disabled",message:""};
 if(!payload?.passages?.length)return {ok:false,reason:"unavailable",message:UNAVAILABLE_MESSAGE};
 const ctl=new AbortController();
 const timer=setTimeout(()=>ctl.abort(),timeoutMs);
 signal?.addEventListener?.("abort",()=>ctl.abort(),{once:true});
 try{
  const res=await fetchImpl(endpoint,{
   method:"POST",headers:{...headers,"content-type":"application/json",accept:"text/event-stream, application/json"},
   body:JSON.stringify(payload),credentials:"omit",referrerPolicy:"no-referrer",signal:ctl.signal
  });
  if(res.status===429)return {ok:false,reason:"limit",message:LIMIT_MESSAGE};
  if(!res.ok)return {ok:false,reason:"unavailable",message:UNAVAILABLE_MESSAGE};
  const type=res.headers?.get?.("content-type")||"";
  let text="";
  if(type.includes("text/event-stream")&&res.body?.getReader){
   const reader=res.body.getReader(),dec=new TextDecoder();
   let buf="";
   for(;;){
    const {value,done}=await reader.read();
    if(done)break;
    buf+=dec.decode(value,{stream:true});
    let nl;
    while((nl=buf.indexOf("\n"))>=0){
     const parsed=parseSseLine(buf.slice(0,nl).trimEnd());
     buf=buf.slice(nl+1);
     if(parsed?.token){text+=parsed.token;}
    }
   }
   const tail=parseSseLine(buf.trim());
   if(tail?.token){text+=tail.token;}
  }else{
   const j=await res.json();
   text=typeof j?.answer==="string"?j.answer:"";
   // Never reveal unchecked raw AI text to a UI callback.
  }
  text=text.trim();
  const audit=auditAssistantReply(text,payload.passages);
  if(!audit.ok)return {ok:false,reason:"unavailable",message:UNAVAILABLE_MESSAGE};
  // Citations are kept for the audit above; the learner reads plain, natural text.
  text=stripCitations(text);
  onToken(text); // final, checked text only; no speculative streaming
  return {ok:true,text};
 }catch{
  return {ok:false,reason:"unavailable",message:UNAVAILABLE_MESSAGE};
 }finally{clearTimeout(timer);}
}
