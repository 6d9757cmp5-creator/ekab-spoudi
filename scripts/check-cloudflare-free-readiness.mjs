/**
 * Offline-only, non-billing readiness gate for Cloudflare Workers AI.
 * Does NOT deploy, authenticate, call AI, verify the account plan or inspect secrets.
 */
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
const read=p=>readFileSync(new URL(p,import.meta.url),'utf8');
const config=JSON.parse(read('../workers/answer-grader/wrangler.jsonc'));
const worker=read('../workers/answer-grader/src/index.js');
const client=read('../ai-grading-client.js');
const workflow=read('../.github/workflows/deploy-answer-grader-worker.yml');
const model='@cf/google/gemma-4-26b-a4b-it';
const checks={
 modelFreeEligibleByCloudflareDocs:worker.includes("model:'"+model+"'"),
 aiBindingConfigured:config.ai?.binding==='AI',
 workerPublicAddressConfigured:config.workers_dev===true,
 usesAppwriteJwtVerification:worker.includes("'/account'")&&worker.includes("'X-Appwrite-JWT':jwt"),
 onlyExpectedBrowserOrigin:worker.includes("const ALLOWED_ORIGIN='https://6d9757cmp5-creator.github.io'"),
 noImplicitPaidModelFallback:!worker.includes("OPENAI_API_KEY")&&!worker.includes("OPENAI_MODEL"),
 limitsPerUser:worker.includes('const LIMIT=15')&&worker.includes('if(limited(user))'),
 clientRequiresSignedInUser:client.includes('createJWT()'),
 noAutomaticProductionDeployment:/workflow_dispatch:\s*\n/.test(workflow)&&!/^\s+push:\s*$/m.test(workflow),
 deploymentRequiresManualAcademicAttestation:workflow.includes('reference_review_confirmed'),
 deploymentRequiresManualFreePlanAttestation:workflow.includes('free_plan_confirmed')
};
const report={
 generatedAt:new Date().toISOString(),
 scope:'Repository static checks, no Cloudflare API calls and no AI inferences',
 checkedModel:model,workerName:config.name,
 staticChecks:checks,
 staticReady:Object.values(checks).every(Boolean),
 cloudflareAccountFreePlanVerifiedByApi:false,
 currentCloudflareAccountQuotaVerified:false,
 githubDeploymentCredentialsVerified:false,
 liveWorkerDeploymentVerified:false,
 medicalEducationReviewCompleted:false,
 safeToAutodeploy:false,
 nextAction:'Confirm true account plan and deployment token permissions, independently review grading criteria, then manually dispatch the guarded Free-only workflow.'
};
mkdirSync('audit-results',{recursive:true});
writeFileSync('audit-results/cloudflare-free-readiness.json',JSON.stringify(report,null,2)+'\n');
console.log('CLOUDFLARE_FREE_READINESS static_checks='+Object.values(checks).filter(Boolean).length+'/'+Object.keys(checks).length,
 'free_account_unverified','no_ai_calls','no_deployment');
for(const [name,ok] of Object.entries(checks))if(!ok)console.log('STATIC_CHECK_FAILED',name);
if(!report.staticReady)process.exitCode=1;
