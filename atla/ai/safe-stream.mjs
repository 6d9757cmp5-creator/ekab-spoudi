/**
 * ATLA server-side SSE verification.
 * No bytes from the upstream model are returned to the browser until the
 * complete response passes the deterministic citation/safety surface gate.
 * This does NOT certify clinical or semantic accuracy.
 */
import {auditAssistantReply} from './teaching-policy.mjs';

export async function collectAndAuditAiStream(stream,passages,{maxBytes=48000,maxChars=6000}={}){
 if(!stream||typeof stream.getReader!=='function')return {ok:false,reason:'missing-stream'};
 const reader=stream.getReader(),decoder=new TextDecoder('utf-8',{fatal:true});
 let bytes=0,pending='',answer='',sawDone=false,failed=false;
 const parseLine=line=>{
  if(!line.startsWith('data:'))return;
  const data=line.slice(5).trim();
  if(data==='[DONE]'){if(sawDone)throw new Error('duplicate-sse-done');sawDone=true;return;}
  if(!data)return;
  if(sawDone)throw new Error('sse-event-after-done');
  let event;
  try{event=JSON.parse(data);}catch{throw new Error('invalid-sse-json');}
  if(!event||typeof event!=='object'||event.error)throw new Error('invalid-sse-event');
  const token=typeof event.token==='string'?event.token:typeof event.response==='string'?event.response:null;
  if(token===null)throw new Error('unknown-sse-event');
  if(sawDone&&token)throw new Error('tokens-after-done');
  if(answer.length+token.length>maxChars)throw new Error('oversized-reply');
  answer+=token;
 };
 const append=str=>{
  pending+=str;
  if(pending.length>maxBytes)throw new Error('oversized-event');
  let nl;
  while((nl=pending.indexOf('\n'))>=0){
   parseLine(pending.slice(0,nl).trimEnd());
   pending=pending.slice(nl+1);
  }
 };
 try{
  for(;;){
   const part=await reader.read();
   if(part.done)break;
   bytes+=part.value?.byteLength||0;
   if(bytes>maxBytes)throw new Error('oversized-stream');
   append(decoder.decode(part.value,{stream:true}));
  }
  append(decoder.decode());
  if(pending.trim())parseLine(pending.trimEnd());
  // A truncated stream must never be mistaken for a complete medical answer.
  if(!sawDone)throw new Error('incomplete-sse');
  const verdict=auditAssistantReply(answer.trim(),passages);
  if(!verdict.ok)return {ok:false,reason:verdict.reason};
  return {ok:true,text:answer.trim()};
 }catch{
  failed=true;
  return {ok:false,reason:'invalid-or-unsafe-stream'};
 }finally{
  if(failed){try{await reader.cancel();}catch{}}
  try{reader.releaseLock();}catch{}
 }
}

export function verifiedSseResponse(text,headers={}){
 const data='data: '+JSON.stringify({token:text})+'\n\n'+'data: [DONE]\n\n';
 return new Response(data,{status:200,headers:{...headers,'content-type':'text/event-stream; charset=utf-8','cache-control':'no-store'}});
}
