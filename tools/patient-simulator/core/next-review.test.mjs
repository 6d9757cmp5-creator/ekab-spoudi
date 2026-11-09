import test from 'node:test';
import assert from 'node:assert/strict';
import {newSession,execute,askPatient,nextMinute,setFocus} from './next-sim.mjs';
import {patientPose,patientEvidence,missionEvidence,vitalTrend,buildEvidenceReport,buildHandoverDraft} from './next-review.mjs';
test('evidence separates observations per patient and keeps global scene safety',()=>{
 let s=newSession();s=execute(s,'exam','scene');s=execute(s,'dialogue','symptoms');s=execute(s,'exam','initial');
 let e=missionEvidence(s);assert(e.shared.find(x=>x.id==='safety').done);
 assert(e.people.find(x=>x.id==='a').covered===2);assert(e.people.find(x=>x.id==='b').covered===0);
 s=setFocus(s,'b','full');s=askPatient(s,'Τι αισθάνεστε;');
 e=missionEvidence(s);assert.equal(e.people[1].covered,1);assert.equal(e.people[0].covered,2);
});
test('patient positions are visual only and independent',()=>{
 let s=execute(newSession(),'position','seated');assert.equal(patientPose(s,'a'),'seated');assert.equal(patientPose(s,'b'),'standing');
 assert.deepEqual(patientEvidence(s,'a').steps.map(x=>x.done),[false,false,false,false]);
 s=setFocus(s,'b','full');s=execute(s,'position','reclined');assert.equal(patientPose(s,'b'),'reclined');
});
test('vital trend uses exact synthetic time values, no treatment effect',()=>{
 let s=nextMinute(newSession(),5);let series=vitalTrend(s,'a','spo2');assert.equal(series.length,6);assert.equal(series[0].minute,0);
 assert.equal(series.at(-1).minute,s.minute);assert.throws(()=>vitalTrend(s,'a','bp'));
});
test('debrief flags premature handover and produces no clinical score',()=>{
 let s=execute(newSession(),'interventions','handover');
 const e=missionEvidence(s);assert(e.caution.length>=1);
 assert.match(buildEvidenceReport(s),/Μόνο εκπαιδευτική/);assert(!buildEvidenceReport(s).includes('βαθμός:'));
});

test('S/B/A/R starts with missing observations, never fabricates vitals or treatment',()=>{
 const session=newSession(),draft=buildHandoverDraft(session,'a');
 assert.match(draft,/S \/ ΚΑΤΑΣΤΑΣΗ/);
 assert.match(draft,/B \/ ΙΣΤΟΡΙΚΟ/);
 assert.match(draft,/A \/ ΚΑΤΑΓΕΓΡΑΜΜΕΝΕΣ/);
 assert.match(draft,/R \/ ΣΥΣΤΑΣΗ Ή ΑΙΤΗΜΑ/);
 assert.match(draft,/Δεν καταγράφηκαν συνθετικά ζωτικά/);
 assert.doesNotMatch(draft,/HR 106|SpO₂ 97|διάγνωση:/);
 assert.match(draft,/Δεν διατυπώνεται θεραπευτική ή κλινική σύσταση/);
 assert.throws(()=>buildHandoverDraft(session,'c'),/unknown-person/);
});
test('S/B/A/R isolates patient records; includes only explicitly recorded synthetic values',()=>{
 let s=execute(newSession('eoppep-practical-2'),'exam','scene');
 s=execute(s,'dialogue','symptoms');
 s=execute(s,'monitor','record');
 const a=buildHandoverDraft(s,'a'),b=buildHandoverDraft(s,'b');
 const monitorEvent=s.events.find(e=>e.actionId==='record');
 assert(a.includes(monitorEvent.detail));
 assert(a.includes('Δεν μπορώ να πάρω ανάσα'));
 assert(!b.includes(monitorEvent.detail));
 assert(!b.includes('Δεν μπορώ να πάρω ανάσα'));
 assert.match(b,/Δεν καταγράφηκε συνομιλία/);
 s=setFocus(s,'b','full');
 s=askPatient(s,'Τι αισθάνεστε;');
 const after=buildHandoverDraft(s,'b');
 assert(after.includes('Εγώ είμαι καλά'));
 assert(!buildHandoverDraft(s,'a').includes('Εγώ είμαι καλά'));
 const exported=buildEvidenceReport(s);
 assert(exported.includes('ΠΡΟΣΧΕΔΙΑ ΔΟΜΗΜΕΝΗΣ ΠΑΡΑΔΟΣΗΣ'));
 assert(exported.includes('Άνδρας 55 ετών')&&exported.includes('Μάρτυρας'));
});
