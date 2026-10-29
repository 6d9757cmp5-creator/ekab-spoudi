/**
 * MENTOR speech: opt-in browser speech synthesis, no external API, tokens,
 * grading or storage. The installed system voice defines the actual quality.
 */
export function supportsSpeech(env=globalThis){
  return !!(env?.speechSynthesis&&typeof env.SpeechSynthesisUtterance==="function");
}
const normalizeLang=lang=>String(lang||"").toLowerCase().replace(/_/g,"-");
export function greekVoices(voices){
  if(!Array.isArray(voices))return [];
  return voices.filter(v=>normalizeLang(v?.lang).startsWith("el"))
    .sort((a,b)=>{
      const rank=v=>{
        const name=String(v.name||"").toLowerCase();
        return (/(premium|enhanced|natural|neural|υψηλ)/i.test(name)?10:0)+(v.localService?2:0);
      };
      return rank(b)-rank(a)||String(a.name).localeCompare(String(b.name),"el");
    });
}
export function listGreekVoices(env=globalThis){
  if(!supportsSpeech(env))return [];
  try{return greekVoices(env.speechSynthesis.getVoices());}catch{return [];}
}
export function selectGreekVoice(voices,name){
  const list=greekVoices(voices);
  return list.find(v=>v.name===name)||list[0]||null;
}
export function speakGreek(text,{env=globalThis,voiceName="",rate=0.94,pitch=1,onStart=()=>{},onFinish=()=>{},onError=()=>{}}={}){
  if(!supportsSpeech(env))return false;
  const utterance=new env.SpeechSynthesisUtterance(String(text||"").trim().slice(0,2500));
  if(!utterance.text)return false;
  utterance.lang="el-GR";
  utterance.rate=Math.max(.8,Math.min(1.12,Number(rate)||.94));
  utterance.pitch=Math.max(.85,Math.min(1.15,Number(pitch)||1));
  const voice=selectGreekVoice(env.speechSynthesis.getVoices(),voiceName);
  if(voice)utterance.voice=voice;
  utterance.onstart=()=>onStart();
  utterance.onend=()=>onFinish();
  utterance.onerror=event=>onError(event);
  env.speechSynthesis.cancel();
  env.speechSynthesis.speak(utterance);
  return true;
}
export function stopGreek(env=globalThis){
  if(supportsSpeech(env))env.speechSynthesis.cancel();
}
