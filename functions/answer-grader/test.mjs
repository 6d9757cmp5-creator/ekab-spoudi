import test from 'node:test';
import assert from 'node:assert/strict';
import handler from './main.js';
import {freeProviders} from './free-providers.js';
const answer={section:'seminar',courseId:'bls',questionIndex:1,answer:'Ελέγχω την ασφάλεια του χώρου.'};
const grade={verdict:'correct',explanation:'Σωστό νόημα',correctPoints:['Ασφάλεια'],missingPoints:[],criticalError:false,safetyNote:''};
const invoke=(body,user='user',authenticated=true)=>handler({req:{method:'POST',headers:authenticated?{'x-appwrite-user-id':user,'x-appwrite-user-jwt':'test-jwt'}:{},bodyJson:body},res:{json:(body,status=200)=>({body,status})}});
async function setup(run){
 const env={...process.env},fetch=globalThis.fetch;
 delete process.env.OPENAI_API_KEY;delete process.env.OPENROUTER_API_KEY;delete process.env.CLOUDFLARE_API_TOKEN;
 process.env.OPENROUTER_API_KEY='test-only';process.env.OPENROUTER_FREE_MODEL='google/gemma-4-31b-it:free';
 try{await run();}finally{globalThis.fetch=fetch;for(const key of Object.keys(process.env))if(!(key in env))delete process.env[key];Object.assign(process.env,env);}
}
const response=data=>({ok:true,json:async()=>({choices:[{finish_reason:'stop',message:{content:JSON.stringify(data)}}]})});
test('no implicit paid provider; new free providers require explicit verification',()=>{
 assert.deepEqual(freeProviders({OPENAI_API_KEY:'paid',GROQ_API_KEY:'key'}),[]);
 assert.equal(freeProviders({GROQ_API_KEY:'key',GROQ_FREE_PLAN_CONFIRMED:'true'})[0].model,'qwen/qwen3.8-27b');
 assert.deepEqual(freeProviders({MISTRAL_API_KEY:'key',CEREBRAS_API_KEY:'key'}),[]);
 assert.deepEqual(freeProviders({GROQ_API_KEY:'key',GROQ_FREE_PLAN_CONFIRMED:'false'}),[]);
});
test('OpenRouter rejects paid models and implicit models',()=>{
 for(const model of ['', 'openai/gpt-4o','openai/gpt-oss-20b:free','foo:free:nitro','vendor/model:free'])assert.deepEqual(freeProviders({OPENROUTER_API_KEY:'key',OPENROUTER_FREE_MODEL:model}),[]);
 assert.equal(freeProviders({OPENROUTER_API_KEY:'key',OPENROUTER_FREE_MODEL:'google/gemma-4-31b-it:free'}).length,1);
});
test('NVIDIA free alternative stays on the explicit non-OpenAI allowlist',()=>{
 assert.equal(freeProviders({OPENROUTER_API_KEY:'test',OPENROUTER_FREE_MODEL:'nvidia/nemotron-3.5-super-vl:free'}).length,1);
});
test('Cloudflare requires Free plan, valid account and an allowlisted model',()=>{
 const cloud={CLOUDFLARE_API_TOKEN:'test',CLOUDFLARE_ACCOUNT_ID:'a'.repeat(32),CLOUDFLARE_FREE_PLAN_CONFIRMED:'true'};
 assert.equal(freeProviders(cloud)[0].id,'cloudflare');
 for(const model of ['@cf/zai-org/glm-4.7-flash','@cf/google/gemma-4-26b-a4b-it','@cf/nvidia/nemotron-3-120b-a12b'])
  assert.equal(freeProviders({...cloud,CLOUDFLARE_FREE_MODEL:model})[0].model,model);
 assert.deepEqual(freeProviders({...cloud,CLOUDFLARE_FREE_PLAN_CONFIRMED:'false'}),[]);
 assert.deepEqual(freeProviders({...cloud,CLOUDFLARE_FREE_MODEL:'paid/model'}),[]);
 assert.deepEqual(freeProviders({...cloud,CLOUDFLARE_ACCOUNT_ID:'../other'}),[]);
});
test('authentication and missing configuration stop before any request',async()=>setup(async()=>{
 globalThis.fetch=()=>assert.fail('must not call model');
 assert.equal((await invoke(answer,'anonymous',false)).status,401);
 delete process.env.OPENROUTER_API_KEY;
 assert.equal((await invoke(answer,'missing')).status,503);
}));
test('blank and invalid references rejected',async()=>setup(async()=>{
 globalThis.fetch=()=>assert.fail('must not call model');
 assert.equal((await invoke({...answer,answer:''},'blank')).status,400);
 assert.equal((await invoke({...answer,courseId:'injected'},'invalid')).status,400);
}));
test('server controls reference; user cannot override it',async()=>setup(async()=>{
 globalThis.fetch=async(url,opt)=>{
  assert.equal(url,'https://openrouter.ai/api/v1/chat/completions');
  const body=JSON.parse(opt.body),content=JSON.parse(body.messages[1].content);
  assert.equal(content.reference,'Εξασφάλισε τη δική σου ασφάλεια πριν πλησιάσεις.');
  assert.equal(body.temperature,0);assert.match(body.messages[0].content,/ασαφής/);
  return response(grade);
 };
 const result=await invoke({...answer,reference:'forged'},'reference');
 assert.equal(result.body.verdict,'correct');assert.equal(result.body.provider,'openrouter');
}));
test('seminar_case uses controlled scenario reference',async()=>setup(async()=>{
 globalThis.fetch=async(url,opt)=>{const input=JSON.parse(JSON.parse(opt.body).messages[1].content);assert.match(input.section,/Κλινικό σενάριο/);return response(grade);};
 assert.equal((await invoke({section:'seminar_case',courseId:'bls',caseIndex:0,answer:answer.answer},'case')).status,200);
}));
test('EOPPEP reference is bundled in the Function, never fetched from GitHub',async()=>setup(async()=>{
 let calls=0;globalThis.fetch=async(url,opt)=>{calls++;assert.equal(url,'https://openrouter.ai/api/v1/chat/completions');
  const input=JSON.parse(JSON.parse(opt.body).messages[1].content);assert.match(input.question,/ρινικών κοιλοτήτων/);assert.ok(input.reference.length>50);return response(grade);};
 const result=await invoke({section:'eoppep',questionId:'EOP-A-001',answer:'Ο αέρας θερμαίνεται και καθαρίζεται.'},'eop-local');
 assert.equal(result.status,200);assert.equal(calls,1);
}));
test('429 switches once to free-only fallback with zero price constraint',async()=>setup(async()=>{
 process.env.CLOUDFLARE_API_TOKEN='test-key';process.env.CLOUDFLARE_ACCOUNT_ID='a'.repeat(32);process.env.CLOUDFLARE_FREE_PLAN_CONFIRMED='true';let calls=0;
 globalThis.fetch=async(url,opt)=>{calls++;if(calls===1){assert.equal(JSON.parse(opt.body).reasoning,undefined);return {ok:false,status:429};}
  assert.equal(url,'https://openrouter.ai/api/v1/chat/completions');const request=JSON.parse(opt.body);
  assert.deepEqual(request.provider.max_price,{prompt:0,completion:0,request:0});assert.equal(request.provider.allow_fallbacks,false);return response(grade);
 };
 const result=await invoke(answer,'fallback');assert.equal(result.status,200);assert.equal(result.body.provider,'openrouter');assert.equal(calls,2);
}));
test('unsupported pulse requirement in BLS falls back instead of misgrading',async()=>setup(async()=>{
 process.env.CLOUDFLARE_API_TOKEN='test-key';process.env.CLOUDFLARE_ACCOUNT_ID='a'.repeat(32);process.env.CLOUDFLARE_FREE_PLAN_CONFIRMED='true';let calls=0;
 globalThis.fetch=async()=>{calls++;return response(calls===1?{...grade,verdict:'partial',missingPoints:['Έλεγχος παλμών'],explanation:'Λείπει ο έλεγχος παλμών.'}:grade);};
 const result=await invoke({section:'seminar',courseId:'bls',questionIndex:7,answer:'Καλώ βοήθεια και ελέγχω την αναπνοή.'},'pulse-guard');
 assert.equal(result.status,200);assert.equal(result.body.provider,'openrouter');assert.equal(result.body.verdict,'correct');assert.equal(calls,2);
}));
test('all unavailable never returns fabricated grade or calls paid OpenAI',async()=>setup(async()=>{
 let calls=0;globalThis.fetch=async url=>{assert.ok(!url.includes('api.openai.com'));calls++;return {ok:false,status:429};};
 const result=await invoke(answer,'exhausted');assert.equal(result.status,503);assert.equal(result.body.verdict,undefined);assert.equal(calls,1);
}));
test('malformed or truncated output cannot become a grade',async()=>setup(async()=>{
 globalThis.fetch=async()=>response({verdict:'correct'});assert.equal((await invoke(answer,'malformed')).status,503);
 globalThis.fetch=async()=>({ok:true,json:async()=>({choices:[{finish_reason:'length',message:{content:JSON.stringify(grade)}}]})});
 assert.equal((await invoke(answer,'truncated')).status,503);
}));
test('uncertainty remains ungraded; critical error cannot be correct',async()=>setup(async()=>{
 globalThis.fetch=async()=>response({...grade,verdict:'uncertain',explanation:'Η απάντηση είναι ασαφής. Γράψε πιο συγκεκριμένα.'});
 const unclear=await invoke(answer,'unclear');assert.equal(unclear.body.verdict,'uncertain');assert.equal(unclear.body.score,undefined);
 globalThis.fetch=async()=>response({...grade,criticalError:true});assert.equal((await invoke(answer,'critical')).body.verdict,'incorrect');
}));
test('same user and same submission reuse result, different user does not',async()=>setup(async()=>{
 let calls=0;globalThis.fetch=async()=>{calls++;return response(grade);};
 const [a,b]=await Promise.all([invoke(answer,'cache'),invoke(answer,'cache')]);assert.deepEqual(a,b);assert.equal(calls,1);
 await invoke(answer,'cache');assert.equal(calls,1);await invoke(answer,'other-cache');assert.equal(calls,2);
}));


test('teaching feedback shows a grounded model answer and example without praising wrong answers',async()=>setup(async()=>{
 globalThis.fetch=async()=>response({
  ...grade,verdict:'incorrect',explanation:'Το «αγενής» είναι χαρακτηρισμός.',
  correctPoints:['Δεν υπήρχε κανένα σωστό στοιχείο'],missingPoints:['Περιέγραψε τι συνέβη.'],
  modelAnswer:'Αντικειμενικά παρατηρήσιμη συμπεριφορά.',
  example:'Όχι «αγενής». Γράψε συγκεκριμένα τι έκανε.',takeaway:'Καταγράφουμε γεγονότα.'
 });
 const output=await invoke({section:'seminar',courseId:'bls',questionIndex:1,answer:'Ο ασθενής είναι αγενής.'},'teaching');
 assert.equal(output.status,200);
 assert.equal(output.body.verdict,'incorrect');
 assert.deepEqual(output.body.correctPoints,[]);
 assert.deepEqual(output.body.missingPoints,['Περιέγραψε τι συνέβη.']);
 assert.equal(output.body.modelAnswer,'Αντικειμενικά παρατηρήσιμη συμπεριφορά.');
 assert.match(output.body.referenceAnswer,/ασφάλεια/);
 assert.match(output.body.example,/Όχι/);
 assert.match(output.body.takeaway,/γεγονότα/);
}));
test('correct feedback cannot contain contradictory missing steps; old models still work',async()=>setup(async()=>{
 globalThis.fetch=async()=>response({...grade,missingPoints:['Λάθος υπόδειξη']});
 const output=await invoke(answer,'teaching-legacy');
 assert.equal(output.status,200);
 assert.equal(output.body.verdict,'correct');
 assert.deepEqual(output.body.missingPoints,[]);
 assert.equal(output.body.modelAnswer,'');
 assert.ok(output.body.referenceAnswer.length>0);
}));

test('all configured free AIs exhausted: friendly theory suggestion, explicit code, no invented grade',async()=>setup(async()=>{
 process.env.CLOUDFLARE_API_TOKEN='test-key';
 process.env.CLOUDFLARE_ACCOUNT_ID='a'.repeat(32);
 process.env.CLOUDFLARE_FREE_PLAN_CONFIRMED='true';
 let calls=0;
 globalThis.fetch=async()=>{calls++;return {ok:false,status:429};};
 const r=await invoke(answer,'all-limit-429');
 assert.equal(calls,2);
 assert.equal(r.status,503);
 assert.equal(r.body.code,'all_ai_limits');
 assert.match(r.body.error,/θεωρία/);
 assert.match(r.body.error,/αργότερα/);
 assert.equal(r.body.verdict,undefined);
}));
test('all free AIs out of credits (402): show the same reassuring study message',async()=>setup(async()=>{
 globalThis.fetch=async()=>({ok:false,status:402});
 const r=await invoke(answer,'credit-limit-402');
 assert.equal(r.body.code,'all_ai_limits');
 assert.match(r.body.error,/θεωρία/);
 assert.equal(r.body.verdict,undefined);
}));
test('do not mislabel a mixed quota and service error as all AIs exhausted',async()=>setup(async()=>{
 process.env.CLOUDFLARE_API_TOKEN='test-key';
 process.env.CLOUDFLARE_ACCOUNT_ID='a'.repeat(32);
 process.env.CLOUDFLARE_FREE_PLAN_CONFIRMED='true';
 let attempts=0;
 globalThis.fetch=async()=>{attempts++;return {ok:false,status:attempts===1?429:503};};
 const r=await invoke(answer,'mixed-limit-error');
 assert.equal(r.status,503);
 assert.notEqual(r.body.code,'all_ai_limits');
 assert.equal(r.body.verdict,undefined);
}));
test('student request limit uses study-theory message and no invented score',async()=>setup(async()=>{
 globalThis.fetch=async()=>response(grade);
 let final;
 for(let i=0;i<16;i++)final=await invoke(answer,'student-limit-test');
 assert.equal(final.status,429);
 assert.equal(final.body.code,'student_ai_limit');
 assert.match(final.body.error,/θεωρία/);
 assert.equal(final.body.verdict,undefined);
}));

