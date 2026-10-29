import test from 'node:test';
import assert from 'node:assert/strict';
import {KNOWLEDGE_CARDS,KNOWLEDGE_PACK,KNOWLEDGE_DOMAINS,KNOWLEDGE_SOURCES} from './foundation-pack.mjs';
import {assertKnowledgePack,normalizeGreek,searchKnowledge,isHighRiskRequest,knowledgeResponse} from './search.mjs';

test('30 original Greek educator-authored cards, nine real source links, zero clinical approval',()=>{
 assert.equal(assertKnowledgePack(),true);
 assert.equal(KNOWLEDGE_CARDS.length,30);
 assert.equal(Object.keys(KNOWLEDGE_SOURCES).length,9);
 assert.equal(Object.keys(KNOWLEDGE_DOMAINS).length,8);
 assert.equal(KNOWLEDGE_PACK.model_training,false);
 assert.equal(KNOWLEDGE_PACK.publisher_book_text_imported,false);
 assert.equal(KNOWLEDGE_PACK.production_clinical_approval,false);
 assert.ok(KNOWLEDGE_CARDS.every(c=>c.status.includes('pending')&&!c.clinical_instructions));
 assert.ok(KNOWLEDGE_CARDS.every(c=>c.recall_guide.length>10&&c.recall_question.length>20));
 assert.ok(KNOWLEDGE_CARDS.every(c=>c.source_ids.every(id=>/^https:\/\//.test(KNOWLEDGE_SOURCES[id].url))));
});
test('Does not allow forged clinical signoff, duplicate cards or missing source links',()=>{
 assert.throws(()=>assertKnowledgePack({...KNOWLEDGE_PACK,production_clinical_approval:true}),/approval/);
 assert.throws(()=>assertKnowledgePack({...KNOWLEDGE_PACK,model_training:true}),/approval/);
 assert.throws(()=>assertKnowledgePack({...KNOWLEDGE_PACK,knowledge_cards:[...KNOWLEDGE_CARDS.slice(0,-1),KNOWLEDGE_CARDS[0]]}),/duplicate|invalid-knowledge/);
 assert.throws(()=>assertKnowledgePack({...KNOWLEDGE_PACK,knowledge_cards:KNOWLEDGE_CARDS.slice(0,29)}),/count/);
});
test('Search understands Greek accents, exact terminology and common acronyms',()=>{
 assert.equal(normalizeGreek('Αεραγωγός'),'αεραγωγοσ');
 assert.equal(searchKnowledge('Τι σημαίνει ABCDE;')[0].id,'assessment-abcde');
 assert.equal(searchKnowledge('Τι είναι η διαλογή;')[0].id,'triage-purpose');
 assert.equal(searchKnowledge('Πες μου για BLS')[0].id,'resuscitation-bls-als');
 assert.equal(searchKnowledge('Τι είναι ΗΚΓ;')[0].id,'medicine-ecg');
 assert.equal(searchKnowledge('Εξήγησέ μου τα ΜΑΠ')[0].id,'safety-ppe');
 assert.equal(searchKnowledge('Τι είναι οι ιατρικοί όροι xyzzy-garbage?').some(c=>c.id==='undefined'),false);
 assert.deepEqual(searchKnowledge('xqzzy-no-result-irrelevant'),[]);
});
test('Source-backed teaching returns explicit references, recall prompts, and no fake AI answers',()=>{
 const r=knowledgeResponse('Τι σημαίνει ABCDE;', {intent:'explain'});
 assert.equal(r.kind,'knowledge');
 assert.equal(r.card_id,'assessment-abcde');
 assert.match(r.text,/αεραγωγόσ|αεραγωγός/i);
 assert.match(r.text,/Ερώτηση για αυτοέλεγχο/);
 assert.ok(r.sources.some(s=>s.url.includes('who.int')));
 assert.ok(r.sources.every(s=>/^https:\/\//.test(s.url)));
 assert.match(r.disclaimer,/κλινική επιμέλεια/i);
 const e=knowledgeResponse('Δώσε μου άσκηση BLS',{intent:'exercise'});
 assert.equal(e.card_id,'resuscitation-bls-als');
 assert.match(e.text,/Άσκηση ανάκλησης/);
 assert.equal(knowledgeResponse('Πόσες προσπάθειες έχω;',{intent:'progress'}),null,'Legacy progress still owned by existing coach');
 assert.equal(knowledgeResponse('Άσχετο ZZZ κείμενο'),null);
});
test('High-risk real-patient, dosage and invasive procedure prompts fail closed',()=>{
 for(const q of ['Έχω ασθενή που δεν αναπνέει τώρα','πόσα mg να δώσω','ποια δοσολογία να χορηγήσω','πώς κάνω διασωλήνωση']){
  assert.equal(isHighRiskRequest(q),true,q);
  const answer=knowledgeResponse(q,{intent:'unknown'});
  assert.equal(answer.kind,'safety');
  assert.deepEqual(answer.sources,[]);
  assert.match(answer.text,/112|166/);
 }
 assert.equal(isHighRiskRequest('Τι σημαίνει αεραγωγός;'),false);
});
test('Only library pack is accessed, never existing app grading, storage or identity',()=>{
 const original=structuredClone(KNOWLEDGE_CARDS.map(c=>({id:c.id,status:c.status,source_ids:c.source_ids})));
 for(let i=0;i<100;i++){
  searchKnowledge(i%2?'Τι είναι διαλογή':'ΗΚΓ');
  knowledgeResponse(i%2?'Δώσε μου άσκηση για αεραγωγό':'τι σημαίνει BLS',{intent:'exercise'});
 }
 assert.deepEqual(KNOWLEDGE_CARDS.map(c=>({id:c.id,status:c.status,source_ids:c.source_ids})),original);
});
