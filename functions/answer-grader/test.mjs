import test from 'node:test';
import assert from 'node:assert/strict';
import handler from './main.js';
import {freeProviders} from './free-providers.js';
import {EXTRA_GRADING_REFERENCES} from './extra-grading-references.mjs';
import {SEMANTIC_GRADING_POLICY,cautiouslyCheckGrade} from './semantic-grading-policy.mjs';
import {SOURCE_COMPLETENESS,protectCompleteness} from './source-completeness.mjs';
import {QUESTIONS as ORAL_QUESTIONS} from '../../mentor/core/oral-practice.mjs';
import {readFileSync} from 'node:fs';

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


test('all old-style written and MENTOR oral question references are project-controlled and in sync',()=>{
 const original=JSON.parse(readFileSync(new URL('../../old_type_written.json',import.meta.url),'utf8'));
 const old=EXTRA_GRADING_REFERENCES.filter(q=>q.section==='old_written');
 const oral=EXTRA_GRADING_REFERENCES.filter(q=>q.section==='mentor_oral');
 assert.equal(old.length,7);assert.equal(oral.length,6);
 for(const item of original){
  const ref=old.find(x=>x.id===item.id);
  assert.ok(ref);assert.equal(ref.question,item.question);assert.equal(ref.reference,item.modelAnswer);
 }
 for(const q of ORAL_QUESTIONS){
  const ref=oral.find(x=>x.id===q.id);
  assert.ok(ref);assert.equal(ref.question,q.prompt);
  for(const check of q.checks)assert.ok(ref.reference.includes(check));
 }
});
test('Greek spelling and syntax tolerance is explicit while clinical negatives/numbers stay distinct',()=>{
 assert.match(SEMANTIC_GRADING_POLICY,/σύνταξη/);
 assert.match(SEMANTIC_GRADING_POLICY,/τυπογραφικά/);
 assert.match(SEMANTIC_GRADING_POLICY,/αρνήσεις/);
 assert.match(SEMANTIC_GRADING_POLICY,/δόσεις/);
 assert.match(SEMANTIC_GRADING_POLICY,/uncertain/);
});
test('old-style exam and oral rehearsal grade against trusted, non-user-editable reference',async()=>setup(async()=>{
 const sent=[];
 globalThis.fetch=async(url,options)=>{
  const body=JSON.parse(options.body);
  sent.push(JSON.parse(body.messages[1].content));
  assert.match(body.messages[0].content,/ΜΗ βαθμολογείς την ορθογραφία/);
  return response(grade);
 };
 const essay=await invoke({section:'old_written',questionId:'old-141',answer:'ε δυο βη δυο εμ πεντε',reference:'ένας αυθαίρετος βαθμός'},'new-old');
 const practice=await invoke({section:'mentor_oral',questionId:'scene',answer:'βλεπω κινδυνους πριν παω',reference:'κατασκευασμένη πηγή'},'new-mentor');
 assert.equal(essay.status,200);assert.equal(practice.status,200);assert.equal(sent.length,2);
 assert.match(sent[0].question,/Γλασκώβης/);assert.match(sent[0].reference,/GCS/);
 assert.match(sent[1].question,/συνθετικού τροχαίου/);
 assert.ok(!sent[1].reference.includes('κατασκευασμένη'));
 assert.match(sent[1].reference,/πιθανούς κινδύνους/);
}));
test('invalid or wrong-section reference cannot be injected',async()=>setup(async()=>{
 globalThis.fetch=()=>assert.fail('No model request on invalid reference');
 assert.equal((await invoke({section:'old_written',questionId:'scene',answer:'δοκιμαστικό'},'forged1')).status,400);
 assert.equal((await invoke({section:'mentor_oral',questionId:'old-141',answer:'δοκιμαστικό'},'forged2')).status,400);
}));
test('uncorroborated partial or incorrect model verdict becomes ungraded rather than false rejection',()=>{
 const uncertainPartial=cautiouslyCheckGrade({...grade,verdict:'partial',correctPoints:[],missingPoints:['λείπει ένα σημείο']});
 assert.equal(uncertainPartial.verdict,'uncertain');
 const uncertainWrong=cautiouslyCheckGrade({...grade,verdict:'incorrect',correctPoints:[],missingPoints:[]});
 assert.equal(uncertainWrong.verdict,'uncertain');
 assert.equal(cautiouslyCheckGrade({...grade,verdict:'incorrect',criticalError:true,missingPoints:[]}).verdict,'incorrect');
});
test('all optional written assessment surfaces invoke the same safe client',()=>{
 const html=readFileSync(new URL('../../written_exam.html',import.meta.url),'utf8');
 const oral=readFileSync(new URL('../../mentor-oral.html',import.meta.url),'utf8');
 const script=readFileSync(new URL('../../old_type_written.js',import.meta.url),'utf8');
 const oralScript=readFileSync(new URL('../../mentor/app/oral.js',import.meta.url),'utf8');
 assert.match(html,/ai-grading-client\.js/);assert.match(html,/id="ai-grade"/);
 assert.match(oral,/ai-grading-client\.js/);assert.match(oral,/id="oral-grade-ai"/);
 assert.match(script,/section:'old_written'/);assert.match(oralScript,/section:'mentor_oral'/);
 assert.match(oralScript,/examBox\.checked/);
});

test('EOP-A-001: Greek answer with three true functions is NOT a complete answer',async()=>setup(async()=>{
 const seen=[];
 globalThis.fetch=async(url,options)=>{
  const request=JSON.parse(options.body);
  seen.push(JSON.parse(request.messages[1].content));
  return response({...grade,verdict:'correct',correctPoints:['Μύτη'],missingPoints:[],explanation:'Αυθαίρετα σωστό'});
 };
 const result=await invoke({section:'eoppep',questionId:'EOP-A-001',
  answer:'η μυτη το αερα ζεστενει καθαριζει και υγρενει'},'nasal-too-short');
 assert.equal(result.status,200);
 assert.equal(result.body.verdict,'partial');
 assert.match(result.body.explanation,/δεν καλύπτει όλα/);
 assert.ok(result.body.missingPoints.some(x=>x.includes('όσφρηση')));
 assert.ok(result.body.missingPoints.some(x=>x.includes('κροσσοί')));
 assert.equal(seen.length,1);
 assert.equal(seen[0].essentialCriteria.length,5);
 assert.ok(seen[0].essentialCriteria.some(x=>x.includes('όσφρηση')));
}));
test('source rubric safeguard: accepts complete paraphrase, holds negation or unknown synonyms',()=>{
 const q={id:'EOP-A-001'};
 const valid={...grade,verdict:'correct'};
 assert.equal(SOURCE_COMPLETENESS[q.id].essential.length,5);
 const cases=[
  ['καθαρίζει με βλέννη και κροσσούς, θερμαίνει, υγραίνει τον αέρα και βοηθά στην όσφρηση','correct'],
  ['Η μυτη καθαριζη τον αερα, τον ζεσταινει και τον υγραινει.','partial'],
  ['Καθαρίζει, θερμαίνει, υγραίνει τον αέρα','partial'],
  ['Ο αέρας φιλτράρεται με βλέννη, θερμαίνεται, υγραίνεται και βοηθά να μυρίζουμε','correct'],
  ['Καθαρίζει με βλέννη και κροσσούς, θερμαίνει, δεν υγραίνει και βοηθά στην όσφρηση','uncertain'],
  ['Εξισορροπεί το περιβάλλον εισπνοής μέσω προστατευτικών ρινικών δομών','uncertain']
 ];
 for(const [answer,expected] of cases){
  const result=protectCompleteness(q,answer,valid);
  assert.equal(result.verdict,expected,answer);
 }
 // Only a source guard: it cannot upgrade an incorrect answer to correct.
 assert.equal(protectCompleteness(q,'ζεσταίνει', {...valid,verdict:'incorrect'}).verdict,'incorrect');
});
test('grammar is not confused with completeness in the same reference item',()=>{
 const q={id:'EOP-A-001'};
 const output=protectCompleteness(q,'η μυτη το αερα ζεστενει καθαριζει και υγρενει',
   {...grade,verdict:'correct'});
 assert.equal(output.verdict,'partial');
 assert.deepEqual(output.correctPoints,[
 'Καθαρισμός του εισπνεόμενου αέρα',
 'Θέρμανση του εισπνεόμενου αέρα',
 'Ύγρανση του εισπνεόμενου αέρα']);
 assert.ok(output.missingPoints.length===2);
});
