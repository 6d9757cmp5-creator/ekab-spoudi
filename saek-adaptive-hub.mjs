/**
 * ATLA: quiet, read-only progressive study suggestions on the existing SAEK hub.
 * Uses existing SAEK practice engine, never writes official grades.
 */
import {readinessForCourse} from './mentor/core/saek-readiness.mjs';
const $=id=>document.getElementById(id);
const key='ekab.saek.exams.v1';
function history(){
 try {
  const raw=localStorage.getItem(key);
  if(!raw||raw.length>2_000_000)return {};
  const parsed=JSON.parse(raw);
  return parsed&&parsed.history&&typeof parsed.history==='object'&&!Array.isArray(parsed.history)?parsed.history:{};
 }catch{return {}}
}
function render(){
 const getLevel=window.EkabSaekExamEngine?.getLevel;
 if(typeof getLevel!=='function')return;
 const data=history(),levels={foundation:0,reinforce:0,extend:0};
 for(const tile of document.querySelectorAll('.course-tile[href^="saek-course-"]')){
  const courseId=(tile.getAttribute('href')||'').match(/^saek-course-(\d{2})\.html$/)?.[1];
  if(!courseId)continue;
  const recommendation=readinessForCourse(courseId,data,getLevel);
  levels[recommendation.stage]++;
  let summary=tile.querySelector('.atla-study-depth');
  if(!summary){
   summary=document.createElement('small');
   summary.className='atla-study-depth';
   summary.style.cssText='display:block;margin-top:4px;font-weight:600;color:var(--text-muted,var(--muted,#466575))';
   tile.querySelector('.course-tile-main')?.append(summary);
  }
  summary.textContent='ATLA · '+recommendation.label+' — '+recommendation.guidance;
  summary.title='Πρόταση βάσει προηγούμενων ασκήσεων του συγκεκριμένου μαθήματος· δεν είναι πιστοποίηση γνώσης.';
 }
 const tip=$('atla-learning-tip');
 if(tip)tip.textContent='ATLA · Κάθε μάθημα ξεκινά απλά και εμπλουτίζεται σταδιακά με βάση τις απαντήσεις σου. '+
  'Με ελλιπείς προσπάθειες προτείνεται η βασική θεωρία. '+
  (levels.extend?'Σε '+levels.extend+' μαθήματα προτείνεται προαιρετική εμβάθυνση. ':'')+
  'Οι προτάσεις είναι ενδεικτικές και δεν αλλάζουν τις εξετάσεις ή την πρόοδό σου.';
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',render,{once:true});else render();
window.addEventListener('pageshow',render);
window.addEventListener('storage',e=>{if(!e.key||e.key===key)render()});
window.addEventListener('focus',render);
window.addEventListener('ekab:cloud-applied',render);
