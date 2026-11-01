import test from 'node:test';
import assert from 'node:assert/strict';
import {resolveChoice} from './workflow.mjs';
test('shared transition supports simple and multi-observation stages without AI',()=>{
 const phases=[{id:'a',actions:[{id:'yes',outcome:'practice'},{id:'no',outcome:'review'}]}];
 assert.equal(resolveChoice(phases,0,'yes').nextIndex,1);
 assert.equal(resolveChoice(phases,0,'no').nextIndex,0);
 const multi=[{id:'observe',required_marks:['one','two'],actions:[
  {id:'one',mark:'one',outcome:'practice'},{id:'two',mark:'two',outcome:'practice'},
  {id:'skip',outcome:'review'}]}];
 const first=resolveChoice(multi,0,'one');
 assert.equal(first.nextIndex,0);
 assert.deepEqual(first.marks,['one']);
 const finish=resolveChoice(multi,0,'two',first.marks);
 assert.equal(finish.nextIndex,1);
 assert.deepEqual(finish.marks,[]);
 assert.throws(()=>resolveChoice(multi,0,'one',['one']),/already-observed/);
 assert.equal(resolveChoice(multi,0,'skip',['one']).nextIndex,0);
 assert.deepEqual(resolveChoice(multi,0,'skip',['one']).marks,['one']);
});
