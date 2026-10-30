import test from 'node:test';
import assert from 'node:assert/strict';
import {CATEGORIES,TOPICS,OTHER_TOPICS,ALL_TOPICS,getTopic,isOfficiallyValidated} from '../protocols-data.mjs';

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
