import {ATLA_TOPICS,HUMAN_COMMANDS,nativeAtlasUrl,validateViewerUrl} from './biodigital-bridge-core.mjs';
const $=id=>document.getElementById(id);
const nativeFrame=$('nativeFrame'),providerFrame=$('providerFrame'),status=$('status'),source=$('source');
let human=null,ready=false,apiLoad=null,labels=true,xray=false,dissect=false,chapters=0;
const say=message=>{status.textContent=message};
function controls(enabled){
 document.querySelectorAll('[data-human-command]').forEach(b=>{b.disabled=!enabled});
 $('previous').disabled=!enabled||chapters<2;
 $('next').disabled=!enabled||chapters<2;
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
  script.src='https://developer.biodigital.com/builds/api/human-api-3.0.0.min.js';
  script.async=true;
  script.onload=()=>resolve(typeof window.HumanAPI==='function');
  script.onerror=()=>resolve(false);
  document.head.append(script);
 });
 return apiLoad;
}
async function openProvider(){
 const published=validateViewerUrl($('viewerUrl').value);
 if(!published){say('Χρειάζεται έγκυρος δημοσιευμένος σύνδεσμος https://human.biodigital.com/viewer/?id=… ή /widget/?…');return}
 human=null;ready=false;chapters=0;xray=false;dissect=false;labels=true;controls(false);
 active('provider');
 providerFrame.src=published;
 say('Φόρτωση εξωτερικού BioDigital Viewer. Οι εντολές ενεργοποιούνται μόνο μετά την πραγματική απόκριση human.ready.');
 if(!(await loadHumanApi())){say('Ο ενσωματωμένος Viewer μπορεί να λειτουργεί, αλλά το επίσημο JavaScript API δεν φορτώθηκε. Χρησιμοποίησε τα χειριστήρια μέσα στο iframe.');return}
 try{
  const candidate=new window.HumanAPI('providerFrame');
  human=candidate;
  candidate.on('human.ready',()=>{
   if(human!==candidate)return;
   ready=true;controls(true);
   say('BioDigital Viewer API απάντησε. Οι λειτουργίες εξαρτώνται από τις δυνατότητες του δημοσιευμένου μοντέλου.');
   try{candidate.send('timeline.info',data=>{
    if(human!==candidate)return;
    chapters=Array.isArray(data?.chapters)?data.chapters.length:0;controls(true);
   })}catch{}
  });
  candidate.on('scene.xrayEnabled',()=>{xray=true;$('xray').setAttribute('aria-pressed','true')});
  candidate.on('scene.xrayDisabled',()=>{xray=false;$('xray').setAttribute('aria-pressed','false')});
  candidate.on('scene.pickingModeUpdated',e=>{dissect=e?.pickingMode==='dissect';$('dissect').setAttribute('aria-pressed',String(dissect))});
 }catch(err){say('Η αρχικοποίηση του Viewer API απέτυχε. Ο ενσωματωμένος viewer παραμένει διαθέσιμος.');}
}
function callHuman(which){
 if(!human||!ready)return;
 const name=which==='labels'?(labels?'labelsOff':'labelsOn')
  :which==='xray'?(xray?'xrayOff':'xrayOn')
  :which==='dissect'?(dissect?'dissectOff':'dissectOn'):which;
 const command=HUMAN_COMMANDS[name];if(!command)return;
 try{human.send(command[0],command[1]);}
 catch{say('Η συγκεκριμένη εντολή δεν υποστηρίζεται από το ενεργό μοντέλο/API.')}
 if(which==='labels'){labels=!labels;$('labels').setAttribute('aria-pressed',String(labels))}
 if(which==='xray'){xray=!xray;$('xray').setAttribute('aria-pressed',String(xray))}
 if(which==='dissect'){dissect=!dissect;$('dissect').setAttribute('aria-pressed',String(dissect))}
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
 human=null;ready=false;chapters=0;providerFrame.removeAttribute('src');controls(false);
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
