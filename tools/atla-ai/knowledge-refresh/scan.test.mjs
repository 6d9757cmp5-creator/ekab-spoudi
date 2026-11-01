import test from 'node:test';
import assert from 'node:assert/strict';
import {buildWatchlist,mergeCandidates,discoverPubMed,signalFor,main} from './scan.mjs';
import {classifySource,screenPubMedArticle} from './source-policy.mjs';
import {readFileSync} from 'node:fs';

function response(json){
 return {ok:true,status:200,headers:new Headers({'etag':'"example-v1"','last-modified':'Sun, 01 Nov 2026 12:00:00 GMT'}),
  text:async()=>JSON.stringify(json)};
}
function stub(url,options={}){
 if(options.method==='HEAD')return Promise.resolve(response({}));
 const u=new URL(String(url));
 if(u.pathname.endsWith('/esearch.fcgi'))return Promise.resolve(response({esearchresult:{idlist:['12345678','12345679']}}));
 if(u.pathname.endsWith('/esummary.fcgi'))return Promise.resolve(response({
  result:{uids:['12345678','12345679'],12345678:{title:'Evidence-based prehospital training review',pubdate:'2026 Nov 01',source:'Research Journal',pubtype:['Systematic Review'],articleids:[{idtype:'doi',value:'10.1234/review'}]},
   12345679:{title:'Resuscitation training systematic review',pubdate:'2026 Nov 02',source:'Evidence Review',pubtype:['Practice Guideline']}}
 }));
 throw Error('Unexpected endpoint '+u.pathname);
}
test('source watchlist deduplicates registries and rejects outside domains',()=>{
 const x=buildWatchlist([{id:'books',sources:[
  {title:'WHO',source_url:'https://www.who.int/a/'},
  {title:'Evil',source_url:'https://localhost/admin'},
  {title:'Evil IP',source_url:'https://127.0.0.1/private'},
  {title:'Unexpected',source_url:'https://example.com/a'}
 ]},{id:'knowledge',sources:[{title:'WHO again',url:'https://www.who.int/a'}]}]);
 assert.equal(x.length,1);
 assert.deepEqual(x[0].registry_ids,['books','knowledge']);
});
test('new papers remain pending; no approval or AI retrieval is possible from discovery',()=>{
 const now='2026-11-02T02:15:00.000Z';
 const x=mergeCandidates([], [{pmid:'12345678',title:'Research title',journal:'Journal',published_at:'2026-11-01',topic_id:'prehospital',publication_types:['Systematic Review']}],now);
 assert.equal(x.added,1);
 const p=x.items[0];
 assert.equal(p.status,'pending-review');
 assert.equal(p.content_imported,false);
 assert.equal(p.clinical_approval,false);
 assert.equal(p.atla_ai_retrieval_enabled,false);
 assert.equal(p.first_detected,now);
 assert.equal(mergeCandidates(x.items,[{pmid:'12345678',title:'Same',journal:'Journal',published_at:'2026-11-01',publication_types:['Systematic Review'],topic_id:'trauma'}],'2026-11-03').added,0);
 assert.deepEqual(mergeCandidates(x.items,[{pmid:'12345678',title:'Same',journal:'Journal',published_at:'2026-11-01',publication_types:['Systematic Review'],topic_id:'trauma'}],'2026-11-03').items[0].topic_ids,['prehospital','trauma']);
});
test('changed HTTP validators signal only possible source update',()=>{
 assert.equal(signalFor(null,{ok:true,etag:'a'}),'baseline');
 assert.equal(signalFor({ok:true,etag:'a'},{ok:true,etag:'b'}),'possible-source-update');
 assert.equal(signalFor({ok:true,etag:'a'},{ok:false,reason:'403'}),'unverified');
 assert.equal(signalFor({ok:true,etag:'a'},{ok:true,etag:'a'}),'no-confirmed-change');
});
test('PubMed results deduplicate across curated topics and preserve topics',async()=>{
 const r=await discoverPubMed(stub);
 assert.equal(r.failures.length,0);
 assert.equal(r.found.length,6);
 const merged=mergeCandidates([],r.found,'2026-11-02T02:15:00Z');
 assert.equal(merged.items.length,2);
 assert.deepEqual(merged.items[0].topic_ids,['prehospital','resuscitation','trauma']);
});
test('scanner reads existing registries but never writes any active medical learning content',async()=>{
 const result=await main({fetcher:stub,now:'2026-11-02T02:15:00Z',write:false});
 assert.ok(result.metadata.monitored_urls>0);
 assert.ok(result.metadata.monitored_ok>0);
 assert.equal(result.metadata.newly_discovered_papers,2);
 assert.equal(result.metadata.model_training_performed,false);
 assert.equal(result.metadata.clinical_retrieval_updated,false);
 assert.equal(result.metadata.full_texts_imported,0);
 assert.equal(result.pending.items.every(x=>x.status==='pending-review'),true);
 assert.equal(result.pending.items.every(x=>x.atla_ai_retrieval_enabled===false),true);
});
test('fail closed when PubMed is down',async()=>{
 const bad=async(url,opts)=>opts?.method==='HEAD'?response({}):{ok:false,status:503,text:async()=>''};
 const r=await main({fetcher:bad,now:'2026-11-02T02:15:00Z',write:false});
 assert.equal(r.metadata.pubmed_failures.length,3);
 assert.equal(r.metadata.newly_discovered_papers,0);
 assert.equal(r.metadata.clinical_retrieval_updated,false);
});


test('global source ownership verified by exact domain; GitHub and PubMed are not clinical endorsements',()=>{
 const who=classifySource('https://www.who.int/publications/i/item/9781234');
 assert.equal(who.accepted,true);
 assert.equal(who.clinical_use_approved,false);
 assert.equal(who.medical_knowledge_ingestion_allowed,false);
 assert.equal(classifySource('https://www.who.int.evil.example/page').accepted,false);
 assert.equal(classifySource('https://www.who.int@evil.example/page').accepted,false);
 assert.equal(classifySource('http://www.who.int/guidelines').accepted,false);
 assert.equal(classifySource('https://tiktok.com/medical-advice').accepted,false);
 assert.equal(classifySource('https://reddit.com/r/medicine').accepted,false);
 assert.equal(classifySource('https://github.com/arbitrary-user/medical-facts').accepted,false);
 const repo=classifySource('https://github.com/Z-Anatomy/Models-of-human-anatomy');
 assert.equal(repo.accepted,true);
 assert.equal(repo.category,'technical-research-assets-not-clinical-guidance');
 assert.equal(classifySource('https://www.ncbi.nlm.nih.gov/books/').category,'academic-repository-unendorsed');
 assert.equal(classifySource('https://shop.elsevier.com/books/a').category,'official-textbook-publisher-metadata-only');
});
test('article screening blocks retraction, preprint, case report, editorial and uncertain indexing',()=>{
 const base={pmid:'23456789',title:'Systematic review of training',published_at:'2026 Nov 01',journal:'Science',publication_types:['Systematic Review']};
 assert.equal(screenPubMedArticle(base).accepted,true);
 for(const type of ['Retracted Publication','Retraction of Publication','Preprint','Case Reports','Editorial','Published Erratum']){
  assert.equal(screenPubMedArticle({...base,publication_types:['Systematic Review',type]}).accepted,false,type);
 }
 assert.equal(screenPubMedArticle({...base,title:'RETRACTED: Systematic review'}).accepted,false);
 assert.equal(screenPubMedArticle({...base,publication_types:[]}).accepted,false);
 assert.equal(screenPubMedArticle({...base,journal:''}).accepted,false);
 assert.equal(screenPubMedArticle({...base,publication_types:['Randomized Controlled Trial']}).accepted,false,'RCT needs separate evaluator in future');
 assert.equal(mergeCandidates([], [{...base,title:'RETRACTED: Review',topic_id:'trauma'}],'2026-11-02').items.length,0);
});

test('the five curated worldwide evidence hubs use only approved publisher origins',()=>{
 const data=JSON.parse(readFileSync(new URL('./global-official-sources.json',import.meta.url),'utf8'));
 assert.equal(data.sources.length,5);
 assert.equal(new Set(data.sources.map(s=>s.id)).size,5);
 const authorities=data.sources.map(s=>s.origin);
 for(const source of data.sources){
  const result=classifySource(source.source_url);
  assert.equal(result.accepted,true,source.origin);
  assert.equal(result.category,'official-health-guidelines');
  assert.equal(result.clinical_use_approved,false);
 }
 assert.ok(authorities.includes('Cochrane'));
 assert.ok(authorities.includes('World Health Organization'));
});
