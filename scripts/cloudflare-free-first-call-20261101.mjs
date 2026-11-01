/**
 * One-off Gemma Free-tier availability probe for 2026-11-01.
 * User confirmed Workers Free. Exactly one request, tiny synthetic input.
 * No learner data, no deployment, no retries, no provider fallback.
 * This is NOT a medical-grade evaluation or account-plan verification.
 */
import {mkdirSync,writeFileSync} from 'node:fs';
const token=process.env.CLOUDFLARE_API_TOKEN||'';
const account=process.env.CLOUDFLARE_ACCOUNT_ID||'';
const model='@cf/google/gemma-4-26b-a4b-it';
const report={date:'2026-11-01',model,scope:'single synthetic Free-model availability smoke test',
 userAttestedWorkersFree:true,accountPlanIndependentlyVerified:false,
 modelCalls:0,result:'not_started',httpStatus:null,providerErrorCode:null,
 paidModelRequested:false,noRetries:true,realLearnerDataSent:false,
 clinicalAccuracyVerified:false,deploymentPerformed:false};
function save(){
 mkdirSync('audit-results',{recursive:true});
 writeFileSync('audit-results/cloudflare-free-first-call-20261101.json',JSON.stringify(report,null,2)+'\n');
 console.log('CLOUDFLARE_ONE_SHOT',report.result,'http',report.httpStatus??'N/A',
  'model_calls',report.modelCalls,'no_deployment');
}
if(!token||!/^[a-f0-9]{32}$/i.test(account)){
 report.result='blocked_missing_or_invalid_credentials';save();
}else{
 try{
  const res=await fetch('https://api.cloudflare.com/client/v4/accounts/'+account+'/ai/run/'+model,{
   method:'POST',headers:{'Authorization':'Bearer '+token,'Content-Type':'application/json'},
   body:JSON.stringify({messages:[
    {role:'system',content:'Respond in Greek with the word Εντάξει only.'},
    {role:'user',content:'Συνθετική δοκιμή σύνδεσης. Γράψε Εντάξει.'}
   ],temperature:0,max_tokens:60,chat_template_kwargs:{enable_thinking:false}}),
   signal:AbortSignal.timeout(20000)
  });
  report.modelCalls=1;report.httpStatus=res.status;
  const data=await res.json().catch(()=>null);
  const code=data?.errors?.[0]?.code;
  if(typeof code==='number'||typeof code==='string')report.providerErrorCode=String(code).slice(0,12);
  report.result=res.ok&&data?.success!==false?'reachable_model_response':'provider_error';
 }catch(e){
  report.result='transport_error';report.transportErrorType=String(e?.name||'Error').slice(0,35);
 }
 save();
}
