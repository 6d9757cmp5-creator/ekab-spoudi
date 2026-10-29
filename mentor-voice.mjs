/**
 * MENTOR OS: Greek device text-to-speech, without cloud AI or microphone.
 * User-initiated only. The ordinary Mentor remains strictly male Greek.
 * A separately labeled diagnostic test may use another Greek system voice
 * after a direct user click; it never changes the Mentor voice preference.
 *
 * Voice gender is not standardized in Web Speech. Named known voices are
 * a best-effort preference, not confirmation of audio or speaker gender.
 */
export function supportsSpeech(env=globalThis){
  return !!(env?.speechSynthesis&&typeof env.SpeechSynthesisUtterance==="function");
}
const normalizeLang=lang=>String(lang||"").toLowerCase().replace(/_/g,"-");
const MALE_GREEK_VOICES=/(?:nestoras|νέστορας|stefanos|στέφανος|nikos|νίκος|nikolaos|νικόλαος|alexandros|αλέξανδρος|giorgos|γιώργος|george|male|ανδρικ)/i;
const FEMALE_GREEK_VOICES=/(?:athina|αθηνά|eleni|ελένη|despina|δέσποινα|female|γυναικ|afroditi|αφροδίτη|melina|μελίνα)/i;
export function isKnownMaleGreekVoice(voice){
  if(!/^el(?:-|$)/.test(normalizeLang(voice?.lang)))return false;
  const name=String(voice.name||"")+" "+String(voice.voiceURI||"");
  return MALE_GREEK_VOICES.test(name)&&!FEMALE_GREEK_VOICES.test(name);
}
function isKnownFemaleGreekVoice(voice){
  return /^el(?:-|$)/.test(normalizeLang(voice?.lang)) &&
    FEMALE_GREEK_VOICES.test(String(voice.name||"")+" "+String(voice.voiceURI||""));
}
export function greekVoices(voices){
  if(!Array.isArray(voices))return [];
  return voices.filter(v=>/^el(?:-|$)/.test(normalizeLang(v?.lang)))
    .sort((a,b)=>{
      const rank=v=>{
        const name=String(v.name||"");
        return (isKnownMaleGreekVoice(v)?100:0)
          +(isKnownFemaleGreekVoice(v)?-30:0)
          +(/(premium|enhanced|natural|neural|υψηλ)/i.test(name)?10:0)
          +(v.localService?2:0);
      };
      return rank(b)-rank(a)||String(a.name).localeCompare(String(b.name),"el");
    });
}
export function listGreekVoices(env=globalThis){
  if(!supportsSpeech(env))return [];
  try{return greekVoices(env.speechSynthesis.getVoices());}catch{return [];}
}
export function voiceDiagnostics(env=globalThis){
  const supported=supportsSpeech(env);
  const voices=listGreekVoices(env);
  const male=voices.filter(isKnownMaleGreekVoice);
  return Object.freeze({
    supported,greekCount:voices.length,maleCount:male.length,
    maleNames:male.map(v=>v.name),greekNames:voices.map(v=>v.name),
    canSpeakMale:supported&&male.length>0,
    canTestGreek:supported&&voices.length>0
  });
}
/**
 * Returns device metadata; it cannot prove audio output. A missing voice is
 * reported explicitly rather than silently playing a different speaker.
 */
export function resolveMentorGreekVoice(voices,voiceName=""){
  const list=greekVoices(voices);
  const selected=list.find(v=>v.name===voiceName)||list.find(isKnownMaleGreekVoice)||list[0]||null;
  return Object.freeze({
    voice:selected,
    maleVerified:!!selected&&isKnownMaleGreekVoice(selected),
    hasGreek:!!selected,
    label:!selected?"Δεν εμφανίζεται εγκατεστημένη ελληνική φωνή στη λίστα του browser.":
      isKnownMaleGreekVoice(selected)?"Διαθέσιμη ανδρική ελληνική φωνή: "+selected.name:
      "Δεν εμφανίζεται αναγνωρισμένη ανδρική ελληνική φωνή. Διαθέσιμη για ρητή δοκιμή συσκευής: "+selected.name+"."
  });
}
export function selectGreekVoice(voices,name){
  return resolveMentorGreekVoice(voices,name).voice;
}
/** Break long utterances for more reliable iPhone/Safari synthesis. */
export function splitGreekSpeech(text,maxLength=180){
  let remaining=String(text||"").trim().replace(/\s+/g," ").slice(0,2500);
  const limit=Math.max(80,Math.min(250,Math.trunc(maxLength)||180));
  const chunks=[];
  while(remaining.length>limit){
    const candidate=remaining.slice(0,limit+1);
    let end=Math.max(candidate.lastIndexOf(". "),candidate.lastIndexOf("; "),
      candidate.lastIndexOf("! "),candidate.lastIndexOf("? "));
    if(end>=Math.floor(limit*.45))end+=1;
    else{
      end=candidate.lastIndexOf(" ");
      if(end<Math.floor(limit*.45))end=limit;
    }
    const part=remaining.slice(0,end).trim();
    if(part)chunks.push(part);
    remaining=remaining.slice(end).trimStart();
  }
  if(remaining)chunks.push(remaining);
  return chunks;
}
/** Keeps the current utterance referenced until completion (important in iOS). */
let activeSpeech=null;
export function speakGreek(text,{
  env=globalThis,voiceName="",rate=0.94,pitch=1,volume=1,
  requireMale=false,requireGreek=false,
  onVoiceResolved=()=>{},onStart=()=>{},onFinish=()=>{},onError=()=>{},onBoundary=()=>{}
}={}){
  if(!supportsSpeech(env))return false;
  const chunks=splitGreekSpeech(text);
  if(!chunks.length)return false;
  let chosen;
  try{chosen=resolveMentorGreekVoice(env.speechSynthesis.getVoices(),voiceName);}
  catch{chosen=resolveMentorGreekVoice([]);}
  onVoiceResolved(chosen);
  if(requireMale&&!chosen.maleVerified)return false;
  if(requireGreek&&!chosen.hasGreek)return false;
  const synth=env.speechSynthesis;
  const speechRate=Math.max(.8,Math.min(1.12,Number(rate)||.94));
  const speechPitch=Math.max(.85,Math.min(1.15,Number(pitch)||1));
  const speechVolume=Math.max(.75,Math.min(1,Number(volume)||1));
  if(activeSpeech)activeSpeech.cancelled=true;
  const playback={cancelled:false,env,utterance:null,started:false};
  activeSpeech=playback;
  let offset=0;
  const fail=event=>{
    if(playback.cancelled||activeSpeech!==playback)return;
    activeSpeech=null;playback.cancelled=true;
    onError(event);
  };
  function playChunk(index){
    if(playback.cancelled||activeSpeech!==playback)return;
    let utterance;
    try{
      utterance=new env.SpeechSynthesisUtterance(chunks[index]);
      utterance.lang="el-GR";
      utterance.rate=speechRate;
      utterance.pitch=speechPitch;
      utterance.volume=speechVolume;
      if(chosen.voice)utterance.voice=chosen.voice;
      playback.utterance=utterance;
      utterance.onstart=()=>{
        if(playback.cancelled||activeSpeech!==playback)return;
        if(!playback.started){playback.started=true;onStart();}
      };
      utterance.onboundary=event=>{
        if(!playback.cancelled&&activeSpeech===playback)
          onBoundary({...event,charIndex:offset+(Number(event?.charIndex)||0)});
      };
      utterance.onend=()=>{
        if(playback.cancelled||activeSpeech!==playback)return;
        if(index+1<chunks.length){
          offset+=chunks[index].length+1;
          playChunk(index+1);
        }else{
          activeSpeech=null;playback.cancelled=true;
          onFinish();
        }
      };
      utterance.onerror=event=>fail(event);
      synth.speak(utterance);
      if(synth.paused&&typeof synth.resume==="function")synth.resume();
    }catch(error){fail({error:"synthesis-failed",cause:error});}
  }
  try{
    synth.cancel(); // User-initiated request only, never autoplay.
    playChunk(0);
  }catch(error){fail({error:"synthesis-failed",cause:error});return false;}
  return !playback.cancelled || playback.started;
}
export function stopGreek(env=globalThis){
  if(activeSpeech&&activeSpeech.env===env){
    activeSpeech.cancelled=true;
    activeSpeech.utterance=null;
    activeSpeech=null;
  }
  if(supportsSpeech(env))try{env.speechSynthesis.cancel();}catch{}
}
