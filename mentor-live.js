/** MENTOR OS live teaching cockpit. No backend calls, legacy progress or AI. */
import {CASE,STAGES,newLiveSession,stepLive,liveSnapshot,loadLive,saveLive,clearLive} from './mentor/core/live-sim.mjs';
const $=id=>document.getElementById(id);
const create=(tag,text,cls)=>{
 const el=document.createElement(tag);
 if(text!==undefined)el.textContent=text;
 if(cls)el.className=cls;
 return el;
};
let state=loadLive(localStorage),busy=false;
function patientCard(person){
 const card=create('article',undefined,'live-patient');
 card.append(create('h3',person.name),create('p',person.description));
 const group=create('div',undefined,'live-vitals');
 for(const [label,value,unit] of [['HR',person.hr,'/λεπτό'],['RR',person.rr,'/λεπτό'],['SpO₂',person.spo2,'%']]){
  const item=create('div');
  item.append(create('small',label),create('strong',String(value)),create('small',unit));
  group.append(item);
 }
 card.append(group);
 const initial=person.initial;
 card.append(create('p','Αρχή: HR '+initial.hr+' · RR '+initial.rr+' · SpO₂ '+initial.spo2+'%. Οι μεταβολές είναι προκαθορισμένες.','live-trend'));
 return card;
}
function render(){
 const snapshot=liveSnapshot(state);
 $('live-patients').replaceChildren(...snapshot.people.map(patientCard));
 $('live-time').textContent=String(snapshot.minute).padStart(2,'0')+'΄ · συνθετικός χρόνος';
 $('live-positive').textContent=snapshot.practice+' βήματα εξάσκησης';
 $('live-review').textContent=snapshot.review+' για επανάληψη';
 $('live-step').textContent=snapshot.completed?'Ολοκληρώθηκε':'Στάδιο '+(snapshot.stage+1)+' / '+STAGES.length;
 $('live-complete').hidden=!snapshot.completed;
 $('live-choices').replaceChildren();
 if(!snapshot.completed){
  const def=STAGES[snapshot.stage];
  $('live-mission-head').textContent=def.title;
  $('live-context').textContent=def.question;
  for(const action of def.choices){
   const button=create('button',action.label,'live-choice');
   button.type='button';
   button.addEventListener('click',()=>selectChoice(action.id));
   $('live-choices').append(button);
  }
 }else{
  $('live-mission-head').textContent='Εκπαιδευτική ανασκόπηση';
  $('live-context').textContent='Δες τις αποφάσεις και τις συνθετικές παρατηρήσεις. Δεν έγινε υπολογισμός κλινικής έκβασης.';
 }
 $('live-timeline').replaceChildren(...snapshot.timeline.map(event=>{
  const li=create('li');
  li.dataset.kind=event.outcome;
  li.append(create('strong','Λεπτό '+event.minute+' · '+event.title+' · '+(event.outcome==='practice'?'Ολοκληρώθηκε βήμα':'Επανάληψη')),
   create('p',event.feedback));
  return li;
 }));
 if(!snapshot.timeline.length)$('live-timeline').append(create('li','Καμία απόφαση ακόμη. Ξεκίνα από την εκτίμηση σκηνής.'));
}
function selectChoice(choice){
 if(busy)return;
 busy=true;
 try{
  const next=stepLive(state,choice);
  state=next;
  const saved=saveLive(localStorage,next);
  $('live-storage').textContent=saved?'Η πρόοδος αυτής της αποστολής αποθηκεύτηκε μόνο στη συσκευή σου.':'Ο browser δεν επιτρέπει αποθήκευση. Μπορείς να συνεχίσεις έως ότου κλείσεις τη σελίδα.';
  const event=next.events.at(-1);
  const def=STAGES.find(s=>s.id===event.stage_id);
  const action=def.choices.find(c=>c.id===event.choice_id);
  render();
  $('live-feedback').textContent=action.feedback;
  $('live-feedback').dataset.kind=event.outcome;
 }catch(error){
  $('live-feedback').textContent='Δεν μπόρεσε να καταγραφεί η ενέργεια: '+String(error.message||error);
  $('live-feedback').dataset.kind='review';
 }finally{busy=false;}
}
$('live-reset').addEventListener('click',()=>{
 if(busy)return;
 if(state.events.length&&!confirm('Να ξεκινήσει νέα συνθετική αποστολή; Θα επαναφερθεί μόνο η μνήμη αυτής της νέας αποστολής Mentor.'))return;
 clearLive(localStorage);
 state=newLiveSession();
 $('live-feedback').textContent='';
 $('live-storage').textContent='Ξεκινάς νέα προσπάθεια. Οι υπόλοιπες καταγραφές Mentor και ΣΑΕΚ/ΕΟΠΠΕΠ μένουν ανέπαφες.';
 render();
});
render();
$('live-storage').textContent=state.events.length?'Φορτώθηκε η προηγούμενη δοκιμή αυτής της αποστολής.':'Η αποστολή είναι έτοιμη. Μόνο η νέα τοπική μνήμη Mentor θα αλλάξει.';
