import test from 'node:test';
import assert from 'node:assert/strict';
import {audit,enforce,EVIDENCE_GATES,titleScopeFlags} from './scientific-qa.mjs';
const at='2026-11-02T09:28:46.857Z';
const paper={id:'pubmed-12345678',pmid:'12345678',title:'Prehospital trauma review',
 journal:'Journal',published_at:'2026 Nov 01',publication_types:['Systematic Review'],
 topic_ids:['prehospital'],source_url:'https://pubmed.ncbi.nlm.nih.gov/12345678/',
 status:'pending-review',source_quality:'unassessed',independent_review:'required',
 clinical_approval:false,atla_ai_retrieval_enabled:false,content_imported:false};
const source={url:'https://www.who.int/a',ok:true,clinical_approval:false,knowledge_ingestion_enabled:false};
const fixture=()=>({pending:{schema_version:1,checked_at:at,items:[{...paper}]},
 metadata:{schema_version:1,checked_at:at,monitored_urls:1,monitored_ok:1,pending_papers:1,pubmed_topics_checked:10,pubmed_failures:[],full_texts_imported:0,model_training_performed:false,clinical_retrieval_updated:false},
 health:{schema_version:1,checked_at:at,sources:[{...source}]}});
test('systematic-review indexing NEVER yields clinical certification',()=>{
 const a=audit(fixture());
 assert.equal(a.technical_research_gate,'PASS');
 assert.equal(a.scientific_approval,'NOT_GRANTED');
 assert.equal(a.clinical_publication_allowed,false);
 assert.equal(a.independent_accreditation,false);
 assert.equal(EVIDENCE_GATES.length,8);
 assert.ok(EVIDENCE_GATES.includes('second-independent-AI-source-crosscheck-with-verifiable-evidence'));
 assert.equal(a.mandatory_evidence_checks_pending,EVIDENCE_GATES);
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
test('title-only hints are NOT a full-text evidence appraisal',()=>{
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

test('a PMID DOI is an identifier, not proof; malformed/duplicate DOI metadata fails',()=>{
 const input=fixture();
 input.pending.items[0].doi='NOT-A-DOI';
 assert.throws(()=>enforce(audit(input)),/invalid-bibliographic-doi/);
 const another=fixture();
 another.pending.items[0].doi='10.1007/example';
 another.pending.items.push({...paper,id:'pubmed-87654321',pmid:'87654321',
  source_url:'https://pubmed.ncbi.nlm.nih.gov/87654321/',doi:'10.1007/example'});
 another.metadata.pending_papers=2;
 assert.throws(()=>enforce(audit(another)),/duplicate-bibliographic-doi/);
});
test('scientific meta-audit never claims verified treatment evidence',()=>{
 const input=fixture();input.pending.items[0].doi='10.1234/valid-identifier';
 const result=audit(input);
 assert.equal(result.technical_research_gate,'PASS');
 assert.equal(result.evidence_appraisal,'NOT_PERFORMED_FROM_BIBLIOGRAPHIC_METADATA');
 assert.equal(result.confirmed_clinical_claims,0);
 assert.equal(result.inspected_indexed_records,1);
 assert.equal(enforce(result),true);
});
test('incomplete PubMed scan, fake imported content or uncategorized topic is unsafe',()=>{
 for(const change of [
  s=>{s.metadata.pubmed_failures=Array.from({length:10},(_,i)=>({topic_id:String(i)}));},
  s=>{s.metadata.full_texts_imported=1;},
  s=>{s.metadata.pending_papers=20;},
  s=>{s.pending.items[0].topic_ids=['made-up-topic'];}
 ]){
  const s=fixture();change(s);
  assert.throws(()=>enforce(audit(s)),/research-safety-QA-failed/);
 }
});
