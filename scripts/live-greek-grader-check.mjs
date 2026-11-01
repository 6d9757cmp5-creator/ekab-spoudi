/**
 * LIVE test against the SAME Cloudflare Gemma Workers AI model and grading
 * Worker logic used by EKAB Spoudi. Not a medical certification study.
 * Synthetic learner responses only; no patient, account, or learner data.
 * Require confirmed Workers Free plan to prevent accidental paid usage.
 */
import {mkdirSync,writeFileSync} from 'node:fs';
import grader from '../workers/answer-grader/src/index.js';

const MODEL='@cf/google/gemma-4-26b-a4b-it';
const ACCOUNT=process.env.CLOUDFLARE_ACCOUNT_ID||'';
const TOKEN=process.env.CLOUDFLARE_API_TOKEN||'';
const FREE=process.env.CLOUDFLARE_FREE_PLAN_CONFIRMED==='true';
const report={checkedAt:new Date().toISOString(),model:MODEL,liveModelCalls:0,
  cases:[],status:'not_started',notes:'Synthetic Greek answers only, using actual server-side Worker implementation'};
const exit=async(code,status,detail)=>{
 report.status=status;report.detail=detail;
 mkdirSync('audit-results',{recursive:true});
 writeFileSync('audit-results/live-greek-grader-check.json',JSON.stringify(report,null,2)+'\n');
 console.log('LIVE_GRADING_STATUS:',status,detail);
 process.exitCode=code;
};
if(!TOKEN||!ACCOUNT){
 await exit(2,'blocked_missing_credentials','Cloudflare account ID or API token not available in GitHub secrets; no model calls made');
}else if(!FREE){
 await exit(2,'blocked_free_plan_unverified','CLOUDFLARE_FREE_PLAN_CONFIRMED not set to true; no chargeable calls made');
}else if(!/^[a-f0-9]{32}$/i.test(ACCOUNT)){
 await exit(2,'blocked_invalid_account_id','Configured account ID is invalid; no model calls made');
}else{
 const realFetch=globalThis.fetch;
 const apiUrl=`https://api.cloudflare.com/client/v4/accounts/${ACCOUNT}/ai/run/${MODEL}`;
 // In this isolated bench, fake ONLY Appwrite authentication. Do not access a
 // real user account. All requests to Gemma are genuine remote Cloudflare calls.
 globalThis.fetch=async(url,opts)=>{
  if(String(url).startsWith('https://fra.cloud.appwrite.io/v1/account'))
   return new Response(JSON.stringify({$id:'anonymous-synthetic-benchmark'}),{
    status:200,headers:{'content-type':'application/json'}});
  return realFetch(url,opts);
 };
 const cases=[
  {id:'nasal-colloquial-incomplete',expected:['partial'],input:{
   section:'eoppep',questionId:'EOP-A-001',
   answer:'η μυτη ζεστενει το αερα κ τον καθαριζει και τον υγραινει'}},
  {id:'nasal-complete-with-errors',expected:['correct'],input:{
   section:'eoppep',questionId:'EOP-A-001',
   answer:'Ο αερας απτη μυτη καθαριζετε απ τη βλεννα κ τους κροσσους, ζεσταινεται κ υγραινετε. Εκει γινεται κ η οσφρηση δηλαδη μυριζουμε.'}},
  {id:'nasal-contradictory-negation',expected:['uncertain','incorrect'],input:{
   section:'eoppep',questionId:'EOP-A-001',
   answer:'Καθαρίζει με βλέννη και κροσσούς, θερμαίνει, αλλά δεν υγραίνει τον αέρα. Βοηθά στην όσφρηση.'}},
  {id:'alveoli-natural-Greek-correct',expected:['correct'],input:{
   section:'eoppep',questionId:'EOP-A-003',
   answer:'Το οξυγονο παει απ τις κυψελιδες στο αιμα και το διοξειδιο απ το αιμα στις κυψελιδες. Περνανε μεσω της αναπνευστικης μεμβρανης επειδη διαφερουν οι μερικες πιεσεις.'}},
  {id:'alveoli-incomplete',expected:['partial','uncertain'],input:{
   section:'eoppep',questionId:'EOP-A-003',
   answer:'Το οξυγόνο φεύγει από τις κυψελίδες και μπαίνει στο αίμα.'}}
 ];
 for(let i=0;i<cases.length;i++){
  const item=cases[i];
  let response=null;
  try{
   const request=new Request('https://ekab-spoudi-answer-grader.6d9757cmp5.workers.dev/',{
    method:'POST',headers:{Origin:'https://6d9757cmp5-creator.github.io',
     'Content-Type':'application/json','X-Appwrite-JWT':'synthetic-fixture-token'},
    body:JSON.stringify(item.input)});
   response=await grader.fetch(request,{
    APPWRITE_PROJECT_ID:'6ade83ec00260198ae34',
    APPWRITE_ENDPOINT:'https://fra.cloud.appwrite.io/v1',
    AI:{run:async(model,payload)=>{
     if(model!==MODEL)throw Error('Unexpected model ID');
     report.liveModelCalls++;
     const res=await realFetch(apiUrl,{
      method:'POST',
      headers:{Authorization:'Bearer '+TOKEN,'Content-Type':'application/json'},
      body:JSON.stringify({...payload,options:{rejectIfBusy:true}}),
      signal:AbortSignal.timeout(20000)
     });
     const result=await res.json().catch(()=>({success:false,errors:[]}));
     if(!res.ok||result.success===false)
      throw Error('Cloudflare API error '+res.status+(result.errors?.[0]?.code?':'+result.errors[0].code:''));
     return result.result;
    }}
   });
   const result=await response.json();
   const got=result.verdict||null;
   const pass=response.status===200&&item.expected.includes(got);
   report.cases.push({id:item.id,questionId:item.input.questionId,
    expected:item.expected,actual:got,httpStatus:response.status,
    pass,explanation:typeof result.explanation==='string'?result.explanation.slice(0,600):null,
    errorCode:result.code||null});
   console.log('LIVE_CASE',item.id,'expected',item.expected.join('/'),
    'actual',got||'NO_VERDICT','HTTP',response.status,pass?'PASS':'FAIL');
   // Stop on unavailable provider; no additional quota consumed.
   if(!got){report.status='provider_unavailable';break;}
  }catch(e){
   report.cases.push({id:item.id,pass:false,error:'Live transport or model request failed: '+String(e?.message||e).slice(0,170)});
   report.status='provider_unavailable';break;
  }
 }
 const passCount=report.cases.filter(x=>x.pass).length;
 const allCasesRan=report.cases.length===cases.length;
 if(report.status!=='provider_unavailable')report.status=allCasesRan&&passCount===cases.length?'passed':'failed_expectations';
 report.passCount=passCount;report.totalCount=cases.length;
 report.detail=report.status==='passed'?'Limited online smoke test passed, not clinical validation':report.status==='provider_unavailable'?'Live model unavailable, no positive claim':'Some live judgments disagreed with expected examples';
 mkdirSync('audit-results',{recursive:true});
 writeFileSync('audit-results/live-greek-grader-check.json',JSON.stringify(report,null,2)+'\n');
 console.log('LIVE_GRADING_SUMMARY:',report.status,`${passCount}/${cases.length}`,
  'REAL_MODEL_CALLS',report.liveModelCalls);
 if(report.status!=='passed')process.exitCode=1;
}
