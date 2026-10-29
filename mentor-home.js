/* Home MENTOR: entirely opt-in device speech, no mic activation, storage or AI calls. */
import {supportsSpeech,listGreekVoices,speakGreek,stopGreek} from "./mentor-voice.mjs";
const button=document.getElementById("mentor-home-listen");
const stopper=document.getElementById("mentor-home-stop");
const status=document.getElementById("mentor-home-speech-status");
const select=document.getElementById("mentor-home-voice");
const stage=document.querySelector(".mentor-cinema");
const avatar=document.getElementById("mentor-home-avatar");
const greeting="Καλώς ήρθες στην ΕΚΑΒ Σπουδή. Είμαι ο Μέντορ, ο προσωπικός σου εκπαιδευτικός οδηγός. Τι θα ήθελες να μελετήσουμε σήμερα; Μπορείς να ξεκινήσεις με μια ερώτηση, μια αποστολή ή μια επανάληψη.";
let speaking=false;
let generation=0;
function updateVoices(){
 const previous=select.value;
 const voices=listGreekVoices(window);
 select.replaceChildren();
 const option=document.createElement("option");
 option.value="";option.textContent="Αυτόματη ελληνική φωνή";select.append(option);
 for(const voice of voices){
   const opt=document.createElement("option");
   opt.value=voice.name;
   opt.textContent=voice.name+(voice.localService?" · Συσκευή":" · Υπηρεσία browser");
   select.append(opt);
 }
 if(voices.some(v=>v.name===previous))select.value=previous;
 if(!voices.length)select.title="Δεν εντοπίστηκε ρητά εγκατεστημένη ελληνική φωνή. Ο browser θα επιλέξει.";
}
function setSpeaking(value){
 speaking=value;
 stage.classList.toggle("is-speaking",value);
 avatar.classList.toggle("is-speaking",value);
 stopper.disabled=!value;
 button.setAttribute("aria-pressed",String(value));
}
function stop(){
 generation++;stopGreek(window);
 setSpeaking(false);
 status.textContent="Η ανάγνωση σταμάτησε.";
}
if(!supportsSpeech(window)){
 button.disabled=true;stopper.disabled=true;select.disabled=true;
 status.textContent="Η συσκευή δεν υποστηρίζει φωνητική ανάγνωση εδώ. Οι εκπαιδευτικές λειτουργίες παραμένουν διαθέσιμες.";
}else{
 updateVoices();
 window.speechSynthesis.addEventListener?.("voiceschanged",updateVoices);
 button.addEventListener("click",()=>{
   const token=++generation;
   setSpeaking(false);
   const worked=speakGreek(greeting,{
     env:window,voiceName:select.value,rate:.95,pitch:1.01,
     onStart:()=>{if(token!==generation)return;setSpeaking(true);status.textContent="Ο MENTOR διαβάζει με τη διαθέσιμη φωνή του browser.";},
     onFinish:()=>{if(token!==generation)return;setSpeaking(false);status.textContent="Η ανάγνωση ολοκληρώθηκε.";},
     onError:event=>{if(token!==generation)return;setSpeaking(false);status.textContent=event?.error==="not-allowed"?"Επίτρεψε την αναπαραγωγή φωνής από τη συσκευή.":"Η φωνή δεν μπόρεσε να αναπαραχθεί στον browser.";}
   });
   if(!worked)status.textContent="Η αναπαραγωγή δεν ξεκίνησε.";
 });
 stopper.addEventListener("click",stop);
 document.addEventListener("visibilitychange",()=>{if(document.hidden&&speaking)stop();});
 window.addEventListener("pagehide",()=>{if(speaking)stop();});
}
