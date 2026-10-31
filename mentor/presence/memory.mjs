/**
 * MENTOR conversation and learning preferences.
 * - Chat turns live in sessionStorage only: they survive page changes in the tab, vanish with the tab,
 *   and can be deleted at any time.
 * - Preferences (level, voice, focus) live in localStorage and hold no answers or grades.
 */
export const CHAT_KEY="ekab.mentor.chat.v1";
export const LEARNING_KEY="ekab.mentor.learning.v1";
export const MAX_TURNS=12;
export const MAX_TURN_CHARS=700;
export const LEVELS=["beginner","student","advanced","scientific"];
export const LEVEL_LABELS={beginner:"Αρχάριος",student:"Σπουδαστής",advanced:"Προχωρημένος",scientific:"Επιστημονικά αναλυτικός"};
const MODES=["local","ai","refusal","info"];

const clip=(v,n)=>String(v??"").slice(0,n);

export function normalizeTurn(raw){
 if(!raw||typeof raw!=="object"||!["user","mentor"].includes(raw.role))return null;
 const text=clip(raw.text,MAX_TURN_CHARS).trim();
 if(!text)return null;
 const sources=Array.isArray(raw.sources)?raw.sources.slice(0,4).map(s=>({
  term:clip(s?.term,120),
  url:/^https:\/\//.test(s?.url||"")?clip(s.url,300):null
 })).filter(s=>s.term):[];
 return {role:raw.role,text,mode:MODES.includes(raw.mode)?raw.mode:"local",sources};
}

export function loadTurns(storage){
 try{
  const list=JSON.parse(storage.getItem(CHAT_KEY)||"[]");
  return Array.isArray(list)?list.map(normalizeTurn).filter(Boolean).slice(-MAX_TURNS):[];
 }catch{return [];}
}
export function appendTurn(storage,turn){
 const t=normalizeTurn(turn);
 if(!t)return loadTurns(storage);
 const next=[...loadTurns(storage),t].slice(-MAX_TURNS);
 try{storage.setItem(CHAT_KEY,JSON.stringify(next));}catch{}
 return next;
}
export function clearTurns(storage){
 try{storage.removeItem(CHAT_KEY);}catch{}
 return [];
}
/** Last few turns, text only, for the AI request (never sources or modes). */
export function historyForAi(turns,max=4){
 return turns.filter(t=>t.mode!=="refusal"&&t.mode!=="info").slice(-max).map(t=>({role:t.role==="user"?"user":"assistant",text:clip(t.text,300)}));
}

export function defaultLearning(){
 return {level:"student",autoSpeak:false,minimizeOnExam:false};
}
export function normalizeLearning(raw){
 const d=defaultLearning();
 if(!raw||typeof raw!=="object")return d;
 return {
  level:LEVELS.includes(raw.level)?raw.level:d.level,
  autoSpeak:raw.autoSpeak===true,
  minimizeOnExam:raw.minimizeOnExam===true
 };
}
export function loadLearning(storage){
 try{return normalizeLearning(JSON.parse(storage.getItem(LEARNING_KEY)||"null"));}catch{return defaultLearning();}
}
export function saveLearning(storage,value){
 const v=normalizeLearning(value);
 try{storage.setItem(LEARNING_KEY,JSON.stringify(v));}catch{}
 return v;
}
