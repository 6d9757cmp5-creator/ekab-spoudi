import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {selectReviewCases,buildReviewPacket,buildBlankBallot} from './prepare-greek-educator-review.mjs';
import {evaluateBallots} from './evaluate-greek-educator-review.mjs';
import {QUESTIONS as mentor} from '../mentor/core/oral-practice.mjs';

const bank=JSON.parse(readFileSync(new URL('../functions/answer-grader/greek-answer-fixtures.json',import.meta.url),'utf8'));
const selected=selectReviewCases(bank.cases);
const packet=buildReviewPacket(selected);
const fixtureFor=id=>bank.cases.find(x=>x.id===id);
const ballot=(who='teacher_A')=>({
 ...buildBlankBallot(selected),reviewerCode:who,qualification:'Εκπαιδευτής υπό έλεγχο προσόντων',
 independentAttestation:true,reviewedAt:'2026-11-01',
 entries: selected.map(c=>({caseId:c.id,verdict:'partial',rationale:'Εκπαιδευτική κρίση που θα ελεγχθεί από ανεξάρτητο αξιολογητή.',
  sourceCitation:'Εκπαιδευτική αναφορά της συγκεκριμένης ερώτησης',criticalSafetyError:false}))
});

test('review packet selects exactly 120 varied examples from original 300, excluding 500 mechanical orthography pairs',()=>{
 assert.equal(bank.cases.length,800);
 assert.equal(selected.length,120);
 assert.equal(new Set(selected.map(x=>x.id)).size,120);
 assert.ok(selected.every(x=>!x.id.startsWith('milestone800-')));
 assert.deepEqual(Object.fromEntries(['correct','partial','incorrect','uncertain'].map(v=>[v,selected.filter(x=>x.expected===v).length])),
  {correct:30,partial:30,incorrect:30,uncertain:30});
 assert.ok(new Set(selected.map(x=>x.section)).size>=4);
});
test('blind packet reveals source questions and responses but never preliminary answers, expected verdicts, source category of generated cases, or adjudication',()=>{
 assert.equal(packet.items.length,120);
 assert.equal(packet.containsProvisionalLabels,false);
 assert.equal(packet.students,'Synthetic examples ONLY; not actual learner records');
 for(const item of packet.items){
  assert.ok(item.studentAnswer?.length>=8);
  assert.ok(item.question?.length>=10);
  assert.ok(item.educationalReference?.length>=10);
  assert.ok(!Object.hasOwn(item,'expected'));
  assert.ok(!Object.hasOwn(item,'reason'));
  assert.ok(!Object.hasOwn(item,'fixtureKind'));
  assert.ok(!Object.hasOwn(item,'reviewStatus'));
  assert.ok(!Object.hasOwn(item,'fixtureGeneration'));
  assert.ok(!Object.hasOwn(item,'independentSemanticParaphrase'));
 }
 assert.doesNotMatch(JSON.stringify(packet),/milestone(?:300|800)-/);
 assert.ok(packet.items.every(x=>/^R-[a-f0-9]{18}$/.test(x.caseId)));
 assert.equal(new Set(packet.items.map(x=>x.caseId)).size,120);
});
test('packet generation deterministic across repeated runs and independent of fixture order',()=>{
 const next=selectReviewCases([...bank.cases].reverse());
 assert.deepEqual(next.map(x=>x.id),selected.map(x=>x.id));
 assert.deepEqual(buildReviewPacket(next),packet);
});
test('review packet resolves all five sections from repository-backed educational references',()=>{
 assert.ok(packet.items.some(x=>x.section==='eoppep'));
 assert.ok(packet.items.some(x=>x.section==='saek'));
 assert.ok(packet.items.some(x=>x.section==='seminar_case'));
 assert.ok(packet.items.some(x=>x.section==='mentor_oral'));
 assert.ok(packet.items.some(x=>x.section==='seminar'));
 for(const item of packet.items){
  assert.ok(item.source&&item.source.length>12);
  if(item.section==='mentor_oral'){
   const original=mentor.find(x=>x.id===item.questionId);
   assert.equal(item.question,original.prompt);
  }
 }
});
test('blank review template is not a valid completed human review',()=>{
 const empty=buildBlankBallot(selected);
 assert.equal(empty.entries.length,120);
 assert.equal(empty.independentAttestation,false);
 assert.equal(empty.entries[0].verdict,null);
 assert.throws(()=>evaluateBallots(packet,empty,ballot('teacher_B')),/Review rejected/);
});
test('matching ballots produce consensus CANDIDATES but zero certified gold-standard grades',()=>{
 const a=ballot('teacher_A'),b=ballot('teacher_B');
 const report=evaluateBallots(packet,a,b);
 assert.equal(report.total,120);
 assert.equal(report.twoReviewerAgreementCount,120);
 assert.equal(report.twoReviewerDisagreementCount,0);
 assert.equal(report.goldStandardCount,0);
 assert.equal(report.medicallyCertified,false);
 assert.equal(report.modelQualityAccuracy,'NOT_MEASURED');
 assert.ok(report.agreement.every(x=>x.sourceVerification.includes('MANUAL')));
});
test('different verdict or safety flags cause adjudication, not silent majority or full grading',()=>{
 const a=ballot('teacher_A'),b=ballot('teacher_B');
 b.entries[0].verdict='incorrect';
 b.entries[1].criticalSafetyError=true;b.entries[1].verdict='incorrect';
 const result=evaluateBallots(packet,a,b);
 assert.equal(result.twoReviewerDisagreementCount,2);
 assert.equal(result.safetyConcernCount,1);
 assert.equal(result.twoReviewerAgreementCount,118);
 assert.equal(result.goldStandardCount,0);
 assert.ok(result.disagreement.every(x=>x.action.includes('adjudication')));
});
test('same reviewer, duplicate case, false independent attestation or incomplete responses are rejected',()=>{
 const a=ballot('teacher_A'),b=ballot('teacher_A');
 assert.throws(()=>evaluateBallots(packet,a,b),/DIFFERENT/);
 b.reviewerCode='teacher_B';b.independentAttestation=false;
 assert.throws(()=>evaluateBallots(packet,a,b),/attestation/);
 b.independentAttestation=true;b.entries[0].caseId=b.entries[1].caseId;
 assert.throws(()=>evaluateBallots(packet,a,b),/duplicate/);
 b.entries[0].caseId=packet.items[0].caseId;b.entries[0].rationale='';
 assert.throws(()=>evaluateBallots(packet,a,b),/rationale/);
 b.entries[0].rationale='Κατάλληλη συγκεκριμένη αιτιολόγηση ελέγχου.';b.entries[0].sourceCitation='';
 assert.throws(()=>evaluateBallots(packet,a,b),/citation/);
});
test('critical safety errors are never accepted as correct even when claimed by a reviewer',()=>{
 const a=ballot('teacher_A'),b=ballot('teacher_B');
 a.entries[0].verdict='correct';a.entries[0].criticalSafetyError=true;
 assert.throws(()=>evaluateBallots(packet,a,b),/critical safety error/);
});
