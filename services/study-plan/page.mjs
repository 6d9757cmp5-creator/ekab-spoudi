/** Exam calendar page. Reads local progress, writes only the exam list and practical ticks. */
import {STORAGE_KEY,EXAM_TYPES,SAEK_COURSES,SOURCES,daysUntil,reviewGap,examItems,buildPlan,parseExams} from './plan.mjs';
const $=id=>document.getElementById(id);
const PRACTICAL_KEY='ekab.study.practical.v1';
const EOPPEP_KEY='ekab-eoppep-official-v15';
const read=(key,fallback)=>{try{return localStorage.getItem(key)??fallback}catch{return fallback}};
const write=(key,value)=>{try{localStorage.setItem(key,value);return true}catch{return false}};
const el=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n};
const dateLabel=(iso,opts={day:'numeric',month:'long',year:'numeric'})=>new Intl.DateTimeFormat('el-GR',opts).format(new Date(iso+'T12:00:00'));
const plus=days=>{const d=new Date();d.setHours(12,0,0,0);d.setDate(d.getDate()+days);return d};
const DAY_NAME=new Intl.DateTimeFormat('el-GR',{weekday:'short',day:'numeric',month:'short'});
let exams=parseExams(read(STORAGE_KEY,'[]')),bank=[];

function doneSet(exam){
 if(exam.type==='eoppep-theory'){
  let state={};try{state=JSON.parse(read(EOPPEP_KEY,'{}'))||{}}catch{}
  const s=window.EkabStudyScheduler;
  return new Set(bank.filter(q=>s?s.evaluate(state[q.id]).studied:false).map(q=>q.id));
 }
 if(exam.type==='eoppep-practical'){let t={};try{t=JSON.parse(read(PRACTICAL_KEY,'{}'))||{}}catch{}return new Set(Object.keys(t).filter(k=>t[k]))}
 const done=new Set();
 for(const c of exam.courses)for(let n=1;n<=50;n++)if(read('ekab.saek.read.v1.'+c+'.'+n,'')==='1')done.add(c+':'+n);
 return done;
}
function linkList(items,limit,practical){
 const ul=el('ul','plan-items');
 for(const x of items.slice(0,limit)){
  const li=el('li');
  if(practical){
   const label=el('label');const box=el('input');box.type='checkbox';box.checked=doneSet({type:'eoppep-practical'}).has(x.id);
   box.addEventListener('change',()=>{let t={};try{t=JSON.parse(read(PRACTICAL_KEY,'{}'))||{}}catch{}t[x.id]=box.checked;write(PRACTICAL_KEY,JSON.stringify(t));render()});
   label.append(box,' ',x.title);li.append(label,' ');const a=el('a','',' ›');a.href=x.href;a.setAttribute('aria-label','Άνοιγμα: '+x.title);li.append(a);
  }else{const a=el('a','',x.title+(x.course?' · '+x.course:''));a.href=x.href;li.append(a)}
  ul.append(li);
 }
 if(items.length>limit)ul.append(el('li','muted','και άλλα '+(items.length-limit)));
 return ul;
}
function examCard(exam){
 const card=el('article','plan-exam');
 const left=daysUntil(exam.date);
 const head=el('div','plan-exam-head');
 head.append(el('h2','',EXAM_TYPES[exam.type]),el('p','plan-date',dateLabel(exam.date)+(left>=1?' · σε '+left+(left===1?' ημέρα':' ημέρες'):left===0?' · σήμερα':' · έχει περάσει')));
 const remove=el('button','btn compact ghost','Διαγραφή');remove.type='button';
 remove.addEventListener('click',()=>{exams=exams.filter(e=>e.id!==exam.id);write(STORAGE_KEY,JSON.stringify(exams));render()});
 head.append(remove);card.append(head);
 if(exam.type==='saek')card.append(el('p','muted small','Μαθήματα: '+exam.courses.map(c=>c).join(', ')));
 if(!(left>=1)){card.append(el('p','muted','Δεν υπάρχουν ημέρες μελέτης πριν από την εξέταση.'));return card}
 const items=examItems(exam,bank),done=doneSet(exam),plan=buildPlan({items,done,daysLeft:left}),gap=reviewGap(left);
 const stats=el('p','plan-stats');
 stats.append(el('strong','',done.size+'/'+items.length),' μελετημένα · ',el('strong','',plan.perDay),' νέα την ημέρα · επανάληψη κάθε ',el('strong','',gap.use+(gap.use===1?' ημέρα':' ημέρες')),
  ' (εύρος '+gap.min+'–'+gap.max+')'+(plan.finalDays?' · τελευταίες '+plan.finalDays+' ημέρες μόνο επανάληψη':''));
 card.append(stats);
 const today=plan.days[0],practical=exam.type==='eoppep-practical';
 const box=el('section','plan-today');box.append(el('h3','',today.final?'Σήμερα · τελική επανάληψη':'Σήμερα'));
 if(today.add.length){box.append(el('p','plan-label','Νέα μελέτη ('+today.add.length+')'));box.append(linkList(today.add,practical?18:12,practical))}
 if(today.review.length){box.append(el('p','plan-label','Επανάληψη με αυτοεξέταση ('+today.review.length+') · απάντησε πριν δεις τη λύση'));box.append(linkList(today.review,practical?18:12,practical))}
 if(!today.add.length&&!today.review.length)box.append(el('p','muted','Τίποτα για σήμερα. Η επόμενη επανάληψη είναι στις επόμενες ημέρες.'));
 if(exam.type==='eoppep-theory'){const a=el('a','btn compact','Εξάσκηση: ερωτήσεις για επανάληψη ›');a.href='theory.html?mode=exam';box.append(a)}
 card.append(box);
 const week=el('details','plan-week');week.append(el('summary','','Οι επόμενες ημέρες'));
 const table=el('table');const tb=el('tbody');
 for(const d of plan.days.slice(1,15)){const tr=el('tr');tr.append(el('th','',DAY_NAME.format(plus(d.index))),el('td','',d.final?'Τελική επανάληψη: '+d.review.length:'Νέα: '+d.add.length+' · Επανάληψη: '+d.review.length));tb.append(tr)}
 table.append(tb);week.append(table);card.append(week);
 return card;
}
function render(){
 const list=$('plan-list');list.replaceChildren();
 if(!exams.length){list.append(el('p','muted','Δεν έχεις προσθέσει εξέταση. Πρόσθεσε μία παραπάνω.'));return}
 for(const e of exams.slice().sort((a,b)=>a.date.localeCompare(b.date)))list.append(examCard(e));
}
function form(){
 const type=$('plan-type'),date=$('plan-date'),courses=$('plan-courses');
 const tomorrow=plus(1);date.min=[tomorrow.getFullYear(),String(tomorrow.getMonth()+1).padStart(2,'0'),String(tomorrow.getDate()).padStart(2,'0')].join('-');
 for(const sem of ['Α','Β','Γ','Δ']){
  const fs=el('fieldset');fs.append(el('legend','',sem+'΄ εξάμηνο'));
  const all=el('button','btn compact ghost','Όλο το εξάμηνο');all.type='button';
  all.addEventListener('click',()=>fs.querySelectorAll('input').forEach(i=>{i.checked=true}));fs.append(all);
  for(const c of SAEK_COURSES.filter(x=>x.semester===sem)){const l=el('label');const i=el('input');i.type='checkbox';i.value=c.id;l.append(i,' '+c.id+' · '+c.title);fs.append(l)}
  courses.append(fs);
 }
 const sync=()=>{courses.hidden=type.value!=='saek'};type.addEventListener('change',sync);sync();
 $('plan-form').addEventListener('submit',event=>{
  event.preventDefault();
  const picked=[...courses.querySelectorAll('input:checked')].map(i=>i.value);
  if(!date.value||daysUntil(date.value)<1){$('plan-msg').textContent='Διάλεξε ημερομηνία μετά από σήμερα.';return}
  if(type.value==='saek'&&!picked.length){$('plan-msg').textContent='Διάλεξε τα μαθήματα της εξέτασης.';return}
  exams.push({id:String(Date.now()),type:type.value,date:date.value,courses:type.value==='saek'?picked:[]});
  $('plan-msg').textContent=write(STORAGE_KEY,JSON.stringify(exams))?'✓ Η εξέταση προστέθηκε.':'Η αποθήκευση δεν είναι διαθέσιμη σε αυτή τη συσκευή.';
  courses.querySelectorAll('input').forEach(i=>{i.checked=false});render();
 });
}
function sources(){
 const ul=$('plan-sources');
 for(const s of SOURCES){const li=el('li');const a=el('a','',s.text);a.href=s.url;a.target='_blank';a.rel='noopener noreferrer';li.append(a);ul.append(li)}
}
form();sources();render();
fetch('official_questions.json').then(r=>r.json()).then(data=>{bank=Array.isArray(data)?data:data.questions||[];render()}).catch(()=>{$('plan-msg').textContent='Οι ερωτήσεις ΕΟΠΠΕΠ δεν φορτώθηκαν. Δοκίμασε ξανά με σύνδεση.'});
