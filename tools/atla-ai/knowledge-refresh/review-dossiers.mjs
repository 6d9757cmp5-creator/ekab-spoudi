#!/usr/bin/env node
/**
 * ATLA: build an inspectable, read-only scientific review dossier for EACH
 * PubMed candidate. No AI, no re-use of clinical guidance, no clinical approval.
 * A qualified reviewer must read licensed full text and record verifiable evidence.
 *
 * IMPORTANT: Even a filled dossier is NOT a publishing authorization. The
 * learner-facing medical release requires a separate authenticated human process.
 */
import {readFile} from 'node:fs/promises';
import {dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {screenPubMedArticle} from './source-policy.mjs';
import {titleScopeFlags,MANUAL_GATES} from './scientific-qa.mjs';

const ROOT=resolve(dirname(fileURLToPath(import.meta.url)),'queue');
const no=x=>x==null||x==='';
export function reviewTemplate(record){
 const pmid=String(record?.pmid||'');
 if(!screenPubMedArticle(record).accepted ||
    !/^\d{1,10}$/.test(pmid) ||
    record.status!=='pending-review' ||
    record.clinical_approval!==false ||
    record.atla_ai_retrieval_enabled!==false ||
    record.content_imported!==false ||
    record.source_url!=='https://pubmed.ncbi.nlm.nih.gov/'+pmid+'/')
  throw Error('invalid-research-source:'+pmid);
 return {
  pmid,title:record.title,journal:record.journal,
  doi:record.doi||null,source_url:record.source_url,
  detected_at:record.first_detected||null,
  topic_ids:Array.isArray(record.topic_ids)?record.topic_ids:[],
  title_only_scope_flags:titleScopeFlags(record.title),
  status:'awaiting-qualified-independent-review',
  // Never supply imaginary observations or evidence grades.
  full_text_checked_at:null,full_text_permitted_use:null,
  study_question_pico:null,review_method:null,
  amstar2_or_suitable_risk_of_bias_assessment:null,
  grades_by_clinical_outcome:[],
  retraction_and_expression_of_concern_checked_at:null,
  conflict_of_interest_and_funding_review:null,
  greek_scope_of_practice_source:null,
  greek_saeK_learning_objective:null,
  reviewer_one:{verified_identity:null,qualifications:null,reviewed_at:null,assessment:null},
  reviewer_two:{verified_identity:null,qualifications:null,reviewed_at:null,assessment:null},
  disagreement_resolution:null,clinical_advice:null,
  clinical_approval:false,learner_visible:false,atla_ai_retrieval_enabled:false,
  notes:'Review-only template. AI title screening is not evidence appraisal.'
 };
}
export function buildDossiers(snapshot){
 const items=snapshot?.items;
 if(snapshot?.schema_version!==1||!Array.isArray(items)||items.length>100||
    typeof snapshot.checked_at!=='string'||!Number.isFinite(Date.parse(snapshot.checked_at)))
  throw Error('invalid-pubmed-review-snapshot');
 const used=new Set();
 const dossiers=items.map(item=>{
  const entry=reviewTemplate(item);
  if(used.has(entry.pmid))throw Error('duplicate-review-identity:'+entry.pmid);
  used.add(entry.pmid);
  return entry;
 });
 return {
  schema_version:1,
  source_snapshot_at:snapshot.checked_at,
  stage:'RESEARCH_ONLY_ALL_CLINICAL_REVIEWS_PENDING',
  generated_for:'qualified-independent-clinical-reviewers',
  dossier_count:dossiers.length,
  clinical_publications:0,clinical_approval:false,learner_visible:false,
  all_reviewers_unassigned:true,all_studies_unappraised:true,
  required_evidence_gates:[...MANUAL_GATES],
  dossiers
 };
}
export function verifyDossiers(report,snapshot){
 if(!report||!Array.isArray(report.dossiers)||!Array.isArray(snapshot?.items)||
    report.schema_version!==1||report.stage!=='RESEARCH_ONLY_ALL_CLINICAL_REVIEWS_PENDING'||
    report.source_snapshot_at!==snapshot.checked_at||
    report.dossier_count!==snapshot.items.length||
    report.dossiers.length!==report.dossier_count||
    report.clinical_publications!==0||report.clinical_approval!==false||
    report.learner_visible!==false||report.all_reviewers_unassigned!==true||
    report.all_studies_unappraised!==true)throw Error('unsafe-dossier-report');
 const pmids=new Set();
 for(let i=0;i<report.dossiers.length;i++){
  const d=report.dossiers[i],source=snapshot.items[i];
  if(pmids.has(d.pmid)||d.pmid!==String(source.pmid)||
     d.source_url!==source.source_url||d.title!==source.title||
     d.status!=='awaiting-qualified-independent-review'||
     d.clinical_approval!==false||d.learner_visible!==false||
     d.atla_ai_retrieval_enabled!==false||!no(d.clinical_advice)||
     !no(d.full_text_checked_at)||!no(d.review_method)||
     !no(d.amstar2_or_suitable_risk_of_bias_assessment)||
     !no(d.greek_scope_of_practice_source)||
     !no(d.retraction_and_expression_of_concern_checked_at)||
     !no(d.full_text_permitted_use)||
     !Array.isArray(d.grades_by_clinical_outcome)||d.grades_by_clinical_outcome.length!==0||
     !no(d.reviewer_one?.verified_identity)||!no(d.reviewer_two?.verified_identity))
   throw Error('forged-reviewed-or-misattributed-study:'+d.pmid);
  pmids.add(d.pmid);
 }
 return true;
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const snapshot=JSON.parse(await readFile(resolve(ROOT,'pending-pubmed.json'),'utf8'));
 const dossier=buildDossiers(snapshot);
 verifyDossiers(dossier,snapshot);
 // stdout is the ONLY output. No files and no AI endpoint are ever touched.
 console.log(JSON.stringify(dossier,null,2));
}
