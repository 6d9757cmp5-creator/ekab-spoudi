/**
 * ATLAS contextual recall popup (local-only prototype).
 * Reads existing completed SAEK chapter marks; fetches ONE existing lesson on demand.
 * It never loads the former 30-card pack, calls AI, or writes grades/progress.
 */
import {completedChapters,chooseChapter,canInterrupt,safeRoute,suitableRecall,nextSchedule,
 DAILY_LIMIT,AUTO_GAP_MS,STUDY_KEY,FEEDBACK_KEY} from './selector.mjs';

const ROOT=new URL('../../',import.meta.url);
if(!window.__ekabRecallInit)window.__ekabRecallInit=true,boot();

function boot(){
 if(window.top!==window||!safeRoute(location.pathname,location.search))return;
 const $=(tag,cls='',label='')=>{const n=document.createElement(tag);if(cls)n.className=cls;if(label)n.textContent=label;return n;};
 let sheet=document.createElement('link');sheet.rel='stylesheet';sheet.href=new URL('./popup.css',import.meta.url).href;document.head.append(sheet);
 const store={
  get(key){try{return localStorage.getItem(key)}catch{return null}},
  set(key,value){try{localStorage.setItem(key,JSON.stringify(value));return true}catch{return false}}
 };
 const read=(key)=>{try{const t=store.get(key);return t&&t.length<40000?JSON.parse(t):null}catch{return null}};
 const settings=()=>{const s=read(STUDY_KEY);return s&&typeof s==='object'?s:{enabled:false,day:'',shownToday:0,nextAt:0}};
 const feedback=()=>{const f=read(FEEDBACK_KEY);return f&&typeof f==='object'&&!Array.isArray(f)?f:{}};
 const getCompleted=()=>{
  const entries=[];
  try{for(let i=0;i<localStorage.length;i++){
   const key=localStorage.key(i);
   if(key&&/^ekab\.saek\.read\.v1\./.test(key))entries.push([key,localStorage.getItem(key)]);
  }}catch{}
  return completedChapters(entries);
 };
 const today=now=>new Date(now).toISOString().slice(0,10);
 const normalized=()=>{
  const now=Date.now(),s=settings();if(s.day!==today(now)){s.day=today(now);s.shownToday=0;}
  return s;
 };
 let lastActivity=Date.now(),showing=false,loading=false,card=null;
 const cache=new Map(),chip=$('button','atlas-recall-chip','🧠 Επανάληψη');
 chip.type='button';chip.hidden=true;chip.setAttribute('aria-controls','atlas-recall-window');
 chip.setAttribute('aria-label','Προαιρετικές ερωτήσεις επανάληψης ATLAS');
 const panel=$('aside','atlas-recall-window');panel.id='atlas-recall-window';panel.hidden=true;
 panel.setAttribute('aria-label','Ερώτηση εκπαιδευτικής επανάληψης');panel.setAttribute('role','region');
 const hint=$('span','atlas-recall-hint');hint.hidden=true;hint.setAttribute('role','status');
 document.body.append(chip,panel,hint);
 function refresh(){
  const n=getCompleted().length,s=normalized();
  chip.hidden=n===0;chip.textContent=s.enabled?'🧠 Επανάληψη · '+n:'🧠 Ενεργοποίηση επανάληψης';
  chip.title=s.enabled?'Δοκίμασε μία ερώτηση από διαβασμένο κεφάλαιο':'Ενεργοποίησε προαιρετικές υπενθυμίσεις από διαβασμένα κεφάλαια';
 }
 function notice(msg){hint.textContent=msg;hint.hidden=false;setTimeout(()=>{hint.hidden=true},5500)}
 const action=(label,onClick,cls='')=>{const button=$('button',cls,label);button.type='button';button.addEventListener('click',onClick);return button};
 function close(){panel.hidden=true;panel.replaceChildren();showing=false;card=null;refresh();}
 function setFeedback(chosen,answer){
  const data=feedback();data[chosen.id]={seenAt:Date.now(),answer};
  const ids=Object.keys(data);if(ids.length>280)for(const id of ids.slice(0,ids.length-280))delete data[id];
  store.set(FEEDBACK_KEY,data);close();
 }
 async function getLesson(target){
  if(cache.has(target.id))return cache.get(target.id);
  let doc;
  const thisPage=location.pathname.split('/').pop();
  const path='saek-course-'+target.course+'.html';
  if(thisPage===path)doc=document;
  else{
   const url=new URL(path,ROOT);
   const response=await fetch(url,{credentials:'omit',cache:'default'});
   if(!response.ok)throw Error('Lesson not found');
   const html=await response.text();
   if(html.length>700000)throw Error('Lesson too large');
   doc=new DOMParser().parseFromString(html,'text/html');
  }
  const section=doc.getElementById('lesson-'+target.chapter);
  if(!section)return null;
  const question=section.querySelector('.knowledge-check .check-question')?.textContent?.trim()||'';
  const answer=section.querySelector('.knowledge-check .check-answer')?.textContent?.trim()||'';
  if(!suitableRecall(question,answer))return null;
  const title=doc.querySelector('.reader-title')?.textContent?.trim()||'ΣΑΕΚ';
  const heading=section.querySelector('.chapter-heading')?.childNodes;
  const chapterTitle=section.querySelector('.chapter-toc-links')?.textContent?.trim()||
   [...(heading||[])].filter(n=>n.nodeType===Node.TEXT_NODE).map(n=>n.textContent).join('').trim()||
   'Κεφάλαιο '+target.chapter;
  const item={...target,question,answer,courseTitle:title,chapterTitle,
   href:new URL(path+'#lesson-'+target.chapter,ROOT).href};
  cache.set(target.id,item);
  return item;
 }
 function blocked(){
  if(document.visibilityState!=='visible'||document.fullscreenElement)return true;
  if(location.pathname.endsWith('/mentor-next.html')||location.pathname.endsWith('/mentor-ecg.html'))return true; // hands-on simulation: manual review only
  if(document.querySelector('[aria-modal="true"]:not([hidden]),dialog[open]'))return true;
  const ae=document.activeElement;
  if(ae?.closest('input,textarea,select,[contenteditable="true"],[role="textbox"]'))return true;
  if([...document.querySelectorAll('video')].some(v=>!v.paused&&!v.ended))return true;
  if(document.querySelector('#study:not(.hidden),[data-atla-active-exam="true"]'))return true;
  return false;
 }
 async function show(manual=false){
  if(showing||loading||!getCompleted().length||!settings().enabled)return;
  if(!manual&&(Date.now()-lastActivity<25000||blocked()))return;
  if(manual&&document.querySelector('[aria-modal="true"]:not([hidden]),dialog[open]'))return;
  loading=true;
  const candidates=getCompleted(),tries=Math.min(8,candidates.length);
  let remaining=[...candidates],selected=null;
  try{
   for(let i=0;i<tries&&remaining.length;i++){
    const chapter=chooseChapter(remaining,feedback(),Date.now());
    remaining=remaining.filter(x=>x.id!==chapter.id);
    const result=await getLesson(chapter);
    if(result){selected=result;break}
   }
  }catch(e){console.warn('ATLAS recall: lesson not available',e)}
  finally{loading=false}
  if(!selected){const s=normalized();s.nextAt=Date.now()+15*60000;store.set(STUDY_KEY,s);return;}
  const s=normalized();
  if(!manual){
   if(s.shownToday>=DAILY_LIMIT)return;
   s.shownToday++;s.nextAt=Date.now()+AUTO_GAP_MS;store.set(STUDY_KEY,s);
  }
  showing=true;card=selected;
  const head=$('div','atlas-recall-heading');
  head.append($('strong','','ATLAS · Μικρή επανάληψη'),action('✕',close,'atlas-recall-close'));
  head.lastChild.setAttribute('aria-label','Κλείσιμο ερώτησης');
  panel.append(head);
  panel.append($('p','atlas-recall-context',selected.courseTitle+' · '+selected.chapterTitle));
  panel.append($('p','atlas-recall-question',selected.question));
  const answer=$('p','atlas-recall-answer',selected.answer);answer.hidden=true;
  const buttons=$('div','atlas-recall-actions');
  const reveal=action('Δες απάντηση',()=>{answer.hidden=false;reveal.hidden=true;remember.hidden=false;again.hidden=false});
  const remember=action('Το θυμόμουν',()=>setFeedback(selected,'remembered'),'atlas-recall-positive');
  const again=action('Θέλω επανάληψη',()=>setFeedback(selected,'again'));
  remember.hidden=true;again.hidden=true;
  buttons.append(reveal,remember,again,action('Αργότερα',close));
  panel.append(answer,buttons);
  const footer=$('div','atlas-recall-footer');
  const source=$('a','','Άνοιξε το αρχικό κεφάλαιο');source.href=selected.href;
  const pause=action('Παύση υπενθυμίσεων',()=>{
   const current=normalized();current.enabled=false;store.set(STUDY_KEY,current);
   close();notice('Οι αυτόματες υπενθυμίσεις απενεργοποιήθηκαν.');
  });
  footer.append(source,pause);
  panel.append(footer,$('p','atlas-recall-disclaimer','Ερώτηση από ήδη διαβασμένο κεφάλαιο. Χωρίς βαθμολογία ή κλινικές οδηγίες.'));
  panel.hidden=false;
 }
 chip.addEventListener('click',()=>{
  const s=normalized();
  if(!s.enabled){s.enabled=true;s.nextAt=nextSchedule(Date.now());store.set(STUDY_KEY,s);refresh();notice('Οι προαιρετικές υπενθυμίσεις ενεργοποιήθηκαν. Πάτησε ξανά για ερώτηση.');return;}
  void show(true);
 });
 function check(){
  if(panel.hidden===false)return;
  refresh();
  const s=normalized();
  if(!canInterrupt({enabled:s.enabled,now:Date.now(),nextAt:Number(s.nextAt)||0,
   shownToday:Number(s.shownToday)||0,day:s.day,visible:document.visibilityState==='visible',
   idleMs:Date.now()-lastActivity,blocked:blocked()}))return;
  void show();
 }
 for(const ev of ['keydown','pointerdown','touchstart'])window.addEventListener(ev,()=>{lastActivity=Date.now()},{passive:true});
 window.addEventListener('ekab:progress-changed',refresh);
 window.addEventListener('ekab:cloud-applied',refresh);
 window.addEventListener('storage',ev=>{if(ev.key===STUDY_KEY||ev.key===FEEDBACK_KEY||ev.key?.startsWith('ekab.saek.read.'))refresh()});
 document.addEventListener('keydown',ev=>{if(ev.key==='Escape'&&!panel.hidden)close()});
 refresh();
 setInterval(check,30000);
}
