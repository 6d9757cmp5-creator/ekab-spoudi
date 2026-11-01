import test from 'node:test';
import assert from 'node:assert/strict';
import {newSession,patientVitals,nextMinute,setFocus,setPlaying,execute,askPatient,summarize,reportText,loadSession,saveSession,validSession} from './next-sim.mjs';
test('two independent patients and synthetic timed trends',()=>{
 let s=newSession();assert.notDeepEqual(patientVitals(s,'a'),patientVitals(s,'b'));
 s=nextMinute(s,5);assert.equal(s.minute,5);assert.notDeepEqual(patientVitals(s,'a'),patientVitals(newSession(),'a'));
 assert.equal(summarize(s).covered.length,0);
});
test('records actions and flags without treatment-driven physiology',()=>{
 let s=newSession();s=execute(s,'exam','scene');assert(s.flags.safety);
 const before=patientVitals(s,'a');s=execute(s,'interventions','handover');
 assert(s.flags.handover);assert.notDeepEqual(before,patientVitals(s,'a'));
 assert.equal(s.events.length,2);assert.match(reportText(s),/ΣΥΝΘΕΤΙΚΗ/);
});
test('free form uses bounded scripted replies, never calls AI',()=>{
 let s=askPatient(newSession(),'Τι αισθάνεστε;');
 assert.match(s.events[0].detail,/ενόχληση/);
 s=askPatient(s,'δόση αγωγής?');
 assert.match(s.events[1].detail,/Δεν έχω διαθέσιμη/);
 assert.throws(()=>askPatient(s,''));
});
test('pause, focus, finish and validation',()=>{
 let s=setFocus(newSession(),'b','torso');
 s=setPlaying(s,true);assert(s.playing);assert.equal(s.person,'b');
 for(let i=0;i<6;i++)s=nextMinute(s,5);
 assert(s.finished);assert(!s.playing);assert.equal(s.minute,30);
 assert.throws(()=>execute(s,'exam','scene'));
 assert.throws(()=>setFocus(s,'c','head'));
});
test('storage works and corrupted value is safely discarded',()=>{
 const m=new Map();const storage={getItem:k=>m.get(k),setItem:(k,v)=>m.set(k,v)};
 let s=execute(newSession(),'call','coordination');assert(saveSession(storage,s));assert.equal(loadSession(storage).events.length,1);
 s={...s,events:[...s.events,{minute:-1,person:'a',label:'wrong',detail:'x',tool:'exam'}]};
 assert(!validSession(s));assert.equal(loadSession({getItem:()=>JSON.stringify(s)}).events.length,0);
});
