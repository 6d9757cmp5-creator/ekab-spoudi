import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {extractAbstract,aiEnabled,normalizeAssessment,record,validateOutput,assessWithAi,run,getAbstract,extractMatchingAbstract,validateQueueFiles} from './pipeline.mjs';
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
 assert.equal(extractMatchingAbstract(first+relation.replace('RetractionIn','ExpressionOfConcernFor')+last,'12345678'),'');
 assert.equal(extractMatchingAbstract(first+relation.replace('RefType="RetractionIn"','Version="1" RefType="ExpressionOfConcernFor"')+last,'12345678'),'');
 assert.equal(extractMatchingAbstract(first+'<PublicationType>Retracted Publication</PublicationType>'+last,'12345678'),'');
});
test('PubMed OtherAbstract cannot masquerade as the primary indexed article abstract',()=>{
 const wrap=(body)=>'<PubmedArticle><MedlineCitation><PMID>12345678</PMID>'+body+'</MedlineCitation></PubmedArticle>';
 const other='<OtherAbstract Type="PlainLanguageSummary"><AbstractText>'+abstract+'</AbstractText></OtherAbstract>';
 assert.equal(extractMatchingAbstract(wrap('<Article><ArticleTitle>Study</ArticleTitle></Article>'+other),'12345678'),'');
 const primary='<Article PubModel="Electronic"><Abstract><AbstractText>'+abstract+'</AbstractText></Abstract></Article>';
 assert.equal(extractMatchingAbstract(wrap(primary+other),'12345678'),abstract.trim());
});

test('getAbstract checks live response PMID before using as evidence',async()=>{
 const wrong=async()=>({ok:true,text:async()=>'<PubmedArticle><MedlineCitation><PMID>99999999</PMID><Article><Abstract><AbstractText>'+abstract+'</AbstractText></Abstract></Article></MedlineCitation></PubmedArticle>'});
 assert.equal(await getAbstract('12345678',wrong),'');
 assert.equal(await getAbstract('not-a-pmid',wrong),'');
});


test('PubMed EFetch is paced below the unauthenticated NCBI request ceiling',async()=>{
 const calls=[];
 const fetcher=async()=>{
  calls.push(Date.now());
  return {ok:false,text:async()=>''};
 };
 await getAbstract('12345678',fetcher);
 await getAbstract('12345679',fetcher);
 assert.equal(calls.length,2);
 assert.ok(calls[1]-calls[0]>=380,'EFetch requests must be spaced by at least 380ms');
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
 const report=assessment=>({schema_version:2,stage:'research-only-awaiting-independent-review',
  source_discovery_completed:true,clinical_knowledge_imported:0,existing_curriculum_changed:false,
  items:[{...item,assessment}]});
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

test('top-level research report cannot claim clinical publication or curriculum changes',()=>{
 const safe={schema_version:2,stage:'research-only-awaiting-independent-review',
  source_discovery_completed:true,clinical_knowledge_imported:0,existing_curriculum_changed:false,items:[]};
 assert.equal(validateOutput(safe),true);
 for(const patch of [
  {stage:'published'},{stage:undefined},{source_discovery_completed:false},
  {clinical_knowledge_imported:1},{clinical_knowledge_imported:undefined},
  {existing_curriculum_changed:true},{existing_curriculum_changed:undefined}
 ])assert.throws(()=>validateOutput({...safe,...patch}),/unsafe-research-publication/);
});

test('scheduled queue commit cannot rebase unverified changes onto a moving main',()=>{
 const workflow=readFileSync(new URL('../../../.github/workflows/atla-ai-knowledge-acquisition.yml',import.meta.url),'utf8');
 assert.ok(workflow.includes('git add tools/atla-ai/knowledge-refresh/queue/last-scan.json'));
 for(const name of ['source-health.json','pending-pubmed.json','ai-research-review.json'])
  assert.ok(workflow.includes('tools/atla-ai/knowledge-refresh/queue/'+name));
 assert.ok(!workflow.split('\n').some(line=>line.trim()==='git add tools/atla-ai/knowledge-refresh/queue/'));
 assert.ok(workflow.includes('git push origin HEAD:main'));
 assert.ok(workflow.includes("github.event_name != 'pull_request' && github.ref == 'refs/heads/main'"));
 assert.doesNotMatch(workflow,/git pull --rebase/);
});


test('replacement scheduler rejects unsafe source, bibliography and scan queue documents',()=>{
 const scanTime='2026-11-02T02:15:00.000Z';
 const safe={
  report:{schema_version:2,generated_at:scanTime,stage:'research-only-awaiting-independent-review',
   source_discovery_completed:true,clinical_knowledge_imported:0,existing_curriculum_changed:false,
   source_discovery:{monitored_urls:1,monitored_ok:1,pubmed_topics_checked:10,
    pubmed_topics_failed:0,newly_discovered_papers:1},items:[]},
  metadata:{schema_version:1,checked_at:scanTime,monitored_urls:1,monitored_ok:1,pending_papers:1,
   newly_discovered_papers:1,pubmed_topics_checked:10,pubmed_failures:[],
   model_training_performed:false,clinical_retrieval_updated:false,full_texts_imported:0},
  health:{schema_version:1,checked_at:scanTime,sources:[{url:'https://www.who.int/guidelines',ok:true,
   clinical_approval:false,knowledge_ingestion_enabled:false}]},
  pending:{schema_version:1,checked_at:scanTime,items:[{...paper,status:'pending-review',
   content_imported:false,clinical_approval:false,atla_ai_retrieval_enabled:false}]}
 };
 const change=(part,patch)=>({...safe,[part]:{...safe[part],...patch}});
 assert.equal(validateQueueFiles(safe),true);
 for(const patch of [{clinical_retrieval_updated:true},{model_training_performed:true},
  {full_texts_imported:1},{monitored_urls:0},{pubmed_failures:Array(10).fill({reason:'503'})}])
  assert.throws(()=>validateQueueFiles(change('metadata',patch)),/unsafe-scan-metadata/);
 assert.throws(()=>validateQueueFiles(change('health',{sources:[{url:'https://evil.example',
  clinical_approval:false,knowledge_ingestion_enabled:false}]})),/unsafe-source-health/);
 assert.throws(()=>validateQueueFiles(change('health',{sources:[{url:'https://www.who.int',
  clinical_approval:true,knowledge_ingestion_enabled:false}]})),/unsafe-source-health/);
 for(const patch of [{clinical_approval:true},{content_imported:true},
  {atla_ai_retrieval_enabled:true},{status:'approved'}]){
  assert.throws(()=>validateQueueFiles(change('pending',{items:[{...safe.pending.items[0],...patch}]})),/unsafe-pending-queue/);
 }
 assert.throws(()=>validateQueueFiles(change('pending',{items:[{...safe.pending.items[0],
  publication_types:['Retracted Publication']}]})),/unsafe-pending-queue/);
});

test('scheduled workflow checks all four review-only files before staging',()=>{
 const workflow=readFileSync(new URL('../../../.github/workflows/atla-ai-knowledge-acquisition.yml',import.meta.url),'utf8');
 assert.match(workflow,/validateQueueFiles/);
 for(const file of ['ai-research-review.json','last-scan.json','source-health.json','pending-pubmed.json'])
  assert.ok(workflow.includes(file),file);
});

test('cross-file scan consistency rejects mixed or stale review-only evidence',()=>{
 const item={...paper,status:'pending-review',content_imported:false,
  clinical_approval:false,atla_ai_retrieval_enabled:false};
 const scanTime='2026-11-02T02:15:00.000Z';
 const base={
  report:{schema_version:2,generated_at:scanTime,stage:'research-only-awaiting-independent-review',
   source_discovery_completed:true,clinical_knowledge_imported:0,
   existing_curriculum_changed:false,items:[],
   source_discovery:{monitored_urls:1,monitored_ok:1,pubmed_topics_checked:10,
    pubmed_topics_failed:0,newly_discovered_papers:1}},
  metadata:{schema_version:1,checked_at:scanTime,monitored_urls:1,monitored_ok:1,pending_papers:1,
   newly_discovered_papers:1,pubmed_topics_checked:10,pubmed_failures:[],
   model_training_performed:false,clinical_retrieval_updated:false,full_texts_imported:0},
  health:{schema_version:1,checked_at:scanTime,sources:[{url:'https://www.who.int/guidelines',ok:true,
   clinical_approval:false,knowledge_ingestion_enabled:false}]},
  pending:{schema_version:1,checked_at:scanTime,items:[item]}
 };
 assert.equal(validateQueueFiles(base),true);
 const bad=[
  {...base,metadata:{...base.metadata,monitored_ok:0}},
  {...base,metadata:{...base.metadata,pending_papers:2}},
  {...base,report:{...base.report,source_discovery:{...base.report.source_discovery,pubmed_topics_failed:1}}},
  {...base,report:{...base.report,source_discovery:null}},
  {...base,report:{...base.report,items:[{id:'pubmed-99999999',pmid:'99999999',
   status:'pending-independent-scientific-review',full_text_stored:false,
   clinical_approval:false,atla_ai_retrieval_enabled:false,learner_visible:false,assessment:null}]}},
  {...base,pending:{...base.pending,items:[item,item]},metadata:{...base.metadata,pending_papers:2}},
  {...base,health:{...base.health,checked_at:'2026-11-01T02:15:00.000Z'}},
  {...base,pending:{...base.pending,checked_at:'2026-11-01T02:15:00.000Z'}},
  {...base,report:{...base.report,generated_at:'2026-11-01T02:15:00.000Z'}},
  {...base,metadata:{...base.metadata,checked_at:'not-a-date'}}
 ];
 for(const candidate of bad)
  assert.throws(()=>validateQueueFiles(candidate),/inconsistent-research-queue/);
});

test('report article identity and digest must match the pending bibliography',()=>{
 const scanTime='2026-11-02T02:15:00.000Z';
 const pendingItem={...paper,status:'pending-review',content_imported:false,
  clinical_approval:false,atla_ai_retrieval_enabled:false};
 const reviewItem=record(pendingItem,abstract,
  {status:'ai-disabled-awaiting-explicit-cost-approval',assessment:null},scanTime);
 const base={
  report:{schema_version:2,generated_at:scanTime,stage:'research-only-awaiting-independent-review',
   source_discovery_completed:true,clinical_knowledge_imported:0,
   existing_curriculum_changed:false,items:[reviewItem],
   source_discovery:{monitored_urls:1,monitored_ok:1,pubmed_topics_checked:10,
    pubmed_topics_failed:0,newly_discovered_papers:1}},
  metadata:{schema_version:1,checked_at:scanTime,monitored_urls:1,monitored_ok:1,
   pending_papers:1,newly_discovered_papers:1,pubmed_topics_checked:10,
   pubmed_failures:[],model_training_performed:false,
   clinical_retrieval_updated:false,full_texts_imported:0},
  health:{schema_version:1,checked_at:scanTime,sources:[{
   url:'https://www.who.int/guidelines',ok:true,
   clinical_approval:false,knowledge_ingestion_enabled:false}]},
  pending:{schema_version:1,checked_at:scanTime,items:[pendingItem]}
 };
 assert.equal(validateQueueFiles(base),true);
 for(const patch of [
  {id:'pubmed-99999999'},
  {source_url:'https://example.com/fake-paper'},
  {title:'Unrelated study title'},
  {topic_ids:['trauma']},
  {publication_types:['Practice Guideline']},
  {abstract_sha256:'not-a-sha256'},
  {abstract_sha256:null,abstract_available:true}
 ]){
  const altered={...base,report:{...base.report,items:[{...reviewItem,...patch}]}};
  assert.throws(()=>validateQueueFiles(altered),/inconsistent-research-queue/);
 }
});
