import test from 'node:test';
import assert from 'node:assert/strict';
import {audit,enforce,MANUAL_GATES,titleScopeFlags} from './scientific-qa.mjs';
const at='2026-11-02T09:28:46.857Z';
const paper={id:'pubmed-12345678',pmid:'12345678',title:'Prehospital trauma review',
 journal:'Journal',published_at:'2026 Nov 01',publication_types:['Systematic Review'],
 topic_ids:['prehospital'],source_url:'https://pubmed.ncbi.nlm.nih.gov/12345678/',
 status:'pending-review',source_quality:'unassessed',independent_review:'required',
 clinical_approval:false,atla_ai_retrieval_enabled:false,content_imported:false};
const source={url:'https://www.who.int/a',ok:true,clinical_approval:false,knowledge_ingestion_enabled:false};
const fixture=()=>({pending:{schema_version:1,checked_at:at,items:[{...paper}]},
 metadata:{schema_version:1,checked_at:at,monitored_urls:1,monitored_ok:1},
 health:{schema_version:1,checked_at:at,sources:[{...source}]}});
test('systematic-review indexing NEVER yields clinical certification',()=>{
 const a=audit(fixture());
 assert.equal(a.technical_research_gate,'PASS');
 assert.equal(a.scientific_approval,'NOT_GRANTED');
 assert.equal(a.clinical_publication_allowed,false);
 assert.equal(a.independent_accreditation,false);
 assert.equal(MANUAL_GATES.length,8);
 assert.equal(enforce(a),true);
});
test('reject forged clinical, imported or academically approved bibliography',()=>{
 for(const changed of [
  {clinical_approval:true},{atla_ai_retrieval_enabled:true},{content_imported:true},
  {source_quality:'high'},{independent_review:'completed'},
  {publication_types:['Retracted Publication','Systematic Review']},
  {id:'pubmed-00000000'}
 ]){
  const x=fixture(); Object.assign(x.pending.items[0],changed);
  assert.throws(()=>enforce(audit(x)),/research-safety-QA-failed/);
 }
});
test('reject duplicate, contradictory scan or unsafe publisher approval',()=>{
 const x=fixture();x.pending.items.push({...paper});
 assert.throws(()=>enforce(audit(x)),/duplicate-pmid/);
 const y=fixture();y.metadata.monitored_ok=0;
 assert.throws(()=>enforce(audit(y)),/source-availability-counts-mismatch/);
 const z=fixture();z.health.sources[0].clinical_approval=true;
 assert.throws(()=>enforce(audit(z)),/source-autopublished-as-clinical/);
});
test('unavailable sources stay unverified; no invented approval',()=>{
 const x=fixture();x.health.sources[0].ok=false;x.metadata.monitored_ok=0;
 const a=audit(x);
 assert.equal(a.technical_research_gate,'PASS');
 assert.ok(a.warnings.includes('some-publisher-probes-unverified'));
 assert.equal(a.clinical_publication_allowed,false);
});
test('title-only hints are NOT a human evidence appraisal',()=>{
 assert.ok(titleScopeFlags('Anxiety in patients with cancer and emergency department use').includes('prehospital-transferability-review'));
 assert.ok(titleScopeFlags('Economic evaluation in hospital care').includes('SAEK-learning-objective-review'));
 assert.equal(titleScopeFlags('Prehospital trauma review').length,0);
});
test('reject fake downstream clinical approval',()=>{
 const x=fixture();x.review={stage:'research-only-awaiting-independent-review',
  clinical_knowledge_imported:0,existing_curriculum_changed:false,
  items:[{status:'pending-independent-scientific-review',clinical_approval:true,
   learner_visible:false,atla_ai_retrieval_enabled:false}]};
 assert.throws(()=>enforce(audit(x)),/unsafe-ai-research-queue/);
});
