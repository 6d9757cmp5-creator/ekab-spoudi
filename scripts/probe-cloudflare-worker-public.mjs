/** Read-only Worker reachability probe: GET only; cannot invoke AI or grade. */
import {mkdirSync,writeFileSync} from 'node:fs';
const url='https://ekab-spoudi-answer-grader.6d9757cmp5.workers.dev/';
const report={checkedAt:new Date().toISOString(),url,method:'GET',aiCalls:0,studentDataSent:false,
 status:'not_checked',httpStatus:null,
 note:'GET-only probe does not establish which Worker version is deployed or whether the AI binding works.'};
try{
 const response=await fetch(url,{method:'GET',headers:{Accept:'application/json'},signal:AbortSignal.timeout(10000),redirect:'error'});
 report.httpStatus=response.status;
 report.status=response.status===405?'worker_endpoint_reachable':response.status===404?'worker_not_found':
  response.status===403?'worker_forbidden':response.status===200?'unexpected_get_success_needs_review':
  'unexpected_http_status';
}catch(e){report.status='unreachable';report.reason=String(e?.name||'network_error').slice(0,40);}
mkdirSync('audit-results',{recursive:true});
writeFileSync('audit-results/cloudflare-worker-public-probe.json',JSON.stringify(report,null,2)+'\n');
console.log('CLOUDFLARE_WORKER_PUBLIC_PROBE',report.status,'HTTP',report.httpStatus??'N/A','no AI calls');
