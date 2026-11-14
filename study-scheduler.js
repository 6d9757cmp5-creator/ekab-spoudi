/* EKAB Spoudi · dated retrieval practice. Does not send or sync personal data. */
(function(root){
 'use strict';
 const DAY=86400000;
 const INTERVAL_DAYS=[1,3,7,14,30];
 const HISTORY_LIMIT=72;
 function when(value){
  const d=value instanceof Date?new Date(value.getTime()):value?new Date(value):new Date();
  return Number.isFinite(d.getTime())?d:new Date();
 }
 function dayKey(d){
  const y=d.getFullYear(),m=String(d.getMonth()+1).padStart(2,'0'),day=String(d.getDate()).padStart(2,'0');
  return y+'-'+m+'-'+day;
 }
 function events(state){
  return Array.isArray(state?.reviewHistory)?state.reviewHistory.filter(e=>e&&['correct','assisted','incorrect','review'].includes(e.result)&&Number.isFinite(Date.parse(e.at))).slice(-HISTORY_LIMIT):[];
 }
 function correctRun(state){
  const history=events(state),lastBreak=history.findLastIndex(e=>e.result!=='correct');
  return history.slice(lastBreak+1).filter(e=>e.result==='correct');
 }
 function evaluate(state,now){
  const time=when(now),run=correctRun(state),first=run[0]?Date.parse(run[0].at):null;
  const span=first===null?0:time.getTime()>=first?Math.max(0,Date.parse(run[run.length-1].at)-first):0;
  const days=new Set(run.map(e=>e.localDay||dayKey(when(e.at)))).size;
  const studied=run.length>=3&&days>=2&&span>=DAY;
  const mastered=run.length>=5&&days>=3&&span>=7*DAY;
  return {studied,mastered,correctCount:run.length,distinctDays:days,due:isDue(state,time),nextReviewAt:state?.nextReviewAt||null};
 }
 // With an EOPPEP theory exam in the exam calendar, no review gap exceeds ~15% of the time left
 // (Cepeda et al., 2008, Psychological Science 19:1095) and none falls after the exam.
 const EXAMS_KEY='ekab.study.exams.v1';
 function examCapDays(time){
  let list=[];try{list=JSON.parse(root.localStorage?.getItem(EXAMS_KEY)||'[]')}catch(e){list=[]}
  const start=new Date(time.getTime());start.setHours(0,0,0,0);
  const left=(Array.isArray(list)?list:[]).filter(e=>e&&e.type==='eoppep-theory'&&/^\d{4}-\d{2}-\d{2}$/.test(e.date))
   .map(e=>Math.round((new Date(e.date+'T00:00:00')-start)/DAY)).filter(n=>n>=1).sort((a,b)=>a-b)[0];
  return left?Math.max(1,Math.min(Math.round(left*0.15),left-1)):Infinity;
 }
 function isDue(state,now){
  if(!state||typeof state!=='object')return false;
  const time=when(now),hist=events(state);
  if(!hist.length)return Boolean((state.weak||0)>0||(state.selfAttempts||0)>0);
  const due=Date.parse(state.nextReviewAt||'');
  return Number.isFinite(due)?due<=time.getTime():true;
 }
 function record(state,result,now){
  if(!state||typeof state!=='object')throw new TypeError('Progress must be an object');
  if(!['correct','assisted','incorrect'].includes(result))throw new TypeError('Unknown assessment');
  const time=when(now);
  const prior=events(state);
  state.reviewHistory=[...prior,{at:time.toISOString(),localDay:dayKey(time),result}].slice(-HISTORY_LIMIT);
  state.selfAttempts=(Number(state.selfAttempts)||0)+1;
  if(result==='correct'){
   state.selfCorrect=(Number(state.selfCorrect)||0)+1;
   state.streak=(Number(state.streak)||0)+1;
   const count=correctRun(state).length;
   const days=Math.min(INTERVAL_DAYS[Math.min(count-1,INTERVAL_DAYS.length-1)],examCapDays(time));
   state.nextReviewAt=new Date(time.getTime()+days*DAY).toISOString();
  }else{
   state.streak=0;
   state.weak=(Number(state.weak)||0)+1;
   // An unsuccessful recall returns to today's revision queue.
   state.nextReviewAt=result==='incorrect'?time.toISOString():new Date(time.getTime()+DAY).toISOString();
  }
  return evaluate(state,time);
 }
 function markReview(state,now){
  if(!state||typeof state!=='object')throw new TypeError('Progress must be an object');
  const time=when(now);
  state.reviewHistory=[...events(state),{at:time.toISOString(),localDay:dayKey(time),result:'review'}].slice(-HISTORY_LIMIT);
  state.weak=(Number(state.weak)||0)+1;
  state.streak=0;
  state.nextReviewAt=time.toISOString();
  return evaluate(state,time);
 }
 function dateLabel(iso){
  if(!iso||!Number.isFinite(Date.parse(iso)))return '';
  return new Intl.DateTimeFormat('el-GR',{day:'numeric',month:'short',year:'numeric'}).format(new Date(iso));
 }
 root.EkabStudyScheduler=Object.freeze({evaluate,isDue,record,markReview,dayKey,dateLabel,examCapDays,intervals:INTERVAL_DAYS.slice()});
})(typeof window!=='undefined'?window:globalThis);
