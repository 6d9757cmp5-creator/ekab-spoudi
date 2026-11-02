/** ATLAS contextual recall: lightweight, deterministic learner-progress adapter.
 * Existing SAEK read marks are read-only. No grading, AI, or extra fixed card pack.
 */
const KEY=/^ekab\.saek\.read\.v1\.(0[1-9]|1[0-9]|20)\.([1-9]|[1-9]\d)$/;
const COURSE=/^saek-course-(0[1-9]|1[0-9]|20)\.html$/;
export const DAILY_LIMIT=2;
export const AUTO_GAP_MS=45*60*1000;
export const WAIT_AFTER_ENABLE_MS=2*60*1000;
export const STUDY_KEY='ekab.atlas.recall.settings.v1';
export const FEEDBACK_KEY='ekab.atlas.recall.feedback.v1';

export function completedChapters(entries){
 const all=new Map();
 for(const [key,value] of entries){
  const m=KEY.exec(String(key));
  if(m&&value==='1')all.set(m[1]+':'+Number(m[2]),{course:m[1],chapter:Number(m[2]),id:m[1]+':'+Number(m[2])});
 }
 return [...all.values()];
}
export function safeRoute(path,search=''){
 const name=String(path).split('/').pop()||'index.html';
 if(name==='theory.html'||name==='practical_exam.html'||name==='saek-exams.html')return false;
 if(/(?:\?|&)mode=exam(?:&|$)/.test(search))return false;
 return /^(index|saek|eoppep|farmaka|seminar-prep|protocols|mentor-ecg|mentor-next|mentor-lab|tools)\.html$/.test(name)||COURSE.test(name);
}
export function canInterrupt({enabled=false,now=0,nextAt=0,shownToday=0,day='',visible=true,idleMs=0,blocked=false}={}){
 const today=new Date(now).toISOString().slice(0,10);
 return enabled===true&&visible===true&&blocked!==true&&idleMs>=25000&&
  day===today&&shownToday<DAILY_LIMIT&&now>=nextAt;
}
export function chooseChapter(chapters,feedback={},now=Date.now(),random=Math.random){
 if(!Array.isArray(chapters)||!chapters.length)return null;
 const recent=chapters.filter(c=>{
  const v=feedback[c.id]||{};
  return !Number.isFinite(v.seenAt)||now-v.seenAt>=6*60*60*1000;
 });
 const pool=recent.length?recent:chapters;
 const scored=pool.map(c=>{
  const f=feedback[c.id]||{};
  const weight=f.answer==='again'?5:f.answer==='remembered'?0.65:2;
  const age=Number.isFinite(f.seenAt)?Math.min(2,Math.max(0,(now-f.seenAt)/(7*86400000))):2;
  return {chapter:c,weight:weight+age};
 });
 const sum=scored.reduce((a,x)=>a+x.weight,0);
 let target=Math.min(.999999,Math.max(0,Number(random())||0))*sum;
 for(const x of scored){target-=x.weight;if(target<0)return x.chapter;}
 return scored.at(-1).chapter;
}
/** Medical treatment specifics are not suitable for unsolicited quiz prompts. */
export function suitableRecall(question,answer){
 const s=(String(question||'')+' '+String(answer||'')).toLocaleLowerCase('el-GR');
 if(question.length<8||question.length>230||answer.length<3||answer.length>450)return false;
 if(/(?:δοσολογ|mg\b|μg\b|mcg\b|χιλιοστ|χορηγ|ενδοφλεβ|ενδομυϊ|διασωλην|βελον|καθετηρ|αποσυμπιεσ|φαρμακο|θεραπει|πρωτοκολλο αντιμετωπισησ)/u.test(s.normalize('NFD').replace(/[\u0300-\u036f]/g,'')))return false;
 return true;
}
export function nextSchedule(now,random=Math.random){
 const variance=Math.floor(Math.max(0,Math.min(.9999,Number(random())||0))*3*60000);
 return now+WAIT_AFTER_ENABLE_MS+variance;
}
