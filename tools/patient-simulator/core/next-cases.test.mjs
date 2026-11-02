import test from 'node:test';
import assert from 'node:assert/strict';
import {CASES,getCase,CASE,newSession,patientVitals,execute,askPatient,validSession,saveSession,loadSession,loadCaseSession,caseProgress,reportText} from './next-sim.mjs';
import {missionEvidence,vitalTrend} from './next-review.mjs';
const store=()=>{const m=new Map();return{getItem:k=>m.get(k)||null,setItem:(k,v)=>m.set(k,v),read:()=>m};};
test('three distinct original scenes, descriptions and independent synthetic trajectories',()=>{
 assert.equal(CASES.length,3);
 assert.deepEqual(CASES.map(c=>c.scene),['road','home','square']);
 assert(CASES.every(c=>c.patients.length===2&&c.patients.every(p=>p.dialogue.feeling&&p.dialogue.event)));
 assert.equal(CASE.id,CASES[0].id);
 assert.equal(getCase('invalid'),null);
 assert.notDeepEqual(patientVitals(newSession(CASES[0].id),'a'),patientVitals(newSession(CASES[1].id),'a'));
 assert.throws(()=>newSession('unknown'));
});
test('scenario-specific dialogue and briefing never leak between cases',()=>{
 const a=askPatient(newSession(CASES[0].id),'Τι συνέβη;');
 const b=askPatient(newSession(CASES[1].id),'Τι συνέβη;');
 const c=askPatient(newSession(CASES[2].id),'Τι συνέβη;');
 assert.notEqual(a.events[0].detail,b.events[0].detail);
 assert.notEqual(b.events[0].detail,c.events[0].detail);
 assert.match(reportText(b),/Κλήση σε κατοικία/);
 assert(!reportText(b).includes(CASES[0].title));
});
test('all cases have independent process evidence and 30-minute bounded trends',()=>{
 for(const c of CASES){
  let s=newSession(c.id);
  s=execute(s,'exam','scene');s=execute(s,'dialogue','symptoms');
  assert.equal(s.caseId,c.id);
  assert.equal(missionEvidence(s).people.length,2);
  assert.equal(vitalTrend(s,'a','hr').length,s.minute+1);
  assert(validSession(s));
 }
});
test('save and resume individually, preserve existing v1 active session key',()=>{
 const memory=store(),road=CASE.id,home=CASES[1].id,square=CASES[2].id;
 const roadWork=execute(newSession(road),'exam','scene');
 const homeWork=execute(newSession(home),'dialogue','symptoms');
 assert(saveSession(memory,roadWork));assert(saveSession(memory,homeWork));
 assert.equal(loadSession(memory).caseId,home);
 assert.equal(loadCaseSession(memory,road).events[0].tool,'exam');
 assert.equal(loadCaseSession(memory,home).events[0].tool,'dialogue');
 assert.equal(loadCaseSession(memory,square).events.length,0);
 const progress=caseProgress(memory);
 assert.equal(progress[0].events,1);assert.equal(progress[1].events,1);assert.equal(progress[2].events,0);
 assert.throws(()=>loadCaseSession(memory,'invalid-id'));
});
test('old active-only v1 storage remains readable when no library exists',()=>{
 const old=store();old.setItem('ekab.mentor.next-v1',JSON.stringify(execute(newSession(),'call','coordination')));
 assert.equal(loadCaseSession(old,CASE.id).events.length,1);
 assert.equal(caseProgress(old)[0].events,1);
 assert.equal(caseProgress(old)[1].events,0);
});
test('invalid or tampered per-case storage is safely rejected',()=>{
 const memory=store();
 memory.setItem('ekab.mentor.next-library-v1',JSON.stringify({[CASES[1].id]:{...newSession(CASES[0].id),minute:-9}}));
 const home=loadCaseSession(memory,CASES[1].id);assert.equal(home.caseId,CASES[1].id);assert.equal(home.minute,0);
 memory.setItem('ekab.mentor.next-library-v1','invalid-json');
 assert.equal(caseProgress(memory).every(x=>x.events===0),true);
});
