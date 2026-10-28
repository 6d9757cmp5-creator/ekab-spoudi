import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const source=new URL('../mentor/library/source-index.json',import.meta.url);
test('bibliography index contains exactly 15 metadata-only sources and 7 draft imports',async()=>{
 const data=JSON.parse(await readFile(source,'utf8'));
 assert.equal(data.schema_version,1);
 assert.equal(data.sources.length,15);
 assert.equal(data.sources.filter(x=>x.extracted_for_review).length,7);
 assert.equal(data.counts.clinically_approved,0);
 assert.equal(new Set(data.sources.map(x=>x.id)).size,15);
 for(const x of data.sources){
   assert.match(x.source_url,/^https:\/\//);
   assert.equal(x.independent_clinical_review,'not_verified');
   assert.equal(x.publication_rights_review,'not_verified');
   assert.equal(x.clinical_retrieval_enabled,false);
   for(const forbidden of ['text','passages','content','text_path','html','model_training'])assert.equal(Object.hasOwn(x,forbidden),false);
 }
});
test('public source viewer does not modify student data or load raw books',async()=>{
 const html=await readFile(new URL('../mentor-library.html',import.meta.url),'utf8');
 const js=await readFile(new URL('../mentor-library.js',import.meta.url),'utf8');
 assert.match(html,/Δεν αποτελεί εγκεκριμένη κλινική βιβλιοθήκη/);
 assert.match(js,/source-index\.json/);
 assert.doesNotMatch(js,/localStorage|sessionStorage|indexedDB|innerHTML|cloud-sync|official_questions/);
 assert.doesNotMatch(html,/corpus\/|who-bec\.json|openrn-health\.json/);
});
