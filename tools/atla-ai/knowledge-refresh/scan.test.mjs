import test from 'node:test';
import assert from 'node:assert/strict';
import {buildWatchlist,mergeCandidates,discoverPubMed,recheckPendingPubMed,screenPubMedLinkedCorrections,signalFor,preserveProbeHistory,main,probeSource} from './scan.mjs';
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
 if(u.pathname.endsWith('/efetch.fcgi')){
  const ids=(u.searchParams.get('id')||'').split(',').filter(Boolean);
  const xml='<PubmedArticleSet>'+ids.map(id=>'<PubmedArticle><MedlineCitation><PMID>'+id+'</PMID><Article><ArticleTitle>Mock paper</ArticleTitle></Article></MedlineCitation></PubmedArticle>').join('')+'</PubmedArticleSet>';
  return Promise.resolve({ok:true,status:200,text:async()=>xml});
 }
 if(u.pathname.endsWith('/esummary.fcgi')){
  const ids=(u.searchParams.get('id')||'').split(',').filter(Boolean);
  const entries=Object.fromEntries(ids.map(id=>[id,{
   title:id==='12345679'?'Resuscitation training systematic review':'Evidence-based prehospital training review',
   pubdate:'2026 Nov 01',source:'Research Journal',pubtype:['Systematic Review'],
   articleids:[{idtype:'doi',value:'10.1234/review'}]
  }]));
  return Promise.resolve(response({result:{uids:ids,...entries}}));
 }
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
test('real source changes remain detectable after repeated 403/network failures',()=>{
 const baseline={ok:true,etag:'"v1"',last_modified:'Sun, 01 Nov 2026 12:00:00 GMT'};
 const denied={ok:false,http_status:403,reason:'HTTP 403'};
 const after403={...denied,...preserveProbeHistory(baseline,denied)};
 assert.equal(signalFor(baseline,denied),'unverified');
 assert.equal(after403.ok,false);
 assert.equal(after403.last_successful_etag,'"v1"');
 const offline={ok:false,reason:'fetch failed'};
 const afterOffline={...offline,...preserveProbeHistory(after403,offline)};
 assert.equal(signalFor(after403,offline),'unverified');
 assert.equal(afterOffline.last_successful_etag,'"v1"');
 const unchanged={ok:true,etag:'"v1"',last_modified:baseline.last_modified};
 const changed={ok:true,etag:'"v2"',last_modified:baseline.last_modified};
 assert.equal(signalFor(afterOffline,unchanged),'no-confirmed-change');
 assert.equal(signalFor(afterOffline,changed),'possible-source-update');
 const recovered={...changed,...preserveProbeHistory(afterOffline,changed)};
 assert.equal(recovered.last_successful_etag,'"v2"');
 assert.equal(signalFor(recovered,{ok:true,etag:'"v2"'}),'no-confirmed-change');
});

test('PubMed results deduplicate across curated topics and preserve topics',async()=>{
 const r=await discoverPubMed(stub);
 assert.equal(r.failures.length,0);
 assert.equal(r.found.length,20);
 const merged=mergeCandidates([],r.found,'2026-11-02T02:15:00Z');
 assert.equal(merged.items.length,2);
 assert.equal(merged.items[0].topic_ids.length,10);
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
test('fail closed when PubMed is down and previously queued evidence cannot be rechecked',async()=>{
 const bad=async(url,opts)=>opts?.method==='HEAD'?response({}):{ok:false,status:503,text:async()=>''};
 await assert.rejects(()=>main({fetcher:bad,now:'2026-11-02T02:15:00Z',write:false}),/HTTP 503/);
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


test('HEAD redirects preserve canonical trailing slash without bypassing publisher allowlist',async()=>{
 const seen=[];
 const fetcher=async(url,options)=>{
  assert.equal(options.method,'HEAD');
  seen.push(url);
  if(seen.length===1)return {status:301,headers:new Headers({location:'https://goldcopd.org/'})};
  return {ok:true,status:200,headers:new Headers({'etag':'"test"'})};
 };
 const result=await probeSource({url:'https://goldcopd.org'},fetcher);
 assert.equal(result.ok,true);
 assert.deepEqual(seen,['https://goldcopd.org','https://goldcopd.org/']);
 const denied=await probeSource({url:'https://goldcopd.org'},async()=>({
  status:302,headers:new Headers({location:'https://goldcopd.org.evil.example/'})
 }));
 assert.equal(denied.reason,'redirect-outside-allowlist');
 const loop=await probeSource({url:'https://goldcopd.org'},async()=>({
  status:301,headers:new Headers({location:'https://goldcopd.org/'})
 }));
 assert.equal(loop.reason,'redirect-loop');
});

test('malformed HTTP 200 PubMed search or summary is a failed topic, not a valid empty scan',async()=>{
 const missingSearch=async()=>response({});
 const search=await discoverPubMed(missingSearch);
 assert.equal(search.found.length,0);
 assert.equal(search.failures.length,10);
 assert.ok(search.failures.every(x=>x.reason==='invalid-pubmed-search-response'));
 const missingSummary=async url=>{
  const u=new URL(String(url));
  if(u.pathname.endsWith('/esearch.fcgi'))return response({esearchresult:{idlist:['12345678']}});
  return response({result:{uids:['12345678'],12345678:{}}});
 };
 const summary=await discoverPubMed(missingSummary);
 assert.equal(summary.found.length,0);
 assert.equal(summary.failures.length,10);
 assert.ok(summary.failures.every(x=>x.reason==='invalid-pubmed-summary-response'));
 const validEmpty=async()=>response({esearchresult:{idlist:[]}});
 const empty=await discoverPubMed(validEmpty);
 assert.equal(empty.failures.length,0,'a genuinely empty NCBI result is not an outage');
 assert.equal(empty.found.length,0);
});

test('a newly disqualified PMID is removed from pending review, but network silence is not treated as a retraction',()=>{
 const item={pmid:'23456789',title:'Systematic review of training',published_at:'2026 Nov 01',
  journal:'Science',publication_types:['Systematic Review'],topic_id:'trauma'};
 const first=mergeCandidates([],[item],'2026-11-02T01:00:00Z');
 assert.equal(first.items.length,1);
 const later='2026-11-02T02:00:00Z';
 const explicitlyExcluded=[{pmid:item.pmid,topic_id:'trauma',reason:'retracted-preprint-or-non-evidence-publication'}];
 assert.equal(mergeCandidates(first.items,[],later,explicitlyExcluded).items.length,0);
 assert.equal(mergeCandidates(first.items,[item],later,explicitlyExcluded).items.length,0);
 assert.equal(mergeCandidates(first.items,[],later,[]).items.length,1);
});

test('previously queued PMID is rechecked and removed if PubMed now marks it retracted',async()=>{
 const old=mergeCandidates([],[{pmid:'23456789',title:'Systematic review of training',
  published_at:'2026 Nov 01',journal:'Science',publication_types:['Systematic Review'],
  topic_id:'trauma'}],'2026-11-01T00:00:00Z').items[0];
 const retracted=async url=>{
  if(new URL(String(url)).pathname.endsWith('/efetch.fcgi'))
   return {ok:true,status:200,text:async()=>'<PubmedArticle><MedlineCitation><PMID>23456789</PMID></MedlineCitation></PubmedArticle>'};
  return response({result:{uids:['23456789'],
   23456789:{title:'Systematic review of training',pubdate:'2026 Nov 01',
    source:'Science',pubtype:['Systematic Review','Retracted Publication']}}});
 };
 const checked=await recheckPendingPubMed([old],retracted);
 assert.equal(checked.checked,1);
 assert.equal(checked.found.length,0);
 assert.equal(checked.excluded.length,1);
 assert.equal(mergeCandidates([old],[], '2026-11-02T00:00:00Z',checked.excluded).items.length,0);
});
test('incomplete or unreachable PubMed recheck aborts instead of silently retaining stale evidence',async()=>{
 const old=mergeCandidates([],[{pmid:'23456789',title:'Systematic review of training',
  published_at:'2026 Nov 01',journal:'Science',publication_types:['Systematic Review'],
  topic_id:'trauma'}],'2026-11-01T00:00:00Z').items[0];
 await assert.rejects(()=>recheckPendingPubMed([old],async()=>response({result:{uids:[]}})),
  /recheck-incomplete/);
 await assert.rejects(()=>recheckPendingPubMed([old],async()=>({ok:false,status:503})),
  /HTTP 503/);
});

test('PubMed XML linked retraction blocks an older eligible PMID even if ESummary stays unchanged',async()=>{
 const old=mergeCandidates([],[{pmid:'23456789',title:'Prehospital evidence review',
  published_at:'2026 Nov 01',journal:'Science',publication_types:['Systematic Review'],
  topic_id:'prehospital'}],'2026-11-01T00:00:00Z').items[0];
 const summary={result:{uids:['23456789'],23456789:{title:old.title,pubdate:old.published_at,
  source:old.journal,pubtype:['Systematic Review']}}};
 const original='<PubmedArticle><MedlineCitation><PMID Version="1">23456789</PMID><Article><ArticleTitle>Review</ArticleTitle></Article>';
 const close='</MedlineCitation></PubmedArticle>';
 const linked='<CommentsCorrectionsList><CommentsCorrections Version="1" RefType="RetractionIn"><RefSource>Notice</RefSource></CommentsCorrections></CommentsCorrectionsList>';
 const fetcher=async url=>new URL(String(url)).pathname.endsWith('/efetch.fcgi')
  ?{ok:true,status:200,text:async()=>original+linked+close}:response(summary);
 const r=await recheckPendingPubMed([old],fetcher);
 assert.equal(r.checked,1);
 assert.equal(r.found.length,0);
 assert.equal(r.excluded[0].reason,'pubmed-xml-linked-retraction-or-expression-of-concern');
 const concerned=screenPubMedLinkedCorrections(original+linked.replace('RetractionIn','ExpressionOfConcernIn')+close,['23456789']);
 assert.equal(concerned[0].flagged,true);
 const notFlagged=screenPubMedLinkedCorrections(original+linked.replace('RetractionIn','ErratumIn')+close,['23456789']);
 assert.equal(notFlagged[0].flagged,false);
});
test('Missing, duplicate or mismatched PubMed XML identity fails closed without persistence',async()=>{
 const article=id=>'<PubmedArticle><MedlineCitation><PMID>'+id+'</PMID></MedlineCitation></PubmedArticle>';
 assert.throws(()=>screenPubMedLinkedCorrections('', ['23456789']),/incomplete/);
 assert.throws(()=>screenPubMedLinkedCorrections(article('11111111'),['23456789']),/invalid-identity/);
 assert.throws(()=>screenPubMedLinkedCorrections(article('23456789')+article('23456789'),['23456789']),/incomplete/);
 const old=mergeCandidates([],[{pmid:'23456789',title:'Prehospital evidence review',published_at:'2026 Nov 01',
  journal:'Science',publication_types:['Systematic Review'],topic_id:'prehospital'}],
  '2026-11-01T00:00:00Z').items[0];
 const fetcher=async url=>new URL(String(url)).pathname.endsWith('/efetch.fcgi')
  ?{ok:true,status:200,text:async()=>''}:response({result:{uids:['23456789'],
   23456789:{title:old.title,pubdate:old.published_at,source:old.journal,pubtype:['Systematic Review']}}});
 await assert.rejects(()=>recheckPendingPubMed([old],fetcher),/linked-corrections-incomplete/);
});
