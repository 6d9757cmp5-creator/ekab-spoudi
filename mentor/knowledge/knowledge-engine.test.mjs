import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {validateKnowledge,searchKnowledge,choosePracticeCard,foldGreek,KNOWLEDGE_STATUS} from './knowledge-engine.mjs';

const dir=dirname(fileURLToPath(import.meta.url));
const catalog=JSON.parse(await readFile(join(dir,'sources.json'),'utf8'));
const pack=JSON.parse(await readFile(join(dir,'greek-cards.json'),'utf8'));
const cloned=x=>JSON.parse(JSON.stringify(x));

test('actual Greek knowledge package is independently versioned and contains 59 cards, ten domains and eight sources',()=>{
 const good=validateKnowledge({catalog,pack});
 assert.equal(good.pack.cards.length,59);
 assert.equal(good.pack.topics.length,10);
 assert.equal(good.catalog.sources.length,8);
 assert.equal(good.catalog.publisher_text_embedded,false);
 assert.equal(good.pack.grade_effect,false);
 assert.equal(good.pack.clinical_use_allowed,false);
 assert.equal(good.pack.cards.every(c=>c.medical_approval===false && c.status===KNOWLEDGE_STATUS),true);
 assert.equal(good.pack.cards.every(c=>c.language==='el'&&c.official_grade_effect===false),true);
 assert.equal(new Set(good.pack.cards.map(c=>c.id)).size,59);
});
test('ten distinct categories each have at least four meaningful source-linked cards',()=>{
 for(const topic of pack.topics){
  const cards=pack.cards.filter(x=>x.topic===topic.id);
  assert.ok(cards.length>=4,'Not enough cards for '+topic.id);
  assert.ok(cards.every(x=>x.source_ids.length>=1),'Missing citation for '+topic.id);
 }
});
test('Greek accent-insensitive keyword search returns cardiac, airway and ECG content',()=>{
 assert.equal(foldGreek('ΑΕΡΑΓΩΓΌΣ'),'αεραγωγοσ');
 assert.ok(searchKnowledge(pack,{query:'καρδιά'}).some(c=>c.topic==='anatomy'));
 assert.ok(searchKnowledge(pack,{query:'QRS'}).some(c=>c.topic==='ecg'));
 assert.ok(searchKnowledge(pack,{query:'αεραγωγός'}).some(c=>c.topic==='assessment'));
 assert.ok(searchKnowledge(pack,{query:'ανύπαρκτη_άσχετη_λέξη'}).length===0);
});
test('search and practice are deterministic and never mutate pack or legacy state',()=>{
 const snapshot=JSON.stringify(pack);
 const first=searchKnowledge(pack,{query:'εκτίμηση',limit:6});
 assert.ok(first.length<=6&&first.length>0);
 const focus=searchKnowledge(pack,{topic:'triage',limit:20});
 assert.equal(focus.length,5);
 assert.ok(focus.every(c=>c.topic==='triage'));
 const card=choosePracticeCard(pack,{topic:'ecg',offset:100});
 assert.equal(card.topic,'ecg');
 assert.equal(JSON.stringify(pack),snapshot);
});
test('unknown citations, fake publication rights and forged clinical approvals fail validation',()=>{
 const wrong=cloned(pack);wrong.cards[0].source_ids=['unknown-publisher'];
 assert.throws(()=>validateKnowledge({catalog,pack:wrong}),/invalid-knowledge-card/);
 const bad=cloned(pack);bad.cards[1].medical_approval=true;
 assert.throws(()=>validateKnowledge({catalog,pack:bad}),/invalid-knowledge-card/);
 const hacked=cloned(catalog);hacked.sources[0].url='javascript:alert(1)';
 assert.throws(()=>validateKnowledge({catalog:hacked,pack}),/invalid-knowledge-source/);
 const licensed=cloned(catalog);licensed.sources[1].licence_review='approved-for-production';
 assert.throws(()=>validateKnowledge({catalog:licensed,pack}),/invalid-knowledge-source/);
});
test('cards contain original teaching content rather than numerical clinical protocols',()=>{
 for(const card of pack.cards){
  assert.ok(!/(?:\b\d{2,3}\s*(?:mg|mcg|ml)\b)/i.test(card.lesson+' '+card.answer));
  assert.ok(!Object.hasOwn(card,'official_grade'));
  assert.ok(!Object.hasOwn(card,'patient'));
 }
});
