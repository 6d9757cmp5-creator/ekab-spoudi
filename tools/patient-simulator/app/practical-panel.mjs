/**
 * Accessible rehearsal controls for the six EOPPEP practical cases.
 * Does not record patient care by itself: the core validates on submission.
 */
import {getCase} from '../core/next-sim.mjs';
import {practicalRehearsalReview} from '../core/practical-workshop.mjs';
const el=(tag,text,cls)=>{
 const node=document.createElement(tag);
 if(text!==undefined)node.textContent=text;
 if(cls)node.className=cls;
 return node;
};
export function renderPracticalPanel(host,s,selectedId,onChoose,onSubmit){
 const review=practicalRehearsalReview(s),scenario=getCase(s.caseId);
 host.append(
  el('p','ΠΡΑΚΤΙΚΗ ΕΟΠΠΕΠ · Επίλεξε βήμα, προετοίμασε εξοπλισμό και περιέγραψε τι θα έκανες. Η επιλογή βήματος δεν καταγράφει πράξη.','next-practice-rehearsal-intro'),
  el('p','Γραπτές πρόβες: '+review.recorded+'/'+review.total+' · Δεν αποτελεί αξιολόγηση σε ομοίωμα ή κλινική πιστοποίηση.','next-practice-rehearsal-progress')
 );
 const tasks=el('div',undefined,'next-practice-task-list');
 // Alphabetical list avoids revealing the expected order before debrief.
 for(const task of [...review.steps].sort((a,b)=>a.label.localeCompare(b.label,'el'))){
  const button=el('button',task.label+' · '+task.min+'′'+(task.documented?' · Καταγράφηκε πρόβα':''),'next-practice-task-button');
  button.type='button';button.dataset.practicalStep=task.id;
  button.disabled=s.finished||task.documented;
  button.setAttribute('aria-expanded',String(selectedId===task.id));
  if(task.documented)button.classList.add('next-practice-task-done');
  button.addEventListener('click',()=>onChoose(task.id));
  tasks.append(button);
 }
 host.append(tasks);
 const task=review.steps.find(x=>x.id===selectedId);
 if(!task)return;
 const panel=el('section',undefined,'next-practice-rehearsal-panel');
 panel.dataset.activeStep=task.id;
 panel.append(el('h4',task.label));
 const flags=[];
 if(task.conditional)flags.push('ΥΠΟ ΣΥΝΘΗΚΗ: εξήγησε πότε εφαρμόζεται, χωρίς να θεωρείται ότι συνέβη στο περιστατικό.');
 if(task.requiresHandsOn)flags.push('ΑΠΑΙΤΕΙ ΕΡΓΑΣΤΗΡΙΟ: η πραγματική πρακτική επίδειξη δεν πιστοποιείται από την εφαρμογή.');
 if(flags.length)panel.append(el('p',flags.join(' '),'next-practice-rehearsal-warning'));
 if(task.documented){
  panel.append(el('p','Η γραπτή πρόβα έχει καταγραφεί. Επίλεξε άλλο βήμα ή δες την ανασκόπηση.','next-practice-rehearsal-success'));
  host.append(panel);return;
 }
 const form=el('form',undefined,'next-practice-rehearsal-form');
 const fieldset=el('fieldset',undefined,'next-practice-equipment');
 fieldset.append(el('legend','Ποιον εξοπλισμό χρειάζεσαι για αυτό το βήμα;'));
 for(const [i,name] of scenario.equipment.entries()){
  const label=el('label',undefined,'next-practice-equipment-item');
  const input=el('input');input.type='checkbox';input.name='practical-equipment';input.value=name;
  input.id='practical-equipment-'+i;label.append(input,document.createTextNode(' '+name));
  fieldset.append(label);
 }
 fieldset.append(el('p','Επίλεξε μόνο τον απαραίτητο εξοπλισμό. Η επιλογή δεν αποδεικνύει τη φυσική χρήση του.','next-practice-equipment-help'));
 form.append(fieldset);
 const label=el('label','Τι θα έκανες και γιατί; (τουλάχιστον 12 χαρακτήρες)','next-practice-reason-label');
 const note=el('textarea');note.name='practical-reason';note.rows=3;note.maxLength=340;note.minLength=12;note.required=true;
 note.placeholder='Περιέγραψε τη διαδικασία, τις συνθήκες ή όσα θα έλεγες στον εξεταστή…';
 label.append(note);form.append(label);
 const submit=el('button','Καταγραφή γραπτής πρόβας','next-practice-rehearsal-submit');submit.type='submit';form.append(submit);
 const status=el('p','', 'next-practice-form-status');status.setAttribute('role','status');
 form.addEventListener('submit',event=>{
  event.preventDefault();
  const equipment=[...form.querySelectorAll('input[name="practical-equipment"]:checked')].map(input=>input.value);
  const failure=onSubmit(task.id,{equipment,reason:note.value});
  if(failure)status.textContent=failure;
 });
 panel.append(form,status);host.append(panel);
}
