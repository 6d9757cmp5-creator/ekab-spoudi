import test from 'node:test';
import assert from 'node:assert/strict';
import {newSession,execute,askPatient,nextMinute,setFocus} from './next-sim.mjs';
import {patientPose,patientEvidence,missionEvidence,vitalTrend,buildEvidenceReport} from './next-review.mjs';
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
