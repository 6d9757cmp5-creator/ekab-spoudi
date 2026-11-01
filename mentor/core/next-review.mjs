/**
 * MENTOR NEXT · process & observation analysis — 100% synthetic.
 * This is NOT clinical assessment, ECG analysis, patient severity or decision support.
 */
import {CASE,ACTIONS,validSession,patientVitals} from './next-sim.mjs';
const CHECKS=Object.freeze([
 {id:'safety',title:'Ασφάλεια σκηνής'},
 {id:'dialogue',title:'Συνομιλία'},
 {id:'exam',title:'Οπτική εκτίμηση'},
 {id:'monitor',title:'Παρακολούθηση'},
 {id:'reassessment',title:'Επανεκτίμηση'},
 {id:'coordination',title:'Συντονισμός'},
 {id:'handover',title:'Παράδοση'}
]);
function ensure(s){if(!validSession(s))throw Error('invalid-next-review-session');}
export function patientPose(s,id){
 ensure(s);if(!CASE.patients.some(p=>p.id===id))throw Error('unknown-person');
 const last=s.events.filter(e=>e.person===id&&e.tool==='position').at(-1);
 return ['standing','seated','reclined'].includes(last?.actionId)?last.actionId:'standing';
}
function has(s,tool,person,ids=null){
 return s.events.some(e=>e.tool===tool&&(person===null||e.person===person)&&(!ids||ids.includes(e.actionId)));
}
export function patientEvidence(s,id){
 ensure(s);if(!CASE.patients.some(p=>p.id===id))throw Error('unknown-person');
 const records=s.events.filter(e=>e.person===id);
 const steps=[
  {id:'dialogue',label:'Συνομιλία',done:has(s,'dialogue',id)},
  {id:'exam',label:'Οπτική εκτίμηση',done:has(s,'exam',id,['initial','airway','breathing','head','chest','limbs'])},
  {id:'monitor',label:'Συνθετική καταγραφή ζωτικών',done:has(s,'monitor',id,['attach','record'])},
  {id:'reassessment',label:'Επανεκτίμηση',done:has(s,'exam',id,['reassess'])||has(s,'interventions',id,['review'])}
 ];
 return {id,records:records.length,steps,covered:steps.filter(x=>x.done).length,
  incomplete:steps.filter(x=>!x.done).map(x=>x.label),
  vitals:patientVitals(s,id),pose:patientPose(s,id)};
}
export function missionEvidence(s){
 ensure(s);
 const people=CASE.patients.map(p=>patientEvidence(s,p.id));
 const shared=[
  {id:'safety',label:'Έλεγχος κινδύνων σκηνής',done:has(s,'exam',null,['scene'])||has(s,'interventions',null,['safety'])},
  {id:'coordination',label:'Εικονική επικοινωνία συντονισμού',done:has(s,'call',null)},
  {id:'handover',label:'Δομημένη παράδοση',done:has(s,'interventions',null,['handover'])}
 ];
 const caution=[];
 const firstPatientWork=s.events.find(e=>!['view','position'].includes(e.tool)&&!(e.tool==='exam'&&e.actionId==='scene'));
 const safety=s.events.find(e=>(e.tool==='exam'&&e.actionId==='scene')||(e.tool==='interventions'&&e.actionId==='safety'));
 if(firstPatientWork&&(!safety||firstPatientWork.minute<=safety.minute&&s.events.indexOf(firstPatientWork)<s.events.indexOf(safety)))
  caution.push('Η πρώτη καταγεγραμμένη ενέργεια προηγήθηκε του ελέγχου κινδύνων σκηνής. Έλεγξε τη σειρά των οργανωτικών βημάτων.');
 const handover=s.events.find(e=>e.tool==='interventions'&&e.actionId==='handover');
 if(handover){
  const before=s.events.slice(0,s.events.indexOf(handover));
  if(!CASE.patients.every(p=>before.some(e=>e.person===p.id&&['dialogue','exam','monitor'].includes(e.tool))))
   caution.push('Η δομημένη παράδοση καταγράφηκε πριν συλλεχθούν δεδομένα και για τα δύο άτομα.');
 }
 const missingShared=shared.filter(x=>!x.done).map(x=>x.label);
 return {people,shared,missingShared,caution,recordCount:s.events.length,
  disclaimer:'Μόνο εκπαιδευτική πληρότητα καταγραφών, όχι κλινική ορθότητα, διάγνωση ή βαθμολογία.'};
}
export function vitalTrend(s,id,metric){
 ensure(s);if(!CASE.patients.some(p=>p.id===id))throw Error('unknown-person');
 if(!['hr','rr','spo2'].includes(metric))throw Error('unsupported-vital');
 const result=[];for(let minute=0;minute<=s.minute;minute++)result.push({minute,value:patientVitals({...s,minute},id)[metric]});
 return result;
}
export function buildEvidenceReport(s){
 const e=missionEvidence(s),out=['MENTOR NEXT · ΑΝΑΣΚΟΠΗΣΗ ΑΝΑ ΑΣΘΕΝΗ',e.disclaimer,
 'Χρόνος: '+s.minute+' εκπαιδευτικά λεπτά','Καταγραφές: '+s.events.length,''];
 for(const p of e.people){
  out.push('ΑΣΘΕΝΗΣ '+p.id.toUpperCase(),...p.steps.map(x=>(x.done?'[x] ':'[ ] ')+x.label),
   'Συνθετικές τιμές HR '+p.vitals.hr+', RR '+p.vitals.rr+', SpO₂ '+p.vitals.spo2+'%','');
 }
 out.push('ΚΟΙΝΑ ΟΡΓΑΝΩΤΙΚΑ ΒΗΜΑΤΑ',...e.shared.map(x=>(x.done?'[x] ':'[ ] ')+x.label));
 if(e.caution.length)out.push('','ΣΗΜΕΙΑ ΓΙΑ ΕΠΑΝΑΛΗΨΗ',...e.caution);
 return out.join('\n')+'\n';
}
