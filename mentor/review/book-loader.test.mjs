import test from 'node:test';
import assert from 'node:assert/strict';
import {webcrypto,createHash} from 'node:crypto';
import {createReviewBookLoader,validateReviewManifest} from './book-loader.mjs';
const id='wistech-emr-2025',sourceUrl='https://wtcs.pressbooks.pub/emergencymedtech/';
const example={schema_version:1,source_id:id,title:'Example book',passages:Array.from({length:10},(_,i)=>({
 id:'wistech-emr-2025-'+String(i).padStart(4,'0'),source_id:id,source_url:sourceUrl,title:'Airway',
 text:'A short classroom example mentions an airway and source provenance only, without specific clinical instructions. '.repeat(3),
 review_status:'draft',section:'whole-book'}))};
const raw=Buffer.from(JSON.stringify(example));
const hash=createHash('sha256').update(raw).digest('hex');
const other=['openrn-health','openrn-skills','openrn-pharm','openrn-advanced','who-bec','medical-surgical-nursing'].map(source_id=>({source_id,sha256:hash,passage_count:10,scientific_review:'pending'}));
const manifest={schema_version:1,errors:[],books:[{source_id:id,sha256:hash,passage_count:10,scientific_review:'pending'},...other]};
const catalog={schema_version:1,purpose:'bibliography-only',counts:{identified:7,extracted_in_isolated_review_branch:7,clinically_approved:0},
 sources:[id,...other.map(s=>s.source_id)].map(sourceId=>({id:sourceId,title:'Example book',publisher:'Publisher',
 source_url:sourceUrl,license_summary:'Review pending',extracted_for_review:true,learning_tracks:['paramedic','medicine'],
 independent_clinical_review:'not_verified',publication_rights_review:'not_verified',clinical_retrieval_enabled:false}))};
function mocks(tamper=false){
 const urls=[];
 const request=async url=>{
  urls.push(url);
  if(url.endsWith('manifest.json'))return {ok:true,json:async()=>manifest};
  if(url.endsWith('source-index.json'))return {ok:true,json:async()=>catalog};
  return {ok:true,arrayBuffer:async()=>{const data=Buffer.from(raw);if(tamper)data[data.length-20]^=1;return data;}};
 };
 return {request,urls};
}
test('A single explicitly selected book loads by content hash; later calls are cached',async()=>{
 const {request,urls}=mocks();
 const loader=createReviewBookLoader({request,cryptoApi:webcrypto,base:'./mentor/review-corpus/',index:'./mentor/library/source-index.json'});
 const first=await loader.load(id),again=await loader.load(id);
 assert.equal(first.book,again.book);
 assert.equal(first.manifest.sha256,hash);
 assert.equal(urls.filter(x=>x.endsWith('wistech-emr-2025.json')).length,1);
 assert.ok(urls.every(url=>!url.includes('unknown-source')));
});
test('Tampered text is rejected before it reaches the viewer',async()=>{
 const {request}=mocks(true);
 const loader=createReviewBookLoader({request,cryptoApi:webcrypto,base:'./mentor/review-corpus/',index:'./mentor/library/source-index.json'});
 await assert.rejects(loader.load(id),/SHA-256/);
});
test('Unknown source ids are never constructed into a request',async()=>{
 const {request,urls}=mocks();
 const loader=createReviewBookLoader({request,cryptoApi:webcrypto,base:'./mentor/review-corpus/',index:'./mentor/library/source-index.json'});
 await assert.rejects(loader.load('../config'),/δεν επιτρέπεται/);
 assert.equal(urls.some(x=>x.includes('config')),false);
});
test('Catalog refuses sources enabled for clinical retrieval without review',async()=>{
 const {request}=mocks();
 const unsafe={...catalog,sources:[{...catalog.sources[0],clinical_retrieval_enabled:true}]};
 const loader=createReviewBookLoader({request:async url=>url.includes('source-index')?{ok:true,json:async()=>unsafe}:request(url),
 cryptoApi:webcrypto,base:'./mentor/review-corpus/',index:'./mentor/library/source-index.json'});
 await assert.rejects(loader.load(id),/Unverified|unsafe/);
});
test('User-attested OpenStax and WHO sources are allowed in review loader but never in clinical AI',async()=>{
 const {request,urls}=mocks();
 const loader=createReviewBookLoader({request,cryptoApi:webcrypto,base:'./mentor/review-corpus/',index:'./mentor/library/source-index.json'});
 for(const source of ['medical-surgical-nursing','who-bec']){
   // Mock extract intentionally uses the EMR identifier, so source validation refuses it.
   // Crucially this proves the restriction is lifted only to reach content verification.
   await assert.rejects(loader.load(source),/SHA-256|source mismatch|Invalid/i);
   assert.ok(urls.some(x=>x.endsWith(source+'.json')),'Source made it to review-only integrity stage');
 }
 const {SOURCE_POLICY}=await import('./rights-policy.mjs');
 for(const source of ['medical-surgical-nursing','who-bec']){
   assert.equal(SOURCE_POLICY[source].preview_allowed,true);
   assert.equal(SOURCE_POLICY[source].ai_retrieval_allowed,false);
   assert.equal(SOURCE_POLICY[source].production_publication_allowed,false);
   assert.equal(SOURCE_POLICY[source].rights_signoff,'user-attested-unverified');
 }
});
test('Manifest must remain exactly seven unapproved source texts',()=>{
 assert.equal(validateReviewManifest(manifest).books.length,7);
 assert.throws(()=>validateReviewManifest({...manifest,books:[]}),/μητρώο/);
 assert.throws(()=>validateReviewManifest({...manifest,books:[{...manifest.books[0],scientific_review:'approved'},...other]}),/Ασυμφωνία/);
});
