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

/** Passages that name their source record (file#id). The Worker accepts a passage only if its
 * text is word for word in that record of the published material; anything else is dropped there.
 */
export function eligibleAiPassages(passages){
 if(!Array.isArray(passages))return [];
 return passages.slice(0,4).filter(p=>p&&/^T[1-4]$/.test(p.id)&&typeof p.ref==='string'&&/^[\w.-]+#.+/.test(p.ref)&&p.term&&p.definition);
}

export function buildPayload({question,passages,level,history}){
 const q=String(question||"").trim().slice(0,300);
 const ps=(Array.isArray(passages)?passages:[]).slice(0,4).map(p=>({
  id:String(p.id).slice(0,8),ref:String(p.ref||'').slice(0,200),term:String(p.term).slice(0,160),definition:String(p.definition).slice(0,700)
 }));
 return {
  question:q,
  passages:ps,
  level:LEVELS.includes(level)?level:"student",
  history:(Array.isArray(history)?history:[]).slice(-4).map(h=>({role:h.role==="user"?"user":"assistant",text:String(h.text).slice(0,300)}))
 };
}

/** Textbook passages the Worker added (T5 and after): kept only in this exact shape, with an https origin. */
export function bookSources(list){
 return (Array.isArray(list)?list:[]).slice(0,4).filter(s=>s&&/^T[5-9]$/.test(s.id)&&/^book:[\w.-]+#\d+$/.test(s.ref)&&
  typeof s.term==="string"&&typeof s.definition==="string"&&typeof s.book?.title==="string"&&/^https:\/\//.test(s.book?.origin||""))
  .map(s=>({id:s.id,ref:s.ref,term:s.term.slice(0,200),definition:s.definition.slice(0,1500),
   book:{title:s.book.title.slice(0,160),origin:s.book.origin.slice(0,300),licence:String(s.book.licence||"").slice(0,80),publisher:String(s.book.publisher||"").slice(0,120)}}));
}

/** Extracts a text delta from one SSE data line (Worker format or Workers AI native format). */
export function parseSseLine(line){
 if(!line.startsWith("data:"))return null;
 const body=line.slice(5).trim();
 if(!body||body==="[DONE]")return {done:body==="[DONE]",token:""};
 try{
  const j=JSON.parse(body);
  if(Array.isArray(j.sources))return {done:false,token:"",sources:bookSources(j.sources)};
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
  // Which model answered (free or paid), for the 👍/👎 review.
  const provider=res.headers?.get?.("x-atla-provider")||"";
  let text="",sources=[];
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
     if(parsed?.sources)sources=parsed.sources;
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
  const audit=auditAssistantReply(text,[...payload.passages,...sources]);
  if(!audit.ok)return {ok:false,reason:"unavailable",message:UNAVAILABLE_MESSAGE};
  // The books the answer actually cites, named under it (CC BY attribution).
  const cited=new Set([...text.matchAll(/\[([^\]]{1,40})\]/g)].flatMap(m=>[...m[1].matchAll(/[ΤT]([1-9][0-9]?)/g)].map(x=>"T"+x[1])));
  const books=sources.filter(s=>cited.has(s.id)).map(s=>s.book);
  // Citations are kept for the audit above; the learner reads plain, natural text.
  text=stripCitations(text);
  onToken(text); // final, checked text only; no speculative streaming
  return {ok:true,text,provider,books};
 }catch{
  return {ok:false,reason:"unavailable",message:UNAVAILABLE_MESSAGE};
 }finally{clearTimeout(timer);}
}
