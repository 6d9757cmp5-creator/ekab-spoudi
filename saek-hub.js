/* EKAB Spoudi — simple SAEK hub. Read-only progress; no changes to course pages or grades. */
(function(){
 'use strict';
 const KEY='ekab.saek.hub.semester.v1',PREFIX='ekab.saek.read.v1.';
 const counts=[71,73,51,52];
 const labels=['Α΄','Β΄','Γ΄','Δ΄'];
 const tabs=[...document.querySelectorAll('[data-semester-tab]')];
 const panels=[...document.querySelectorAll('[data-semester-panel]')];
 let active=0;
 function getSaved(){
  try{const raw=localStorage.getItem(KEY);return /^[0-3]$/.test(raw||'')?Number(raw):0}
  catch{return 0}
 }
 function choose(index,saveSelection=true){
  if(!Number.isInteger(index)||index<0||index>3||tabs.length!==4||panels.length!==4)return;
  active=index;
  tabs.forEach((tab,i)=>{const selected=i===index;tab.setAttribute('aria-pressed',String(selected))});
  panels.forEach((panel,i)=>{panel.hidden=i!==index});
  if(saveSelection)try{localStorage.setItem(KEY,String(index))}catch{}
 }
 function updateProgress(){
  let totalDone=0;
  panels.forEach((panel,index)=>{
   let semesterDone=0;
   for(const row of panel.querySelectorAll('[data-course-progress]')){
    const courseId=row.getAttribute('data-course-progress');
    const previous=String(row.textContent||''),match=previous.match(/(\d+)\s*\/\s*(\d+)/);
    const count=match?Number(match[2]):0;
    let done=0;
    if(!/^\d{2}$/.test(courseId)||count<1||count>50)continue;
    for(let chapter=1;chapter<=count;chapter++){
     try{if(localStorage.getItem(PREFIX+courseId+'.'+chapter)==='1')done++}catch{break}
    }
    row.textContent=done+'/'+count+' διαβασμένα';
    semesterDone+=done;
   }
   const stat=panel.querySelector('[data-semester-progress]');
   if(stat)stat.textContent=semesterDone+'/'+counts[index]+' κεφάλαια μελετημένα';
   totalDone+=semesterDone;
  });
  const progress=document.getElementById('library-done');
  if(progress)progress.textContent=totalDone+'/247';
  const bar=document.getElementById('saekHubProgressBar');
  if(bar)bar.style.width=Math.round(100*totalDone/247)+'%';
 }
 function init(){
  if(tabs.length!==4||panels.length!==4)return;
  tabs.forEach((tab,i)=>tab.addEventListener('click',()=>choose(i)));
  choose(getSaved(),false);
  updateProgress();
  window.addEventListener('pageshow',updateProgress);
  window.addEventListener('focus',updateProgress);
  window.addEventListener('storage',event=>{
   if(event.key===KEY){choose(getSaved(),false);return}
   if(!event.key||event.key.startsWith(PREFIX))updateProgress();
  });
  window.addEventListener('ekab:cloud-applied',updateProgress);
  window.addEventListener('ekab:progress-changed',updateProgress);
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();