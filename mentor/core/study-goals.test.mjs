import test from 'node:test';
import assert from 'node:assert/strict';
import {PREF_KEY,normalizeStudyPreferences,readStudyPreferences,saveStudyPreferences,planForGoals} from './study-goals.mjs';

test('preferences accept only known goals, modes and minute options',()=>{
  assert.deepEqual(normalizeStudyPreferences({goals:['saek','saek','bogus','eoppep'],minutes:99,mode:'unknown'}),{
    goals:['saek','eoppep'],minutes:25,mode:'guided'
  });
  assert.deepEqual(normalizeStudyPreferences({goals:[],minutes:10,mode:'exam'}),{
    goals:[],minutes:10,mode:'exam'
  });
  assert.deepEqual(normalizeStudyPreferences(null),{goals:['saek'],minutes:25,mode:'guided'});
});

test('all goal plans retain the selected total minutes',()=>{
  for(const mode of ['guided','practice','exam'])
    for(const minutes of [10,15,25,30]){
      const plan=planForGoals({goals:['saek','eoppep','seminars'],mode,minutes});
      assert.equal(plan.length,3);
      for(const goal of plan){
        assert.equal(goal.tasks.reduce((n,x)=>n+x.minutes,0),minutes);
        assert.ok(goal.tasks.every(x=>x.minutes>=0));
        assert.ok(/\.html$/.test(goal.href));
      }
    }
});

test('preferences are isolated from every educational progress key',()=>{
  const map=new Map([
    ['ekab-eoppep-official-v15','{"EOP-A-001":{"selfAttempts":2}}'],
    ['ekab.saek.exams.v1','{"history":{"saek-01-01":{"incorrect":1}}}']
  ]);
  const storage={getItem:key=>map.get(key)||null,setItem:(key,value)=>map.set(key,value)};
  assert.equal(saveStudyPreferences(storage,{goals:['eoppep'],minutes:15,mode:'practice'}),true);
  assert.deepEqual(readStudyPreferences(storage),{goals:['eoppep'],minutes:15,mode:'practice'});
  assert.equal(map.get('ekab-eoppep-official-v15'),'{"EOP-A-001":{"selfAttempts":2}}');
  assert.equal(map.get('ekab.saek.exams.v1'),'{"history":{"saek-01-01":{"incorrect":1}}}');
  assert.ok(map.has(PREF_KEY));
  const unavailable={getItem:()=>{throw Error('blocked')},setItem:()=>{throw Error('blocked')}};
  assert.deepEqual(readStudyPreferences(unavailable),normalizeStudyPreferences(null));
  assert.equal(saveStudyPreferences(unavailable,{}),false);
});
