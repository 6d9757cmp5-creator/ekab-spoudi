/**
 * Home MENTOR: real rigged 3D iframe, locally sourced study answers,
 * explicit opt-in voice and persistent user-only visibility preference.
 * Does not write to learner grades, notes, exam status or sync.
 */
import {supportsSpeech,listGreekVoices,isKnownMaleGreekVoice,speakGreek,stopGreek} from "../voice/speech.mjs";
import {chooseMouthShape} from "../avatar/live.mjs";
import {answerStudyQuestion,loadMentorTermLibrary} from "../core/quick-answer.mjs";
import {interpretQuestion} from "../core/guided-coach.mjs";
import {chooseMentorDelivery,deliverySpeechSettings,publicDeliveryCue} from "../core/presence-director.mjs";

const $=id=>document.getElementById(id);
const stage=document.querySelector(".mentor-cinema");
const frame=$("mentor-home-presence-frame");
const visual=$("mentor-home-visual-shell");
const toggle=$("mentor-home-visual-toggle");
const button=$("mentor-home-listen"),stopper=$("mentor-home-stop"),status=$("mentor-home-speech-status"),select=$("mentor-home-voice");
const question=$("mentor-home-question"),form=$("mentor-home-question-form");
const answer=$("mentor-home-answer"),source=$("mentor-home-answer-source"),sayAnswer=$("mentor-home-answer-speak");
const mic=$("mentor-home-mic");
const greeting="Καλώς ήρθες στην ΕΚΑΒ Σπουδή. Είμαι ο Μέντορ, ο προσωπικός σου εκπαιδευτικός οδηγός. Ρώτησέ με για την ύλη ή ξεκίνα μια αποστολή.";
const SpeechRecognizer=window.SpeechRecognition||window.webkitSpeechRecognition;
let latestAnswer="",generation=0,speaking=false,recognizer=null,delivery=chooseMentorDelivery();
let hiddenByUser=false;
try{hiddenByUser=localStorage.getItem("ekab-mentor-home-hidden")==="1";}catch{}
function updateVisibility(hide){
 hiddenByUser=hide;
 visual.hidden=hide;
 toggle.textContent=hide?"Εμφάνιση μορφής MENTOR":"Απόκρυψη μορφής";
 toggle.setAttribute("aria-expanded",String(!hide));
 try{localStorage.setItem("ekab-mentor-home-hidden",hide?"1":"0");}catch{}
 if(hide)send({type:"mentor:speech",speaking:false,viseme:"rest"});
}
function send(data){
 try{frame?.contentWindow?.postMessage(data,location.origin);}catch{}
}
updateVisibility(hiddenByUser);
toggle.addEventListener("click",()=>updateVisibility(!hiddenByUser));
window.addEventListener("message",event=>{
 if(event.origin!==location.origin||event.source!==frame?.contentWindow)return;
 if(event.data?.type==="mentor:stage"){
   const state=event.data.state;
   if(state==="ready")$("mentor-home-3d-status").textContent="Ο MENTOR είναι παρών σε 3D.";
   else $("mentor-home-3d-status").textContent="Η μορφή 3D δεν φορτώθηκε. Δεν εμφανίζεται παλιό μοντέλο.";
 }
});
function paintSpeaking(active){
 speaking=active;
 stage?.classList.toggle("is-speaking",active);
 stopper.disabled=!active;
 button.setAttribute("aria-pressed",String(active));
 if(!active)send({type:"mentor:speech",speaking:false,viseme:"rest"});
}
function refreshVoices(){
 if(!supportsSpeech(window))return;
 const prev=select.value;
 select.replaceChildren();
 const opt=document.createElement("option");opt.value="";opt.textContent="Αυτόματη ανδρική ελληνική φωνή";select.append(opt);
 const voices=listGreekVoices(window).filter(isKnownMaleGreekVoice);
 for(const v of voices){
   const opt=document.createElement("option");opt.value=v.name;opt.textContent=v.name+(v.localService?" · Συσκευή":" · Browser");select.append(opt);
 }
 const other=document.createElement("option");other.value="__device__";
 other.textContent="Εναλλακτική: ελληνική φωνή συσκευής (δεν εγγυάται ανδρική)";
 select.append(other);
 if([...select.options].some(x=>x.value===prev))select.value=prev;
 if(!voices.length)select.title="Δεν αναγνωρίστηκε ανδρική ελληνική φωνή στη συσκευή.";
}
function stop(){
 generation++;stopGreek(window);paintSpeaking(false);
 if(recognizer){recognizer.abort();recognizer=null;}
 status.textContent="Η φωνητική λειτουργία σταμάτησε.";
}
function play(text){
 if(!supportsSpeech(window)||!text){
   status.textContent="Η φωνητική ανάγνωση δεν υποστηρίζεται στη συσκευή.";
   return false;
 }
 const ticket=++generation;
 const voiceStyle=deliverySpeechSettings(delivery,.95);
 paintSpeaking(false);
 const ok=speakGreek(text,{
   env:window,voiceName:select.value==="__device__"?"":select.value,requireMale:select.value!=="__device__",
   rate:voiceStyle.rate,pitch:voiceStyle.pitch,volume:voiceStyle.volume,
   onStart:()=>{
     if(ticket!==generation)return;
     paintSpeaking(true);status.textContent="Ο MENTOR μιλά με ανδρική ελληνική φωνή.";
     send({type:"mentor:presence",detail:publicDeliveryCue(delivery)});
     send({type:"mentor:speech",speaking:true,viseme:"open"});
   },
   onBoundary:event=>{
     if(ticket!==generation)return;
     send({type:"mentor:speech",speaking:true,viseme:chooseMouthShape(text,event.charIndex||0)});
   },
   onFinish:()=>{if(ticket!==generation)return;paintSpeaking(false);status.textContent="Η ανάγνωση ολοκληρώθηκε.";},
   onError:()=>{if(ticket!==generation)return;paintSpeaking(false);status.textContent="Η φωνή δεν αναπαράχθηκε. Μπορείς να χρησιμοποιήσεις την απάντηση ως κείμενο.";}
 });
 if(!ok)status.textContent="Δεν αναγνωρίστηκε ανδρική ελληνική φωνή. Επίλεξε ρητά την εναλλακτική φωνή συσκευής ή διάβασε την απάντηση.";
 return ok;
}
async function ask(text){
 const questionText=String(text||"").trim().slice(0,300);
 if(!questionText)return;
 answer.hidden=false;answer.textContent="Αναζήτηση στην ελληνική βιβλιοθήκη…";
 source.hidden=true;latestAnswer="";
 const items=await loadMentorTermLibrary();
 const result=answerStudyQuestion(questionText,{items});
 latestAnswer=result.text;
 answer.textContent=result.text;
 if(result.source){source.href=result.source;source.hidden=false;}
 const intent=interpretQuestion(questionText);
 delivery=chooseMentorDelivery({intent:intent.intent==="unknown"?"explain":intent.intent,topic:intent.topic||"scene"});
 send({type:"mentor:presence",detail:publicDeliveryCue(delivery)});
 sayAnswer.disabled=false;
 status.textContent="Ο MENTOR απάντησε γραπτώς. Για ακρόαση πάτησε «Άκου απάντηση».";
}
form.addEventListener("submit",e=>{
 e.preventDefault();const text=question.value.trim();if(!text)return;void ask(text);
});
sayAnswer.addEventListener("click",()=>play(latestAnswer));
if(!supportsSpeech(window)){
 button.disabled=true;stopper.disabled=true;select.disabled=true;
 status.textContent="Η συσκευή δεν διαθέτει φωνητική ανάγνωση. Η γραπτή καθοδήγηση λειτουργεί.";
}else{
 refreshVoices();
 window.speechSynthesis.addEventListener?.("voiceschanged",refreshVoices);
 button.addEventListener("click",()=>play(latestAnswer||greeting));
 stopper.addEventListener("click",stop);
}
if(mic){
 mic.disabled=typeof SpeechRecognizer!=="function";
 mic.title=mic.disabled?"Η αναγνώριση ελληνικής ομιλίας δεν υποστηρίζεται εδώ.":"";
 mic.addEventListener("click",()=>{
   if(mic.disabled)return;
   if(recognizer){recognizer.abort();recognizer=null;return;}
   stopGreek(window);generation++;paintSpeaking(false);
   const listener=new SpeechRecognizer();recognizer=listener;
   listener.lang="el-GR";listener.continuous=false;listener.interimResults=false;
   listener.onstart=()=>{status.textContent="Ακούω την ερώτησή σου. Η αναγνώριση μπορεί να χρησιμοποιεί υπηρεσία του browser.";};
   listener.onresult=e=>{
     if(recognizer!==listener)return;
     question.value=String(e.results?.[0]?.[0]?.transcript||"").trim().slice(0,300);
     status.textContent="Αναγνωρίστηκε η ερώτηση. Έλεγξέ την και πάτησε «Ρώτησε».";
     question.focus();
   };
   listener.onerror=()=>{status.textContent="Η φωνητική αναγνώριση δεν λειτούργησε. Γράψε την ερώτηση.";}
   listener.onend=()=>{if(recognizer===listener)recognizer=null;};
   try{listener.start();}catch{recognizer=null;status.textContent="Δεν έγινε εκκίνηση μικροφώνου.";}
 });
}
document.addEventListener("visibilitychange",()=>{if(document.hidden&&speaking)stop();});
window.addEventListener("pagehide",()=>{if(speaking||recognizer)stop();});
