/**
 * Five-source cross-domain ATLA educational smoke + distinct second-model challenge.
 * All cases synthetic. Maximum six Workers AI calls, no deployment, no learners.
 * A PASS is a scoped screening result, never claim-level scientific certification.
 */
import {mkdirSync,writeFileSync} from 'node:fs';
import medicalTerms from '../medical-terms.json' with {type:'json'};
import worker,{verifiedPassages} from '../workers/mentor-chat/src/index.js';
import {retrieve} from '../atla/knowledge/retrieve.mjs';
import {ATLA_AI} from '../atla/ai/config.mjs';
const account=process.env.CLOUDFLARE_ACCOUNT_ID||'';
const token=process.env.CLOUDFLARE_WORKERS_AI_TEST_TOKEN||'';
const MAIN_MODEL='@cf/google/gemma-4-26b-a4b-it';
const REVIEW_MODEL='@cf/meta/llama-3.3-70b-instruct-fp8-fast';
const cases=[
 {id:'cpr',term:'Καρδιοπνευμονική αναζωογόνηση',q:'Εξήγησε μόνο με βάση τις πηγές τι είναι η ΚΑΡΠΑ.',must:['συμπιεσ','αερισμ','κυκλοφορ']},
 {id:'airway',term:'Αεραγωγός',q:'Τι είναι ο αεραγωγός; Χρησιμοποίησε μόνο τον δοσμένο ορισμό.',must:['αεραγωγ','αερα']},
 {id:'anaphylaxis',term:'Αναφυλαξία',q:'Πώς ορίζεται η αναφυλαξία; Μόνο τον ορισμό της.',must:['αναφυλαξ','αναπνο']},
 {id:'ecg',term:'Ηλεκτροκαρδιογράφημα',q:'Τι καταγράφει το ηλεκτροκαρδιογράφημα;',must:['ηλεκτρ','καρδι']},
 {id:'stroke',term:'Αγγειακό εγκεφαλικό επεισόδιο',q:'Τι είναι το αγγειακό εγκεφαλικό επεισόδιο, χωρίς κλινική διάγνωση;',must:['εγκεφαλ','ισχαιμ']}
];
const result={date:new Date().toISOString(),sourceBase:'medical-terms.json',scope:'5-domain synthetic educator cases; 1 distinct-model second pass; no clinical certification',liveCallCount:0,
  productionDeployments:0,productionFlagsModified:false,realPatientData:false,model:MAIN_MODEL,reviewerModel:REVIEW_MODEL,cases:[],reviewer:null,
  productionOffCheckedBefore:ATLA_AI.endpoint==='',productionOffCheckedAfter:false,status:'not_started'};
const save=()=>{mkdirSync('audit-results',{recursive:true});writeFileSync('audit-results/atla-cross-domain-20261104.json',JSON.stringify(result,null,2)+'\n');};
const norm=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('el');
const userReq=body=>new Request('https://cross-domain.example',{method:'POST',headers:{origin:'https://6d9757cmp5-creator.github.io','content-type':'application/json','cf-connecting-ip':'198.51.100.53'},body:JSON.stringify(body)});
let offRun=0;
const offEnv={MENTOR_PROVIDER:'workers-ai',MENTOR_FREE_PLAN_CONFIRMED:'false',AI:{run:()=>{offRun++;throw Error('AI called while OFF');}}};
const offSample={question:'Τι είναι η ΚΑΡΠΑ;',passages:retrieve('ΚΑΡΠΑ',medicalTerms.items),level:'student',history:[]};
if(!result.productionOffCheckedBefore||(await worker.fetch(userReq(offSample),offEnv)).status!==503||offRun!==0){
 result.status='blocked-nonproduction-off-guard';save();process.exit(2);
}
if(!/^[a-f0-9]{32}$/i.test(account)||!token||process.env.CLOUDFLARE_FREE_PLAN_CONFIRMED!=='true'){
 result.status='blocked-free-test-credentials';save();process.exit(2);
}
const invoke=async(model,messages,cap)=>{
 if(result.liveCallCount>=6)throw Error('hard call budget exceeded');
 result.liveCallCount++;
 const input={messages,stream:false,max_tokens:cap,temperature:0.15};
 if(model===MAIN_MODEL)input.chat_template_kwargs={enable_thinking:false};
 const response=await fetch('https://api.cloudflare.com/client/v4/accounts/'+account+'/ai/run/'+model,{
   method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},
   body:JSON.stringify(input),
   signal:AbortSignal.timeout(22000)
 });
 const j=await response.json().catch(()=>null);
 if(!response.ok||j?.success===false)throw Error('cloudflare-http-'+response.status+'-code-'+String(j?.errors?.[0]?.code||''));
 const d=j?.result??j;
 const content=typeof d?.choices?.[0]?.message?.content==='string'?d.choices[0].message.content:typeof d?.response==='string'?d.response:typeof d?.output==='string'?d.output:'';
 if(!content)throw Error('empty-provider-response');
 const finish=d?.choices?.[0]?.finish_reason??'stop';
 if(finish!=='stop')throw Error('incomplete-upstream-'+finish);
 return {text:content,usage:d?.usage??j?.usage??null,finish};
};
const enc=new TextEncoder();
let failed=false,providerStopped=false;
for(const item of cases){
 const e={id:item.id,term:item.term,question:item.q,called:false,serverValidated:false,workerAccepted:false,markerPassed:false,rawOutput:'',result:'not_run'};
 result.cases.push(e);
 if(providerStopped){e.result='not_run_after_provider_error';save();continue;}
 const records=retrieve(item.q,medicalTerms.items,{k:4,minScore:3});
 const one=records.filter(x=>x.term===item.term);
 e.serverValidated=one.length===1&&verifiedPassages(item.q,one).length===1;
 e.definition=one[0]?.definition||'';
 e.sourceType=one[0]?.sourceType||'unset';
 if(!e.serverValidated){e.result='blocked-source';failed=true;save();continue;}
 let modelReply='';
 const env={MENTOR_PROVIDER:'workers-ai',MENTOR_FREE_PLAN_CONFIRMED:'true',MENTOR_MODEL:MAIN_MODEL,DAILY_CAP:'6',
   AI:{run:async(model,payload)=>{
     if(model!==MAIN_MODEL)throw Error('unexpected model');
     e.called=true;
     let out;
     try{out=await invoke(model,payload.messages,350);}catch(err){e.providerError=String(err.message).slice(0,140);throw err;}
     modelReply=out.text;e.providerUsage=out.usage;
     return new ReadableStream({start(controller){controller.enqueue(enc.encode('data: '+JSON.stringify({token:modelReply})+'\n\ndata: [DONE]\n\n'));controller.close();}});
   }}
 };
 try{
  const resp=await worker.fetch(userReq({question:item.q,passages:one,level:'student',history:[]}),env);
  e.workerHttpStatus=resp.status;
  e.workerAccepted=resp.status===200&&(await resp.text()).includes('data: [DONE]');
  e.rawOutput=modelReply.slice(0,2200);
  e.markerPassed=item.id==='anaphylaxis'
    ?norm(modelReply).includes('αναφυλαξ')&&(norm(modelReply).includes('αναπνο')||norm(modelReply).includes('κυκλοφορ'))
    :item.must.every(word=>norm(modelReply).includes(word));
  e.result=e.workerAccepted&&e.markerPassed?'screening_pass':'screening_fail';
  if(!e.workerAccepted||!e.markerPassed)failed=true;
  if(e.providerError){providerStopped=true;e.result='provider_unavailable';}
 }catch(err){e.result='provider_or_guard_error';e.error=String(err.message).slice(0,120);failed=true;providerStopped=true;}
 console.log('ATLA_CROSS_DOMAIN',item.id,e.result,'HTTP',e.workerHttpStatus||'error');
 save();
}
const entries=result.cases.filter(x=>x.rawOutput).map(x=>({id:x.id,sourceDefinition:x.definition,modelOutput:x.rawOutput}));
if(entries.length===5&&result.liveCallCount<6){
 try{
  const prompt='Ανεξάρτητο δεύτερο πέρασμα εκπαιδευτικής τεκμηρίωσης, ελληνικά. Δες μόνο τις ακόλουθες ζεύξεις σύντομης πηγής–απάντησης. Για ΚΑΘΕ id έλεγξε αν κάθε κλινικός ισχυρισμός υπάρχει στο συγκεκριμένο sourceDefinition. Μην επεκτείνεις επιστημονικές οδηγίες. Απάντησε σε JSON ή 5 σύντομες γραμμές: id, SUPPORTED ή OVERSPECIFIED ή INCORRECT και μία σύντομη αιτία. Αν ο ορισμός είναι ανεπαρκής, δήλωσέ το. Μην αξιολογείς πρακτική κλινική επάρκεια.\n'+JSON.stringify(entries);
  const out=await invoke(REVIEW_MODEL,[{role:'system',content:'Είσαι ελεγκτής επιστημονικής τεκμηρίωσης. Έλεγξε αποκλειστικά το περιεχόμενο των δεδομένων ορισμών, όχι εξωτερική μνήμη. Μην δηλώσεις πιστοποίηση.'},{role:'user',content:prompt}],650);
  result.reviewer={called:true,text:out.text.slice(0,5000),usage:out.usage,method:'independent-model-text-vs-definition-screen'};
 }catch(err){result.reviewer={called:false,error:String(err.message).slice(0,120)};failed=true;}
}else{result.reviewer={called:false,reason:'not-all-five-valid'};failed=true;}
result.productionOffCheckedAfter=(await worker.fetch(userReq(offSample),offEnv)).status===503&&offRun===0&&ATLA_AI.endpoint==='';
result.status=failed?'INCOMPLETE_OR_FAILED_SCOPE':'SCOPED_SCREENING_COMPLETE_REQUIRES_PRIMARY_SOURCE_REVIEW';
save();console.log('ATLA_CROSS_DOMAIN_SUMMARY',result.status,'MODEL_CALLS',result.liveCallCount,'ATLA_OFF',result.productionOffCheckedAfter);
if(!result.productionOffCheckedAfter)process.exitCode=2;
else if(failed)process.exitCode=1;
