import test from 'node:test';
import assert from 'node:assert/strict';
import {ITEMS,expectedCount,qrsTimes,newPractice,answer,replay,debrief,load,save,clear,KEY,stripFor} from './ecg-practice.mjs';

test('every strip holds exactly bpm/10 QRS complexes, so the exercise has one correct count',()=>{
 for(const item of ITEMS){
  assert.equal(qrsTimes(item.bpm).length,expectedCount(item.bpm),String(item.bpm));
  assert.equal(stripFor(item).points.length,720);
 }
});
test('a full run records answers, keeps state replayable and rejects invalid input',()=>{
 let s=newPractice();
 for(const item of ITEMS)s=answer(s,expectedCount(item.bpm));
 assert.equal(s.completed,true);
 assert.deepEqual(replay(s),s);
 assert.throws(()=>answer(s,3),/invalid-practice/);
 assert.throws(()=>answer(newPractice(),-1),/invalid-count/);
 assert.throws(()=>answer(newPractice(),2.5),/invalid-count/);
 assert.throws(()=>replay({...s,answers:s.answers.map((a,i)=>i===0?{...a,correct:!a.correct}:a)}),/tampered-practice/);
});
test('the debrief names the direction of the errors and gives a concrete hint',()=>{
 let s=newPractice();
 for(const item of ITEMS)s=answer(s,expectedCount(item.bpm)-1); // always one too few
 const d=debrief(s);
 assert.equal(d.right,0);assert.equal(d.under,5);assert.equal(d.meanAbsError,10);
 assert.match(d.hint,/λιγότερα/);
 let t=newPractice();for(const item of ITEMS)t=answer(t,expectedCount(item.bpm));
 assert.equal(debrief(t).right,5);assert.match(debrief(t).hint,/ίδια μέθοδο/);
});
test('progress is stored only under its own key and storage failures are harmless',()=>{
 const map=new Map([['ekab.saek.exams.v1','{"score":8}']]);const writes=[];
 const store={getItem:k=>map.get(k)||null,setItem:(k,v)=>{writes.push(k);map.set(k,v);},removeItem:k=>{writes.push(k);map.delete(k);}};
 const s=answer(newPractice(),7);
 assert.equal(save(store,s),true);assert.deepEqual(load(store),s);assert.equal(clear(store),true);
 assert.ok(writes.every(k=>k===KEY));assert.equal(map.get('ekab.saek.exams.v1'),'{"score":8}');
 const blocked={getItem(){throw Error('x')},setItem(){throw Error('x')},removeItem(){throw Error('x')}};
 assert.deepEqual(load(blocked),newPractice());assert.equal(save(blocked,s),false);
});
