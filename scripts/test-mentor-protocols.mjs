import test from 'node:test';
import assert from 'node:assert/strict';
import {CATEGORIES,TOPICS,OTHER_TOPICS,ALL_TOPICS,getTopic,isOfficiallyValidated} from '../protocols-data.mjs';
import {ROLES,CASE_BRIEFS,createStages,roleFor} from '../mentor-scenario-paths.mjs';

test('protocol taxonomy remains stable and every category has topics',()=>{
 assert.equal(CATEGORIES.length,6);
 assert.equal(TOPICS.length,12);
 const ids=new Set(TOPICS.map(x=>x.id));
 assert.equal(ids.size,TOPICS.length);
 for(const category of CATEGORIES){
  assert.ok(TOPICS.some(x=>x.category===category.id),category.id);
 }
});
test('all contextual MENTOR module links resolve to a known study topic',()=>{
 for(const id of ['pharmacy','anatomy','seminars','ecg','saek','eoppep']){
  assert.ok(OTHER_TOPICS.some(x=>x.id===id));
  assert.equal(getTopic(id).id,id);
 }
 assert.equal(ALL_TOPICS.length,18);
});
test('educational categories never claim independent operational protocol approval',()=>{
 assert.equal(isOfficiallyValidated(),false);
 for(const topic of TOPICS){
  assert.ok(topic.name&&topic.scenario&&topic.focus);
 }
});


test('all subjects have independent prehospital briefs and three distinct learner tracks',()=>{
 assert.deepEqual(ROLES.map(r=>r.id),['firstaid','responder','doctor']);
 assert.equal(Object.keys(CASE_BRIEFS).length,ALL_TOPICS.length);
 const prompts=new Set();
 for(const topic of ALL_TOPICS){
  for(const role of ROLES){
   const steps=createStages(topic,role.id);
   assert.equal(steps.length,4);
   assert.equal(steps[0].dimension,'Ασφάλεια και τεκμηρίωση');
   assert.ok(steps.every(step=>step.choices.length===3));
   assert.ok(steps.every(step=>step.choices.filter(choice=>choice[2]).length===1));
   assert.ok(steps.every(step=>step.choices.every(choice=>choice[3])));
  }
  assert.ok(!prompts.has(createStages(topic,'responder')[1].prompt));
  prompts.add(createStages(topic,'responder')[1].prompt);
 }
 assert.equal(roleFor('unknown').id,'responder');
});
