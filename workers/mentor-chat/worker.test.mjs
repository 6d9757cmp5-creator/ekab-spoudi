import test from "node:test";
import assert from "node:assert/strict";
import medicalTerms from "../../medical-terms.json" with {type:"json"};
import worker,{validate,buildMessages,verifiedPassages,SYSTEM_PROMPT,_resetLimits} from "./src/index.js";

const ORIGIN="https://6d9757cmp5-creator.github.io";
const canonicalCpr=medicalTerms.items.find(x=>x.term==="Καρδιοπνευμονική αναζωογόνηση");
assert(canonicalCpr,"Canonical CPR glossary record must be present");
assert.match(canonicalCpr.definition,/θωρακικές συμπιέσεις.*κυκλοφορίας.*αερισμούς.*αναπνοής/);
const body={question:"Τι είναι η ΚΑΡΠΑ;",passages:[{id:"T1",term:canonicalCpr.term,definition:canonicalCpr.definition}],level:"student",history:[]};
const req=(over={},method="POST",b=body)=>new Request("https://w.example/",{method,headers:{origin:ORIGIN,"content-type":"application/json","cf-connecting-ip":"1.1.1.1",...over},body:method==="POST"?JSON.stringify(b):undefined});
const aiOk=()=>({AI:{run:async(model,input)=>{aiOk.last={model,input};return new Response("data: {\"response\":\"Εκπαιδευτικός ορισμός. [T1]\"}\n\ndata: [DONE]\n\n").body;}},MENTOR_FREE_PLAN_CONFIRMED:"true"});

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
 assert.ok(aiOk.last.input.messages.at(-1).content.includes("[T1] "+canonicalCpr.term+": "+canonicalCpr.definition));
});

test("no passages means no AI call",async()=>{
 let called=false;
 const env={AI:{run:async()=>{called=true;}},MENTOR_FREE_PLAN_CONFIRMED:"true"};
 const r=await worker.fetch(req({},"POST",{...body,passages:[]}),env);
 assert.equal(r.status,200);assert.equal(called,false);
 assert.match((await r.json()).answer,/δεν είμαι σίγουρος/i);
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


test("server blocks direct unsafe clinical requests before invoking any model",async()=>{
 let called=false;
 const env={MENTOR_FREE_PLAN_CONFIRMED:"true",AI:{run:async()=>{called=true;throw Error("should not run");}}};
 for(const question of ["Ποια είναι η δοσολογία;","Έχω έναν ασθενή τώρα","Κάνε μου διάγνωση"]){
  const r=await worker.fetch(req({},"POST",{...body,question}),env);
  assert.equal(r.status,400,question);
  assert.equal((await r.json()).error,"unsafe_request");
 }
 assert.equal(called,false);
});

test("worker returns no unvalidated stream bytes for invented citations or dosing",async()=>{
 for(const unsafe of ["Ισχυρισμός χωρίς πηγές","Αβάσιμη απάντηση [T9]","Δώσε 12 mg [T1]"]){
  const env={MENTOR_FREE_PLAN_CONFIRMED:"true",AI:{run:async()=>new Response("data: "+JSON.stringify({response:unsafe})+"\n\n").body}};
  const r=await worker.fetch(req(),env);
  assert.equal(r.status,503,unsafe);
  assert.doesNotMatch(await r.text(),/Αβάσιμη|Ισχυρισμός|12 mg/);
 }
});


test("Claude provider is also buffered, citation-checked and never leaks unsafe SSE",async()=>{
 const oldFetch=globalThis.fetch;
 const budget={idFromName:()=> "global",get:()=>({fetch:async()=>Response.json({ok:true})})};
 const env={MENTOR_PROVIDER:"claude",MENTOR_CLAUDE_ENABLED:"true",MENTOR_SPEND_LIMIT_CONFIRMED:"true",
  MENTOR_PUBLIC:"true",ANTHROPIC_API_KEY:"private-test-key-not-real",BUDGET:budget,MENTOR_MODEL:"claude-haiku-5-5"};
 try{
  for(const [message,status] of [["Εκπαιδευτικός ορισμός. [T1]",200],["Πάρε 20 mg [T1]",503]]){
   globalThis.fetch=async(url,init)=>{
    assert.match(url,/anthropic\.com\/v1\/messages/);
    assert.equal(init.headers["x-api-key"],"private-test-key-not-real");
    const raw="data: "+JSON.stringify({type:"content_block_delta",delta:{type:"text_delta",text:message}})+"\n\n"+
     "data: "+JSON.stringify({type:"message_stop"})+"\n\n";
    return new Response(raw,{status:200,headers:{"content-type":"text/event-stream"}});
   };
   const res=await worker.fetch(req(),env);
   assert.equal(res.status,status,message);
   const text=await res.text();
   assert.doesNotMatch(text,/private-test-key-not-real|content_block_delta/);
   if(status===503)assert.doesNotMatch(text,/20 mg/);
   else assert.match(text,/Εκπαιδευτικός ορισμός/);
  }
 }finally{globalThis.fetch=oldFetch;}
});

test("server provenance gate rejects forged, edited, duplicated or irrelevant source before AI",async()=>{
 let called=0;
 const env={MENTOR_FREE_PLAN_CONFIRMED:"true",AI:{run:async()=>{called++;throw Error("should never call AI");}}};
 const p=body.passages[0];
 for(const b of [
  {...body,passages:[{...p,definition:"Πλαστός ορισμός από client"}]},
  {...body,passages:[{...p,id:"T9"}]},
  {...body,passages:[p,p]},
  {...body,question:"Εξήγησε τον πλανήτη Ποσειδώνα"}
 ]){
  const r=await worker.fetch(req({},"POST",b),env);
  assert.equal(r.status,200);
  assert.match((await r.json()).answer,/δεν είμαι σίγουρος/i);
 }
 assert.equal(called,0);
 assert.equal(verifiedPassages(body.question,body.passages).length,1);
 assert.equal(verifiedPassages(body.question,[{...p,term:"Κατασκευασμένος όρος"}]).length,0);
});

test("unverified chapter or exam passage stays local, not sent to AI",async()=>{
 let called=false;
 const env={MENTOR_FREE_PLAN_CONFIRMED:"true",AI:{run:async()=>{called=true;}}};
 const r=await worker.fetch(req({},"POST",{...body,passages:[{id:"T1",term:"ΕΟΠΠΕΠ EOP-A-001",definition:"Αυθαίρετη απάντηση"}]}),env);
 assert.equal(r.status,200);
 assert.equal(called,false);
});

test("AI source provenance refuses unsupported category-only medical terms",async()=>{
 const generic=medicalTerms.items.find(x=>x.term==="Καρδιακή ανεπάρκεια");
 assert(generic&&generic.sourceType==="category");
 let modelCalls=0;
 const env={MENTOR_FREE_PLAN_CONFIRMED:"true",AI:{run:async()=>{
   modelCalls++;throw Error("AI cannot use category-only term as a verified source");
 }}};
 const query={...body,question:"Τι είναι η καρδιακή ανεπάρκεια;",passages:[
  {id:"T1",term:generic.term,definition:generic.definition}
 ]};
 assert.equal(verifiedPassages(query.question,query.passages).length,0);
 const r=await worker.fetch(req({},"POST",query),env);
 assert.equal(r.status,200);
 assert.match((await r.json()).answer,/Δεν είμαι σίγουρος/);
 assert.equal(modelCalls,0);
 assert.equal(verifiedPassages(body.question,body.passages).length,1);
});
