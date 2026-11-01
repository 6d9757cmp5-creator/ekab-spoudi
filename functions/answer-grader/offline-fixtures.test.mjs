/**
 * Synthetic educational test cases: NO API requests, NO model-weight training.
 * These checks verify reference alignment and conservative safety guards only.
 * The provisional labels are NOT verified student grades.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {protectCompleteness} from './source-completeness.mjs';
import {QUESTIONS as mentor} from '../../mentor/core/oral-practice.mjs';

const read=path=>JSON.parse(readFileSync(new URL(path,import.meta.url),'utf8'));
const corpus=read('./greek-answer-fixtures.json');
const eoppep=read('./eoppep-rubrics.json');
const seminars=read('./seminar-rubrics.json');
const verdicts=new Set(['correct','partial','incorrect','uncertain']);

test('offline practice corpus contains 37 synthetic cases from multiple sections; no claims of verified grades',()=>{
 assert.equal(corpus.cases.length,37);
 assert.equal(corpus.medicalValidation,'not_performed');
 assert.equal(corpus.modelExecution,'none');
 assert.match(corpus.labelProvenance,/provisional/);
 const found=new Set(corpus.cases.map(x=>x.section));
 assert.deepEqual([...found].sort(),['eoppep','mentor_oral','seminar']);
});
test('every offline case has unique identifiers, a source-controlled question and a provisional judgment',()=>{
 const seen=new Set();
 for(const c of corpus.cases){
  assert.ok(typeof c.id==='string'&&!seen.has(c.id),c.id);seen.add(c.id);
  assert.ok(verdicts.has(c.expected),c.id);
  assert.ok(c.answer?.length>=8,c.id);
  assert.ok(c.reason?.length>=8,c.id);
  assert.equal(c.provenance,'synthetic_written_for_regression');
  assert.equal(c.reviewStatus,'pending_independent_educator_review');
  if(c.section==='eoppep'){
   const q=eoppep.find(x=>x.id===c.questionId);
   assert.ok(q&&q.question&&q.answer&&q.answerStatus==='reviewed_educational',c.id);
  }else if(c.section==='mentor_oral'){
   const q=mentor.find(x=>x.id===c.questionId);
   assert.ok(q&&q.checks.length===3,c.id);
  }else if(c.section==='seminar'){
   const track=seminars.find(x=>x.id===c.courseId);
   assert.ok(track&&Number.isInteger(c.questionIndex)&&c.questionIndex>=0&&c.questionIndex<48,c.id);
   const unit=track.units[Math.floor(c.questionIndex/4)];
   assert.ok(unit?.length>=5,c.id);
  }else assert.fail('Unexpected grading section '+c.section);
 }
});
test('diverse Greek examples include full, partial, incorrect and ambiguous answers',()=>{
 const counts=Object.fromEntries([...verdicts].map(v=>[v,corpus.cases.filter(c=>c.expected===v).length]));
 assert.ok(counts.correct>=10&&counts.partial>=10&&counts.incorrect>=8&&counts.uncertain>=4);
 const nasal=corpus.cases.filter(c=>c.questionId==='EOP-A-001');
 assert.equal(nasal.length,6);
 assert.ok(nasal.some(c=>/μυτη το αερα/.test(c.answer)), 'Must retain user-provided counterexample');
 assert.ok(corpus.cases.some(c=>/δεν|ΔΕΝ/.test(c.answer)&&c.expected==='incorrect'));
});
test('offline guard never upgrades a provisional incorrect/partial response to correct',()=>{
 const nasal=corpus.cases.filter(c=>c.questionId==='EOP-A-001');
 for(const item of nasal){
  const raw={verdict:item.expected,criticalError:false,correctPoints:[],missingPoints:[],explanation:''};
  const output=protectCompleteness({id:item.questionId},item.answer,raw);
  if(item.expected!=='correct')assert.notEqual(output.verdict,'correct',item.id);
 }
});
test('the original three-function example cannot become full credit even if the model says correct',()=>{
 const example=corpus.cases.find(x=>x.id==='nasal-three-words');
 const raw={verdict:'correct',criticalError:false,correctPoints:['καθαρισμός'],missingPoints:[],explanation:'Όλα σωστά'};
 const result=protectCompleteness({id:example.questionId},example.answer,raw);
 assert.equal(result.verdict,'partial');
 assert.ok(result.missingPoints.some(x=>/όσφρηση/.test(x)));
 assert.ok(result.missingPoints.some(x=>/κροσσοί/.test(x)));
});
test('explicit negation or unknown synonyms do not receive automatic full credit',()=>{
 const negated=corpus.cases.find(x=>x.id==='nasal-negation');
 const verdict=protectCompleteness({id:'EOP-A-001'},negated.answer,{verdict:'correct',criticalError:false});
 assert.equal(verdict.verdict,'uncertain');
 const vague=corpus.cases.find(x=>x.id==='nasal-too-vague');
 assert.equal(protectCompleteness({id:'EOP-A-001'},vague.answer,{verdict:'correct'}).verdict,'uncertain');
});
