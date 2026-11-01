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

test('offline practice corpus contains 800 synthetic cases across all written-answer sections; labels unverified',()=>{
 assert.equal(corpus.cases.length,800);
 assert.equal(corpus.medicalValidation,'not_performed');
 assert.equal(corpus.modelExecution,'none');
 assert.match(corpus.labelProvenance,/provisional/);
 const found=new Set(corpus.cases.map(x=>x.section));
 assert.deepEqual([...found].sort(),['eoppep','mentor_oral','saek','seminar','seminar_case']);
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
  }else if(c.section==='seminar_case'){
   const track=seminars.find(x=>x.id===c.courseId);
   assert.ok(track&&Number.isInteger(c.caseIndex)&&c.caseIndex>=0&&c.caseIndex<12,c.id);
   const unit=track.units[c.caseIndex];assert.ok(unit?.length===5,c.id);
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

test('milestone 300: extend the original coverage to 36 EOPPEP questions, 22 SAEK exercises and 5 clinical scenarios',()=>{
 const first300=corpus.cases.filter(x=>!x.id.startsWith('milestone800-'));
 assert.equal(first300.length,300);
 const counts=first300.reduce((out,x)=>(out[x.section]=(out[x.section]||0)+1,out),{});
 assert.deepEqual(counts,{eoppep:147,mentor_oral:26,seminar:6,saek:96,seminar_case:25});
 const eopIds=new Set(corpus.cases.filter(x=>x.section==='eoppep').map(x=>x.questionId));
 const saekIds=new Set(corpus.cases.filter(x=>x.section==='saek').map(x=>x.questionId));
 assert.equal(eopIds.size,161);
 assert.equal(saekIds.size,147);
 for(let n=1;n<=36;n++)assert.ok(eopIds.has('EOP-A-'+String(n).padStart(3,'0')));
 for(const id of ['saek-01-9','saek-02-2','saek-03-3','saek-03-5','saek-04-2','saek-19-3','saek-20-8'])assert.ok(saekIds.has(id));
});
test('the 800 synthetic examples contain provisional labels and no independently verified educational labels',()=>{
 const labels=corpus.cases.reduce((a,c)=>(a[c.expected]=(a[c.expected]||0)+1,a),{});
 assert.deepEqual(labels,{correct:623,partial:59,incorrect:71,uncertain:47});
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

test('300-case milestones are linked to 40 authored topic packs and not duplicated filler',()=>{
 const packs=['eoppep','saek','scenarios'].flatMap(group=>read('./greek-answer-fixtures-300-seeds-'+group+'.json'));
 assert.equal(packs.length,40);
 assert.equal(packs.filter(x=>x.section==='eoppep').length,16);
 assert.equal(packs.filter(x=>x.section==='saek').length,15);
 assert.equal(packs.filter(x=>x.section==='seminar_case').length,5);
 assert.equal(packs.filter(x=>x.section==='mentor_oral').length,4);
 let sum=0;
 const uniqueKeys=new Set();
 for(const pack of packs){
  assert.ok(pack.slug&&!uniqueKeys.has(pack.slug),pack.slug);uniqueKeys.add(pack.slug);
  assert.equal(pack.answers.length,5,pack.slug);
  assert.ok(pack.answers.every(x=>typeof x==='string'&&x.trim().length>=8),pack.slug);
  for(const answer of pack.answers){
   const row=corpus.cases.find(x=>x.id==='milestone300-'+pack.slug+'-'+['formal','conversational','incomplete','contradiction','ambiguous'][pack.answers.indexOf(answer)]);
   assert.ok(row,pack.slug);
   assert.equal(row.answer,answer,pack.slug);
   assert.equal(row.section,pack.section,pack.slug);
   if(pack.questionId)assert.equal(row.questionId,pack.questionId,pack.slug);
   if(pack.courseId){assert.equal(row.courseId,pack.courseId);assert.equal(row.caseIndex,pack.caseIndex);}
   sum++;
  }
 }
 assert.equal(sum,200);
 assert.equal(corpus.cases.filter(x=>x.id.startsWith('milestone300-')).length,200);
});
test('do not demand reference-only details from concise questions',()=>{
 for(const id of [
 'milestone300-formula-incomplete',
 'milestone300-joints-incomplete',
 'milestone300-bile-incomplete',
 'milestone300-virus-incomplete',
 'milestone300-airflow-incomplete',
 'milestone300-dizziness-incomplete',
 'milestone300-stretcher-incomplete',
 'milestone300-contraindication-incomplete',
 'milestone300-trauma-bleeding-incomplete',
 'milestone300-student-autonomy-incomplete'
 ]){
  const row=corpus.cases.find(c=>c.id===id);
  assert.equal(row?.expected,'correct',id);
  assert.equal(row?.fixtureKind,'concise_complete',id);
  assert.match(row.reason,/δεν απαιτούνται/);
 }
 const unverified=corpus.cases.find(c=>c.id==='milestone300-debrief-incomplete');
 assert.equal(unverified.expected,'uncertain');
});
test('all five safety seminar tracks have an authored scenario plus mentor has all six oral questions',()=>{
 const scenarios=corpus.cases.filter(c=>c.section==='seminar_case');
 assert.equal(scenarios.length,25);
 assert.deepEqual([...new Set(scenarios.map(x=>x.courseId))].sort(),['als','bls','ils','pbls','phtls']);
 const mentorIds=new Set(corpus.cases.filter(c=>c.section==='mentor_oral').map(c=>c.questionId));
 assert.equal(mentorIds.size,6);
 for(const q of mentor)assert.ok(mentorIds.has(q.id),q.id);
});

test('milestone 800 has 250 new distinct questions and exactly 500 reference-preserving Greek fixtures',()=>{
 const latest=corpus.cases.filter(x=>x.id.startsWith('milestone800-'));
 assert.equal(latest.length,500);
 assert.equal(latest.filter(x=>x.section==='eoppep').length,250);
 assert.equal(latest.filter(x=>x.section==='saek').length,250);
 const keys=new Set(latest.map(x=>x.section+':'+x.questionId));
 assert.equal(keys.size,250);
 const exact=latest.filter(x=>x.fixtureKind==='reference_anchor');
 const colloquial=latest.filter(x=>x.fixtureKind==='orthography_tolerance');
 assert.equal(exact.length,250);assert.equal(colloquial.length,250);
 assert.ok(latest.every(x=>x.expected==='correct'&&x.fixtureGeneration==='deterministic_source_preserving'));
 assert.ok(latest.every(x=>x.independentSemanticParaphrase===false&&x.referenceOrigin==='project_server_rubric'));
 const allSections=corpus.cases.reduce((a,x)=>(a[x.section]=(a[x.section]||0)+1,a),{});
 assert.deepEqual(allSections,{eoppep:397,mentor_oral:26,seminar:6,saek:346,seminar_case:25});
 const saekCourses=new Set(latest.filter(x=>x.section==='saek').map(x=>x.questionId.split('-')[1]));
 assert.equal(saekCourses.size,20,'new SAEK examples must cover all 20 courses');
});
test('milestone 800 Greek fixtures reproduce references and preserve numerical values and negations',()=>{
 const sourceE=new Map(eoppep.map(x=>[x.id,x.answer]));
 const sourceS=new Map(read('./saek-exam-rubrics.json').items.map(x=>[x.id,x.answer]));
 const latest=corpus.cases.filter(x=>x.id.startsWith('milestone800-'));
 function informal(answer){return 'Με απλα λογια: '+answer.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('el-GR').replace(/(?:^|\s)και(?=\s|[,.·;:])/g,' κ').replace(/\s+·\s+/g,', ').replace(/\s+/g,' ').trim();}
 const groups=new Map();
 for(const item of latest){
  const ref=item.section==='eoppep'?sourceE.get(item.questionId):sourceS.get(item.questionId);
  assert.ok(ref,item.id);
  const expected=item.fixtureKind==='reference_anchor'?ref.trim():informal(ref.trim());
  assert.equal(item.answer,expected,item.id);
  assert.equal(item.reviewStatus,'pending_independent_educator_review');
  assert.equal(item.provenance,'synthetic_written_for_regression');
  const refNumbers=(ref.match(/\d+(?:[.,]\d+)*/g)||[]).join('|');
  const answerNumbers=(item.answer.match(/\d+(?:[.,]\d+)*/g)||[]).join('|');
  assert.equal(answerNumbers,refNumbers,'numbers/doses must remain intact: '+item.id);
  const refNeg=(ref.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('el-GR').match(/(?:^|\s)(?:δεν|μην|οχι|χωρις)(?=\s|[,.·;:])/g)||[]).length;
  const answerNeg=(item.answer.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('el-GR').match(/(?:^|\s)(?:δεν|μην|οχι|χωρις)(?=\s|[,.·;:])/g)||[]).length;
  assert.equal(answerNeg,refNeg,'negation must remain intact: '+item.id);
  const k=item.section+':'+item.questionId;
  if(!groups.has(k))groups.set(k,new Set());
  groups.get(k).add(item.fixtureKind);
 }
 assert.equal(groups.size,250);
 for(const types of groups.values())assert.deepEqual([...types].sort(),['orthography_tolerance','reference_anchor']);
});
test('milestone 800 positives are a targeted spelling robustness bank, not independent answers or balanced accuracy evidence',()=>{
 const latest=corpus.cases.filter(x=>x.id.startsWith('milestone800-'));
 assert.ok(latest.every(x=>x.expected==='correct'));
 assert.ok(latest.every(x=>x.reason.includes('Προσωριν')||x.reason.includes('προσωριν')));
 assert.ok(latest.every(x=>x.independentSemanticParaphrase===false));
 assert.equal(corpus.medicalValidation,'not_performed');
 assert.equal(corpus.modelExecution,'none');
});
