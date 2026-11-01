import test from "node:test";
import assert from "node:assert/strict";
import {buildPayload,parseSseLine,askAi,LIMIT_MESSAGE,UNAVAILABLE_MESSAGE} from "./client.mjs";
import {MENTOR_AI} from "./config.mjs";

const passages=[{id:"T1",term:"ΚΑΡΠΑ",definition:"Ορισμός.",source:"https://x.example",score:9}];
const sse=chunks=>new Response(new ReadableStream({start(c){for(const x of chunks)c.enqueue(new TextEncoder().encode(x));c.close();}}),{status:200,headers:{"content-type":"text/event-stream"}});

test("shipped config keeps AI disabled until the owner sets an endpoint",()=>{
 assert.equal(MENTOR_AI.endpoint,"");
});

test("payload carries only question, passages, level and short history",()=>{
 const p=buildPayload({question:"x".repeat(900),passages:[...passages,...passages,...passages,...passages,...passages],level:"nope",
  history:[1,2,3,4,5,6].map(i=>({role:i%2?"user":"mentor",text:"t"+i,sources:[1]}))});
 assert.equal(p.question.length,300);
 assert.equal(p.passages.length,4);
 assert.deepEqual(Object.keys(p.passages[0]).sort(),["definition","id","term"]);
 assert.equal(p.level,"student");
 assert.equal(p.history.length,4);
 assert.deepEqual(Object.keys(p.history[0]).sort(),["role","text"]);
 assert.deepEqual(Object.keys(p).sort(),["history","level","passages","question"]);
});

test("SSE lines parse in both Worker and Workers-AI formats",()=>{
 assert.deepEqual(parseSseLine('data: {"token":"Γεια"}'),{done:false,token:"Γεια"});
 assert.deepEqual(parseSseLine('data: {"response":"σου"}'),{done:false,token:"σου"});
 assert.deepEqual(parseSseLine("data: [DONE]"),{done:true,token:""});
 assert.equal(parseSseLine("event: x"),null);
 assert.equal(parseSseLine("data: {oops"),null);
});

test("disabled when there is no endpoint: no network call is made",async()=>{
 let called=false;
 const r=await askAi({endpoint:"",payload:buildPayload({question:"q",passages}),fetchImpl:()=>{called=true;}});
 assert.equal(r.ok,false);assert.equal(r.reason,"disabled");assert.equal(called,false);
});

test("never calls the network without grounding passages",async()=>{
 let called=false;
 const r=await askAi({endpoint:"https://w.example",payload:buildPayload({question:"q",passages:[]}),fetchImpl:()=>{called=true;}});
 assert.equal(r.ok,false);assert.equal(called,false);
});

test("streams tokens, including a chunk split mid-line",async()=>{
 const seen=[];
 const r=await askAi({endpoint:"https://w.example",payload:buildPayload({question:"q",passages}),
  fetchImpl:async(url,init)=>{assert.equal(init.credentials,"omit");assert.equal(init.method,"POST");return sse(['data: {"token":"Η ΚΑ','ΡΠΑ"}\n\n','data: {"token":" είναι"}\ndata: [DONE]\n']);},
  onToken:t=>seen.push(t)});
 assert.equal(r.ok,true);assert.equal(r.text,"Η ΚΑΡΠΑ είναι");
 assert.equal(seen.at(-1),"Η ΚΑΡΠΑ είναι");
});

test("plain JSON answers work too",async()=>{
 const r=await askAi({endpoint:"https://w.example",payload:buildPayload({question:"q",passages}),
  fetchImpl:async()=>new Response(JSON.stringify({answer:"Απάντηση"}),{status:200,headers:{"content-type":"application/json"}})});
 assert.deepEqual(r,{ok:true,text:"Απάντηση"});
});

test("429 shows the free-limit notice; other errors fall back quietly",async()=>{
 const mk=status=>async()=>new Response("",{status});
 const a=await askAi({endpoint:"https://w.example",payload:buildPayload({question:"q",passages}),fetchImpl:mk(429)});
 assert.deepEqual(a,{ok:false,reason:"limit",message:LIMIT_MESSAGE});
 const b=await askAi({endpoint:"https://w.example",payload:buildPayload({question:"q",passages}),fetchImpl:mk(503)});
 assert.equal(b.reason,"unavailable");assert.equal(b.message,UNAVAILABLE_MESSAGE);
 const c=await askAi({endpoint:"https://w.example",payload:buildPayload({question:"q",passages}),fetchImpl:async()=>{throw new Error("net");}});
 assert.equal(c.reason,"unavailable");
});

test("a hung server is aborted by the timeout",async()=>{
 const r=await askAi({endpoint:"https://w.example",timeoutMs:30,payload:buildPayload({question:"q",passages}),
  fetchImpl:(url,init)=>new Promise((_,rej)=>init.signal.addEventListener("abort",()=>rej(new Error("aborted"))))});
 assert.equal(r.reason,"unavailable");
});
