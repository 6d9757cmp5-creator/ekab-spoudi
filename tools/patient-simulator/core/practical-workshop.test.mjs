import test from 'node:test';
import assert from 'node:assert/strict';
import {PRACTICAL_CASES,PRACTICAL_SKILLS} from './eoppep-practical-cases.mjs';
import {CASES,newSession,setFocus,patientVitals,execute,validSession,summarize} from './next-sim.mjs';
import {practicalTasks,practicalRehearsalReview,recordPracticalRehearsal,practicalReport} from './practical-workshop.mjs';
const note='Ελέγχω τις συνθήκες του περιστατικού και εξηγώ κάθε βήμα με σαφήνεια.';
const rehearse=(s,id,equipment=[])=>recordPracticalRehearsal(s,id,{equipment,reason:note});

test('every official-source practical case has exactly its original steps and 12 skills are mapped',()=>{
 assert.equal(PRACTICAL_CASES.length,6);
 const seen=new Set();
 for(const scenario of PRACTICAL_CASES){
  const tasks=practicalTasks(scenario.id);
  assert.equal(tasks.length,scenario.steps.length,scenario.id);
  assert(tasks.every((t,i)=>t.id===scenario.steps[i].id&&t.requiredEquipment.every(x=>scenario.equipment.includes(x))));
  tasks.flatMap(task=>task.skills).forEach(skill=>seen.add(skill));
  assert.equal(practicalRehearsalReview(newSession(scenario.id)).total,scenario.steps.length);
 }
 assert.deepEqual([...seen].sort(),[...PRACTICAL_SKILLS].sort());
 for(const scenario of CASES.filter(s=>!s.group))assert.equal(practicalTasks(scenario.id).length,0);
});

test('cannot complete a practical with just a click, without a narrative or equipment',()=>{
 const scenario=PRACTICAL_CASES[1],s=newSession(scenario.id);
 assert.throws(()=>recordPracticalRehearsal(s,'s2-oxygen',{equipment:[],reason:note}),/missing-equipment/);
 assert.throws(()=>recordPracticalRehearsal(s,'s2-oxygen',{equipment:scenario.equipment.slice(0,1),reason:note}),/missing-equipment/);
 assert.throws(()=>recordPracticalRehearsal(s,'s2-oxygen',{equipment:['Φιάλη οξυγόνου','Μάσκες οξυγόνου'],reason:'ok'}),/explain-action/);
 assert.throws(()=>recordPracticalRehearsal(s,'s2-oxygen',{equipment:['Φιάλη οξυγόνου','Μάσκες οξυγόνου','Ambu'],reason:note}),/unrelated-equipment/);
 assert.equal(practicalRehearsalReview(s).recorded,0);
 assert.equal(s.events.length,0);
});

test('written rehearsal records bounded evidence, changes no patient physiology and survives validation',()=>{
 const s=newSession('eoppep-practical-2');
 const before=patientVitals(s,'a');
 const next=rehearse(s,'s2-oxygen',['Φιάλη οξυγόνου','Μάσκες οξυγόνου']);
 assert(validSession(next));
 assert.equal(next.events.length,1);
 assert.equal(practicalRehearsalReview(next).recorded,1);
 assert.equal(practicalRehearsalReview(next).total,PRACTICAL_CASES[1].steps.length);
 assert.equal(patientVitals(next,'a').hr,before.hr);
 assert.equal(patientVitals(next,'a').spo2,before.spo2);
 assert.equal(next.events[0].practice.mode,'written-rehearsal');
 assert.match(next.events[0].detail,/Δεν εκτελέστηκε κλινική πράξη|Γραπτή πρόβα/);
 assert.match(practicalReport(next),/ΠΡΑΚΤΙΚΗ ΕΟΠΠΕΠ/);
 assert.match(practicalReport(next),/ΑΠΑΙΤΕΙ ΠΡΑΚΤΙΚΗ ΕΠΙΔΕΙΞΗ/);
 assert.throws(()=>rehearse(next,'s2-oxygen',['Φιάλη οξυγόνου','Μάσκες οξυγόνου']),/step-already-recorded/);
});

test('no cross-patient or cross-case rehearsal; no false completion by legacy one-click record',()=>{
 const s=newSession('eoppep-practical-1');
 const witness=setFocus(s,'b','scene');
 assert.throws(()=>rehearse(witness,'s1-call'),/choose-patient-a/);
 assert.throws(()=>rehearse(s,'s2-oxygen'),/unknown-practical-step/);
 assert.throws(()=>rehearse(newSession(PRACTICAL_CASES[2].id),'s1-call'),/unknown-practical-step/);
 const clickOnly=execute(s,'interventions','s1-call');
 assert.equal(summarize(clickOnly).practiceSteps.find(x=>x.label.includes('ενεργοποίηση')).done,true);
 assert.equal(practicalRehearsalReview(clickOnly).recorded,0,'legacy click without equipment/rationale is not a documented rehearsal');
});

test('debrief identifies out-of-order practice events without awarding clinical scores',()=>{
 let s=newSession('eoppep-practical-1');
 s=rehearse(s,'s1-tests',['Οξύμετρο','Πιεσόμετρο']);
 s=rehearse(s,'s1-call');
 const result=practicalRehearsalReview(s);
 assert.equal(result.recorded,2);
 assert.equal(result.outOfOrder,true);
 assert.match(result.disclaimer,/Δεν αποδεικνύει δεξιότητα/);
 assert(!Object.hasOwn(result,'clinicalScore'));
 assert.match(practicalReport(s),/υπάρχει απόκλιση/);
});

test('mannequin-dependent tasks never certify actual performance',()=>{
 let s=newSession('eoppep-practical-1');
 s=rehearse(s,'s1-cpr',['Ανθρώπινο ομοίωμα ΚΑΡΠΑ','AED με pads']);
 const r=practicalRehearsalReview(s);
 const task=r.steps.find(x=>x.id==='s1-cpr');
 assert.equal(task.documented,true);
 assert.equal(task.requiresLabPractice,true);
 assert(r.pendingLab.includes(task.label));
 assert.match(s.events[0].detail,/Εκκρεμεί επίδειξη σε ομοίωμα/);
 assert.equal(s.events[0].practice.handsOn,'requires-supervised-practical-demonstration');
});
