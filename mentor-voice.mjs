/**
 * MENTOR Greek speech: browser-owned voice, opted-in only by user.
 * Browser SpeechSynthesisVoice has no standardized gender field. A real male
 * speaker can be preferred only from known voice identifiers or explicitly
 * advertised male metadata; pitch-shifting cannot make a female voice male.
 * For a guaranteed speaker + phoneme timing a licensed dedicated TTS provider
 * or recorded Greek male voice track is required; NOT connected here.
 */
export function supportsSpeech(env=globalThis){
  return !!(env?.speechSynthesis&&typeof env.SpeechSynthesisUtterance==="function");
}
const normalizeLang=lang=>String(lang||"").toLowerCase().replace(/_/g,"-");
const MALE_GREEK_VOICES=/(?:nestoras|νέστορας|stefanos|στέφανος|nikos|νίκος|giorgos|γιώργος|george|male|ανδρικ)/i;
const FEMALE_GREEK_VOICES=/(?:athina|αθηνά|eleni|ελένη|despina|δέσποινα|female|γυναικ|afroditi|αφροδίτη)/i;
export function isKnownMaleGreekVoice(voice){
  if(!normalizeLang(voice?.lang).startsWith("el"))return false;
  const name=String(voice.name||"")+" "+String(voice.voiceURI||"");
  return MALE_GREEK_VOICES.test(name)&&!FEMALE_GREEK_VOICES.test(name);
}
function isKnownFemaleGreekVoice(voice){
  return normalizeLang(voice?.lang).startsWith("el")&&FEMALE_GREEK_VOICES.test(String(voice.name||"")+" "+String(voice.voiceURI||""));
}
export function greekVoices(voices){
  if(!Array.isArray(voices))return [];
  return voices.filter(v=>normalizeLang(v?.lang).startsWith("el"))
    .sort((a,b)=>{
      const rank=v=>{
        const name=String(v.name||"").toLowerCase();
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
/**
 * Do not silently assert that a voice with unknown name is male.
 * Return metadata so the UI can disclose what the device actually has.
 */
export function resolveMentorGreekVoice(voices,voiceName=""){
  const list=greekVoices(voices);
  const selected=list.find(v=>v.name===voiceName)||list.find(isKnownMaleGreekVoice)||list[0]||null;
  return Object.freeze({
    voice:selected,
    maleVerified:!!selected&&isKnownMaleGreekVoice(selected),
    hasGreek:!!selected,
    label:!selected?"Δεν βρέθηκε εγκατεστημένη ελληνική φωνή.":
      isKnownMaleGreekVoice(selected)?"Ανδρική ελληνική φωνή: "+selected.name:
      "Διαθέσιμη ελληνική φωνή (το φύλο δεν είναι επιβεβαιωμένο): "+selected.name
  });
}
export function selectGreekVoice(voices,name){
  return resolveMentorGreekVoice(voices,name).voice;
}
export function speakGreek(text,{
  env=globalThis,voiceName="",rate=0.94,pitch=1,volume=1,
  onVoiceResolved=()=>{},onStart=()=>{},onFinish=()=>{},onError=()=>{},onBoundary=()=>{}
}={}){
  if(!supportsSpeech(env))return false;
  const utterance=new env.SpeechSynthesisUtterance(String(text||"").trim().slice(0,2500));
  if(!utterance.text)return false;
  utterance.lang="el-GR";
  utterance.rate=Math.max(.8,Math.min(1.12,Number(rate)||.94));
  utterance.pitch=Math.max(.85,Math.min(1.15,Number(pitch)||1));
  utterance.volume=Math.max(.75,Math.min(1,Number(volume)||1));
  const chosen=resolveMentorGreekVoice(env.speechSynthesis.getVoices(),voiceName);
  if(chosen.voice)utterance.voice=chosen.voice;
  onVoiceResolved(chosen);
  utterance.onstart=()=>onStart();
  utterance.onend=()=>onFinish();
  utterance.onboundary=event=>onBoundary(event);
  utterance.onerror=event=>onError(event);
  env.speechSynthesis.cancel();
  env.speechSynthesis.speak(utterance);
  return true;
}
export function stopGreek(env=globalThis){
  if(supportsSpeech(env))env.speechSynthesis.cancel();
}
