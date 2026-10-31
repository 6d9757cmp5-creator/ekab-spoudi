import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync,readdirSync,statSync} from "node:fs";
import {join} from "node:path";
import {buildClaudeRequest,toAnthropicMessages,anthropicStreamToTokens,callClaude,clampMaxTokens,pickModel,redact,estimateInputTokens,HARD_MAX_TOKENS} from "./claude-adapter.mjs";
import {charge,limitsFromEnv,tokenMatches,MAX_LIMITS} from "./guard.mjs";
import worker,{buildMessages,_resetLimits} from "../../workers/mentor-chat/src/index.js";
import {run} from "../../scripts/claude-connection-test.mjs";

const KEY="sk-ant-TESTKEY-0000000000000000";
const ORIGIN="https://6d9757cmp5-creator.github.io";
const body={question:"Τι είναι η ΚΑΡΠΑ;",passages:[{id:"T1",term:"ΚΑΡΠΑ",definition:"Ορισμός."}],level:"student",history:[]};
const req=(over={})=>new Request("https://w.example/",{method:"POST",headers:{origin:ORIGIN,"content-type":"application/json","cf-connecting-ip":"1.1.1.1",...over},body:JSON.stringify(body)});
const memStore=()=>{const m=new Map();return {get:async k=>m.get(k),put:async(k,v)=>{m.set(k,v);},m};};
function budgetBinding(store){return {idFromName:()=>"g",get:()=>({fetch:async(_u,init)=>{const b=JSON.parse(init.body);return Response.json(await charge(store,{ipKey:b.ipKey,tokens:b.tokens,limits:b.limits}));}})};}
const sse=lines=>new Response(new ReadableStream({start(c){const e=new TextEncoder();for(const l of lines)c.enqueue(e.encode(l+"\n"));c.close();}}),{status:200,headers:{"content-type":"text/event-stream"}});
const on=(extra={})=>({MENTOR_PROVIDER:"claude",MENTOR_CLAUDE_ENABLED:"true",MENTOR_SPEND_LIMIT_CONFIRMED:"true",ANTHROPIC_API_KEY:KEY,
 MENTOR_TEST_TOKEN:"private-test-token-123",BUDGET:budgetBinding(memStore()),...extra});
const auth={"x-mentor-test-token":"private-test-token-123"};
test.beforeEach(()=>_resetLimits());

test("request is built for the cheapest allowlisted model with hard token ceilings",()=>{
 const r=buildClaudeRequest({messages:buildMessages({...body,history:[]}),model:"claude-opus-9",maxTokens:99999});
 assert.equal(r.model,"claude-haiku-5-5");assert.equal(r.max_tokens,HARD_MAX_TOKENS);assert.equal(r.stream,true);
 assert.equal(pickModel("x"),"claude-haiku-5-5");assert.equal(clampMaxTokens("abc"),300);assert.equal(clampMaxTokens(50),50);
 assert.ok(r.messages.every(m=>m.role==="user"||m.role==="assistant")&&r.messages[0].role==="user");
 assert.throws(()=>buildClaudeRequest({messages:[{role:"user",content:"α".repeat(5000)}]}),/input-out-of-bounds/);
});
test("system prompt is separated and consecutive turns are merged",()=>{
 const o=toAnthropicMessages([{role:"system",content:"S"},{role:"assistant",content:"x"},{role:"user",content:"a"},{role:"user",content:"b"}]);
 assert.equal(o.system,"S");assert.deepEqual(o.messages,[{role:"user",content:"a\nb"}]);
});
test("Anthropic SSE is translated to the token lines the browser parses",async()=>{
 const up=sse(["event: content_block_delta",'data: {"type":"content_block_delta","delta":{"type":"text_delta","text":"Γεια"}}','data: {"type":"ping"}','data: {"type":"message_stop"}']).body;
 const text=await new Response(anthropicStreamToTokens(up)).text();
 assert.match(text,/data: \{"token":"Γεια"\}/);assert.match(text,/data: \[DONE\]/);assert.doesNotMatch(text,/ping/);
});
test("callClaude sends the key only in the x-api-key header and hides upstream error bodies",async()=>{
 let seen;
 const ok=await callClaude({apiKey:KEY,request:{a:1},fetchImpl:async(u,i)=>{seen={u,i};return sse([]);}});
 assert.equal(ok.ok,true);assert.equal(seen.u,"https://api.anthropic.com/v1/messages");
 assert.equal(seen.i.headers["x-api-key"],KEY);assert.ok(!seen.i.body.includes(KEY));
 const bad=await callClaude({apiKey:KEY,request:{},fetchImpl:async()=>new Response("echo "+KEY,{status:500})});
 assert.deepEqual(bad,{ok:false,status:503});
 assert.deepEqual(await callClaude({apiKey:KEY,request:{},fetchImpl:async()=>new Response("",{status:429})}),{ok:false,status:429});
 assert.deepEqual(await callClaude({apiKey:"",request:{}}),{ok:false,status:503});
 assert.equal(redact("a "+KEY+" b",KEY),"a [redacted] b");
});
test("budget: per-IP hourly, daily requests and daily tokens all fail closed",async()=>{
 const s=memStore(),limits={ipPerHour:2,requestsPerDay:3,tokensPerDay:1000};
 const c=(ip,tokens=100)=>charge(s,{ipKey:ip,tokens,limits,now:Date.UTC(2026,9,31,10)});
 assert.equal((await c("a")).ok,true);assert.equal((await c("a")).ok,true);
 assert.deepEqual(await c("a"),{ok:false,reason:"ip"});
 assert.equal((await c("b")).ok,true);
 assert.deepEqual(await c("c"),{ok:false,reason:"daily-requests"});
 const t=memStore();
 assert.deepEqual(await charge(t,{ipKey:"x",tokens:1001,limits,now:0}),{ok:false,reason:"daily-tokens"});
 assert.equal((await charge(s,{ipKey:"a",tokens:1,limits,now:Date.UTC(2026,9,31,11)})).ok,false,"daily cap spans hours");
 assert.equal((await charge(s,{ipKey:"a",tokens:1,limits,now:Date.UTC(2026,10,1,0)})).ok,true,"new day resets");
});
test("configured limits can never exceed the hard ceilings",()=>{
 const l=limitsFromEnv({CLAUDE_IP_HOURLY:"9999",CLAUDE_DAILY_CAP:"999999",CLAUDE_DAILY_TOKENS:"1e12"});
 assert.deepEqual(l,{ipPerHour:MAX_LIMITS.ipPerHour,requestsPerDay:MAX_LIMITS.requestsPerDay,tokensPerDay:MAX_LIMITS.tokensPerDay});
 assert.equal(limitsFromEnv({}).requestsPerDay,50);
});
test("test token is compared strictly and short tokens are refused",()=>{
 assert.equal(tokenMatches("private-test-token-123","private-test-token-123"),true);
 assert.equal(tokenMatches("x","private-test-token-123"),false);
 assert.equal(tokenMatches("short","short"),false);assert.equal(tokenMatches("","") ,false);assert.equal(tokenMatches(undefined,"private-test-token-123"),false);
});
test("Worker: Claude is OFF unless every switch, the secret and the budget store are present",async()=>{
 for(const missing of ["MENTOR_CLAUDE_ENABLED","MENTOR_SPEND_LIMIT_CONFIRMED","ANTHROPIC_API_KEY","BUDGET"]){
  const env=on();delete env[missing];
  let called=false;globalThis.fetch=async()=>{called=true;return sse([]);};
  const r=await worker.fetch(req(auth),env);
  assert.equal(r.status,503,missing);assert.equal(called,false,missing+" must not reach the network");
 }
});
test("Worker: private mode needs the test token; a wrong one never reaches Claude",async()=>{
 let calls=0;globalThis.fetch=async()=>{calls++;return sse([]);};
 assert.equal((await worker.fetch(req(),on())).status,401);
 assert.equal((await worker.fetch(req({"x-mentor-test-token":"nope"}),on())).status,401);
 assert.equal((await worker.fetch(req(auth),on({MENTOR_TEST_TOKEN:""}))).status,401);
 assert.equal(calls,0);
 assert.equal((await worker.fetch(req(auth),on())).status,200);assert.equal(calls,1);
 assert.equal((await worker.fetch(req(),on({MENTOR_PUBLIC:"true"}))).status,200);
});
test("Worker: success streams tokens; key never appears in headers or body",async()=>{
 let sent;
 globalThis.fetch=async(u,i)=>{sent=JSON.parse(i.body);return sse(['data: {"type":"content_block_delta","delta":{"type":"text_delta","text":"ok"}}']);};
 const r=await worker.fetch(req(auth),on());
 const text=await r.text();
 assert.equal(r.status,200);assert.match(text,/"token":"ok"/);
 assert.ok(![...r.headers.values(),text].some(v=>v.includes(KEY)));
 assert.equal(sent.model,"claude-haiku-5-5");assert.ok(sent.max_tokens<=HARD_MAX_TOKENS);
});
test("Worker: no passages means no paid call; limits return 429 without calling Claude",async()=>{
 let calls=0;globalThis.fetch=async()=>{calls++;return sse([]);};
 const noPass=new Request("https://w.example/",{method:"POST",headers:{origin:ORIGIN,"content-type":"application/json",...auth},body:JSON.stringify({...body,passages:[]})});
 assert.equal((await worker.fetch(noPass,on())).status,200);assert.equal(calls,0);
 const env=on({CLAUDE_IP_HOURLY:"1"});
 assert.equal((await worker.fetch(req(auth),env)).status,200);
 assert.equal((await worker.fetch(req(auth),env)).status,429);assert.equal(calls,1);
});
test("Worker: upstream failure becomes a generic 503 without details",async()=>{
 globalThis.fetch=async()=>new Response(JSON.stringify({error:KEY}),{status:500});
 const r=await worker.fetch(req(auth),on());
 assert.equal(r.status,503);assert.ok(!(await r.text()).includes(KEY));
});
test("connection-test script: dry run makes no request; billable call needs CONFIRM_BILLABLE=YES",async()=>{
 const lines=[],log=m=>lines.push(m);let calls=0;const fetchImpl=async()=>{calls++;return Response.json({model:"claude-haiku-5-5",usage:{input_tokens:9,output_tokens:2}});};
 assert.equal(await run({env:{ANTHROPIC_API_KEY:KEY},argv:["--dry-run"],fetchImpl,log}),0);
 assert.equal(await run({env:{ANTHROPIC_API_KEY:KEY},argv:[],fetchImpl,log}),3);
 assert.equal(await run({env:{},argv:[],fetchImpl,log}),2);assert.equal(calls,0);
 assert.equal(await run({env:{ANTHROPIC_API_KEY:KEY,CONFIRM_BILLABLE:"YES"},argv:[],fetchImpl,log}),0);assert.equal(calls,1);
 assert.equal(await run({env:{ANTHROPIC_API_KEY:KEY,CONFIRM_BILLABLE:"YES"},argv:[],fetchImpl:async()=>Response.json({error:{type:"authentication_error",message:KEY}},{status:401}),log}),1);
 assert.ok(!lines.join("\n").includes(KEY),"key never printed");
});
test("browser code never contains a key and the shipped endpoint stays empty (AI off)",()=>{
 const walk=d=>readdirSync(d).flatMap(n=>{const p=join(d,n);return statSync(p).isDirectory()?walk(p):[p];});
 const files=[...walk("mentor"),...walk("workers/mentor-chat/src"),...walk("scripts"),...walk(".github/workflows")].filter(f=>/\.(mjs|js|html|yml|jsonc)$/.test(f)&&!f.endsWith(".test.mjs"));
 for(const f of files)assert.doesNotMatch(readFileSync(f,"utf8"),/sk-ant-[A-Za-z0-9_-]{20,}/,f);
 const page=files.filter(f=>f.startsWith("mentor")&&!f.endsWith(".test.mjs")&&!f.includes("claude-adapter")&&!f.includes("guard.mjs"));
 for(const f of page)assert.doesNotMatch(readFileSync(f,"utf8"),/api\.anthropic\.com|ANTHROPIC_API_KEY/,f);
 assert.match(readFileSync("mentor/ai/config.mjs","utf8"),/endpoint:""/);
 const wr=readFileSync("workers/mentor-chat/wrangler.jsonc","utf8");
 for(const v of ["MENTOR_CLAUDE_ENABLED","MENTOR_SPEND_LIMIT_CONFIRMED","MENTOR_PUBLIC"])assert.match(wr,new RegExp('"'+v+'": "false"'));
});