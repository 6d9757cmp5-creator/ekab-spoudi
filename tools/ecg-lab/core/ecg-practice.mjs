/**
 * MENTOR OS: guided rate-counting exercise on the illustrative ECG strip.
 * The learner counts QRS complexes on a synthetic 6-second strip; rate = count × 10.
 * Synthetic curve only: no patient data, no interpretation of rhythms, no diagnosis, no official grade.
 */
import {createSyntheticEcg} from './ecg-synthetic.mjs';
export const KEY='ekab.mentor.ecg-practice.v1';
export const SECONDS=6;
// Rates are multiples of 10 so that the strip holds a whole number of QRS complexes.
export const ITEMS=Object.freeze([70,100,60,90,120].map((bpm,i)=>Object.freeze({id:'strip-'+(i+1),bpm})));
const MAX_COUNT=20;

export const expectedCount=bpm=>bpm/10;
export function stripFor(item){return createSyntheticEcg({bpm:item.bpm,seconds:SECONDS,samples:720});}
/** Seconds (within the strip) at which each QRS peak occurs. */
export function qrsTimes(bpm,seconds=SECONDS){
 const beat=60/bpm,times=[];
 for(let k=0;;k++){const t=(k+.41)*beat;if(t>seconds)break;times.push(Number(t.toFixed(4)));}
 return times;
}
export function newPractice(){return {schema_version:1,answers:[],completed:false};}
export function answer(session,count){
 if(!session||session.schema_version!==1||!Array.isArray(session.answers)||session.completed||session.answers.length>=ITEMS.length)throw Error('invalid-practice');
 if(!Number.isInteger(count)||count<0||count>MAX_COUNT)throw Error('invalid-count');
 const index=session.answers.length,item=ITEMS[index];
 const entry={index,bpm:item.bpm,count,estimate:count*10,correct:count===expectedCount(item.bpm)};
 const answers=[...session.answers,entry];
 return {schema_version:1,answers,completed:answers.length===ITEMS.length};
}
export function replay(raw){
 if(!raw||raw.schema_version!==1||!Array.isArray(raw.answers)||raw.answers.length>ITEMS.length)throw Error('invalid-saved-practice');
 let s=newPractice();
 for(const a of raw.answers){
  if(!a||!Number.isInteger(a.count))throw Error('invalid-saved-answer');
  s=answer(s,a.count);
  const made=s.answers.at(-1);
  if(['index','bpm','count','estimate','correct'].some(k=>made[k]!==a[k]))throw Error('tampered-practice');
 }
 if(raw.completed!==s.completed)throw Error('tampered-practice');
 return s;
}
/** What the learner did, in plain numbers, plus one concrete hint. */
export function debrief(session){
 const s=replay(session),total=s.answers.length,right=s.answers.filter(a=>a.correct).length;
 const errors=s.answers.map(a=>a.estimate-a.bpm);
 const under=errors.filter(e=>e<0).length,over=errors.filter(e=>e>0).length;
 const meanAbs=total?Math.round(errors.reduce((n,e)=>n+Math.abs(e),0)/total):0;
 let hint='Συνέχισε με την ίδια μέθοδο: μέτρησε τα QRS και πολλαπλασίασε επί 10.';
 if(total&&right<total){
  if(under>over)hint='Τείνεις να μετράς λιγότερα QRS από όσα υπάρχουν. Σημάδεψε κάθε κορυφή με το δάχτυλο ή το ποντίκι πριν απαντήσεις.';
  else if(over>under)hint='Τείνεις να μετράς περισσότερα QRS από όσα υπάρχουν. Μέτρα μόνο τις ψηλές αιχμές, όχι τα κύματα P ή T.';
  else hint='Τα λάθη πήγαν και προς τις δύο κατευθύνσεις. Μέτρα αργά και σημάδεψε κάθε αιχμή.';
 }
 return {total,right,meanAbsError:meanAbs,under,over,hint,completed:s.completed};
}
export function load(storage){
 try{const v=storage.getItem(KEY);return v?replay(JSON.parse(v)):newPractice();}catch{return newPractice();}
}
export function save(storage,session){
 try{storage.setItem(KEY,JSON.stringify(replay(session)));return true;}catch{return false;}
}
export function clear(storage){try{storage.removeItem(KEY);return true;}catch{return false;}}
