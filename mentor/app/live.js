/** Independent educational scenario UI with optional MENTOR companion. No backend calls, legacy progress or AI. */
import {CASE,STAGES,newLiveSession,stepLive,inspectLive,liveSnapshot,loadLive,saveLive,clearLive} from '../core/live-sim.mjs';
import {LIVE_TOOLS,LIVE_ACTIONS,findLiveTool,findLiveAction,liveResponse} from '../core/live-interactions.mjs';
import {buildLiveDebrief,exportLiveDebrief} from '../core/live-debrief.mjs';
const $=id=>document.getElementById(id);
const create=(tag,text,cls)=>{
 const el=document.createElement(tag);
 if(text!==undefined)el.textContent=text;
 if(cls)el.className=cls;
 return el;
};
let state=loadLive(localStorage),busy=false,paused=false,selectedPerson='a',selectedTool='dialogue',selectedView='all',drawerOpen=true;
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
 card.append(create('p','Αρχή: HR '+initial.hr+' · RR '+initial.rr+' · SpO₂ '+initial.spo2+'%. Συνθετική εξέλιξη· επηρεάζεται από τις αποφάσεις σου.','live-trend'));
 if(person.extraSteps)card.append(create('p','Συνέπεια αποφάσεων: '+person.extraSteps+' επιπλέον βήμα(τα) εξέλιξης λόγω καθυστέρησης.','live-consequence'));
 return card;
}
function render(){
 const snapshot=liveSnapshot(state);
 renderCockpit(snapshot);
 renderLiveDebrief();
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
   button.disabled=paused;
   button.addEventListener('click',()=>selectChoice(action.id));
   $('live-choices').append(button);
  }
 }else{
  $('live-mission-head').textContent='Εκπαιδευτική ανασκόπηση';
  $('live-context').textContent='Δες τις αποφάσεις, τις συνέπειές τους και τις συνθετικές παρατηρήσεις. Δεν έγινε υπολογισμός κλινικής έκβασης.'+(snapshot.unreliableHandover?' Η παράδοσή σου περιείχε ανεπιβεβαίωτες πληροφορίες, άρα δεν θεωρείται αξιόπιστη.':'');
 }
 $('live-timeline').replaceChildren(...snapshot.timeline.map(event=>{
  const li=create('li');
  li.dataset.kind=event.outcome;
  li.append(create('strong','Λεπτό '+event.minute+' · '+event.title+' · '+(event.outcome==='practice'?'Ολοκληρώθηκε βήμα':'Επανάληψη')),
   create('p',event.feedback));
  if(event.consequence)li.append(create('p','Συνέπεια: '+event.consequence,'live-consequence'));
  return li;
 }));
 // Tell the floating MENTOR which step is open (title only, never the choices or feedback).
 window.dispatchEvent(new CustomEvent('mentor:context',{detail:{kind:'scenario',id:CASE.id,label:snapshot.completed?'Ανασκόπηση αποστολής: '+CASE.title:CASE.title+' — '+STAGES[snapshot.stage].title}}));
 if(!snapshot.timeline.length)$('live-timeline').append(create('li','Καμία απόφαση ακόμη. Ξεκίνα από την εκτίμηση σκηνής.'));
}
function selectChoice(choice){
 if(busy||paused)return;
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

function renderCockpit(snapshot){
 const person=snapshot.people.find(p=>p.id===selectedPerson)||snapshot.people[0];
 const stage=$('sim-cockpit');stage.dataset.finished=String(snapshot.completed);
 stage.querySelector('.sim-drawer').hidden=!drawerOpen;
 const scene=stage.querySelector('.sim-scene');scene.dataset.view=selectedView;
 for(const button of document.querySelectorAll('[data-sim-view]'))button.setAttribute('aria-pressed',String(button.dataset.simView===selectedView));
 $('sim-head-time').textContent=String(snapshot.minute).padStart(2,'0')+'΄ χρόνου σεναρίου';
 $('sim-person-name').textContent=person.name;
 $('sim-person-description').textContent=person.description;
 for(const button of document.querySelectorAll('[data-sim-person]'))
  button.setAttribute('aria-pressed',String(button.dataset.simPerson===person.id));
 const monitor=$('sim-vitals');monitor.replaceChildren();
 for(const [name,value,unit] of [['HR',person.hr,'/λεπτό'],['RR',person.rr,'/λεπτό'],['SpO₂',person.spo2,'%'],['ΑΠ','—','μη διαθέσιμη']]){
  const tile=create('article');
  tile.append(create('span',name),create('b',String(value)),create('span',unit));
  monitor.append(tile);
 }
 const trajectory=CASE.people.find(p=>p.id===person.id).trend.map(p=>p.hr);
 const min=Math.min(...trajectory)-4,max=Math.max(...trajectory)+4,range=max-min||1;
 $('sim-trend-line').setAttribute('points',trajectory.map((v,i)=>(8+i*56)+','+(56-(v-min)/range*44).toFixed(1)).join(' '));
 $('sim-trend').setAttribute('aria-label',person.name+': απεικόνιση προκαθορισμένης πορείας παλμών από '+trajectory[0]+' έως '+trajectory.at(-1)+' ανά λεπτό. Δεν είναι ΗΚΓ.');
 const toolbar=$('sim-toolbar');toolbar.replaceChildren();
 for(const tool of LIVE_TOOLS){
  const button=create('button',undefined,'sim-tool');
  button.type='button';button.setAttribute('aria-pressed',String(selectedTool===tool.id));button.title=tool.detail;
  button.append(create('span',tool.icon,'sim-tool-ico'),create('span',tool.label));
  if(!LIVE_ACTIONS[tool.id])button.append(create('small','πληροφορίες'));
  button.addEventListener('click',()=>{selectedTool=tool.id;drawerOpen=true;$('sim-tool-result').textContent='';renderCockpit(liveSnapshot(state));});
  toolbar.append(button);
 }
 const active=findLiveTool(selectedTool);
 $('sim-tool-heading').textContent=active.label+' · '+person.name;
 $('sim-tool-detail').textContent=active.detail;
 const target=$('sim-tool-actions');target.replaceChildren();
 if(selectedTool==='records'){
  const intro=create('p','Οι καταγραφές είναι τοπικές και αφορούν αποκλειστικά τη συνθετική άσκηση.');
  const list=create('ol',undefined,'sim-records');
  for(const e of snapshot.inspections){
   const tool=findLiveTool(e.tool_id),action=findLiveAction(e.tool_id,e.action_id);
   list.append(create('li','Στάδιο '+e.at_stage+' · '+(e.patient_id==='a'?'Άτομο Α':'Άτομο Β')+' · '+tool.label+': '+action.label));
  }
  if(!snapshot.inspections.length)list.append(create('li','Καμία καταγραφή εργαλείου ακόμη.'));
  target.append(intro,list);
  const link=create('a','Ανασκόπηση Αποστολής — εκπαιδευτική διαδρομή');
  link.href='#live-debrief';
  target.append(link);
 }else if(LIVE_ACTIONS[selectedTool]){
  for(const action of LIVE_ACTIONS[selectedTool]){
   const btn=create('button',action.label);
   btn.type='button';btn.disabled=paused;
   btn.addEventListener('click',()=>selectInspection(selectedTool,selectedPerson,action.id));
   target.append(btn);
  }
 }else{
  target.append(create('p','Η λειτουργία παρουσιάζεται ως προδιαγραφή, αλλά δεν εκτελείται: '+active.detail+' Το προνοσοκομειακό περιβάλλον και οι επαγγελματικές αρμοδιότητες απαιτούν έλεγχο πριν ενεργοποιηθεί.','sim-caution'));
 }
 $('sim-pause').textContent=paused?'▶ Συνέχεια':'⏸ Παύση';
 $('sim-pause').setAttribute('aria-pressed',String(paused));
}

function renderLiveDebrief(){
 const report=buildLiveDebrief(state);
 const summary=$('live-review-summary');summary.replaceChildren();
 for(const label of [
  report.completed?'Ολοκληρωμένη εκπαιδευτική αποστολή':'Σε εξέλιξη',
  report.minute+'΄ συνθετικός χρόνος',
  report.practice+' οργανωτικά βήματα',
  report.review+' για επανάληψη',
  report.observations.length+' καταγραφές'
 ])summary.append(create('span',label));
 const decisions=$('live-review-decisions');decisions.replaceChildren();
 for(const entry of report.timeline){
  const li=create('li');li.dataset.kind=entry.outcome;
  li.append(create('strong',entry.title+' · '+entry.minute+'΄ · '+(entry.outcome==='review'?'Για επανάληψη':'Ολοκληρώθηκε βήμα')),
   create('p','Επιλογή: '+entry.action),create('p',entry.feedback));
  if(entry.consequence)li.append(create('p','Συνθετική συνέπεια: '+entry.consequence));
  decisions.append(li);
 }
 if(!report.timeline.length)decisions.append(create('li','Δεν έχουν γίνει ακόμη επιλογές.'));
 const notes=$('live-review-observations');notes.replaceChildren();
 for(const entry of report.observations){
  const li=create('li');
  li.append(create('strong',entry.person+' · '+entry.tool+' · Στάδιο '+entry.stage),
    create('p',entry.action),create('p',entry.response));
  notes.append(li);
 }
 if(!report.observations.length)notes.append(create('li','Δεν υπάρχουν καταγεγραμμένες παρατηρήσεις.'));
 $('live-review-advice').textContent=report.advice+
  (report.unreliableHandover?' Προσοχή: η παράδοση περιείχε ανεπιβεβαίωτες πληροφορίες.':'');
}
function downloadLiveReport(){
 const content=exportLiveDebrief(state);
 const blob=new Blob([content],{type:'text/plain;charset=utf-8'});
 const url=URL.createObjectURL(blob);
 try{
  const link=document.createElement('a');
  link.href=url;link.download='ekab-mentor-live-debrief.txt';
  document.body.append(link);link.click();link.remove();
  $('live-export-status').textContent='Δημιουργήθηκε η εκπαιδευτική αναφορά αυτής της αποστολής (.txt).';
 }finally{setTimeout(()=>URL.revokeObjectURL(url),30000);}
}
$('live-export').addEventListener('click',downloadLiveReport);
for(const button of document.querySelectorAll('[data-sim-view]')){
 button.addEventListener('click',()=>{
  selectedView=button.dataset.simView;
  if(selectedView!=='all')selectedPerson=selectedView;
  renderCockpit(liveSnapshot(state));
 });
}
$('sim-clear').addEventListener('click',()=>{
 drawerOpen=false;
 $('sim-tool-result').textContent='';
 renderCockpit(liveSnapshot(state));
});

function selectInspection(tool,person,action){
 if(busy||paused)return;
 try{
  const next=inspectLive(state,tool,person,action);
  state=next;
  const stored=saveLive(localStorage,next);
  render();
  $('sim-tool-result').textContent=(liveResponse(tool,action,person)||'Η παρατήρηση καταγράφηκε.')+
   (stored?' · Καταγράφηκε στη συσκευή.':' · Η τοπική αποθήκευση δεν είναι διαθέσιμη.');
 }catch(e){$('sim-tool-result').textContent='Αδυναμία καταγραφής: '+(e.message||e);}
}
for(const button of document.querySelectorAll('[data-sim-person]')){
 button.addEventListener('click',()=>{
  selectedPerson=button.dataset.simPerson;
  $('sim-tool-result').textContent='';
  renderCockpit(liveSnapshot(state));
 });
}
$('sim-pause').addEventListener('click',()=>{
 paused=!paused;
 $('sim-tool-result').textContent=paused?'Παύση επιλογών — οι συνθετικές τιμές δεν αλλάζουν αυτόματα.':'Οι εκπαιδευτικές επιλογές συνεχίζονται.';
 render();
});

$('live-reset').addEventListener('click',()=>{
 if(busy)return;
 if((state.events.length||state.inspections?.length)&&!confirm('Να ξεκινήσει νέα συνθετική αποστολή; Θα επαναφερθεί μόνο η μνήμη αυτής της νέας αποστολής Mentor.'))return;
 clearLive(localStorage);
 state=newLiveSession();
 selectedPerson='a';selectedTool='dialogue';selectedView='all';paused=false;drawerOpen=true;
 $('sim-tool-result').textContent='';
 $('live-export-status').textContent='Η νέα αποστολή δεν περιέχει προηγούμενες καταγραφές.';
 $('live-feedback').textContent='';
 $('live-storage').textContent='Ξεκινάς νέα προσπάθεια. Οι υπόλοιπες καταγραφές Mentor και ΣΑΕΚ/ΕΟΠΠΕΠ μένουν ανέπαφες.';
 render();
});
render();
// The floating MENTOR module loads after this one: announce the open step again once everything is ready.
window.addEventListener('load',render);
$('live-storage').textContent=state.events.length?'Φορτώθηκε η προηγούμενη δοκιμή αυτής της αποστολής.':'Η αποστολή είναι έτοιμη. Μόνο η νέα τοπική μνήμη Mentor θα αλλάξει.';
