import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {
  supportsSpeech,greekVoices,isKnownMaleGreekVoice,isKnownFemaleGreekVoice,voiceDiagnostics,
  resolveMentorGreekVoice,splitGreekSpeech,speakGreek,stopGreek
} from '../mentor-voice.mjs';

const greekMale={lang:'el-GR',name:'Nikos',voiceURI:'com.apple.ttsbundle.Nikos',localService:true};
const greekFemale={lang:'el-GR',name:'Melina',voiceURI:'com.apple.ttsbundle.Melina',localService:true};
const greekUnknown={lang:'el-GR',name:'Unknown Greek',voiceURI:'el-GR',localService:true};
const english={lang:'en-US',name:'Daniel Male',voiceURI:'en-US',localService:true};
function mockSpeech(available=[]){
 const calls=[];
 let voices=available;
 class SpeechSynthesisUtterance {constructor(text){this.text=text;}}
 const synth={
  paused:false, getVoices:()=>voices,
  cancel(){calls.push({type:'cancel'});},
  resume(){calls.push({type:'resume'});},
  speak(u){calls.push({type:'speak',u});this.current=u;}
 };
 const env={SpeechSynthesisUtterance,speechSynthesis:synth};
 return {env,synth,calls,setVoices(value){voices=value;},get utterance(){return synth.current;}};
}
test('iOS Greek voice discovery requires explicit female identity and includes known Melina',()=>{
 assert.equal(supportsSpeech(mockSpeech().env),true);
 assert.equal(isKnownFemaleGreekVoice(greekFemale),true);
 assert.equal(isKnownFemaleGreekVoice(greekMale),false);
 assert.equal(isKnownFemaleGreekVoice(greekUnknown),false);
 assert.equal(isKnownFemaleGreekVoice(english),false);
 assert.equal(isKnownMaleGreekVoice(greekMale),true);
 assert.deepEqual(greekVoices([greekMale,english,greekUnknown,greekFemale]).map(x=>x.name),
   ['Melina','Unknown Greek','Nikos']);
 assert.equal(resolveMentorGreekVoice([greekMale,greekFemale]).femaleVerified,true);
 assert.equal(resolveMentorGreekVoice([greekMale,greekFemale]).voice.name,'Melina');
});
test('Female Mentor does not silently play a male Greek voice even when browser supports speech',()=>{
 const device=mockSpeech([greekMale]);
 const selection=[];
 const started=speakGreek('Γεια σου, είμαι ο Μέντορας.',{
  env:device.env,requireFemale:true,onVoiceResolved:x=>selection.push(x)
 });
 assert.equal(started,false);
 assert.equal(selection[0].hasGreek,true);
 assert.equal(selection[0].femaleVerified,false);
 assert.equal(device.calls.length,0,'No accidental male voice playback');
});
test('Audio troubleshooting explicitly permits a Greek voice but never changes the Mentor female preference',()=>{
 const device=mockSpeech([greekFemale]);
 const sample=speakGreek('Δοκιμή ελληνικού ήχου.',{env:device.env,requireGreek:true});
 assert.equal(sample,true);
 assert.equal(device.utterance.voice,greekFemale);
 assert.equal(device.utterance.lang,'el-GR');
 stopGreek(device.env);
 const empty=mockSpeech([]);
 assert.equal(speakGreek('Δοκιμή ήχου.',{env:empty.env,requireGreek:true}),false);
 assert.equal(empty.calls.length,0);
});
test('Manual re-check detects delayed Greek voice list on Safari',()=>{
 const device=mockSpeech([]);
 assert.deepEqual(voiceDiagnostics(device.env).femaleNames,[]);
 assert.equal(voiceDiagnostics(device.env).canSpeakFemale,false);
 device.setVoices([greekFemale]);
 const later=voiceDiagnostics(device.env);
 assert.equal(later.greekCount,1);
 assert.equal(later.femaleCount,1);
 assert.equal(later.canSpeakFemale,true);
});
test('Long Greek text is split for mobile; start, boundaries, completion match the entire speech',()=>{
 const device=mockSpeech([greekFemale]);
 const long='Σήμερα θα εξασκηθούμε στην εκτίμηση περιστατικού με σταθερή σειρά. '.repeat(14);
 const chunks=splitGreekSpeech(long);
 assert.ok(chunks.length>3);
 assert.ok(chunks.every(s=>s.length<=180));
 let started=0,ended=0,errors=0;
 const boundary=[];
 const ok=speakGreek(long,{env:device.env,requireFemale:true,rate:0.9,pitch:0.96,volume:0.9,
  onStart:()=>started++,onFinish:()=>ended++,onError:()=>errors++,
  onBoundary:e=>boundary.push(e.charIndex)});
 assert.equal(ok,true);
 let last=-1;
 for(let i=0;i<chunks.length;i++){
  const utterance=device.utterance;
  assert.equal(utterance.text,chunks[i]);
  assert.equal(utterance.voice,greekFemale);
  assert.equal(utterance.rate,0.9);
  utterance.onstart();
  utterance.onboundary({charIndex:4});
  assert.ok(boundary.at(-1)>last,'Boundary offsets must increase across segments');
  last=boundary.at(-1);
  utterance.onend();
 }
 assert.equal(started,1,'The avatar must animate from one real speech start');
 assert.equal(ended,1,'One completion event for the whole utterance');
 assert.equal(errors,0);
});
test('Stop and speech errors do not trigger fake completion or continued animation',()=>{
 const device=mockSpeech([greekFemale]);
 let complete=0,errors=[];
 const ok=speakGreek('Ελληνική δοκιμή.',{env:device.env,requireFemale:true,
  onFinish:()=>complete++,onError:e=>errors.push(e?.error)});
 assert.equal(ok,true);
 const first=device.utterance;
 stopGreek(device.env);
 first.onend();first.onerror({error:'interrupted'});
 assert.equal(complete,0);
 assert.deepEqual(errors,[]);
 speakGreek('Άλλη δοκιμή.',{env:device.env,requireFemale:true,
  onError:e=>errors.push(e?.error)});
 device.utterance.onerror({error:'not-allowed'});
 assert.deepEqual(errors,['not-allowed']);
});
test('Live MENTOR interface connects status, refresh and explicit voice diagnostic without legacy grading writes',()=>{
 const html=readFileSync(new URL('../mentor-lab.html',import.meta.url),'utf8');
 const app=readFileSync(new URL('../mentor/app/lab.js',import.meta.url),'utf8');
 const css=readFileSync(new URL('../mentor-lab.css',import.meta.url),'utf8');
 for(const id of ['mentor-voice-refresh','mentor-voice-probe','mentor-voice-inventory','mentor-voice-help']){
  assert.ok(html.includes('id="'+id+'"'),id);
 }
 assert.match(app,/voiceDiagnostics\(window\)/);
 assert.match(app,/requireFemale:voiceSelect\.value!=='__device__'/);
 assert.match(app,/other\.value='__device__'/);
 // The default uses a verified female voice. Only explicit user choice enables device fallback.
 assert.match(app,/requireMale:false,requireFemale:false,requireGreek:true/);
 assert.match(css,/mentor-voice-diagnostics/);
 assert.doesNotMatch(app,/localStorage\.setItem|official_grade\s*=/);
});
