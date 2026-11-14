/** ATLAS contextual recall: lightweight, deterministic learner-progress adapter.
 * Existing SAEK read marks are read-only. No grading, AI, or extra fixed card pack.
 */
const KEY=/^ekab\.saek\.read\.v1\.(0[1-9]|1[0-9]|20)\.([1-9]|[1-9]\d)$/;
const COURSE=/^saek-course-(0[1-9]|1[0-9]|20)\.html$/;
export const DAILY_LIMIT=2;
export const AUTO_GAP_MS=45*60*1000;
export const WAIT_AFTER_ENABLE_MS=5*60*1000;
export const STUDY_KEY='ekab.atlas.recall.settings.v1';
export const FEEDBACK_KEY='ekab.atlas.recall.feedback.v1';

export function completedChapters(entries){
 const all=new Map();
 for(const [key,value] of entries){
  const m=KEY.exec(String(key));
  if(m&&value==='1'&&Number(m[2])<=50)all.set(m[1]+':'+Number(m[2]),{course:m[1],chapter:Number(m[2]),id:m[1]+':'+Number(m[2])});
 }
 return [...all.values()];
}
export function safeRoute(path,search=''){
 const name=String(path).split('/').pop()||'index.html';
 if(name==='theory.html'||name==='practical_exam.html'||name==='saek-exams.html')return false;
 if(/(?:\?|&)mode=exam(?:&|$)/.test(search))return false;
 return /^(index|saek|eoppep|farmaka|seminar-prep|protocols|mentor-ecg|mentor-next|mentor-lab|tools)\.html$/.test(name)||COURSE.test(name);
}
export const localDayKey=now=>{const d=new Date(now);return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');};
export function canInterrupt({enabled=false,now=0,nextAt=0,shownToday=0,day='',visible=true,idleMs=0,blocked=false}={}){
 const today=localDayKey(now);
 return enabled===true&&visible===true&&blocked!==true&&idleMs>=25000&&
  day===today&&shownToday<DAILY_LIMIT&&now>=nextAt;
}
/**
 * With a SAEK exam in the exam calendar, chapters of its courses come first and a chapter counts
 * as "ready for review" after about 15% of the time left (Cepeda et al., 2008); otherwise after a week.
 */
export function chooseChapter(chapters,feedback={},now=Date.now(),random=Math.random,exam=null){
 if(!Array.isArray(chapters)||!chapters.length)return null;
 const recent=chapters.filter(c=>{
  const v=feedback[c.id]||{};
  return !Number.isFinite(v.seenAt)||now-v.seenAt>=6*60*60*1000;
 });
 let pool=recent.length?recent:chapters;
 if(exam&&Array.isArray(exam.courses)){const inExam=pool.filter(c=>exam.courses.includes(c.course));if(inExam.length)pool=inExam;}
 const gapMs=(exam&&exam.gapDays>0?exam.gapDays:7)*86400000;
 const scored=pool.map(c=>{
  const f=feedback[c.id]||{};
  const weight=f.answer==='again'?5:f.answer==='remembered'?0.65:2;
  const age=Number.isFinite(f.seenAt)?Math.min(2,Math.max(0,(now-f.seenAt)/gapMs)):2;
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
export function nextSchedule(now,random=Math.random,phase='initial'){
 const r=Math.max(0,Math.min(.999999,Number(random())||0));
 // First offer 5–15 minutes after study becomes eligible; subsequent offers 45–105 minutes later.
 return now+(phase==='repeat'?AUTO_GAP_MS+Math.floor(r*60*60000):WAIT_AFTER_ENABLE_MS+Math.floor(r*10*60000));
}
