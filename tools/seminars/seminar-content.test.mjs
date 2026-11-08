// Pins the ERC 2025 facts in the seminar content, so a later edit cannot silently drop or revert them.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const root=new URL('../../',import.meta.url);
const context={window:{}};
vm.runInNewContext(readFileSync(new URL('tools/seminars/seminar-tracks.js',root),'utf8'),context);
// Copy out of the sandbox realm so deepEqual compares plain values.
const COURSES=JSON.parse(JSON.stringify(context.window.EkabSeminarTracks)),MCQ=JSON.parse(JSON.stringify(context.window.EkabSeminarMCQ));
const course=id=>COURSES.find(c=>c.id===id);
const text=id=>JSON.stringify(course(id).units)+JSON.stringify(MCQ[id]);

test('same shape the seminar page validates: 5 courses, 12 units of 5, 12 MCQs with 4 distinct options',()=>{
 assert.deepEqual(COURSES.map(c=>c.id),['bls','pbls','ils','phtls','als']);
 for(const c of COURSES){
  assert.equal(c.units.length,12,c.id);
  assert.ok(c.units.every(u=>u.length===5&&u.every(s=>typeof s==='string'&&s.trim())),c.id);
  assert.equal(MCQ[c.id].length,12,c.id);
  assert.ok(MCQ[c.id].every(q=>q.length===6&&new Set(q.slice(1,5)).size===4),c.id);
  assert.ok(c.sources?.length,c.id+' cites its guidelines');
 }
});
test('the grader grades against the same content the learner reads',()=>{
 const rubrics=JSON.parse(readFileSync(new URL('functions/answer-grader/seminar-rubrics.json',root),'utf8'));
 assert.deepEqual(rubrics.map(r=>r.units),COURSES.map(c=>c.units));
});
test('BLS 2025: call before checking breathing, 100–120/min, 5–6 cm, 30:2, choking 5+5',()=>{
 const bls=course('bls').units;
 assert.match(bls[2][1],/πριν ελέγξεις την αναπνοή/);
 assert.ok(bls.findIndex(u=>u[0]==='Κλήση βοήθειας')<bls.findIndex(u=>u[0]==='Αναπνοή και gasping'));
 const t=text('bls');
 for(const fact of ['100–120','5 cm','6 cm','30:2','10 δευτερόλεπτα','5 χτυπήματα στην πλάτη','5 κοιλιακές ωθήσεις'])assert.ok(t.includes(fact),fact);
});
test('PBLS 2025: 5 initial breaths, 15:2 if trained else 30:2, one third depth never over 6 cm, 25 kg AED',()=>{
 const t=text('pbls');
 for(const fact of ['5 αρχικές εμφυσήσεις','15:2','30:2','ένα τρίτο','6 cm','25 kg','δύο αντίχειρων','θωρακικές ωθήσεις'])assert.ok(t.includes(fact),fact);
 assert.doesNotMatch(t,/4 cm/,'the 2025 guideline gives no fixed infant depth in cm');
});
test('ALS 2025: shocks, adrenaline and amiodarone timing, post-ROSC targets, bradycardia',()=>{
 const t=text('als');
 for(const fact of ['150 J','1 mg','μετά το 3ο σοκ','3–5 λεπτά','300 mg','150 mg','5 δευτερόλεπτα','10 φορές το λεπτό','94–98%','37,5','500 μg','3 mg','μπρος-πίσω'])assert.ok(t.includes(fact),fact);
 assert.match(t,/εξουσιοδοτημένο προσωπικό/,'doses are knowledge, not authority to give drugs');
});
test('ILS and PHTLS keep their key steps',()=>{
 for(const fact of ['ABCDE','SBAR','υπεργλωττιδική','94–98%'])assert.ok(text('ils').includes(fact),fact);
 for(const fact of ['XABCDE','5–7 cm','μειζόνων τροχαντήρων','ATMIST','αεριζόμενο'])assert.ok(text('phtls').includes(fact),fact);
});
