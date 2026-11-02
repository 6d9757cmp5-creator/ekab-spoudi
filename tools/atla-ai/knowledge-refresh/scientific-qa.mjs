#!/usr/bin/env node
/** Independent-style scientific QA of research staging, NEVER clinical certification. */
import {readFile} from 'node:fs/promises';
import {dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {screenPubMedArticle} from './source-policy.mjs';
const ROOT=resolve(dirname(fileURLToPath(import.meta.url)),'queue');
const isISO=s=>typeof s==='string'&&!Number.isNaN(Date.parse(s))&&new Date(s).toISOString()===s;
export function titleScopeFlags(title){
 const t=String(title||'');
 return [
  ...(/\b(emergency department|in-hospital|hospitalization|cancer|oncolog)\b/i.test(t)?['prehospital-transferability-review']:[]),
  ...(/\b(economic|cost|financial|utilization|aviation|flight-based)\b/i.test(t)?['SAEK-learning-objective-review']:[])
 ];
}
export const MANUAL_GATES=Object.freeze([
 'full-text-and-methods-read-by-qualified-reviewer',
 'risk-of-bias-reviewed-using-appropriate-tool',
 'GRADE-certainty-assessed-for-each-clinical-outcome',
 'linked-retractions-and-expressions-of-concern-rechecked',
 'funding-and-conflicts-of-interest-assessed',
 'per-work-copyright-and-permissions-verified',
 'SAEK-learning-goals-and-Greek-EMS-scope-mapped',
 'second-independent-qualified-medical-reviewer-signoff'
]);
export function audit({pending,metadata,health,review=null}){
 const critical=[],warnings=[];
 const items=pending?.items;
 if(!Array.isArray(items)||pending?.schema_version!==1)
  critical.push('pending-bibliography-unavailable');
 if(!metadata||metadata.schema_version!==1||!isISO(metadata.checked_at))
  critical.push('invalid-scanner-metadata');
 if(!health||health.schema_version!==1||!Array.isArray(health.sources))
  critical.push('invalid-source-health');
 if(pending?.checked_at!==metadata?.checked_at||health?.checked_at!==metadata?.checked_at)
  critical.push('mixed-evidence-snapshots');
 if(Array.isArray(items)){
  const ids=new Set();
  for(const p of items){
   const id=String(p?.pmid||'');
   if(ids.has(id))critical.push('duplicate-pmid:'+id);
   ids.add(id);
   if(!screenPubMedArticle(p).accepted||p.id!=='pubmed-'+id||
     p.source_url!=='https://pubmed.ncbi.nlm.nih.gov/'+id+'/'||
     p.status!=='pending-review'||p.clinical_approval!==false||
     p.atla_ai_retrieval_enabled!==false||p.content_imported!==false)
     critical.push('unsafe-bibliography-record:'+id);
   if(p.source_quality!=='unassessed'||p.independent_review!=='required')
     critical.push('unassessed-evidence-marked-approved:'+id);
   if(!Array.isArray(p.topic_ids)||!p.topic_ids.length)
     critical.push('uncategorized-study:'+id);
  }
 }
 if(Array.isArray(health?.sources)){
  const reachable=health.sources.filter(x=>x.ok===true).length;
  if(health.sources.length!==metadata?.monitored_urls||
     reachable!==metadata?.monitored_ok)critical.push('source-availability-counts-mismatch');
  if(health.sources.some(x=>x.clinical_approval!==false||x.knowledge_ingestion_enabled!==false))
   critical.push('source-autopublished-as-clinical');
  if(reachable<health.sources.length)warnings.push('some-publisher-probes-unverified');
 }
 if(review){
  if(review.stage!=='research-only-awaiting-independent-review'||
    review.clinical_knowledge_imported!==0||review.existing_curriculum_changed!==false||
    !Array.isArray(review.items)||review.items.some(x=>
      x.clinical_approval!==false||x.learner_visible!==false||
      x.atla_ai_retrieval_enabled!==false||x.status!=='pending-independent-scientific-review'))
    critical.push('unsafe-ai-research-queue');
 }else warnings.push('ai-research-review-not-yet-staged-on-current-branch');
 return {
  schema_version:1,
  audit_scope:'research-intake-only; no full-text clinical review',
  technical_research_gate:critical.length?'FAIL':'PASS',
  scientific_approval:'NOT_GRANTED',
  clinical_publication_allowed:false,
  independent_accreditation:false,
  publication_count:Array.isArray(items)?items.length:0,
  title_only_scope_hints:Array.isArray(items)?items.flatMap(x=>
   titleScopeFlags(x.title).length?[{pmid:String(x.pmid),flags:titleScopeFlags(x.title)}]:[]):[],
  mandatory_human_reviews_pending:MANUAL_GATES,
  critical,warnings
 };
}
export function enforce(a){
 if(a.critical.length||a.technical_research_gate!=='PASS')
  throw Error('research-safety-QA-failed:'+a.critical.join(','));
 if(a.scientific_approval!=='NOT_GRANTED'||a.clinical_publication_allowed!==false||
  a.independent_accreditation!==false)throw Error('invalid-clinical-certification');
 return true;
}
async function json(name){
 try{return JSON.parse(await readFile(resolve(ROOT,name),'utf8'));}
 catch(e){if(e.code==='ENOENT')return null;throw e;}
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const [pending,metadata,health,review]=await Promise.all([
  json('pending-pubmed.json'),json('last-scan.json'),
  json('source-health.json'),json('ai-research-review.json')
 ]);
 const result=audit({pending,metadata,health,review});
 console.log(JSON.stringify(result,null,2));
 enforce(result);
}
