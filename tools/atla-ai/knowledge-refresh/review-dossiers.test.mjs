import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {buildDossiers,verifyDossiers} from './review-dossiers.mjs';
const snapshot=()=>({
 schema_version:1,checked_at:'2026-11-02T09:28:46.857Z',
 items:[{id:'pubmed-12345678',pmid:'12345678',title:'Prehospital trauma systematic review',
  journal:'Research Journal',published_at:'2026 Nov 01',publication_types:['Systematic Review'],
  source_url:'https://pubmed.ncbi.nlm.nih.gov/12345678/',topic_ids:['trauma'],
  status:'pending-review',clinical_approval:false,
  atla_ai_retrieval_enabled:false,content_imported:false}]
});
test('create one review dossier for each pending PubMed record, no auto approval',()=>{
 const s=snapshot(),a=buildDossiers(s);
 assert.equal(a.dossier_count,s.items.length);
 assert.equal(a.clinical_approval,false);
 assert.equal(a.all_reviewers_unassigned,true);
 assert.equal(a.all_studies_unappraised,true);
 assert.equal(a.dossiers[0].reviewer_one.verified_identity,null);
 assert.equal(a.dossiers[0].grades_by_clinical_outcome.length,0);
 assert.equal(a.dossiers[0].clinical_advice,null);
 assert.equal(verifyDossiers(a,s),true);
});
test('never treat a synthetic signature or self-asserted review as valid approval',()=>{
 const s=snapshot();
 for(const change of [
  d=>d.reviewer_one.verified_identity='AI',
  d=>d.clinical_approval=true,
  d=>d.learner_visible=true,
  d=>d.atla_ai_retrieval_enabled=true,
  d=>d.grades_by_clinical_outcome.push({certainty:'high'}),
  d=>d.full_text_checked_at='2026-11-03T00:00:00Z',
  d=>d.clinical_advice='Use an invented clinical protocol'
 ]){
  const a=buildDossiers(s);change(a.dossiers[0]);
  assert.throws(()=>verifyDossiers(a,s),/forged-reviewed/);
 }
});
test('forged DOI, wrong PMID or duplicated identity cannot masquerade as a new paper',()=>{
 const s=snapshot();
 const a=buildDossiers(s);a.dossiers[0].pmid='99999999';
 assert.throws(()=>verifyDossiers(a,s),/forged-reviewed/);
 s.items.push({...s.items[0]});
 assert.throws(()=>buildDossiers(s),/duplicate-review-identity/);
});
test('reject papers already claiming clinical approval',()=>{
 const s=snapshot();s.items[0].clinical_approval=true;
 assert.throws(()=>buildDossiers(s),/invalid-research-source/);
});
test('real checked-in PubMed snapshot produces complete unpublished review workload',()=>{
 const p=JSON.parse(readFileSync(new URL('./queue/pending-pubmed.json',import.meta.url),'utf8'));
 const review=buildDossiers(p);
 assert.ok(review.dossier_count>0);
 assert.equal(review.dossier_count,p.items.length);
 assert.equal(verifyDossiers(review,p),true);
 assert.equal(review.dossiers.every(d=>d.status==='awaiting-qualified-independent-review'),true);
 assert.equal(review.dossiers.every(d=>d.clinical_approval===false),true);
 assert.equal(review.required_evidence_gates.length,8);
});
