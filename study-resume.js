/* ΕΚΑΒ Σπουδή · independent continuation widget. Does not alter scores or progress. */
(() => {
'use strict';
const KEY='ekab.study.resume.v1';
const HISTORY='ekab.study.resume.history.v1';
const DISMISSED='ekab.study.resume.dismissed.v1';
const page=location.pathname.split('/').pop()||'index.html';
const COURSE=/^saek-course-(0[1-9]|1[0-9]|20)\.html$/;
const QUESTION=/^EOP-[AB]-\d{3}$/;
const get=k=>{try{return localStorage.getItem(k)}catch{return null}};
function entryId(value){return value.kind+':'+(value.course||value.mode||'catalog');}
function arrayAt(key){try{const value=JSON.parse(get(key)||'[]');return Array.isArray(value)?value:[]}catch{return [];}}
function save(value){try{
 localStorage.setItem(KEY,JSON.stringify(value));
 const id=entryId(value),history=arrayAt(HISTORY).filter(x=>entryId(x)!==id);
 history.unshift(value);localStorage.setItem(HISTORY,JSON.stringify(history.slice(0,30)));
 localStorage.setItem(DISMISSED,JSON.stringify(arrayAt(DISMISSED).filter(x=>x!==id)));
}catch{}}
function read(){try{return JSON.parse(get(KEY)||'null')}catch{return null}}
function destination(item){
 if(!item||typeof item!=='object')return null;
 if(item.kind==='seminar'&&['bls','pbls','ils','phtls','als'].includes(item.course)){
  const mode=item.mode==='practice'?'practice':'study';
  return {href:'seminar-prep.html?section='+mode+'#'+item.course,label:'Σεμινάριο '+item.course.toUpperCase(),compact:item.course.toUpperCase()};
 }
 if(item.kind==='saek'){
  const id=String(item.course||''),chapter=Number(item.chapter);
  if(!/^(0[1-9]|1[0-9]|20)$/.test(id)||!Number.isInteger(chapter)||chapter<1||chapter>50)return null;
  return {href:'saek-course-'+id+'.html#lesson-'+chapter,
   label:(typeof item.title==='string'&&item.title.trim()?item.title.trim().slice(0,125):'ΣΑΕΚ · Μάθημα '+Number(id)+' · Κεφάλαιο '+chapter),
   compact:'ΣΑΕΚ '+Number(id)+' · Κεφ. '+chapter};
 }
 if(item.kind==='eoppep'&&item.mode==='reader'&&QUESTION.test(item.question||'')){
  const id=item.question;
  return {href:'theory.html?section=study&question='+encodeURIComponent(id),label:'ΕΟΠΠΕΠ · Ομάδα '+id[4]+' · Ερώτηση '+Number(id.slice(6)),
   compact:'ΕΟΠΠΕΠ '+(id[4]==='A'?'Α':'Β')+' · Ερ. '+Number(id.slice(6))};
 }
 if(item.kind==='eoppep'&&item.mode==='exam'&&['A','B','all'].includes(item.group)){
  // Existing exam run is not persisted. Resume its setup, not a made-up exam state.
  return {href:'theory.html?section=practice&mode=exam&group='+encodeURIComponent(item.group),
   label:item.group==='all'?'ΕΟΠΠΕΠ · Εξάσκηση':'ΕΟΠΠΕΠ · Εξάσκηση Ομάδας '+item.group,
   compact:item.group==='all'?'ΕΟΠΠΕΠ · Εξάσκηση':'Εξάσκηση · Ομάδα '+(item.group==='A'?'Α':'Β')};
 }
 if(item.kind==='eoppep'&&item.mode==='catalog')
  return {href:'theory.html?section=study&view=catalog',label:'ΕΟΠΠΕΠ · Θεωρία',compact:'ΕΟΠΠΕΠ · Θεωρία'};
 return null;
}
function entries(){
 const history=arrayAt(HISTORY),latest=read();if(latest)history.push(latest);
 for(let i=1;i<=20;i++){
  const course=String(i).padStart(2,'0'),chapter=Number(get('ekab.saek.lastchapter.'+course));
  if(chapter>=1&&chapter<=50)history.push({kind:'saek',course,chapter});
 }
 try{
  const records=JSON.parse(get('ekab-eoppep-official-v15')||'{}');
  if(Object.entries(records).some(([id,value])=>QUESTION.test(id)&&value&&(value.seen>0||value.selfAttempts>0||value.readCompletedAt)))history.push({kind:'eoppep',mode:'catalog'});
 }catch{}
 try{
  const records=JSON.parse(get('ekab.seminar-prep.local.v1')||'{}');
  for(const course of ['bls','pbls','ils','phtls','als']){
   const p=records[course];
   if(p&&(p.studied?.length||p.right?.length||p.mcRight?.length||Object.values(p.oralNotes||{}).some(Boolean)||Object.keys(p.mixedRun?.responses||{}).length||Object.keys(p.scenarioGrades||{}).length))history.push({kind:'seminar',course,mode:'study'});
  }
 }catch{}
 const hidden=new Set(arrayAt(DISMISSED)),seen=new Set();
 return history.flatMap(item=>{
  if(!item||typeof item!=='object')return [];
  const target=destination(item),id=entryId(item);
  if(!target||seen.has(id)||hidden.has(id))return [];
  seen.add(id);return [{...item,...target,id}];
 });
}
window.EkabStudyResume={entries,dismiss(id){try{
 const hidden=new Set(arrayAt(DISMISSED));hidden.add(id);localStorage.setItem(DISMISSED,JSON.stringify([...hidden]));return true;
}catch{return false;}}};
function legacy(){
 // Historical per-course markers lack dates: use them only if exactly one course was opened.
 const courses=[];
 for(let i=1;i<=20;i++){
  const id=String(i).padStart(2,'0'),value=get('ekab.saek.lastchapter.'+id),n=Number(value);
  if(value!==null&&Number.isInteger(n)&&n>=1&&n<=50)courses.push({kind:'saek',course:id,chapter:n});
 }
 if(courses.length===1)return courses[0];
 if(courses.length>1)return null;
 try{
  const records=JSON.parse(get('ekab-eoppep-official-v15')||'null');
  if(records&&typeof records==='object'&&Object.keys(records).some(id=>
   QUESTION.test(id)&&records[id]&&(Number(records[id].seen)>0||Number(records[id].selfAttempts)>0)))
   return {kind:'eoppep',mode:'catalog'};
 }catch{}
 return null;
}
function home(){
 const box=document.getElementById('studyResume'),link=document.getElementById('studyResumeLink'),
  name=document.getElementById('studyResumeName');
 if(!box||!link||!name)return;
 const target=destination(read())||destination(legacy());
 // Expand the progress panel to the full row when no resume destination exists.
 box.closest('.home-bottom-row')?.classList.toggle('has-resume',Boolean(target));
 if(!target){box.style.display='none';link.removeAttribute('href');return}
 name.textContent=target.compact||target.label;
 link.href=target.href;
 link.title='Συνέχισε από εκεί που έμεινες: '+target.label;
 link.setAttribute('aria-label','Συνέχισε από εκεί που έμεινες: '+target.label);
 box.style.display='block';
}
function saek(){
 const match=COURSE.exec(page);if(!match)return;
 const course=match[1],chapters=Array.from(document.querySelectorAll('.reader-chapters > details.reader-fold')),
  counter=document.getElementById('saekChapterCount');
 if(!chapters.length||!counter)return;
 function record(){
  const index=chapters.findIndex(ch=>ch.open);if(index<0)return;
  const chapter=index+1,courseTitle=document.title.split(' — ')[0].trim();
  const toc=document.querySelector('.chapter-toc-links a[href="#lesson-'+chapter+'"]');
  const title=toc?toc.textContent.trim().replace(/^\d+\s*[·.]\s*/,''):'Κεφάλαιο '+chapter;
  save({kind:'saek',course:course,chapter:chapter,title:courseTitle+' · '+title,at:Date.now()});
 }
 record();
 new MutationObserver(record).observe(counter,{childList:true,characterData:true,subtree:true});
}
function eoppep(){
 if(page!=='theory.html')return;
 function watch(id,mode){
  const el=document.getElementById(id);if(!el)return;
  function record(){
   const match=el.textContent.match(/Ομάδα\s+([AB])\s*·\s*(?:Ερώτηση|Θέμα)\s+(\d+)/u);
   if(!match)return;
   const group=match[1],n=Number(match[2]);
   if(mode==='reader'){
    if(document.getElementById('catalogReaderContent')?.hidden||n<1||n>(group==='A'?105:209))return;
    save({kind:'eoppep',mode:'reader',question:'EOP-'+group+'-'+String(n).padStart(3,'0'),at:Date.now()});
   }else if(!document.getElementById('study')?.classList.contains('hidden')){
    save({kind:'eoppep',mode:'exam',group:group,at:Date.now()});
   }
  }
  new MutationObserver(record).observe(el,{childList:true,characterData:true,subtree:true});
  record();
 }
 watch('catalogReaderNumber','reader');
 watch('qmeta','exam');
}
function init(){
 if(document.getElementById('studyResume')){
  home();['pageshow','focus','storage','ekab:cloud-applied'].forEach(event=>window.addEventListener(event,home));
 }
 saek();eoppep();
 if(page==='seminar-prep.html'){
  const heading=document.getElementById('seminarCourseTitle');
  if(heading){const record=()=>{const course=location.hash.slice(1);if(['bls','pbls','ils','phtls','als'].includes(course)&&!document.getElementById('seminarCourse')?.hidden)save({kind:'seminar',course,mode:new URLSearchParams(location.search).get('section')==='practice'?'practice':'study',at:Date.now()});};new MutationObserver(record).observe(heading,{childList:true,characterData:true,subtree:true});record();}
 }
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
else init();
})();
