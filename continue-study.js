/* ΕΚΑΒ Σπουδή · Τοπική συνέχεια μελέτης, ανεξάρτητη από βαθμολογίες/πρόοδο. */
(function(){
 'use strict';
 const KEY='ekab.resume.v1';
 const COURSE=/^saek-course-(0[1-9]|1[0-9]|20)\.html$/;
 const QUESTION=/^EOP-([AB])-(\d{3})$/;
 const read=()=>{try{return JSON.parse(localStorage.getItem(KEY)||'null')}catch{return null}};
 function isValid(d){
  if(!d||typeof d!=='object'||!Number.isFinite(d.updatedAt)||typeof d.title!=='string'||!d.title.trim())return false;
  if(d.kind==='saek')return /^(0[1-9]|1[0-9]|20)$/.test(d.course||'')&&Number.isInteger(d.chapter)&&d.chapter>0&&d.chapter<=50;
  if(d.kind==='eoppep'){
   const m=QUESTION.exec(d.question||'');
   return !!m&&Number(m[2])>=1&&Number(m[2])<=(m[1]==='A'?105:209)&&['catalog','exam'].includes(d.mode);
  }
  return false;
 }
 function save(d){try{localStorage.setItem(KEY,JSON.stringify({...d,updatedAt:Date.now()}))}catch{}}
 function render(){
  const host=document.getElementById('continueStudyWidget');
  if(!host)return;
  const link=document.getElementById('continueStudyLink'),title=document.getElementById('continueStudyTitle'),data=read();
  if(!link||!title||!isValid(data)){host.style.display='none';return}
  link.href=data.kind==='saek'?'saek-course-'+data.course+'.html#lesson-'+data.chapter:
   'theory.html?'+(data.mode==='exam'?'resume=exam&':'')+'question='+encodeURIComponent(data.question);
  title.textContent=data.title.slice(0,180);
  host.style.display='block';
 }
 function initSaek(){
  const course=COURSE.exec(location.pathname.split('/').pop()||'')?.[1];
  if(!course)return;
  const parent=document.querySelector('.reader-chapters');
  if(!parent)return;
  function capture(ch){
   if(!ch||!ch.open||!ch.matches('details.reader-fold'))return;
   const chapter=Number(/^lesson-(\d+)$/.exec(ch.id)?.[1]);
   if(!Number.isInteger(chapter)||chapter<1||chapter>50)return;
   const heading=ch.querySelector('summary .chapter-heading');
   const name=heading?.firstChild?.textContent?.trim()||'Κεφάλαιο '+chapter;
   const courseName=document.title.split(' — ')[0].trim()||'ΣΑΕΚ';
   save({kind:'saek',course,chapter,title:(courseName+' · Κεφάλαιο '+chapter+': '+name).slice(0,180)});
  }
  parent.addEventListener('toggle',event=>{if(event.target?.parentElement===parent)capture(event.target)},true);
  capture(parent.querySelector('details.reader-fold[open]'));
 }
 function init(){
  render();initSaek();
  if(document.getElementById('continueStudyWidget')){
   window.addEventListener('pageshow',render);
   window.addEventListener('focus',render);
   window.addEventListener('storage',event=>{if(!event.key||event.key===KEY)render()});
  }
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();