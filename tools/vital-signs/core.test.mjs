import test from 'node:test';
import assert from 'node:assert/strict';
import {TOPICS,EXAMPLES,QUESTIONS,SOURCES,STRIPS,ratePerMinute,getExample,changesFor,handoverText,grade,topicQuestions} from './core.mjs';

test('core topics unique and nonempty',()=>{
 assert.equal(TOPICS.length,7);
 assert.equal(new Set(TOPICS.map(t=>t.id)).size,7);
 for(const t of TOPICS)assert.match(t.chapter,/^saek-course-\d\d\.html#lesson-\d+$/);
});
test('synthetic pulse and respiratory counting arithmetic',()=>{
 assert.equal(ratePerMinute(19,15),76);
 assert.equal(ratePerMinute(8,30),16);
 assert.throws(()=>ratePerMinute(-2,15),RangeError);
 assert.throws(()=>ratePerMinute(8,0),RangeError);
 for(const type of ['pulse','resp'])for(const sample of STRIPS[type])assert.ok(ratePerMinute(sample.beats,sample.seconds)>0);
});
test('quality warning prevents unsafe SpO2 delta',()=>{
 const example=getExample('artefact');
 const changes=changesFor(example);
 assert.equal(changes.spo2,null);
 assert.equal(changes.needSignalCheck,true);
 assert.match(handoverText(example),/σήμα μη αξιόπιστο/);
 assert.equal(changesFor(getExample('stable')).spo2,0);
});
test('changes and handover use actual timestamps, no invented diagnosis',()=>{
 const example=getExample('change'),text=handoverText(example);
 assert.deepEqual(changesFor(example).times,['14:00','14:12']);
 assert.equal(changesFor(example).resp,6);
 assert.match(text,/14:00/);
 assert.match(text,/14:12/);
 assert.doesNotMatch(text,/υποξαιμία|έμφραγμα|διάγνωση:/i);
 assert.equal(EXAMPLES.length,3);
});
test('every question is valid and grade does not invent feedback',()=>{
 assert.ok(QUESTIONS.length>=12);
 assert.equal(new Set(QUESTIONS.map(q=>q.id)).size,QUESTIONS.length);
 for(const q of QUESTIONS){
  assert.ok(TOPICS.some(t=>t.id===q.topic));
  assert.ok(q.choices.length>=3);
  assert.ok(q.correct>=0 && q.correct<q.choices.length);
  assert.ok(grade(q.id,q.correct).correct);
  assert.ok(grade(q.id,(q.correct+1)%q.choices.length).correct===false);
  assert.ok(topicQuestions(q.topic).includes(q));
 }
 assert.throws(()=>grade('missing',0),RangeError);
});
test('only recognized source domains and read-only links',()=>{
 assert.equal(SOURCES.length,3);
 SOURCES.forEach(s=>assert.match(s.url,/^https:\/\/(www\.heart\.org|www\.fda\.gov|medlineplus\.gov)\//));
});
