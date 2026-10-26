/* ΕΚΑΒ Σπουδή · Προετοιμασία σεμιναρίων. Educational recall, not an official examination. */
(function(){
'use strict';
const COURSES=window.EkabSeminarTracks||[];
const STORE='ekab.seminar-prep.local.v1';
const $=id=>document.getElementById(id);
const make=(tag,cls,label)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(label!==undefined)e.textContent=label;return e;};
const qPrompts=[
 title=>'Ποια είναι η βασική γνώση που πρέπει να θυμάσαι για «'+title+'»;',
 title=>'Ποια είναι η κύρια προτεραιότητα στο θέμα «'+title+'»;',
 title=>'Ποιο σφάλμα πρέπει να αποφεύγεται κατά το «'+title+'»;',
 title=>'Πώς θα αντιμετώπιζες ένα ενδεικτικό σενάριο για «'+title+'»;'
];
let progress={},selected=null,unit=0,question=0,oral=0,view='theory';
function cleanRecord(obj){
 const o={};for(const c of COURSES){
  const p=obj?.[c.id]||{};
  const indices=(array,max)=>Array.isArray(array)?[...new Set(array.filter(x=>Number.isInteger(x)&&x>=0&&x<max))]:[];
  const strings=(x,max)=>{const out={};if(x&&typeof x==='object'&&!Array.isArray(x))for(const [k,v] of Object.entries(x)){const n=Number(k);if(Number.isInteger(n)&&n>=0&&n<max&&typeof v==='string')out[n]=v.slice(0,2000);}return out;};
  o[c.id]={studied:indices(p.studied,12),right:indices(p.right,48),needs:indices(p.needs,48),oral:indices(p.oral,12),qNotes:strings(p.qNotes,48),oralNotes:strings(p.oralNotes,12)};
  o[c.id].needs=o[c.id].needs.filter(n=>!o[c.id].right.includes(n));
 }
 return o;
}
try{progress=cleanRecord(JSON.parse(localStorage.getItem(STORE)||'{}'));}catch{progress=cleanRecord({});}
function save(){try{localStorage.setItem(STORE,JSON.stringify(progress));$('seminarSaveStatus').textContent='Αποθηκεύτηκε στη συσκευή.';}catch{$('seminarSaveStatus').textContent='Δεν ήταν δυνατή η αποθήκευση· εξήγαγε αντίγραφο όπου είναι εφικτό.';}}
const current=()=>progress[selected.id];
function showHome(){
 selected=null;$('seminarHome').hidden=false;$('seminarCourse').hidden=true;
 const host=$('seminarCards');host.replaceChildren();
 for(const c of COURSES){
  const p=progress[c.id];
  const article=make('article','seminar-card');
  const info=make('div','seminar-card-text');
  const heading=make('h2',null,c.name),small=make('p','seminar-card-sub',c.subtitle);
  const stats=make('p','seminar-card-stats',p.studied.length+'/12 θεματικές · '+p.right.length+'/48 ερωτήσεις · '+p.oral.length+'/12 προφορικές');
  info.append(heading,small,stats);
  const button=make('button','btn seminar-start',p.studied.length||p.right.length||p.oral.length?'Συνέχεια':'Έναρξη');
  button.type='button';button.addEventListener('click',()=>openCourse(c.id));
  article.append(info,button);host.append(article);
 }
 if(location.hash&&/^#(bls|pbls|ils|phtls|als)$/.test(location.hash))openCourse(location.hash.slice(1),false);
}
function openCourse(id,updateHash=true){
 const course=COURSES.find(c=>c.id===id);if(!course)return;
 selected=course;unit=0;question=0;oral=0;view='theory';
 $('seminarHome').hidden=true;$('seminarCourse').hidden=false;
 $('seminarCourseTitle').textContent=course.name;
 $('seminarCourseSub').textContent=course.subtitle;
 if(updateHash)history.replaceState(null,'','#'+id);
 switchView('theory');window.scrollTo({top:0,behavior:'instant'});
}
function switchView(target){
 view=target;
 for(const b of document.querySelectorAll('[data-seminar-tab]')){const active=b.dataset.seminarTab===view;b.classList.toggle('active',active);b.setAttribute('aria-selected',String(active));}
 $('seminarTheory').hidden=view!=='theory';$('seminarQuiz').hidden=view!=='quiz';$('seminarOral').hidden=view!=='oral';
 $('seminarCourseProgress').textContent=current().studied.length+'/12 θεματικές · '+current().right.length+'/48 ερωτήσεις αυτοελέγχου · '+current().oral.length+'/12 προφορικές';
 if(view==='theory')renderTheory();else if(view==='quiz')renderQuestion();else renderOral();
}
function renderTheory(){
 const list=$('seminarUnits'),c=selected,p=current();list.replaceChildren();
 c.units.forEach((u,i)=>{const b=make('button','seminar-unit'+(unit===i?' active':''),(p.studied.includes(i)?'✓ ':'')+(i+1)+'. '+u[0]);b.type='button';b.addEventListener('click',()=>{unit=i;renderTheory();});list.append(b)});
 const u=c.units[unit];$('seminarUnitNumber').textContent='Θεματική '+(unit+1)+' / 12';
 $('seminarUnitTitle').textContent=u[0];$('seminarUnitTheory').textContent=u[1];
 $('seminarUnitPriority').textContent=u[2];$('seminarUnitAvoid').textContent=u[3];
 $('seminarUnitCase').textContent=u[4];
 $('seminarMarkStudied').textContent=p.studied.includes(unit)?'✓ Μελετημένη':'Σημείωσε ως μελετημένη';
 $('seminarPrevUnit').disabled=unit===0;$('seminarNextUnit').disabled=unit===11;
}
function renderQuestion(){
 $('seminarAIResult').hidden=true;
 $('seminarGradeAI').disabled=false;
 $('seminarGradeAI').textContent='Αξιολόγηση με AI';
 const p=current(),i=question,topic=Math.floor(i/4),type=i%4,u=selected.units[topic];
 $('seminarQuestionCounter').textContent='Ερώτηση '+(i+1)+' / 48 · Θεματική '+(topic+1);
 $('seminarQuestionTitle').textContent=qPrompts[type](u[0]);
 $('seminarQuestionNotes').value=p.qNotes[i]||'';
 $('seminarQuestionSolution').textContent=u[type+1];$('seminarQuestionSolution').hidden=true;
 $('seminarQuizReveal').hidden=false;$('seminarQuizGrade').hidden=true;
 $('seminarQuestionState').textContent=p.right.includes(i)?'✓ Σωστά στην αυτοαξιολόγηση':p.needs.includes(i)?'↻ Για επανάληψη':'Δεν έχει αξιολογηθεί';
 $('seminarPrevQuestion').disabled=i===0;$('seminarNextQuestion').disabled=i===47;
}
function renderOral(){
 const p=current(),u=selected.units[oral];$('seminarOralCounter').textContent='Προφορική άσκηση '+(oral+1)+' / 12';
 $('seminarOralTitle').textContent='Περίγραψε προφορικά τις ενέργειές σου: '+u[0];
 $('seminarOralCase').textContent=u[4];$('seminarOralNotes').value=p.oralNotes[oral]||'';
 $('seminarOralHelp').textContent=u[2];$('seminarOralHelp').hidden=true;
 $('seminarOralReveal').hidden=false;
 $('seminarMarkOral').textContent=p.oral.includes(oral)?'✓ Ολοκληρώθηκε':'Ολοκλήρωσα την προφορική';
 $('seminarPrevOral').disabled=oral===0;$('seminarNextOral').disabled=oral===11;
}
function toggleIn(arr,id){const at=arr.indexOf(id);if(at===-1)arr.push(id);else arr.splice(at,1)}
function setGrade(kind){
 const p=current();p.right=p.right.filter(n=>n!==question);p.needs=p.needs.filter(n=>n!==question);
 p[kind].push(question);save();renderQuestion();$('seminarQuestionSolution').hidden=false;$('seminarQuizReveal').hidden=true;$('seminarQuizGrade').hidden=false;
}
function bind(){
 $('seminarBack').addEventListener('click',()=>{history.replaceState(null,'',location.pathname);showHome();});
 document.querySelectorAll('[data-seminar-tab]').forEach(b=>b.addEventListener('click',()=>switchView(b.dataset.seminarTab)));
 $('seminarMarkStudied').addEventListener('click',()=>{toggleIn(current().studied,unit);save();switchView('theory')});
 $('seminarPrevUnit').addEventListener('click',()=>{unit=Math.max(0,unit-1);renderTheory()});
 $('seminarNextUnit').addEventListener('click',()=>{unit=Math.min(11,unit+1);renderTheory()});
 $('seminarPrevQuestion').addEventListener('click',()=>{question=Math.max(0,question-1);renderQuestion()});
 $('seminarNextQuestion').addEventListener('click',()=>{question=Math.min(47,question+1);renderQuestion()});
 $('seminarQuestionNotes').addEventListener('input',e=>{current().qNotes[question]=e.target.value.slice(0,2000);save()});
 $('seminarGradeAI').addEventListener('click',async ()=>{
  const answer=$('seminarQuestionNotes').value.trim(),ai=window.EkabAIGrade;
  const status=$('seminarAIResult');
  if(!ai){status.hidden=false;status.textContent='Η υπηρεσία αξιολόγησης δεν φορτώθηκε.';return;}
  if(answer.length<3){status.hidden=false;status.textContent='Γράψε πρώτα τη δική σου απάντηση.';return;}
  const courseId=selected.id,questionId=question,button=$('seminarGradeAI');
  button.disabled=true;button.textContent='Γίνεται αξιολόγηση…';
  status.hidden=false;status.textContent='Έλεγχος νοήματος της απάντησης…';
  try{
   const result=await ai.evaluate({section:'seminar',courseId,questionIndex:questionId,answer});
   if(!selected||courseId!==selected.id||questionId!==question)return;
   if(result.verdict==='correct')setGrade('right');
   else if(result.verdict==='partial'||result.verdict==='incorrect')setGrade('needs');
   else renderQuestion();
   ai.render(status,result);
  }catch(err){
   if(!selected||courseId!==selected.id||questionId!==question)return;
   status.hidden=false;status.className='ai-grading-result ai-grading-unavailable';
   status.textContent=err.message||'Η αξιολόγηση δεν ολοκληρώθηκε.';
  }finally{
   if(selected&&courseId===selected.id&&questionId===question){button.disabled=false;button.textContent='Αξιολόγηση με AI';}
  }
 });
 $('seminarQuizReveal').addEventListener('click',()=>{$('seminarQuestionSolution').hidden=false;$('seminarQuizGrade').hidden=false;$('seminarQuizReveal').hidden=true});
 $('seminarGradeRight').addEventListener('click',()=>setGrade('right'));
 $('seminarGradeNeeds').addEventListener('click',()=>setGrade('needs'));
 $('seminarPrevOral').addEventListener('click',()=>{oral=Math.max(0,oral-1);renderOral()});
 $('seminarNextOral').addEventListener('click',()=>{oral=Math.min(11,oral+1);renderOral()});
 $('seminarOralNotes').addEventListener('input',e=>{current().oralNotes[oral]=e.target.value.slice(0,2000);save()});
 $('seminarOralReveal').addEventListener('click',()=>{$('seminarOralHelp').hidden=false;$('seminarOralReveal').hidden=true});
 $('seminarMarkOral').addEventListener('click',()=>{toggleIn(current().oral,oral);save();renderOral();switchView('oral')});
 $('seminarExport').addEventListener('click',()=>{
  const payload={type:'ekab-seminar-prep',version:1,exportedAt:new Date().toISOString(),progress};
  const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob);
  const a=make('a');a.href=url;a.download='ekab-seminars-progress.json';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
 });
 $('seminarImport').addEventListener('change',async e=>{
  const file=e.target.files?.[0];e.target.value='';if(!file)return;
  try{
   if(file.size>3000000)throw Error('Το αντίγραφο είναι πολύ μεγάλο.');
   const data=JSON.parse(await file.text());
   if(data?.type!=='ekab-seminar-prep'||data.version!==1||!data.progress||typeof data.progress!=='object')throw Error('Μη αναγνωρισμένο αντίγραφο σεμιναρίων.');
   if(!confirm('Να αντικατασταθεί ΜΟΝΟ η πρόοδος σεμιναρίων αυτής της συσκευής; ΕΟΠΠΕΠ και ΣΑΕΚ δεν επηρεάζονται.'))return;
   progress=cleanRecord(data.progress);save();if(selected)switchView(view);else showHome();
   $('seminarSaveStatus').textContent='Το αντίγραφο προετοιμασίας σεμιναρίων εισήχθη.';
  }catch(err){$('seminarSaveStatus').textContent=err.message||'Αποτυχία εισαγωγής.';}
 });
 window.addEventListener('hashchange',()=>{
  const id=location.hash.slice(1);const next=COURSES.find(c=>c.id===id);
  if(next&&(!selected||selected.id!==id))openCourse(id,false);
  else if(!next&&selected)showHome();
 });
}
if(COURSES.length!==5||COURSES.some(c=>c.units?.length!==12||c.units.some(u=>u.length!==5))){
 $('seminarCards').textContent='Το εκπαιδευτικό υλικό δεν φορτώθηκε πλήρως.';return;
}
bind();showHome();
})();