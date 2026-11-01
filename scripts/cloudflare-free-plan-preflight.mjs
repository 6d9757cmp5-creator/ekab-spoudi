/** Cloudflare read-only subscription probe. Never logs credentials or account details. */
import {appendFileSync} from 'node:fs';
const account=process.env.CLOUDFLARE_ACCOUNT_ID||'';
const token=process.env.CLOUDFLARE_API_TOKEN||'';
if(!account||!token) {console.log('CLOUDFLARE_PLAN_PROBE missing_credential');process.exit(0);}
const endpoint=`https://api.cloudflare.com/client/v4/accounts/${account}/subscriptions`;
try{
 const r=await fetch(endpoint,{method:'GET',headers:{Authorization:'Bearer '+token,Accept:'application/json'},signal:AbortSignal.timeout(9000)});
 if(!r.ok){console.log('CLOUDFLARE_PLAN_PROBE unavailable_status_'+r.status);process.exit(0);}
 const result=await r.json();
 if(!result.success||!Array.isArray(result.result)){console.log('CLOUDFLARE_PLAN_PROBE response_not_verifiable');process.exit(0);}
 const subs=result.result;
 const workers=subs.filter(s=>/workers/i.test([s?.rate_plan?.public_name,s?.rate_plan?.id,s?.rate_plan?.scope,s?.name].join(' ')));
 const explicitlyFree=workers.length>0 && workers.every(s=>{
  const name=[s?.rate_plan?.id,s?.rate_plan?.public_name].join(' ').toLowerCase();
  return /free/.test(name)&&Number(s?.price||0)===0;
 });
 if(explicitlyFree){
  if(process.env.GITHUB_ENV)appendFileSync(process.env.GITHUB_ENV,'CLOUDFLARE_FREE_PLAN_CONFIRMED=true\n');
  console.log('CLOUDFLARE_PLAN_PROBE explicit_workers_free_plan_confirmed');
 }else console.log('CLOUDFLARE_PLAN_PROBE free_plan_not_proven_from_visible_subscriptions');
}catch(e){console.log('CLOUDFLARE_PLAN_PROBE read_only_check_unavailable');}
