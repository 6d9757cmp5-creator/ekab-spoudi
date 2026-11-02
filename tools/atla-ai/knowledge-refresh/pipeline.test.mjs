import test from 'node:test';
import assert from 'node:assert/strict';
import {extractAbstract,aiEnabled,normalizeAssessment,record,validateOutput,assessWithAi,run,getAbstract,extractMatchingAbstract} from './pipeline.mjs';
const paper={pmid:'12345678',title:'Prehospital systematic review',published_at:'2026 Nov 01',
 journal:'Reviewed Journal',publication_types:['Systematic Review'],topic_ids:['prehospital']};
const abstract='Evidence gathered in several studies with important limitations. '.repeat(3);
test('extract short abstract; no entire document',()=>{
 assert.equal(extractAbstract('<AbstractText Label="RESULTS">'+abstract+'</AbstractText>'),abstract.trim());
 assert.equal(extractAbstract('<FullText>private</FullText>'),'');
});
test('AI stays off unless cost settings and secret all verified',()=>{
 assert.equal(aiEnabled({ATLA_RESEARCH_AI_ENABLED:'true'}),false);
 assert.equal(aiEnabled({ATLA_RESEARCH_AI_ENABLED:'true',ATLA_RESEARCH_SPENDING_APPROVED:'true',
  ATLA_RESEARCH_ANTHROPIC_API_KEY:'short'}),false);
});
test('model output cannot self-authorize publication',()=>{
 const a=normalizeAssessment({relevance:'high',study_method:'review',research_note:'Abstract reports an association.',
   clinical_approval:true,learner_visible:true,atla_ai_retrieval_enabled:true});
 assert.equal(a.clinical_approval,false);assert.equal(a.learner_visible,false);
 assert.equal(a.atla_ai_retrieval_enabled,false);
});
test('ineligible items are excluded',()=>{
 assert.throws(()=>record({...paper,publication_types:['Editorial']},abstract,{status:'pending',assessment:null},'now'));
});
test('review queue stores digest, not abstract, and cannot go live',async()=>{
 const scanner=async()=>({pending:{items:[paper]}});
 const fetcher=async()=>({ok:true,text:async()=>'<PubmedArticle><MedlineCitation><PMID Version="1">12345678</PMID><Article><Abstract><AbstractText>'+abstract+'</AbstractText></Abstract></Article></MedlineCitation></PubmedArticle>'});
 const r=await run({scanner,fetcher,env:{},now:'2026-11-02T00:00:00Z',write:false});
 assert.equal(r.items.length,1);
 assert.equal(r.items[0].abstract_available,true);
 assert.equal(r.items[0].ai_status,'ai-disabled-awaiting-explicit-cost-approval');
 assert.equal(r.items[0].clinical_approval,false);
 assert.equal(r.items[0].atla_ai_retrieval_enabled,false);
 assert.equal(JSON.stringify(r).includes(abstract),false);
 assert.equal(validateOutput(r),true);
});
test('AI assessment remains unverified even if upstream claims success',async()=>{
 const env={ATLA_RESEARCH_AI_ENABLED:'true',ATLA_RESEARCH_SPENDING_APPROVED:'true',
  ATLA_RESEARCH_ANTHROPIC_API_KEY:'fake-test-key-12345'};
 const fetcher=async()=>({ok:true,json:async()=>({content:[{type:'text',text:JSON.stringify({
  relevance:'high',study_method:'meta-analysis',research_note:'Abstract reports a result.',
  clinical_approval:true})}]})});
 const r=await assessWithAi(paper,abstract,{env,fetcher});
 assert.equal(r.status,'ai-triage-pending-independent-review');
 assert.equal(r.assessment.clinical_approval,false);
});
test('network failures fail closed',async()=>{
 assert.equal(await getAbstract('12345678',async()=>{throw Error('offline')}),'');
 const r=await assessWithAi(paper,abstract,{env:{},fetcher:async()=>{throw Error('must not call')}});
 assert.match(r.status,/disabled/);
});
test('forged clinical approvals fail the final gate',()=>{
 assert.throws(()=>validateOutput({schema_version:2,items:[{status:'pending-independent-scientific-review',
  full_text_stored:false,clinical_approval:true,learner_visible:false,atla_ai_retrieval_enabled:false}]}));
});


test('PubMed identity cross-check blocks mismatched, duplicate and unstructured responses',()=>{
 const body=id=>'<PubmedArticle><MedlineCitation><PMID Version="1">'+id+'</PMID><Article><Abstract><AbstractText>'+abstract+'</AbstractText></Abstract></Article></MedlineCitation></PubmedArticle>';
 assert.equal(extractMatchingAbstract(body('12345678'),'12345678'),abstract.trim());
 assert.equal(extractMatchingAbstract(body('87654321'),'12345678'),'');
 assert.equal(extractMatchingAbstract(body('12345678')+body('12345678'),'12345678'),'');
 assert.equal(extractMatchingAbstract('<AbstractText>'+abstract+'</AbstractText>','12345678'),'');
});
test('PubMed retraction and expression-of-concern XML trigger fail closed',()=>{
 const first='<PubmedArticle><MedlineCitation><PMID>12345678</PMID><Article><Abstract><AbstractText>'+abstract+'</AbstractText></Abstract></Article></MedlineCitation>';
 const last='</PubmedArticle>';
 const relation='<CommentsCorrectionsList><CommentsCorrections RefType="RetractionIn"><RefSource>Retraction notice</RefSource></CommentsCorrections></CommentsCorrectionsList>';
 assert.equal(extractMatchingAbstract(first+relation+last,'12345678'),'');
 assert.equal(extractMatchingAbstract(first+relation.replace('RetractionIn','ExpressionOfConcernIn')+last,'12345678'),'');
 assert.equal(extractMatchingAbstract(first+'<PublicationType>Retracted Publication</PublicationType>'+last,'12345678'),'');
});
test('getAbstract checks live response PMID before using as evidence',async()=>{
 const wrong=async()=>({ok:true,text:async()=>'<PubmedArticle><MedlineCitation><PMID>99999999</PMID><Article><Abstract><AbstractText>'+abstract+'</AbstractText></Abstract></Article></MedlineCitation></PubmedArticle>'});
 assert.equal(await getAbstract('12345678',wrong),'');
 assert.equal(await getAbstract('not-a-pmid',wrong),'');
});
