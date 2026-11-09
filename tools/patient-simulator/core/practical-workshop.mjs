/**
 * Evidence-oriented educational rehearsal for the six EOPPEP practical cases.
 * No treatment, procedural actuator, patient physiology, score or clinical
 * sign-off. A written rehearsal is not performance on a training mannequin.
 */
import {getCase,execute,validSession} from './next-sim.mjs';

const EQUIPMENT_BY_STEP=Object.freeze({
 's1-cpr':['Ανθρώπινο ομοίωμα ΚΑΡΠΑ','AED με pads'],
 's1-tests':['Οξύμετρο','Πιεσόμετρο'],
 's2-measure':['Οξύμετρο','Πιεσόμετρο'],
 's2-oxygen':['Φιάλη οξυγόνου','Μάσκες οξυγόνου'],
 's3-abcde':['Πιεσόμετρο','Οξύμετρο'],
 's3-prepare':['Αναρρόφηση','Στοματοφαρυγγικοί αεραγωγοί'],
 's4-expose':['Οξύμετρο'],
 's5-neuro':['Πιεσόμετρο','Οξύμετρο'],
 's5-spine':['Στρώμα πολυτραυματία'],
 's5-warm':['Σκεπάσματα αλουμινίου'],
 's6-immobilize':['Νάρθηκες με αεροθάλαμο'],
 's6-transport':['Σανίδα με ιμάντες']
});
// These actions may require a REAL mannequin or clinical supervision, which
// cannot be demonstrated or certified through the app.
const MANNEQUIN_STEPS=new Set([
 's1-cpr','s2-oxygen','s3-prepare','s4-dressing','s5-bleed','s6-immobilize'
]);
const CONDITIONAL_STEPS=new Set([
 's1-cpr','s2-advanced','s3-seizure','s4-tension','s5-bleed'
]);

export function practicalTasks(caseId){
 const scenario=getCase(caseId);
 if(!scenario?.group||scenario.group!=='eoppep-practical')return [];
 return scenario.steps.map((step,index)=>{
  const requiredEquipment=EQUIPMENT_BY_STEP[step.id]||[];
  if(requiredEquipment.some(item=>!scenario.equipment.includes(item)))throw Error('invalid-practical-resource-map:'+step.id);
  return {
   ...step,index,requiredEquipment,
   requiresHandsOn:MANNEQUIN_STEPS.has(step.id),
   conditional:CONDITIONAL_STEPS.has(step.id)
  };
 });
}
export function practicalRehearsalReview(s){
 if(!validSession(s))throw Error('invalid-practical-session');
 const tasks=practicalTasks(s.caseId);
 const firstById=new Map();
 for(let i=0;i<s.events.length;i++){
  const event=s.events[i];
  if(event.tool==='interventions'&&event.practice?.mode==='written-rehearsal'&&
    tasks.some(t=>t.id===event.actionId)&&!firstById.has(event.actionId))
   firstById.set(event.actionId,{event,index:i});
 }
 const steps=tasks.map(task=>{
  const entry=firstById.get(task.id);
  const equipment=Array.isArray(entry?.event?.practice?.equipment)?entry.event.practice.equipment:[];
  const note=String(entry?.event?.practice?.reason||'');
  const documented=!!entry&&note.trim().length>=12&&task.requiredEquipment.every(item=>equipment.includes(item));
  return {...task,documented,
   requiresLabPractice:task.requiresHandsOn,
   evidence:documented?'Γραπτή/προφορική πρόβα · δεν πιστοποιεί πρακτική εκτέλεση':'Δεν καταγράφηκε τεκμηριωμένη πρόβα'};
 });
 const indices=steps.map((step,i)=>step.documented?{i,order:firstById.get(step.id).index}:null).filter(Boolean);
 const outOfOrder=indices.some((entry,i)=>i>0&&entry.order<indices[i-1].order);
 return {
  steps,recorded:steps.filter(s=>s.documented).length,total:steps.length,
  missing:steps.filter(s=>!s.documented).map(s=>s.label),
  skills:[...new Set(steps.flatMap(s=>s.skills||[]))],
  outOfOrder,
  pendingLab:steps.filter(s=>s.requiresHandsOn).map(s=>s.label),
  disclaimer:'Η καταγραφή είναι μόνο πρόβα αποφάσεων και εξοπλισμού. Δεν αποδεικνύει δεξιότητα σε άνθρωπο ή εκπαιδευτικό ομοίωμα, δεν πιστοποιεί κλινική ορθότητα.'
 };
}
export function recordPracticalRehearsal(s,stepId,{equipment=[],reason=''}={}){
 if(!validSession(s)||s.finished)throw Error('session-finished-or-invalid');
 const caseInfo=getCase(s.caseId);
 const task=practicalTasks(s.caseId).find(item=>item.id===stepId);
 if(!caseInfo||!task)throw Error('unknown-practical-step');
 if(s.person!=='a')throw Error('choose-patient-a');
 if(typeof reason!=='string'||reason.trim().length<12||reason.trim().length>340)throw Error('explain-action');
 if(!Array.isArray(equipment)||equipment.length>24||equipment.some(x=>typeof x!=='string'||!caseInfo.equipment.includes(x))||
   new Set(equipment).size!==equipment.length)throw Error('invalid-equipment');
 const missing=task.requiredEquipment.filter(item=>!equipment.includes(item));
 if(missing.length)throw Error('missing-equipment:'+missing.join(', '));
 const unknown=equipment.filter(item=>!task.requiredEquipment.includes(item));
 if(unknown.length)throw Error('unrelated-equipment:'+unknown.join(', '));
 const before=practicalRehearsalReview(s);
 if(before.steps.find(x=>x.id===stepId)?.documented)throw Error('step-already-recorded');
 const updated=execute(s,'interventions',stepId);
 const last=updated.events.at(-1);
 const safeReason=reason.trim().replace(/\s+/g,' ');
 const evidence={
  mode:'written-rehearsal',equipment:[...equipment],reason:safeReason,
  handsOn:task.requiresHandsOn?'requires-supervised-practical-demonstration':'not-assessed'
 };
 const suffix=task.conditional?' · Η συνθήκη εφαρμογής πρέπει να επιβεβαιώνεται· δεν εκτελέστηκε κλινική πράξη.':'';
 const detail='Γραπτή πρόβα · Εξοπλισμός: '+(equipment.join(', ')||'δεν απαιτείται')+
  ' · Περιγραφή μαθητή: '+safeReason+suffix+
  (task.requiresHandsOn?' · Εκκρεμεί επίδειξη σε ομοίωμα/επιβλεπόμενο εργαστήριο.':'');
 const final={...updated,events:[...updated.events.slice(0,-1),{...last,detail:detail.slice(0,600),practice:evidence}]};
 if(!validSession(final))throw Error('invalid-practical-event');
 return final;
}
export function practicalReport(s){
 const r=practicalRehearsalReview(s);
 if(!r.total)return '';
 return [
  'ΠΡΑΚΤΙΚΗ ΕΟΠΠΕΠ · ΑΥΤΟΚΑΤΑΓΡΑΦΗ ΠΡΟΒΑΣ',
  r.disclaimer,
  'Τεκμηριωμένες γραπτές πρόβες: '+r.recorded+'/'+r.total,
  'Σειρά ενεργειών: '+(r.outOfOrder?'υπάρχει απόκλιση από την ακολουθία του υλικού':'δεν ανιχνεύτηκε απόκλιση στις διαθέσιμες πρόβες'),
  ...r.steps.map((step,i)=>(step.documented?'[x] ':'[ ] ')+(i+1)+'. '+step.label+(step.requiresHandsOn?' (ΑΠΑΙΤΕΙ ΠΡΑΚΤΙΚΗ ΕΠΙΔΕΙΞΗ)':'')),
  'Δεξιότητες που συνδέονται με το περιστατικό: '+(r.skills.join(' · ')||'Καμία')
 ].join('\n')+'\n';
}
