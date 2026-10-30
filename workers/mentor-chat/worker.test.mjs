import test from "node:test";
import assert from "node:assert/strict";
import worker,{validate,buildMessages,SYSTEM_PROMPT,_resetLimits} from "./src/index.js";

const ORIGIN="https://6d9757cmp5-creator.github.io";
const body={question:"Τι είναι η ΚΑΡΠΑ;",passages:[{id:"T1",term:"ΚΑΡΠΑ",definition:"Ορισμός."}],level:"student",history:[]};
const req=(over={},method="POST",b=body)=>new Request("https://w.example/",{method,headers:{origin:ORIGIN,"content-type":"application/json","cf-connecting-ip":"1.1.1.1",...over},body:method==="POST"?JSON.stringify(b):undefined});
const aiOk=()=>({AI:{run:async(model,input)=>{aiOk.last={model,input};return new Response("data: {\"response\":\"ok\"}\n\n").body;}},MENTOR_FREE_PLAN_CONFIRMED:"true"});

test.beforeEach(()=>_resetLimits());

test("foreign origins are rejected before anything else",async()=>{
 const r=await worker.fetch(req({origin:"https://evil.example"}),aiOk());
 assert.equal(r.status,403);
});

test("localhost is allowed only when ALLOW_LOCAL is set",async()=>{
 assert.equal((await worker.fetch(req({origin:"http://localhost:8080"}),aiOk())).status,403);
 assert.equal((await worker.fetch(req({origin:"http://localhost:8080"}),{...aiOk(),ALLOW_LOCAL:"true"})).status,200);
});

test("preflight succeeds for the site origin",async()=>{
 const r=await worker.fetch(req({},"OPTIONS"),aiOk());
 assert.equal(r.status,204);
 assert.equal(r.headers.get("access-control-allow-origin"),ORIGIN);
});

test("stays disabled until the free plan is confirmed",async()=>{
 const env=aiOk();env.MENTOR_FREE_PLAN_CONFIRMED="false";
 assert.equal((await worker.fetch(req(),env)).status,503);
 assert.equal((await worker.fetch(req(),{MENTOR_FREE_PLAN_CONFIRMED:"true"})).status,503);
});

test("valid request streams from an allowlisted model with grounded messages",async()=>{
 const env=aiOk();env.MENTOR_MODEL="@cf/some/expensive-model";
 const r=await worker.fetch(req(),env);
 assert.equal(r.status,200);
 assert.match(r.headers.get("content-type"),/text\/event-stream/);
 assert.equal(aiOk.last.model,"@cf/meta/llama-3.3-70b-instruct-fp8-fast");
 assert.equal(aiOk.last.input.stream,true);
 assert.ok(aiOk.last.input.max_tokens<=350);
 assert.match(aiOk.last.input.messages.at(-1).content,/\[T1\] ΚΑΡΠΑ: Ορισμός\./);
});

test("no passages means no AI call",async()=>{
 let called=false;
 const env={AI:{run:async()=>{called=true;}},MENTOR_FREE_PLAN_CONFIRMED:"true"};
 const r=await worker.fetch(req({},"POST",{...body,passages:[]}),env);
 assert.equal(r.status,200);assert.equal(called,false);
 assert.match((await r.json()).answer,/τεκμηριωμένη πηγή/);
});

test("invalid and oversized input is rejected",async()=>{
 assert.equal((await worker.fetch(req({},"POST",{question:""}),aiOk())).status,400);
 assert.equal((await worker.fetch(req({"content-length":"99999"}),aiOk())).status,413);
 assert.equal((await worker.fetch(req({"content-type":"text/plain"},"POST",null),aiOk())).status,400);
});

test("per-IP limit returns 429 after 20 requests",async()=>{
 const env=aiOk();
 for(let i=0;i<20;i++)assert.equal((await worker.fetch(req(),env)).status,200);
 const r=await worker.fetch(req(),env);
 assert.equal(r.status,429);assert.equal(r.headers.get("retry-after"),"3600");
 assert.equal((await worker.fetch(req({"cf-connecting-ip":"2.2.2.2"}),env)).status,200);
});

test("daily cap protects the free quota",async()=>{
 const env={...aiOk(),DAILY_CAP:"2"};
 await worker.fetch(req({"cf-connecting-ip":"3.3.3.3"}),env);
 await worker.fetch(req({"cf-connecting-ip":"4.4.4.4"}),env);
 assert.equal((await worker.fetch(req({"cf-connecting-ip":"5.5.5.5"}),env)).status,429);
});

test("provider failure is a quiet 503, not a leak",async()=>{
 const env={AI:{run:async()=>{throw new Error("secret internal detail");}},MENTOR_FREE_PLAN_CONFIRMED:"true"};
 const r=await worker.fetch(req(),env);
 assert.equal(r.status,503);
 assert.doesNotMatch(await r.text(),/secret/);
});

test("validate clips and drops malformed fields; prompt forbids dosing and guessing",()=>{
 const v=validate({question:"q".repeat(900),passages:[{id:"T1",term:"a",definition:"b".repeat(900)},{bad:1}],level:"x",history:[{role:"user",text:"h"}]});
 assert.equal(v.question.length,300);assert.equal(v.passages.length,1);assert.equal(v.passages[0].definition.length,400);assert.equal(v.level,"student");
 assert.match(SYSTEM_PROMPT,/δοσολογίες/);assert.match(SYSTEM_PROMPT,/μην μαντέψεις/);
 assert.equal(buildMessages(v)[0].role,"system");
});
