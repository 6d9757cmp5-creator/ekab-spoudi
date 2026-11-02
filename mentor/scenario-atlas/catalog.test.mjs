import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {CATEGORIES,SCENARIOS,REFERENCE_INDEX,ROLE_TRACKS,SKILLS,normalizeSearch,queryScenarios,getScenario,verifyAtlas} from './catalog.mjs';

test('360 unique Greek scenario outlines across 32 prehospital families',()=>{
 const result=verifyAtlas();
 assert.deepEqual(result,{categories:32,scenarios:360,independently_clinically_approved:0,ai_connected:false});
 assert.equal(CATEGORIES.length,32); assert.equal(SCENARIOS.length,360);
 assert.equal(new Set(SCENARIOS.map(s=>s.id)).size,360);
 assert.ok(SCENARIOS.every(s=>s.title.length>3));
 assert.equal(CATEGORIES.reduce((n,f)=>n+f.topic_count,0),360);
 for(const id of ['CARD','RESUS','RESP','NEURO','METAB','INFECT','ALLERG','GASTRO','RENAL','TRAUMA','BLEED','BURN','PED','NEO','OB','PSY','TOX','ENV','WATER','MOUNT','AGRI','HAZMAT','MCI','DISASTER','TRANS','AIR','EQUIP','POP','ETHICS','TEAM','OPER']){
  assert.ok(CATEGORIES.some(c=>c.id===id),id);
 }
});
test('Greek diacritics insensitive search, pagination and filters',()=>{
 const trauma=queryScenarios({search:'ΤΡΟΧΑΙΟ'});
 assert.ok(trauma.total>=4,trauma.total);
 assert.ok(trauma.items.some(s=>s.title.includes('Τροχαίο')));
 assert.equal(normalizeSearch('ΆΝΑΚΟΠΉ'),normalizeSearch('ανακοπη'));
 assert.ok(queryScenarios({search:'ανακοπη'}).total>=3);
 const children=queryScenarios({category:'PED',population:'child'});
 assert.equal(children.total,14);
 assert.ok(children.items.every(s=>s.category_id==='PED'&&s.population==='child'));
 assert.equal(queryScenarios({category:'PED',difficulty:'foundation'}).total,3);
 assert.equal(queryScenarios({category:'PED',difficulty:'intermediate'}).total,4);
 assert.equal(queryScenarios({category:'PED',difficulty:'advanced'}).total,7);
 const first=queryScenarios({limit:10,offset:0}).items;
 const second=queryScenarios({limit:10,offset:10}).items;
 assert.equal(first.length,10);assert.equal(second.length,10);
 assert.ok(!first.some(s=>second.includes(s)));
 assert.deepEqual(queryScenarios({search:'δεν-υπαρχει-αυτο',limit:4}),{total:0,items:[]});
 for(const bad of [{limit:0},{limit:999},{offset:-1},{limit:1.5}]){
  assert.throws(()=>queryScenarios(bad),/invalid-pagination/);
 }
 assert.equal(getScenario('TRAUMA-001').title,'Σύγκρουση αυτοκινήτων');
 assert.equal(getScenario('TRAUMA-999'),null);
});
test('NO automatic triage, doses, clinical decisions, patient physiology, grade or AI',()=>{
 assert.deepEqual(Object.keys(ROLE_TRACKS).sort(),['ekab','paramedic','physician']);
 for(const s of SCENARIOS){
  assert.equal(s.clinical_review_status,'requires_clinical_review');
  assert.equal(s.role_scope_status,'requires_local_scope_verification');
  assert.equal(s.source_match_status,'general_reading_only_not_scenario_checked');
  assert.equal(s.implementation_stage,'topic_outline_not_individual_interactive_simulation');
  for(const field of ['treatment_enabled','dosing_enabled','triage_algorithm_enabled','physiological_simulation_enabled','ai_enabled','official_grading_enabled']){
   assert.equal(s[field],false,s.id+':'+field);
  }
  assert.equal(s.educational_role_tracks.length,3);
  assert.ok(s.skills.every(id=>Object.hasOwn(SKILLS,id)));
  assert.ok(s.reference_ids.every(id=>Object.hasOwn(REFERENCE_INDEX,id)));
 }
});
test('source references are broad verified-origin guidance only, never fictitious clinical signoff',async()=>{
 for(const source of Object.values(REFERENCE_INDEX)){
  assert.match(source.url,/^https:\/\/(?:www\.erc\.edu|cpr\.heart\.org|qualityhealthservices\.who\.int|www\.who\.int|www\.ekab\.gr)\//);
 }
 const path=new URL('../app/scenarios.js',import.meta.url);
 const [browser,html]=await Promise.all([
  readFile(path,'utf8'),
  readFile(new URL('../../mentor-scenarios.html',import.meta.url),'utf8')
 ]);
 assert.match(html,/δεν δίνει δόσεις/i);
 assert.match(html,/Δεν χρησιμοποιείται AI/);
 assert.match(browser,/replaceChildren/);
 assert.doesNotMatch(browser,/\b(fetch|XMLHttpRequest|indexedDB|localStorage|sessionStorage|SpeechRecognition|innerHTML|setItem|removeItem|cloudSync|gradeAnswer)\b/);
});
