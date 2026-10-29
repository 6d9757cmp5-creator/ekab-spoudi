import test from 'node:test';
import assert from 'node:assert/strict';
import {QUESTIONS,getOralQuestion,checklistSummary} from './oral-practice.mjs';
test('oral-rehearsal question set has distinct IDs, Greek prompts and review cues',()=>{
 assert.equal(QUESTIONS.length,6);
 assert.equal(new Set(QUESTIONS.map(q=>q.id)).size,6);
 assert.ok(QUESTIONS.every(q=>q.prompt.length>45&&q.checks.length===3));
 assert.throws(()=>getOralQuestion(-1),/invalid-oral/);
 assert.throws(()=>getOralQuestion(6),/invalid-oral/);
});
test('checklist reports manual inspection only, no official or clinical grade',()=>{
 const out=checklistSummary(0,[0,2]);
 assert.deepEqual(out,{checked:2,total:3,note:'Αυτοέλεγχος 2 από 3 σημείων. Δεν υπάρχει αυτόματη βαθμολόγηση ή έλεγχος ακρίβειας απάντησης.'});
 assert.throws(()=>checklistSummary(0,[0,0]),/invalid-oral-checklist/);
 assert.throws(()=>checklistSummary(0,[4]),/invalid-oral-checklist/);
 assert.equal(QUESTIONS.every(q=>!('answer' in q)&&!('grade' in q)&&!('diagnosis' in q)),true);
});
