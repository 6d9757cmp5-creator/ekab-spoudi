import {ATLA_TOPICS,HUMAN_COMMANDS,nativeAtlasUrl,validateViewerUrl,isolatePickedObjectMap} from './biodigital-bridge-core.mjs';
const $=id=>document.getElementById(id);
const nativeFrame=$('nativeFrame'),providerFrame=$('providerFrame'),status=$('status'),source=$('source');
let human=null,ready=false,apiLoad=null,labels=true,xray=false,chapters=0,pickedId=null,capturedScene=null,isolated=false,quizActive=false,tourPlaying=false;
const say=message=>{status.textContent=message};
function controls(enabled){
 document.querySelectorAll('[data-human-command]').forEach(b=>{b.disabled=!enabled});
 $('previous').disabled=!enabled||chapters<2;
 $('next').disabled=!enabled||chapters<2;
 $('isolate').disabled=!enabled||!pickedId||isolated;
 $('restoreScene').disabled=!enabled||!isolated;
 $('quizEnter').disabled=!enabled||quizActive;
 $('quizExit').disabled=!enabled||!quizActive;
 $('tourPlay').disabled=!enabled||chapters===0||tourPlaying;
 $('tourPause').disabled=!enabled||chapters===0||!tourPlaying;
}
function active(which){
 const isProvider=which==='provider';
 providerFrame.hidden=!isProvider;nativeFrame.hidden=isProvider;
 $('providerControls').hidden=!isProvider;
 $('nativeControls').hidden=isProvider;
 document.querySelectorAll('[data-source]').forEach(btn=>btn.setAttribute('aria-pressed',String(btn.dataset.source===which)));
 source.textContent=isProvider?'BioDigital Human · εξωτερικός Viewer API':'ATLA · τοπικά ελεγχόμενος 3D άτλας';
}
function showTopic(id){
 const topic=ATLA_TOPICS.find(t=>t.id===id);
 if(!topic)return;
 $('prompt').textContent=topic.prompt;
 $('topic').value=topic.id;
 // Only a user click starts an anatomy download; no automatic large model load.
 nativeFrame.src=nativeAtlasUrl(id);
 active('native');say('Άνοιξε ο άτλας ATLA με εστίαση: '+topic.name+'. Ο αυτοέλεγχος βρίσκεται μέσα στον άτλαντα.');
}
async function loadHumanApi(){
 if(typeof window.HumanAPI==='function')return true;
 if(apiLoad)return apiLoad;
 apiLoad=new Promise(resolve=>{
  const script=document.createElement('script');
  script.src='./vendor/biodigital-human-api-3.0.0.min.js';
  script.async=true;
  script.onload=()=>resolve(typeof window.HumanAPI==='function');
  script.onerror=()=>{apiLoad=null;resolve(false)};
  document.head.append(script);
 });
 return apiLoad;
}
async function openProvider(){
 const published=validateViewerUrl($('viewerUrl').value);
 if(!published){say('Χρειάζεται έγκυρος δημοσιευμένος σύνδεσμος BioDigital με αναγνωριστικό μοντέλου.');return}
 human=null;ready=false;chapters=0;xray=false;labels=true;pickedId=null;capturedScene=null;isolated=false;quizActive=false;tourPlaying=false;
 controls(false);active('provider');
 say('Φόρτωση του επίσημου Human Viewer API...');
 if(!(await loadHumanApi())){
  providerFrame.src=published;
  say('Ο εξωτερικός viewer φορτώνει, αλλά το Viewer API δεν ήταν διαθέσιμο. Τα εξωτερικά χειριστήρια παραμένουν ανενεργά.');return;
 }
 try{
  const candidate=new window.HumanAPI({iframeId:'providerFrame',onUnsupported:()=>{
   say('Το BioDigital Viewer δεν υποστηρίζει την τρέχουσα σύνδεση. Έλεγξε το επίσημο Published Viewer URL και το Developer App.');
  }});
  human=candidate;
  candidate.on('human.ready',()=>{
   if(human!==candidate)return;
   ready=true;controls(true);
   say('Ο Viewer ανταποκρίθηκε. Πάτησε ανατομικό σημείο για επιλογή και απομόνωση.');
   candidate.send('timeline.info',data=>{
    if(human!==candidate)return;
    chapters=Array.isArray(data?.chapters)?data.chapters.length:0;
    tourPlaying=Boolean(data?.playing);
    controls(true);
   });
  });
  candidate.on('scene.picked',e=>{
   if(human!==candidate)return;
   const next=isolatePickedObjectMap(e?.objectId);
   pickedId=next?e.objectId:null;
   if(pickedId)say('Επιλεγμένη δομή: '+pickedId.slice(0,100)+'. Μπορείς να την απομονώσεις.');
   controls(ready);
  });
  candidate.on('scene.xrayEnabled',()=>{if(human!==candidate)return;xray=true;$('xray').setAttribute('aria-pressed','true')});
  candidate.on('scene.xrayDisabled',()=>{if(human!==candidate)return;xray=false;$('xray').setAttribute('aria-pressed','false')});
  candidate.on('labels.enabled',()=>{if(human!==candidate)return;labels=true;$('labels').setAttribute('aria-pressed','true')});
  candidate.on('labels.disabled',()=>{if(human!==candidate)return;labels=false;$('labels').setAttribute('aria-pressed','false')});
  candidate.on('quiz.entered',()=>{if(human!==candidate)return;quizActive=true;controls(true);say('Άνοιξε η 3D εξέταση του ενεργού BioDigital μοντέλου.')});
  candidate.on('quiz.exited',()=>{if(human!==candidate)return;quizActive=false;controls(true);say('Η 3D εξέταση έκλεισε. Δεν τροποποιήθηκε η βαθμολογία ATLA.')});
  candidate.on('quiz.completed',data=>{
   if(human!==candidate)return;
   if(Number.isFinite(data?.score)&&Number.isFinite(data?.total))
     say('Αποτέλεσμα BioDigital: '+data.score+'% σε '+data.total+' ερωτήσεις. Δεν καταχωρίζεται ως επίσημη βαθμολογία ATLA.');
   else say('Ολοκληρώθηκε η εξέταση BioDigital. Χωρίς αλλαγή στην πρόοδο ATLA.');
  });
  candidate.on('timeline.chapterTransition',()=>{if(human!==candidate)return;capturedScene=null;isolated=false;pickedId=null;controls(true)});
  candidate.on('timeline.completed',()=>{if(human!==candidate)return;tourPlaying=false;controls(true)});
  candidate.on('scene.restored',()=>{if(human!==candidate)return;isolated=false;capturedScene=null;controls(true)});
  providerFrame.src=published;
  // The provider can show an authentication error inside its cross-origin iframe
  // without firing human.ready. Never assume the URL alone proves entitlement.
  setTimeout(()=>{
   if(human===candidate&&!ready){
    controls(false);
    say('Δεν επιβεβαιώθηκε σύνδεση BioDigital Viewer API. Έλεγξε μέσα στο 3D παράθυρο για σφάλμα ταυτοποίησης και χρησιμοποίησε τον επίσημο σύνδεσμο Publish με τα στοιχεία Developer App που απαιτούνται.');
   }
  },12000);
 }catch{
  human=null;ready=false;controls(false);say('Αποτυχία σύνδεσης Viewer API. Ο εξωτερικός viewer παραμένει διαθέσιμος.');
  providerFrame.src=published;
 }
}
function callHuman(which){
 if(!human||!ready)return;
 const send=(name,params,callback)=>{
  const command=HUMAN_COMMANDS[name];
  if(!command)return;
  try{human.send(command[0],params===undefined?command[1]:params,callback)}catch{say('Η εντολή απέτυχε στο ενεργό μοντέλο.')}
 };
 if(which==='isolate'){
  const selection=isolatePickedObjectMap(pickedId);if(!selection||isolated)return;
  const current=human;
  try{current.send('scene.capture',state=>{
    if(current!==human||!ready)return;
    if(!state||typeof state!=='object'){say('Δεν μπόρεσα να αποθηκεύσω την προηγούμενη σκηνή.');return}
    capturedScene=state;
    current.send('scene.showObjects',selection);
    isolated=true;controls(true);
    say('Ζητήθηκε απομόνωση της επιλεγμένης δομής. Επαναφορά από το αντίστοιχο κουμπί.');
  })}catch{say('Η απομόνωση δεν είναι διαθέσιμη.')}
  return;
 }
 if(which==='restore'){
  if(!isolated)return;
  const state=capturedScene;
  if(state){
   try{human.send('scene.restore',state)}catch{say('Δεν ήταν εφικτή η επαναφορά.');return}
  }else send('restore');
  capturedScene=null;isolated=false;controls(true);say('Ζητήθηκε επαναφορά της προηγούμενης ανατομικής προβολής.');
  return;
 }
 if(which==='quizEnter'){
  try{human.send('quiz.enter',response=>{
   if(response?.error)say('Δεν υπάρχει διαθέσιμη εξέταση στο συγκεκριμένο μοντέλο.');
  })}catch{say('Η εξέταση δεν υποστηρίζεται εδώ.')}
  return;
 }
 if(which==='quizExit'){send('quizExit');return}
 if(which==='tourPlay'){if(chapters>0){send('play');tourPlaying=true;controls(true)}return}
 if(which==='tourPause'){if(chapters>0){send('pause');tourPlaying=false;controls(true)}return}
 const name=which==='labels'?(labels?'labelsOff':'labelsOn')
  :which==='xray'?(xray?'xrayOff':'xrayOn'):which;
 if(!HUMAN_COMMANDS[name])return;
 send(name);
 if(which==='labels')say('Στάλθηκε εντολή εμφάνισης/απόκρυψης ετικετών.');
 else if(which==='xray')say('Στάλθηκε εντολή λειτουργίας X-ray.');
}
for(const t of ATLA_TOPICS){
 const opt=document.createElement('option');opt.value=t.id;opt.textContent=t.name;$('topic').append(opt);
}
$('topic').addEventListener('change',()=>{$('prompt').textContent=ATLA_TOPICS.find(t=>t.id===$('topic').value)?.prompt||''});
$('openTopic').addEventListener('click',()=>showTopic($('topic').value));
$('openProvider').addEventListener('click',openProvider);
document.querySelectorAll('[data-source]').forEach(b=>b.addEventListener('click',()=>{
 if(b.dataset.source==='native'&&nativeFrame.hasAttribute('src'))active('native');
 else if(b.dataset.source==='provider'&&providerFrame.hasAttribute('src'))active('provider');
 else say('Διάλεξε πρώτα μοντέλο και πάτησε «Άνοιγμα».');
}));
document.querySelectorAll('[data-human-command]').forEach(b=>b.addEventListener('click',()=>callHuman(b.dataset.humanCommand)));
$('closeProvider').addEventListener('click',()=>{
 // Explicitly release the third-party viewer and stop messages.
 human=null;ready=false;chapters=0;pickedId=null;capturedScene=null;isolated=false;quizActive=false;tourPlaying=false;providerFrame.removeAttribute('src');controls(false);
 active('native');say('Έκλεισε η σύνδεση BioDigital. Ο ATLA συνεχίζει ανεξάρτητα.');
});
$('openQuiz').addEventListener('click',()=>{
 // The existing ATLA quiz is a genuine 3D quiz, not a simulated score here.
 const url=nativeAtlasUrl($('topic').value);if(!url)return;
 nativeFrame.src=url;active('native');
 say('Στον άτλαντα που ανοίγει, επίλεξε «Αυτοέλεγχος» για την πραγματική άσκηση ανατομίας.');
});
$('nativeLaunch').addEventListener('click',()=>showTopic($('topic').value));
controls(false);active('native');
say('Ο ATLA λειτουργεί ανεξάρτητα. Επίλεξε ελληνικό 3D μάθημα ή επικόλλησε δικό σου δημοσιευμένο BioDigital Viewer URL.');
