/** MENTOR Next: first-party UI/controller for the original simulated case. */
import {CASES,getCase,TOOLS,ACTIONS,newSession,loadSession,loadCaseSession,caseProgress,saveSession,patientVitals,nextMinute,setFocus,setPlaying,execute,askPatient,summarize,reportText,validSession} from '../core/next-sim.mjs';
import {mountPatientScene} from './next-scene.mjs';
import {patientPose,missionEvidence,vitalTrend,buildEvidenceReport} from '../core/next-review.mjs';
const $=id=>document.getElementById(id);
const el=(tag,text,cls)=>{const x=document.createElement(tag);if(text!==undefined)x.textContent=text;if(cls)x.className=cls;return x;};
let state=loadSession(localStorage),tool='dialogue',result='Επίλεξε τον ασθενή και ένα εργαλείο για να ξεκινήσεις.';
let renderer=mountPatientScene($('next-canvas'));
const meshText=$('next-mesh-status'),patientCanvas=$('next-canvas');
function updatePatientAssetStatus(){
 const status=patientCanvas.dataset.humanModel;
 meshText.textContent=status==='ready'?'Ανθρώπινο 3D πλέγμα CC0 · διαδραστική εκπαιδευτική απεικόνιση':
 status==='fallback'?'Εναλλακτική 3D απεικόνιση · χωρίς εξωτερικές υπηρεσίες':
 status==='loading'?'Φόρτωση ανοικτού 3D μοντέλου ανθρώπου…':'Προβολή συνθετικών 3D ασθενών';
}
const meshObserver=new MutationObserver(updatePatientAssetStatus);
meshObserver.observe(patientCanvas,{attributes:true,attributeFilter:['data-human-model']});
updatePatientAssetStatus();

// Real GLB patient preview — independent of the synthetic clinical engine.
// These static mesh poses are purely visual and do not drive observations or treatment.
const READY_ASSETS=Object.freeze({
 alex:'../assets/patients/alex-standing.glb',
 daniel:'../assets/patients/daniel-lying.glb',
 amara:'../assets/patients/amara-sitting.glb'
});
const readyToggle=$('next-ready-toggle'),readyOverlay=$('next-ready-overlay'),
 readyModel=$('next-ready-model'),readyPose=$('next-ready-pose'),
 readyStatus=$('next-ready-status');
let readyEnabled=false,readyLoading=false,lastReadyPerson=state.person;
function readyURL(key){return new URL(READY_ASSETS[key],import.meta.url).href;}
function updateReadyModel(pose){
 if(!Object.hasOwn(READY_ASSETS,pose))return;
 readyPose.value=pose;
 const src=readyURL(pose);
 if(readyModel.getAttribute('src')!==src){
  readyStatus.textContent='Φόρτωση πραγματικού 3D μοντέλου…';
  readyModel.setAttribute('src',src);
 }
 readyModel.setAttribute('alt','Στατικό τρισδιάστατο μοντέλο '+pose+', CC0. Δεν αποτελεί κλινικό εύρημα.');
}
function disableRealisticMode(){
 readyEnabled=false;
 readyOverlay.hidden=true;
 readyModel.removeAttribute('src');
 readyToggle.disabled=false;
 readyToggle.textContent='✦ Έτοιμοι 3D ασθενείς';
 readyToggle.setAttribute('aria-pressed','false');
 patientCanvas.style.removeProperty('visibility');
}
async function enableRealisticMode(){
 if(readyEnabled||readyLoading)return;
 readyLoading=true;readyToggle.disabled=true;readyToggle.textContent='Φόρτωση έτοιμου 3D…';
 try{
  const response=await fetch(readyURL('alex'),{method:'HEAD',cache:'no-store'});
  if(!response.ok)throw Error('Το αρχείο ανθρώπινου μοντέλου δεν έχει δημοσιευτεί ακόμη.');
  await import('../vendor/model-viewer.min.js');
  await customElements.whenDefined('model-viewer');
  readyEnabled=true;
  readyOverlay.hidden=false;
  patientCanvas.style.setProperty('visibility','hidden');
  lastReadyPerson=state.person;
  updateReadyModel(state.person==='b'?'amara':'alex');
  readyToggle.textContent='↶ Παλιά 3D σκηνή';
  readyToggle.setAttribute('aria-pressed','true');
 }catch(error){
  disableRealisticMode();
  showResult('Το ρεαλιστικό 3D δεν φορτώθηκε. Η προηγούμενη σκηνή παραμένει διαθέσιμη: '+String(error?.message||error).slice(0,120));
 }finally{readyLoading=false;readyToggle.disabled=false;}
}
readyToggle.addEventListener('click',()=>readyEnabled?disableRealisticMode():enableRealisticMode());
readyPose.addEventListener('change',()=>{if(readyEnabled)updateReadyModel(readyPose.value);});
readyModel.addEventListener('load',()=>{
 readyStatus.textContent='Έτοιμο 3D μοντέλο · περιστροφή και μεγέθυνση με αφή ή ποντίκι';
 readyModel.dataset.assetReady='true';
});
readyModel.addEventListener('error',()=>{
 readyStatus.textContent='Αδυναμία εμφάνισης μοντέλου. Ενεργή η παλιά σκηνή 3D.';
 readyModel.dataset.assetReady='false';
 disableRealisticMode();
});

const fullscreenButton=$('next-fullscreen');
fullscreenButton.addEventListener('click',async()=>{
 const stage=$('next-immersive-stage');
 if(document.fullscreenElement){
  if(document.fullscreenElement===stage)await document.exitFullscreen?.();
 }else if(stage.requestFullscreen){
  try{await stage.requestFullscreen();}catch{$('next-result').textContent='Η πλήρης οθόνη δεν υποστηρίζεται σε αυτόν τον browser.';}
 }else{$('next-result').textContent='Η πλήρης οθόνη δεν υποστηρίζεται σε αυτή τη συσκευή.';}
});
document.addEventListener('fullscreenchange',()=>{
 const on=document.fullscreenElement===$('next-immersive-stage');
 fullscreenButton.textContent=on?'↙ Έξοδος πλήρους οθόνης':'⛶ Πλήρης οθόνη';
 fullscreenButton.setAttribute('aria-pressed',String(on));
});
function commit(next,message){
 if(!validSession(next))throw Error('invalid-new-state');
 state=next;if(message!==undefined)result=message;
 const saved=saveSession(localStorage,state);
 $('next-save-note').textContent=saved?'Η άσκηση αποθηκεύεται τοπικά σε αυτή τη συσκευή.':'Η αποθήκευση δεν επιτρέπεται σε αυτόν τον browser. Η άσκηση λειτουργεί μέχρι το κλείσιμο της σελίδας.';
 render();
}
function labelPerson(id){return getCase(state.caseId)?.patients.find(p=>p.id===id)?.name||'Εικονικός ασθενής';}
function showResult(message){result=message;$('next-result').textContent=result;}
function actionButton(text,onClick,disabled=false){
 const b=el('button',text);b.type='button';b.disabled=disabled;b.addEventListener('click',onClick);return b;
}

function renderCaseLibrary(){
 const active=getCase(state.caseId),cases=$('next-case-list'),progress=caseProgress(localStorage);
 $('next-case-title').textContent=active.title;
 $('next-case-briefing').textContent=active.briefing;
 $('next-case-goal').textContent=active.goal;
 $('next-location').textContent=active.location+' · ΣΥΝΘΕΤΙΚΗ ΣΚΗΝΗ';
 for(const btn of document.querySelectorAll('[data-next-patient]')){
  const p=active.patients.find(x=>x.id===btn.dataset.nextPatient);
  btn.replaceChildren(document.createTextNode(p.name+' '),el('small',p.setting));
 }
 cases.replaceChildren();
 for(const c of CASES){
  const stored=progress.find(p=>p.caseId===c.id);
  const button=el('button',undefined,'next-case-card');
  button.type='button';button.dataset.caseId=c.id;
  button.setAttribute('aria-pressed',String(c.id===active.id));
  button.append(el('span',c.tag+' · '+c.level,'next-case-tag'),el('strong',c.title),
    el('small',c.location+' · '+(stored.events?stored.events+' καταγραφές · '+stored.minutes+'′':'Δεν έχει ξεκινήσει')));
  button.addEventListener('click',()=>{
   if(c.id===state.caseId)return;
   tool='dialogue';result='Φορτώθηκε η αποστολή «'+c.title+'». Το προηγούμενο περιστατικό παραμένει αποθηκευμένο τοπικά.';
   commit(loadCaseSession(localStorage,c.id),result);
   $('next-stage').scrollIntoView({behavior:'smooth',block:'start'});
  });
  cases.append(button);
 }
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
  position:'Απεικονιστικές στάσεις 3D ασθενούς. Η αλλαγή δεν είναι κλινική μετακίνηση, θεραπεία ή οδηγία πρώτων βοηθειών.',
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

function renderInsights(){
 const review=missionEvidence(state),grid=$('next-evidence-grid');
 grid.replaceChildren();
 for(const p of review.people){
  const card=el('article',undefined,'next-evidence-person');
  const name=el('h3','Άτομο '+p.id.toUpperCase()+' · '+p.covered+'/4 εκπαιδευτικά βήματα');
  card.append(name,el('p','Συνθετικό στιγμιότυπο: HR '+p.vitals.hr+' · RR '+p.vitals.rr+' · SpO₂ '+p.vitals.spo2+'%'));
  const ul=el('ul');
  for(const item of p.steps){
   const li=el('li',item.label);
   li.className=item.done?'next-done':'next-missing';
   li.prepend(el('span',item.done?'✓ ':'○ '));ul.append(li);
  }
  card.append(ul);
  card.append(actionButton('Επιλογή ατόμου '+p.id.toUpperCase(),()=>{
   commit(setFocus(state,p.id,state.view),'Εστιάζεις στο Άτομο '+p.id.toUpperCase()+'.');
  }));
  grid.append(card);
 }
 const shared=$('next-evidence-shared');shared.replaceChildren();
 for(const item of review.shared){
  const li=el('li',(item.done?'✓ ':'○ ')+item.label);li.className=item.done?'next-done':'next-missing';shared.append(li);
 }
 const issues=$('next-evidence-issues');issues.replaceChildren();
 if(!review.caution.length)issues.append(el('li','Δεν εντοπίστηκαν οργανωτικές ασυνέπειες στις μέχρι τώρα καταγραφές.'));
 else for(const note of review.caution)issues.append(el('li',note));
 const stateLine=$('next-evidence-state');
 stateLine.textContent='Έως τώρα: '+state.events.length+' καταγραφές · '+state.minute+'′ συνθετικού χρόνου. Καμία αξιολόγηση κλινικής ορθότητας.';
 drawChart();
}
function drawChart(){
 const svg=$('next-trend-svg');const ns='http://www.w3.org/2000/svg',metric=$('next-trend-metric').value;
 const values=['hr','rr','spo2'].includes(metric)?metric:'hr';
 const a=vitalTrend(state,'a',values),b=vitalTrend(state,'b',values),all=[...a,...b].map(p=>p.value);
 const mn=Math.min(...all)-2,mx=Math.max(...all)+2,span=mx-mn||1;
 const W=540,H=205,L=43,R=15,T=21,B=34;
 const xp=n=>L+(n/30)*(W-L-R),yp=v=>T+(1-(v-mn)/span)*(H-T-B);
 function node(tag,attrs={},txt){const v=document.createElementNS(ns,tag);for(const [k,val] of Object.entries(attrs))v.setAttribute(k,String(val));if(txt!==undefined)v.textContent=txt;return v;}
 svg.replaceChildren();svg.setAttribute('viewBox','0 0 '+W+' '+H);
 for(let i=0;i<=3;i++){const y=T+i*(H-T-B)/3;svg.append(node('line',{x1:L,y1:y,x2:W-R,y2:y,stroke:'#32586e','stroke-dasharray':'4 5'}),node('text',{x:7,y:y+4,fill:'#bfd4db','font-size':11},String(Math.round(mx-i*span/3))));}
 for(let i=0;i<=30;i+=10)svg.append(node('text',{x:xp(i),y:H-11,fill:'#bfd4db','font-size':11,'text-anchor':'middle'},i+'′'));
 for(const [series,color,label] of [[a,'#78e3c3','Άτομο Α'],[b,'#91b8f7','Άτομο Β']]){
  const pts=series.map(p=>xp(p.minute).toFixed(1)+','+yp(p.value).toFixed(1)).join(' ');
  if(series.length>1)svg.append(node('polyline',{points:pts,fill:'none',stroke:color,'stroke-width':3,'stroke-linecap':'round','stroke-linejoin':'round'}));
  const last=series.at(-1);svg.append(node('circle',{cx:xp(last.minute),cy:yp(last.value),r:4.8,fill:color,stroke:'#061923','stroke-width':2}));
 }
 $('next-trend-caption').textContent='Εικονική πορεία '+({hr:'παλμών (HR)',rr:'αναπνοών (RR)',spo2:'κορεσμού (SpO₂)'}[values])+' · Άτομο Α '+a.at(-1).value+', Άτομο Β '+b.at(-1).value+'. Μόνο συνθετικές τιμές, όχι ΗΚΓ ή ανταπόκριση σε θεραπεία.';
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
 renderCaseLibrary();
 $('next-minute').textContent=String(state.minute).padStart(2,'0')+':00';
 $('next-status').textContent=state.finished?'Ολοκληρώθηκε':state.playing?'Ο χρόνος προχωρά':'Σε παύση';
 $('next-play').disabled=state.finished;
 $('next-play').setAttribute('aria-pressed',String(state.playing));
 $('next-play').textContent=state.playing?'⏸ Παύση χρόνου':'▶ Έναρξη χρόνου';
 $('next-step').disabled=state.finished;
 const currentCase=getCase(state.caseId),patient=currentCase.patients.find(p=>p.id===state.person),v=patientVitals(state,state.person);
 $('next-person-name').textContent=patient.name;
 $('next-person-description').textContent=patient.description;
 $('next-hr').textContent=String(v.hr);$('next-rr').textContent=String(v.rr);$('next-spo2').textContent=String(v.spo2);
 for(const button of document.querySelectorAll('[data-next-patient]'))button.setAttribute('aria-pressed',String(button.dataset.nextPatient===state.person));
 for(const button of document.querySelectorAll('[data-next-view]'))button.setAttribute('aria-pressed',String(button.dataset.nextView===state.view));
 if(readyEnabled&&lastReadyPerson!==state.person){
  lastReadyPerson=state.person;
  updateReadyModel(state.person==='b'?'amara':'alex');
 }
 renderer.setEnvironment?.(currentCase.scene);
 renderer.setFocus(state.view==='scene'?'scene':state.person,state.view);
 renderer.setPaused(!state.playing);
 renderer.setPoses?.({a:patientPose(state,'a'),b:patientPose(state,'b')});
 renderMenu();renderTool();renderReview();renderInsights();
 window.dispatchEvent(new CustomEvent('mentor:context',{detail:{kind:'scenario',id:currentCase.id,label:'MENTOR NEXT — '+currentCase.title}}));
}
for(const button of document.querySelectorAll('[data-next-patient]'))button.addEventListener('click',()=>{
 try{commit(setFocus(state,button.dataset.nextPatient,state.view),'Επέλεξες '+labelPerson(button.dataset.nextPatient)+'.');}catch{}
});
for(const button of document.querySelectorAll('[data-next-view]'))button.addEventListener('click',()=>{
 try{commit(setFocus(state,state.person,button.dataset.nextView),'Άλλαξε η γωνία προβολής.');}catch{}
});
$('next-trend-metric').addEventListener('change',drawChart);
$('next-rotate-left').addEventListener('click',()=>renderer.rotate?.(-0.23));
$('next-rotate-right').addEventListener('click',()=>renderer.rotate?.(0.23));
$('next-play').addEventListener('click',()=>{try{commit(setPlaying(state,!state.playing),state.playing?'Η παύση σταματά μόνο τον αυτόματο χρόνο.':'Η αυτόματη εξέλιξη του συνθετικού χρόνου ξεκίνησε.');}catch{}});
$('next-step').addEventListener('click',()=>{try{commit(nextMinute(state,1),'Προχώρησε ένα εικονικό λεπτό. Οι ενδείξεις ακολουθούν προκαθορισμένη πορεία.');}catch{}});
$('next-reset').addEventListener('click',()=>{if(!confirm('Νέα εκπαιδευτική προσπάθεια; Θα αντικατασταθεί μόνο αυτή η συνθετική αποστολή.'))return;tool='dialogue';commit(newSession(state.caseId),'Ξεκίνησε νέα συνθετική αποστολή.');});
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
 const blob=new Blob([reportText(state)+'\n'+buildEvidenceReport(state)],{type:'text/plain;charset=utf-8'});
 const url=URL.createObjectURL(blob),a=el('a');a.href=url;a.download='mentor-next-ekab-report.txt';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
});
let elapsed=0;
const clock=setInterval(()=>{
 if(document.hidden||!state.playing||state.finished)return;
 elapsed++;if(elapsed<7)return;elapsed=0;
 try{commit(nextMinute(state,1),'Ενημερώθηκαν οι συνθετικές ενδείξεις λόγω παρέλευσης εικονικού χρόνου.');}catch{}
},1000);
// The native <details> element owns close/reopen, independent of JavaScript and the floating MENTOR.
// Guided next process step, never clinical advice.
$('next-nextstep').addEventListener('click',()=>{
 const r=missionEvidence(state),p=r.people.find(x=>x.id===state.person);
 if(!r.shared[0].done)tool='exam';
 else if(p.steps.some(x=>!x.done)){
  const first=p.steps.find(x=>!x.done);
  tool=first.id==='dialogue'?'dialogue':first.id==='exam'?'exam':first.id==='monitor'?'monitor':'exam';
 }else if(!r.shared[1].done)tool='call';
 else if(!r.shared[2].done)tool='interventions';
 else tool='debrief';
 $('next-tool-panels').open=true;
 renderMenu();renderTool();
 $('next-tool-title').scrollIntoView({behavior:'smooth',block:'center'});
});
window.addEventListener('pagehide',()=>{clearInterval(clock);meshObserver.disconnect();renderer.dispose();},{once:true});
render();
// Heavy GLBs load after core controls are interactive; reduced-data users opt in manually.
if(!navigator.connection?.saveData){
 window.addEventListener('load',()=>{void enableRealisticMode();},{once:true});
}

