/** MENTOR Next: first-party UI/controller for the original simulated case. */
import {CASE,TOOLS,ACTIONS,newSession,loadSession,saveSession,patientVitals,nextMinute,setFocus,setPlaying,execute,askPatient,summarize,reportText,validSession} from '../core/next-sim.mjs';
import {mountPatientScene} from './next-scene.mjs';
const $=id=>document.getElementById(id);
const el=(tag,text,cls)=>{const x=document.createElement(tag);if(text!==undefined)x.textContent=text;if(cls)x.className=cls;return x;};
let state=loadSession(localStorage),tool='dialogue',result='Επίλεξε τον ασθενή και ένα εργαλείο για να ξεκινήσεις.';
let renderer=mountPatientScene($('next-canvas'));
function commit(next,message){
 if(!validSession(next))throw Error('invalid-new-state');
 state=next;if(message!==undefined)result=message;
 const saved=saveSession(localStorage,state);
 $('next-save-note').textContent=saved?'Η άσκηση αποθηκεύεται τοπικά σε αυτή τη συσκευή.':'Η αποθήκευση δεν επιτρέπεται σε αυτόν τον browser. Η άσκηση λειτουργεί μέχρι το κλείσιμο της σελίδας.';
 render();
}
function labelPerson(id){return CASE.patients.find(p=>p.id===id)?.name||'Εικονικός ασθενής';}
function showResult(message){result=message;$('next-result').textContent=result;}
function actionButton(text,onClick,disabled=false){
 const b=el('button',text);b.type='button';b.disabled=disabled;b.addEventListener('click',onClick);return b;
}
function renderMenu(){
 const nav=$('next-tools');nav.replaceChildren();
 for(const t of TOOLS){
  const button=el('button',undefined,'next-tool');button.type='button';button.title=t.label;
  button.append(el('span',t.icon,'next-icon'),el('span',t.label));
  button.setAttribute('aria-pressed',String(tool===t.id));
  button.addEventListener('click',()=>{tool=t.id;renderMenu();renderTool();});
  nav.append(button);
 }
}
function renderTool(){
 const active=TOOLS.find(t=>t.id===tool)||TOOLS[0],actions=$('next-actions');
 $('next-tool-title').textContent=active.label+' · '+labelPerson(state.person);
 $('next-tool-subtitle').textContent={
  view:'Επιλογή οπτικής του τρισδιάστατου μοντέλου. Το μοντέλο είναι ενδεικτικό, όχι ανατομική εξέταση.',
  dialogue:'Ρώτησε ελεύθερα ή επίλεξε τυποποιημένες ερωτήσεις. Όλες οι απαντήσεις προέρχονται από το σενάριο.',
  exam:'Διαθέσιμες περιγραφικές παρατηρήσεις, όχι διάγνωση ή πραγματική εξέταση.',
  monitor:'Τα ζωτικά ακολουθούν συνθετική χρονική πορεία. Δεν επηρεάζονται από θεραπευτικές επιλογές.',
  tests:'Μόνο έλεγχος διαθεσιμότητας. Δεν δημιουργούνται εργαστηριακές ή απεικονιστικές τιμές.',
  call:'Πρόβα επικοινωνίας, χωρίς πραγματική κλήση.',
  interventions:'Μόνο μη θεραπευτικά οργανωτικά βήματα. Οι κλινικές παρεμβάσεις απαιτούν έλεγχο.',
  meds:'Η επιλογή φαρμάκων και δοσολογιών παραμένει κλειδωμένη.',
  records:'Οι δικές σου καταγραφές αυτής της συνθετικής αποστολής.',
  debrief:'Ποια εκπαιδευτικά βήματα καταγράφηκαν και ποια θέλουν επανάληψη.'
 }[tool];
 actions.replaceChildren();
 $('next-ask-form').hidden=tool!=='dialogue'||state.finished;
 const activeActions=ACTIONS[tool]||[];
 if(tool==='view'){
  const labels={scene:'Ολόκληρη σκηνή',full:'Πλήρες σώμα',head:'Προβολή κεφαλής',torso:'Προβολή θώρακα',legs:'Προβολή κάτω άκρων'};
  for(const [view,label] of Object.entries(labels))actions.append(actionButton(label,()=>commit(setFocus(state,state.person,view),'Άλλαξε η εκπαιδευτική γωνία προβολής.'),state.view===view));
 }else if(tool==='meds'){
  actions.append(el('p','Κλειδωμένο: δεν υπάρχουν εγκεκριμένα φαρμακευτικά πρωτόκολλα, δόσεις ή φυσιολογικό μοντέλο στο πρωτότυπο.'));
 }else if(tool==='records'){
  actions.append(el('p','Καταγεγραμμένες ενέργειες: '+state.events.length+'. Τα δεδομένα παραμένουν στη συσκευή. Ο «Φάκελος» δεν αποτελεί ιατρικό έγγραφο.'));
  actions.append(actionButton('Μετάβαση στο ιστορικό',()=>{$('next-events').scrollIntoView({behavior:'smooth'});}));
 }else if(tool==='debrief'){
  const r=summarize(state);
  actions.append(el('p','Καταγράφηκαν: '+(r.covered.join(' · ')||'κανένα βήμα')+'. Για επανάληψη: '+(r.missing.join(' · ')||'κανένα')+'.'));
  actions.append(actionButton('Μετάβαση στο MENTOR DEBRIEF',()=>{$('next-review-body').scrollIntoView({behavior:'smooth'});}));
 }else for(const a of activeActions){
  actions.append(actionButton(a.label+' · '+a.min+'′',()=>{
   try{const updated=execute(state,tool,a.id);commit(updated,updated.events.at(-1).detail);}
   catch{showResult('Η ενέργεια δεν ήταν διαθέσιμη.');}
  },state.finished));
 }
 $('next-result').textContent=result;
}
function renderReview(){
 const r=summarize(state),target=$('next-review-body');
 target.replaceChildren();
 target.append(el('h3','Καταγεγραμμένα · '+r.covered.length+'/7'));
 const have=el('ul');for(const label of r.covered)have.append(el('li',label));if(!r.covered.length)have.append(el('li','Δεν υπάρχουν ακόμη.'));target.append(have);
 target.append(el('h3','Για επανάληψη · '+r.missing.length));
 const need=el('ul');for(const label of r.missing)need.append(el('li',label));if(!r.missing.length)need.append(el('li','Όλα τα οργανωτικά βήματα έχουν καταγραφεί.'));target.append(need);
 const events=$('next-events');events.replaceChildren();
 if(!state.events.length)events.append(el('li','Καμία καταγραφή ακόμη.'));
 else state.events.forEach((e,i)=>{
  const li=el('li');li.append(el('strong',(i+1)+'. '+String(e.minute).padStart(2,'0')+'′ · '+labelPerson(e.person)+' · '+e.label),el('small',e.detail));events.append(li);
 });
 $('next-finish').disabled=state.finished;
 $('next-finish').textContent=state.finished?'Ολοκληρώθηκε — ανασκόπηση διαθέσιμη':'Ολοκλήρωση / Ανασκόπηση';
}
function render(){
 $('next-minute').textContent=String(state.minute).padStart(2,'0')+':00';
 $('next-status').textContent=state.finished?'Ολοκληρώθηκε':state.playing?'Ο χρόνος προχωρά':'Σε παύση';
 $('next-play').disabled=state.finished;
 $('next-play').setAttribute('aria-pressed',String(state.playing));
 $('next-play').textContent=state.playing?'⏸ Παύση χρόνου':'▶ Έναρξη χρόνου';
 $('next-step').disabled=state.finished;
 const patient=CASE.patients.find(p=>p.id===state.person),v=patientVitals(state,state.person);
 $('next-person-name').textContent=patient.name;
 $('next-person-description').textContent=patient.description;
 $('next-hr').textContent=String(v.hr);$('next-rr').textContent=String(v.rr);$('next-spo2').textContent=String(v.spo2);
 for(const button of document.querySelectorAll('[data-next-patient]'))button.setAttribute('aria-pressed',String(button.dataset.nextPatient===state.person));
 for(const button of document.querySelectorAll('[data-next-view]'))button.setAttribute('aria-pressed',String(button.dataset.nextView===state.view));
 renderer.setFocus(state.view==='scene'?'scene':state.person,state.view);
 renderer.setPaused(!state.playing);
 renderMenu();renderTool();renderReview();
 window.dispatchEvent(new CustomEvent('mentor:context',{detail:{kind:'scenario',id:CASE.id,label:'MENTOR NEXT — '+CASE.title}}));
}
for(const button of document.querySelectorAll('[data-next-patient]'))button.addEventListener('click',()=>{
 try{commit(setFocus(state,button.dataset.nextPatient,state.view),'Επέλεξες '+labelPerson(button.dataset.nextPatient)+'.');}catch{}
});
for(const button of document.querySelectorAll('[data-next-view]'))button.addEventListener('click',()=>{
 try{commit(setFocus(state,state.person,button.dataset.nextView),'Άλλαξε η γωνία προβολής.');}catch{}
});
$('next-rotate-left').addEventListener('click',()=>renderer.rotate?.(-0.23));
$('next-rotate-right').addEventListener('click',()=>renderer.rotate?.(0.23));
$('next-play').addEventListener('click',()=>{try{commit(setPlaying(state,!state.playing),state.playing?'Η παύση σταματά μόνο τον αυτόματο χρόνο.':'Η αυτόματη εξέλιξη του συνθετικού χρόνου ξεκίνησε.');}catch{}});
$('next-step').addEventListener('click',()=>{try{commit(nextMinute(state,1),'Προχώρησε ένα εικονικό λεπτό. Οι ενδείξεις ακολουθούν προκαθορισμένη πορεία.');}catch{}});
$('next-reset').addEventListener('click',()=>{if(!confirm('Νέα εκπαιδευτική προσπάθεια; Θα αντικατασταθεί μόνο αυτή η συνθετική αποστολή.'))return;tool='dialogue';commit(newSession(),'Ξεκίνησε νέα συνθετική αποστολή.');});
$('next-ask-form').addEventListener('submit',e=>{
 e.preventDefault();const input=$('next-question'),value=input.value;
 try{const updated=askPatient(state,value);input.value='';commit(updated,updated.events.at(-1).detail);}
 catch{showResult('Γράψε πρώτα μια ερώτηση για τον εικονικό ασθενή.');}
});
$('next-finish').addEventListener('click',()=>{
 if(state.finished)return;
 commit({...state,finished:true,playing:false},'Η εκπαιδευτική προσπάθεια ολοκληρώθηκε. Δες τα βήματα του DEBRIEF.');
 $('next-review-body').scrollIntoView({behavior:'smooth'});
});
$('next-download').addEventListener('click',()=>{
 const blob=new Blob([reportText(state)],{type:'text/plain;charset=utf-8'});
 const url=URL.createObjectURL(blob),a=el('a');a.href=url;a.download='mentor-next-ekab-report.txt';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
});
let elapsed=0;
const clock=setInterval(()=>{
 if(document.hidden||!state.playing||state.finished)return;
 elapsed++;if(elapsed<7)return;elapsed=0;
 try{commit(nextMinute(state,1),'Ενημερώθηκαν οι συνθετικές ενδείξεις λόγω παρέλευσης εικονικού χρόνου.');}catch{}
},1000);
window.addEventListener('pagehide',()=>{clearInterval(clock);renderer.dispose();},{once:true});
render();
