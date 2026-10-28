import test from 'node:test';
import assert from 'node:assert/strict';
import {readLegacySnapshot} from './legacy-readonly.mjs';
test('mentor reads old SAEK/EOPPEP data without altering a single key',()=>{
  const values=new Map([
    ['ekab-eoppep-official-v15',JSON.stringify({'EOP-A-001':{selfAttempts:3},'EOP-A-002':{seen:1}})],
    ['ekab.saek.exams.v1',JSON.stringify({history:{'saek-01-1':{correct:1,partial:0,incorrect:0,lastAt:1}}})],
    ['ekab.saek.read.v1.01.1','1'],['ekab.saek.read.v1.02.2','1'],
    ['ekab.personal-notes.v1','{"a":"private"}']
  ]);
  const before=[...values.entries()];
  const readOnly={
    get length(){return values.size},
    key(i){return [...values.keys()][i]},
    getItem(k){return values.get(k)||null},
    setItem(){throw Error('legacy-mutation!')},
    removeItem(){throw Error('legacy-mutation!')}
  };
  const counts=readLegacySnapshot(readOnly);
  assert.equal(counts.saek_read_records,2);
  assert.equal(counts.saek_exam_question_records,1);
  assert.equal(counts.eoppep_attempt_records,1);
  assert.deepEqual([...values.entries()],before);
});
test('malformed legacy counters cannot crash the mentor display',()=>{
  const storage={length:0,key:()=>null,getItem:()=>'{broken'};
  assert.deepEqual(readLegacySnapshot(storage).eoppep_attempt_records,0);
});
