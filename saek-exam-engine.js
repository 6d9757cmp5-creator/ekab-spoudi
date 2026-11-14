/* Exam-selection engine: no DOM/network; each question comes from a real SAEK self-check.
 * "Difficulty" is a heuristic practice tag, not a validated exam item calibration.
 */
(function(root){
 'use strict';
 const levels={1:'Βασικό',2:'Μεσαίο',3:'Προχωρημένο'};
 const gradeValues={correct:1,partial:0.5,incorrect:0};
 function scoped(items,semester,courseId){
  return items.filter(q=>(!semester||semester==='all'||q.semester===semester)&&(!courseId||courseId==='all'||q.courseId===courseId));
 }
 function getLevel(history,questions){
  let total=0,score=0,distinct=0;
  for(const q of questions){
   const h=history[q.id];if(!h)continue;
   const correct=Math.max(0,Number(h.correct)||0),partial=Math.max(0,Number(h.partial)||0),incorrect=Math.max(0,Number(h.incorrect)||0);
   const attempts=correct+partial+incorrect;
   if(!attempts)continue;
   distinct++;total+=attempts;score+=correct+0.5*partial;
  }
  const ratio=total?score/total:0;
  // Require evidence before a "strong" level is inferred.
  const level=total>=20&&distinct>=12&&ratio>=0.8?3:total>=8&&distinct>=6&&ratio>=0.57?2:1;
  return {level,label:levels[level],total,distinct,ratio};
 }
 function choose(questions,usedIds,history,level,random=Math.random){
  const candidates=questions.filter(q=>!usedIds.has(q.id));
  if(!candidates.length)return null;
  const counts={};
  for(const q of questions)if(usedIds.has(q.id))counts[q.courseId]=(counts[q.courseId]||0)+1;
  const weights=candidates.map(q=>{
   const delta=Math.abs((q.difficulty||1)-level);
   const match=delta===0?4:delta===1?1.7:.55;
   const record=history[q.id]||{},n=(record.correct||0)+(record.partial||0)+(record.incorrect||0);
   const successes=(record.correct||0)+0.5*(record.partial||0);
   const weakness=n>0?Math.max(.4,2.7-2.0*successes/n):1.5;
   const balanced=1/(1+(counts[q.courseId]||0)*.33);
   const recent=Number(record.lastAt)>0&&Date.now()-record.lastAt<24*3600*1000?.75:1;
   return Math.max(.01,match*weakness*balanced*recent);
  });
  const total=weights.reduce((sum,w)=>sum+w,0);
  let roll=Math.min(.999999999,Math.max(0,Number(random())||0))*total;
  for(let i=0;i<candidates.length;i++){roll-=weights[i];if(roll<=0)return candidates[i];}
  return candidates.at(-1);
 }
 function recordGrade(history,id,grade,when=Date.now()){
  if(!Object.hasOwn(gradeValues,grade))return false;
  const old=history[id]||{},h={
   correct:Math.max(0,Number(old.correct)||0),
   partial:Math.max(0,Number(old.partial)||0),
   incorrect:Math.max(0,Number(old.incorrect)||0),
   lastAt:when
  };
  h[grade]++;history[id]=h;return true;
 }
 root.EkabSaekExamEngine=Object.freeze({scoped,getLevel,choose,recordGrade,levels});
})(window);
