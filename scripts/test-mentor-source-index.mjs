import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {normalizeSearch,assertPublicCatalog,filterCatalog,matchesLearningTrack} from '../mentor/library/catalog-search.mjs';
const source=new URL('../mentor/library/source-index.json',import.meta.url);
test('bibliography index contains exactly 28 metadata-only sources and 7 draft imports',async()=>{
 const data=JSON.parse(await readFile(source,'utf8'));
 assert.equal(data.schema_version,1);
 assert.equal(data.sources.length,28);
 assert.equal(data.sources.filter(x=>x.extracted_for_review).length,7);
 assert.equal(data.counts.clinically_approved,0);
 assert.equal(data.sources.filter(s=>s.learning_tracks.includes('paramedic')).length,18);
 assert.equal(data.sources.filter(s=>s.learning_tracks.includes('medicine')).length,20);
 assert.equal(data.sources.filter(s=>s.learning_tracks.length===2).length,10);
 assert.equal(new Set(data.sources.map(x=>x.id)).size,28);
 for(const x of data.sources){
   assert.match(x.source_url,/^https:\/\//);
   assert.equal(x.independent_clinical_review,'not_verified');
   assert.equal(x.publication_rights_review,'not_verified');
   assert.equal(x.clinical_retrieval_enabled,false);
   assert.ok(x.learning_tracks.length>=1);
   assert.ok(x.learning_tracks.every(t=>['paramedic','medicine'].includes(t)));
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

test('Greek accents and Latin queries filter catalog without accessing content',async()=>{
 const data=JSON.parse(await readFile(source,'utf8'));
 const items=assertPublicCatalog(data);
 assert.equal(normalizeSearch('Πηγές Κρήτης'), 'πηγεσ κρητησ');
 assert.equal(filterCatalog(items,{stage:'all'}).length,28);
 assert.equal(filterCatalog(items,{stage:'extracted'}).length,7);
 assert.equal(filterCatalog(items,{stage:'identified'}).length,21);
 assert.equal(filterCatalog(items,{track:'paramedic'}).length,18);
 assert.equal(filterCatalog(items,{track:'medicine'}).length,20);
 assert.equal(filterCatalog(items,{track:'paramedic',stage:'extracted'}).length,5);
 assert.equal(filterCatalog(items,{track:'medicine',stage:'extracted'}).length,5);
 assert.ok(matchesLearningTrack(items.find(x=>x.id==='who-bec'),'paramedic'));
 assert.ok(matchesLearningTrack(items.find(x=>x.id==='who-bec'),'medicine'));
 assert.deepEqual(filterCatalog(items,{track:'paramedic',query:'Medical-Surgical Nursing'}),[]);
 assert.equal(filterCatalog(items,{track:'medicine',query:'Medical-Surgical Nursing'}).length,1);
 assert.equal(filterCatalog(items,{track:'paramedic',query:'αιμορραγία'}).some(s=>s.id==='phtls-10'),true);
 assert.ok(filterCatalog(items,{track:'medicine',query:'φυσιολογία'}).some(s=>s.id==='guyton-hall-15'));
 assert.ok(filterCatalog(items,{track:'paramedic',query:'Anatomy and Physiology 2e'}).some(s=>s.id==='openstax-anatomy-physiology-2e'));
 assert.equal(filterCatalog(items,{track:'paramedic',query:'Robbins, Cotran & Kumar'}).length,0);
 assert.equal(filterCatalog(items,{track:'medicine',query:'Robbins, Cotran & Kumar'}).length,1);
 assert.equal(data.sources.filter(s=>s.reference_only).length,13);
 assert.equal(data.sources.filter(s=>s.extracted_for_review).length,7);
 assert.equal(data.sources.find(s=>s.id==='physionet-ptb-xl-103').resource_kind,'ecg-dataset');
 assert.throws(()=>filterCatalog(items,{track:'surgeon'}),/Invalid learning track/);
 assert.ok(filterCatalog(items,{query:'WHO'}).length>=2);
 assert.ok(filterCatalog(items,{query:'erc',stage:'identified'}).some(x=>x.id==='erc-2025'));
 assert.deepEqual(filterCatalog(items,{query:'εκδοτησ-δεν-υπαρχει'}),[]);
 assert.throws(()=>filterCatalog(items,{stage:'approved'}),/Invalid bibliography filter/);
});
test('ATLA topic navigation connects each of 16 pathways only to sources in its own study track',async()=>{
 const data=JSON.parse(await readFile(source,'utf8'));
 const roadmap=JSON.parse(await readFile(new URL('../mentor/library/study-paths.json',import.meta.url),'utf8'));
 const queue=JSON.parse(await readFile(new URL('../mentor/library/enrichment-queue.json',import.meta.url),'utf8'));
 assert.equal(roadmap.schema_version,1);
 assert.equal(roadmap.sections.length,16);
 assert.equal(roadmap.sections.filter(s=>s.track==='paramedic').length,8);
 assert.equal(roadmap.sections.filter(s=>s.track==='medicine').length,8);
 const map=new Map(data.sources.map(s=>[s.id,s]));
 for(const section of roadmap.sections){
   assert.ok(section.learning_goal && section.source_ids.length>=2);
   assert.equal(section.review_status,'curriculum-map-draft');
   assert.equal(section.chapter_level_verified,false);
   for(const id of section.source_ids){
     const source=map.get(id);
     assert.ok(source,'Unknown source '+id);
     assert.ok(source.learning_tracks.includes(section.track),'Wrong teaching track '+id);
   }
 }
 assert.equal(queue.candidates.length,13);
 for(const item of queue.candidates){
   assert.equal(item.status,'source_verified');
   assert.equal(item.added_to_source_index,true);
   assert.equal(item.imported,false);
   assert.equal(item.clinical_approval,false);
   assert.equal(map.get(item.catalog_source_id)?.source_url,item.source_url);
 }
 const html=await readFile(new URL('../mentor-library.html',import.meta.url),'utf8');
 const js=await readFile(new URL('../mentor-library.js',import.meta.url),'utf8');
 assert.match(html,/id="study-paths"/);
 assert.match(js,/study-paths\.json/);
 assert.match(js,/renderPaths/);
 assert.doesNotMatch(js,/localStorage|sessionStorage|indexedDB|innerHTML/);
});
test('fail closed on fake clinical approval, source duplication, unsafe text fields and mismatched counts',async()=>{
 const data=JSON.parse(await readFile(source,'utf8'));
 const tamper=mutate=>{const x=structuredClone(data);mutate(x);assert.throws(()=>assertPublicCatalog(x));};
 tamper(x=>x.sources[0].clinical_retrieval_enabled=true);
 tamper(x=>x.sources[0].independent_clinical_review='approved');
 tamper(x=>x.sources[0].text='Unreviewed medical advice');
 tamper(x=>x.sources[0].source_url='javascript:alert(1)');
 tamper(x=>x.sources[1].id=x.sources[0].id);
 tamper(x=>x.counts.extracted_in_isolated_review_branch=15);
 tamper(x=>x.sources[0].learning_tracks=['doctor']);
 tamper(x=>x.sources[0].learning_tracks=['paramedic','paramedic']);
 tamper(x=>x.sources[0].learning_tracks=[]);
 tamper(x=>delete x.sources[0].learning_tracks);
});
test('search UI has accessible controls and no unsafe clinical or legacy writes',async()=>{
 const html=await readFile(new URL('../mentor-library.html',import.meta.url),'utf8');
 const js=await readFile(new URL('../mentor-library.js',import.meta.url),'utf8');
 for(const id of ['source-search','source-stage','source-track','sources-visible']) assert.ok(html.includes('id="'+id+'"'));
 assert.match(js,/filterCatalog/);
 assert.match(js,/replaceChildren/);
 assert.doesNotMatch(js,/localStorage|sessionStorage|indexedDB|innerHTML|cloud-sync|official_questions/);
});
