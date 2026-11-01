/* Guided QRS-counting exercise on the synthetic ECG strip. Local, own storage namespace, no network, no AI. */
import {toSvgPoints} from '../core/ecg-synthetic.mjs';
import {ITEMS,SECONDS,expectedCount,stripFor,qrsTimes,answer,debrief,load,save,clear} from '../core/ecg-practice.mjs';
const $=id=>document.getElementById(id);
const NS='http://www.w3.org/2000/svg';
let state=load(localStorage),answered=false;
function announce(label){
 // The floating MENTOR shows only which step is open (never the answer).
 window.dispatchEvent(new CustomEvent('mentor:context',{detail:{kind:'study-mode',id:'ecg-practice',label}}));
}
function mark(bpm){
 const g=$('ecg-practice-marks');g.replaceChildren();
 for(const t of qrsTimes(bpm)){
  const x=(t/SECONDS*960).toFixed(1);
  const c=document.createElementNS(NS,'circle');
  c.setAttribute('cx',x);c.setAttribute('cy','24');c.setAttribute('r','9');c.setAttribute('fill','#b3261e');
  const n=document.createElementNS(NS,'text');
  n.setAttribute('x',x);n.setAttribute('y','28');n.setAttribute('text-anchor','middle');n.setAttribute('font-size','11');n.setAttribute('fill','#fff');
  n.textContent=String(g.childElementCount/2+1);
  g.append(c,n);
 }
}
function render(){
 const done=state.completed;
 $('ecg-practice-debrief').hidden=!done;
 $('ecg-practice-next').hidden=true;
 $('ecg-practice-choices').replaceChildren();
 $('ecg-practice-marks').replaceChildren();
 if(done){
  const d=debrief(state);
  $('ecg-practice-step').textContent='Ολοκληρώθηκε';
  $('ecg-practice-feedback').textContent='';
  $('ecg-debrief-text').textContent='Σωστά '+d.right+' από '+d.total+'. Μέσο σφάλμα εκτίμησης ρυθμού: '+d.meanAbsError+' /λεπτό (υποεκτίμηση '+d.under+' φορές, υπερεκτίμηση '+d.over+'). '+d.hint;
  $('ecg-practice-curve').setAttribute('points','');
  announce('ΕΚΓ — ανασκόπηση άσκησης μέτρησης ρυθμού');
  return;
 }
 const index=state.answers.length,item=ITEMS[index];
 answered=false;
 $('ecg-practice-step').textContent='Λωρίδα '+(index+1)+' από '+ITEMS.length;
 $('ecg-practice-curve').setAttribute('points',toSvgPoints(stripFor(item)));
 for(const count of [4,5,6,7,8,9,10,11,12,13,14]){
  const b=document.createElement('button');b.type='button';b.textContent=String(count);
  b.addEventListener('click',()=>choose(count));$('ecg-practice-choices').append(b);
 }
 $('ecg-practice-feedback').textContent='';
 announce('ΕΚΓ — άσκηση μέτρησης ρυθμού, λωρίδα '+(index+1)+' από '+ITEMS.length);
}
function choose(count){
 if(answered||state.completed)return;
 answered=true;
 const item=ITEMS[state.answers.length];
 state=answer(state,count);
 const saved=save(localStorage,state);
 const entry=state.answers.at(-1);
 mark(item.bpm);
 $('ecg-practice-feedback').textContent=(entry.correct?'Σωστά. ':'Όχι ακριβώς. ')+'Η λωρίδα έχει '+expectedCount(item.bpm)+' QRS (κόκκινοι αριθμοί)· εσύ μέτρησες '+count+'. Ρυθμός = '+expectedCount(item.bpm)+' × 10 = '+item.bpm+' /λεπτό· η εκτίμησή σου: '+entry.estimate+' /λεπτό.';
 $('ecg-practice-storage').textContent=saved?'Η πρόοδος αυτής της άσκησης αποθηκεύτηκε μόνο στη συσκευή σου.':'Ο browser δεν επιτρέπει αποθήκευση· μπορείς να συνεχίσεις μέχρι να κλείσεις τη σελίδα.';
 for(const b of $('ecg-practice-choices').children)b.disabled=true;
 $('ecg-practice-next').hidden=false;
 $('ecg-practice-next').focus();
}
$('ecg-practice-next').addEventListener('click',render);
$('ecg-practice-reset').addEventListener('click',()=>{
 if(state.answers.length&&!confirm('Να ξεκινήσει νέα προσπάθεια; Θα σβηστεί μόνο η πρόοδος αυτής της άσκησης.'))return;
 clear(localStorage);state=load(localStorage);$('ecg-practice-storage').textContent='';render();
});
window.addEventListener('load',()=>{if(state.completed)announce('ΕΚΓ — ανασκόπηση άσκησης μέτρησης ρυθμού');else announce('ΕΚΓ — άσκηση μέτρησης ρυθμού, λωρίδα '+(state.answers.length+1)+' από '+ITEMS.length);});
render();
