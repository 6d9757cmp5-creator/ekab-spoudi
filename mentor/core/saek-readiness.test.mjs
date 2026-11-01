import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {readinessForCourse} from './saek-readiness.mjs';

// The real SAEK difficulty engine is the single source of truth for thresholds.
const context={window:{},Date,Math};
runInNewContext(readFileSync(new URL('../../saek-exam-engine.js',import.meta.url),'utf8'),context);
const level=context.window.EkabSaekExamEngine.getLevel;
const make=(course,n,extra=0)=>Object.fromEntries(Array.from({length:n},(_,i)=>[
 'saek-'+course+'-'+(i+1),{correct:1+(i<extra?1:0),partial:0,incorrect:0,lastAt:Date.now()}
]));

test('SAEK begins with a simple lesson per course, never with advanced medicine',()=>{
 const a=readinessForCourse('01',{},level);
 assert.equal(a.stage,'foundation');
 assert.equal(a.estimated_only,true);
 assert.equal(a.clinically_qualified,false);
 assert.match(a.guidance,/Απλή θεωρία/);
 assert.throws(()=>readinessForCourse('21',{},level),/Invalid SAEK/);
});
test('one course deepens from evidence in multiple questions without upgrading another course',()=>{
 const h=make('01',6,2); // 8 correct attempts across six distinct questions.
 assert.equal(readinessForCourse('01',h,level).stage,'reinforce');
 assert.equal(readinessForCourse('02',h,level).stage,'foundation');
});
test('high practice evidence proposes deeper application, not certified mastery',()=>{
 const h=make('05',12,8); // 20 correct attempts, 12 distinct questions.
 const advanced=readinessForCourse('05',h,level);
 assert.equal(advanced.stage,'extend');
 assert.equal(advanced.estimated_only,true);
 assert.equal(advanced.clinically_qualified,false);
 h['saek-05-1'].incorrect=10;
 assert.equal(readinessForCourse('05',h,level).stage,'reinforce');
});
test('course recommendation is pure and does not write any student assessment record',()=>{
 const h=make('09',6,2),before=JSON.stringify(h);
 const recommendation=readinessForCourse('09',h,level);
 assert.equal(JSON.stringify(h),before);
 assert.ok(Object.isFrozen(recommendation));
});
test('repository policy permanently reserves Medicine for the internal ATLA AI source registry',()=>{
 const ag=readFileSync(new URL('../../AGENTS.md',import.meta.url),'utf8');
 const contract=readFileSync(new URL('../../docs/ATLA-ADAPTIVE-LEARNING-CONTRACT.md',import.meta.url),'utf8');
 const library=readFileSync(new URL('../../mentor-library.html',import.meta.url),'utf8');
 assert.match(ag,/ATLA-ADAPTIVE-LEARNING-CONTRACT.md/);
 assert.match(contract,/μία ίδια οθόνη μαθήματος/);
 assert.match(contract,/Ιατρική ΔΕΝ είναι τώρα εκπαιδευτικός τομέας μαθητή/);
 assert.doesNotMatch(library,/<option value="medicine">/);
});
