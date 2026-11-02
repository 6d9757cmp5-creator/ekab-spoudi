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


test('entire PubMed outage blocks the new review queue, even if source HEAD checks succeeded',async()=>{
 const scanner=async ({write})=>{
  assert.equal(write,false,'scanner must stage results without writing');
  return {metadata:{monitored_urls:3,pubmed_topics_checked:10,
   pubmed_failures:Array.from({length:10},(_,i)=>({topic_id:String(i),reason:'503'}))},
   pending:{items:[paper]},health:{sources:[]}};
 };
 await assert.rejects(
  run({scanner,env:{},fetcher:async()=>{throw Error('must not fetch');},write:false}),
  /pubmed-total-outage-refuse-queue-update/
 );
});
test('partial PubMed failures preserve pending research with no paid AI or write',async()=>{
 let scanWriteValue=null,paidRequests=0;
 const scanner=async ({write})=>{
  scanWriteValue=write;
  return {metadata:{monitored_urls:3,monitored_ok:1,pubmed_topics_checked:10,
    pubmed_failures:[{topic_id:'trauma',reason:'503'}],newly_discovered_papers:1},
   pending:{items:[paper]},health:{sources:[]}};
 };
 const fetcher=async url=>{
  if(String(url).includes('api.anthropic.com'))paidRequests++;
  return {ok:true,text:async()=>'<PubmedArticle><MedlineCitation><PMID>12345678</PMID><Article><Abstract><AbstractText>'+abstract+'</AbstractText></Abstract></Article></MedlineCitation></PubmedArticle>'};
 };
 const r=await run({scanner,fetcher,write:false,env:{ATLA_RESEARCH_AI_ENABLED:'true'}});
 assert.equal(scanWriteValue,false);
 assert.equal(paidRequests,0);
 assert.equal(r.source_discovery.pubmed_topics_failed,1);
 assert.equal(r.ai_configured,false);
 assert.equal(r.items[0].learner_visible,false);
});
test('empty watchlist and malformed metadata refuse updates',async()=>{
 const make=(metadata)=>async()=>({metadata,pending:{items:[]},health:{sources:[]}});
 await assert.rejects(run({scanner:make({monitored_urls:0,pubmed_topics_checked:10,pubmed_failures:[]}),
  write:false,env:{}}),/source-watchlist-empty/);
 await assert.rejects(run({scanner:make({monitored_urls:4,pubmed_failures:[]}),
  write:false,env:{}}),/scanner-metadata-incomplete/);
});

test('nested AI research approval flags fail closed before publication',()=>{
 const safe={clinical_approval:false,atla_ai_retrieval_enabled:false,learner_visible:false,
  ai_assessment_unverified:true,independent_clinical_review:'required'};
 const item={status:'pending-independent-scientific-review',full_text_stored:false,
  clinical_approval:false,atla_ai_retrieval_enabled:false,learner_visible:false,assessment:safe};
 const report=assessment=>({schema_version:2,items:[{...item,assessment}]});
 assert.equal(validateOutput(report(safe)),true);
 for(const patch of [
  {learner_visible:true},{clinical_approval:'approved'},{atla_ai_retrieval_enabled:'yes'},
  {ai_assessment_unverified:false},{independent_clinical_review:'approved'}
 ]){
  assert.throws(()=>validateOutput(report({...safe,...patch})),/unsafe-research-publication/);
 }
 const {learner_visible,...missing}=safe;
 assert.throws(()=>validateOutput(report(missing)),/unsafe-research-publication/);
});
