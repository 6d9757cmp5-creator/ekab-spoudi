/**
 * Voice for the MENTOR Live Companion.
 * - Speech output: Greek Web Speech voice (a known female voice when the device has one, otherwise any device Greek voice).
 * - Speech input: only after the learner presses the microphone button; never automatic.
 * - Barge-in: starting the microphone or typing stops MENTOR immediately.
 * Mouth shapes come from the letters of each word (mouth.mjs), timed by the device voice's word boundaries.
 * They are NOT audio-aligned and NOT phoneme-accurate: exact lip-sync needs a voice that returns its audio and timings.
 */
import {supportsSpeech,speakGreek,stopGreek} from "../voice/speech.mjs";
import {chooseMouthShape} from "../avatar/live.mjs";
import {wordAt,scheduleWord} from "./mouth.mjs";

export function createVoice({win=window,onMouth=()=>{},onState=()=>{}}={}){
 const Recognizer=win.SpeechRecognition||win.webkitSpeechRecognition;
 let ticket=0,speaking=false,listener=null,mouthTimers=[];
 const clearMouth=()=>{for(const t of mouthTimers)win.clearTimeout(t);mouthTimers=[];};

 const state=()=>({speaking,listening:!!listener,tts:supportsSpeech(win),stt:typeof Recognizer==="function"});
 const emit=()=>onState(state());

 function stopSpeaking(){
  ticket++;
  clearMouth();
  stopGreek(win);
  if(speaking){speaking=false;onMouth({speaking:false,viseme:"rest"});}
  emit();
 }

 function speak(text){
  if(!supportsSpeech(win)||!text)return {ok:false,reason:"unsupported"};
  const mine=++ticket;
  const run=opts=>speakGreek(text,{
   env:win,...opts,
   onStart:()=>{if(mine!==ticket)return;speaking=true;onMouth({speaking:true,viseme:"open"});emit();},
   // Each word is spread over letter-level shapes derived from the text (not from the audio).
   onBoundary:e=>{
    if(mine!==ticket)return;
    clearMouth();
    const word=wordAt(text,e.charIndex||0),ms=Math.max(110,Math.min(700,word.length*75));
    const plan=scheduleWord(word,ms);
    if(!plan.length){onMouth({speaking:true,viseme:chooseMouthShape(text,e.charIndex||0)});return;}
    for(const step of plan.slice(0,-1))mouthTimers.push(win.setTimeout(()=>{if(mine===ticket)onMouth({speaking:true,viseme:step.shape});},step.at));
   },
   onFinish:()=>{if(mine!==ticket)return;clearMouth();speaking=false;onMouth({speaking:false,viseme:"rest"});emit();},
   onError:()=>{if(mine!==ticket)return;clearMouth();speaking=false;onMouth({speaking:false,viseme:"rest"});emit();}
  });
  let usedDeviceVoice=false;
  let ok=run({requireFemale:true});
  if(!ok){ok=run({requireGreek:true});usedDeviceVoice=ok;}
  return ok?{ok:true,deviceVoice:usedDeviceVoice}:{ok:false,reason:"no-greek-voice"};
 }

 /** Starts one dictation. Resolves with the transcript, or null. Always user-initiated. */
 function listen(){
  return new Promise(resolve=>{
   if(typeof Recognizer!=="function"){resolve({ok:false,reason:"unsupported"});return;}
   if(listener){try{listener.abort();}catch{}listener=null;emit();resolve({ok:false,reason:"cancelled"});return;}
   stopSpeaking();
   const r=new Recognizer();
   listener=r;
   r.lang="el-GR";r.continuous=false;r.interimResults=false;
   let result=null;
   r.onresult=e=>{result=String(e.results?.[0]?.[0]?.transcript||"").trim().slice(0,300);};
   r.onerror=e=>{result=null;r.__error=e?.error||"error";};
   r.onend=()=>{
    const mine=listener===r;
    if(mine)listener=null;
    emit();
    resolve(result?{ok:true,text:result}:{ok:false,reason:r.__error||"empty"});
   };
   try{r.start();emit();}catch{listener=null;emit();resolve({ok:false,reason:"start-failed"});}
  });
 }
 function stopListening(){if(listener){try{listener.abort();}catch{}listener=null;emit();}}
 function stopAll(){stopSpeaking();stopListening();}

 win.addEventListener("pagehide",stopAll);
 win.document?.addEventListener("visibilitychange",()=>{if(win.document.hidden)stopAll();});

 return {speak,stopSpeaking,listen,stopListening,stopAll,state};
}
