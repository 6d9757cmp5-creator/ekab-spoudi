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

test('offline practice corpus contains 100 synthetic cases across SAEK and EOPPEP; labels unverified',()=>{
 assert.equal(corpus.cases.length,100);
 assert.equal(corpus.medicalValidation,'not_performed');
 assert.equal(corpus.modelExecution,'none');
 assert.match(corpus.labelProvenance,/provisional/);
 const found=new Set(corpus.cases.map(x=>x.section));
 assert.deepEqual([...found].sort(),['eoppep','mentor_oral','saek','seminar']);
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
  }else if(c.section==='saek'){
   const sae=read('./saek-exam-rubrics.json');
   const q=sae.items.find(x=>x.id===c.questionId);
   assert.ok(q&&q.question&&q.answer,c.id);
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

test('milestone 100: cover 20 distinct EOPPEP questions and seven SAEK exercises',()=>{
 const counts=corpus.cases.reduce((out,x)=>(out[x.section]=(out[x.section]||0)+1,out),{});
 assert.deepEqual(counts,{eoppep:67,mentor_oral:6,seminar:6,saek:21});
 const eopIds=new Set(corpus.cases.filter(x=>x.section==='eoppep').map(x=>x.questionId));
 const saekIds=new Set(corpus.cases.filter(x=>x.section==='saek').map(x=>x.questionId));
 assert.equal(eopIds.size,20);
 assert.equal(saekIds.size,7);
 for(let n=1;n<=20;n++)assert.ok(eopIds.has('EOP-A-'+String(n).padStart(3,'0')));
 for(const id of ['saek-01-9','saek-02-2','saek-03-3','saek-03-5','saek-04-2','saek-19-3','saek-20-8'])assert.ok(saekIds.has(id));
});
test('the 100 synthetic examples contain varied outcomes but zero independently verified educational labels',()=>{
 const labels=corpus.cases.reduce((a,c)=>(a[c.expected]=(a[c.expected]||0)+1,a),{});
 assert.ok(labels.correct>=30&&labels.partial>=25&&labels.incorrect>=25&&labels.uncertain>=5);
 assert.ok(corpus.cases.every(c=>c.reviewStatus==='pending_independent_educator_review'));
 assert.ok(corpus.cases.every(c=>c.provenance==='synthetic_written_for_regression'));
 assert.ok(corpus.cases.some(c=>c.section==='saek'&&c.expected==='incorrect'&&/δεν/i.test(c.answer)));
});
test('provisional answers are distinguishable, not duplicate text that artificially inflates the milestone',()=>{
 const identities=new Set(),textsByQuestion=new Set();
 for(const c of corpus.cases){
  const identity=[c.section,c.courseId||'',c.questionId||'',c.questionIndex??'',c.id].join(':');
  assert.ok(!identities.has(identity),identity);identities.add(identity);
  const text=[c.section,c.questionId||`${c.courseId}:${c.questionIndex}`,c.answer.normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^\p{L}\p{N}]+/gu,' ').toLowerCase().trim()].join(':');
  assert.ok(!textsByQuestion.has(text),c.id);
  textsByQuestion.add(text);
 }
});
