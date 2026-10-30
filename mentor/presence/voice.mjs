/**
 * Voice for the MENTOR Live Companion.
 * - Speech output: Greek Web Speech voice (male when the device has one, otherwise the device Greek voice).
 * - Speech input: only after the learner presses the microphone button; never automatic.
 * - Barge-in: starting the microphone or typing stops MENTOR immediately.
 * Mouth shapes are estimated from word boundaries; this is NOT phoneme-accurate lip-sync.
 */
import {supportsSpeech,speakGreek,stopGreek} from "../voice/speech.mjs";
import {chooseMouthShape} from "../avatar/live.mjs";

export function createVoice({win=window,onMouth=()=>{},onState=()=>{}}={}){
 const Recognizer=win.SpeechRecognition||win.webkitSpeechRecognition;
 let ticket=0,speaking=false,listener=null;

 const state=()=>({speaking,listening:!!listener,tts:supportsSpeech(win),stt:typeof Recognizer==="function"});
 const emit=()=>onState(state());

 function stopSpeaking(){
  ticket++;
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
   onBoundary:e=>{if(mine!==ticket)return;onMouth({speaking:true,viseme:chooseMouthShape(text,e.charIndex||0)});},
   onFinish:()=>{if(mine!==ticket)return;speaking=false;onMouth({speaking:false,viseme:"rest"});emit();},
   onError:()=>{if(mine!==ticket)return;speaking=false;onMouth({speaking:false,viseme:"rest"});emit();}
  });
  let usedDeviceVoice=false;
  let ok=run({requireMale:true});
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
