import test from 'node:test';
import assert from 'node:assert/strict';
import {validQuestion,readDestination,analyseLearning,choosePrimary} from './next-step.mjs';
const scheduler={evaluate:r=>({studied:r.studied===true,mastered:r.mastered===true}),isDue:r=>r.due===true};
test('only existing validated question and chapter identifiers count',()=>{
 assert.equal(validQuestion('EOP-A-105'),true);assert.equal(validQuestion('EOP-B-209'),true);
 assert.equal(validQuestion('EOP-A-106'),false);assert.equal(validQuestion('EOP-B-210'),false);
 const r=analyseLearning({eopRecords:{'EOP-A-001':{due:true,studied:true,selfAttempts:3},'EOP-A-999':{due:true}},saekReadKeys:['ekab.saek.read.v1.01.1','ekab.saek.read.v1.01.1','ekab.saek.read.v1.99.1'],scheduler});
 assert.equal(r.saek.read,1);assert.equal(r.eoppep.studied,1);assert.equal(r.eoppep.due,1);
 assert.equal(r.eoppep.recommendation.href,'theory.html?question=EOP-A-001');
});
test('no invented due recommendations when scheduler is unavailable',()=>{
 const r=analyseLearning({eopRecords:{'EOP-B-050':{selfAttempts:3,weak:2}}});
 assert.equal(r.eoppep.due,0);assert.equal(r.eoppep.attempted,1);
 assert.equal(r.eoppep.recommendation.source,'course-browser');
});
test('real resume is preferred for SAEK and safe question URLs',()=>{
 const resume={kind:'saek',course:'11',chapter:4};
 assert.equal(readDestination(resume).href,'saek-course-11.html#lesson-4');
 assert.equal(readDestination({kind:'saek',course:'../../evil',chapter:4}),null);
 assert.equal(readDestination({kind:'eoppep',mode:'reader',question:'https://evil'}),null);
 const r=analyseLearning({resume,saekHistory:{'saek-11-3':{incorrect:2}}});
 assert.equal(choosePrimary(r).href,'saek-course-11.html#lesson-4');
 assert.equal(r.saek.examMistakes,1);
});
test('due reviews outrank resuming other sections; explicit goal overrides',()=>{
 const r=analyseLearning({resume:{kind:'saek',course:'01',chapter:2},eopRecords:{'EOP-A-022':{due:true}},scheduler});
 assert.equal(choosePrimary(r).goal,'eoppep');
 assert.equal(choosePrimary(r,'saek').href,'saek-course-01.html#lesson-2');
});
test('no mutation of input study data',()=>{
 const state={selfAttempts:2,due:true,studied:true};
 const records={'EOP-A-001':state};
 const snap=JSON.stringify(records);
 analyseLearning({eopRecords:records,scheduler});
 assert.equal(JSON.stringify(records),snap);
});
