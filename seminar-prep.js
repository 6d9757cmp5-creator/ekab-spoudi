/* ΕΚΑΒ Σπουδή · Προετοιμασία σεμιναρίων. Educational recall, not an official examination. */
(function(){
'use strict';
const COURSES=window.EkabSeminarTracks||[];
const MCQ=window.EkabSeminarMCQ||{};
const STORE='ekab.seminar-prep.local.v1';
const $=id=>document.getElementById(id);
const make=(tag,cls,label)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(label!==undefined)e.textContent=label;return e;};
const qPrompts=[
 title=>'Ποια είναι η βασική γνώση που πρέπει να θυμάσαι για «'+title+'»;',
 title=>'Ποια είναι η κύρια προτεραιότητα στο θέμα «'+title+'»;',
 title=>'Ποιο σφάλμα πρέπει να αποφεύγεται κατά το «'+title+'»;',
 title=>'Πώς θα αντιμετώπιζες ένα ενδεικτικό σενάριο για «'+title+'»;'
];
let progress={},selected=null,unit=0,question=0,mcQuestion=0,oral=0,view='theory',quizFormat='multiple';
function cleanRecord(obj){
 const o={};for(const c of COURSES){
  const p=obj?.[c.id]||{};
  const indices=(array,max)=>Array.isArray(array)?[...new Set(array.filter(x=>Number.isInteger(x)&&x>=0&&x<max))]:[];
  const strings=(x,max)=>{const out={};if(x&&typeof x==='object'&&!Array.isArray(x))for(const [k,v] of Object.entries(x)){const n=Number(k);if(Number.isInteger(n)&&n>=0&&n<max&&typeof v==='string')out[n]=v.slice(0,2000);}return out;};
  const mcAnswers={};
  if(p.mcAnswers&&typeof p.mcAnswers==='object'&&!Array.isArray(p.mcAnswers)){
   for(const [key,value] of Object.entries(p.mcAnswers)){
    const index=Number(key);
    if(Number.isInteger(index)&&index>=0&&index<12&&Number.isInteger(value)&&value>=0&&value<4)mcAnswers[index]=value;
   }
  }
  o[c.id]={studied:indices(p.studied,12),right:indices(p.right,48),needs:indices(p.needs,48),oral:indices(p.oral,12),qNotes:strings(p.qNotes,48),oralNotes:strings(p.oralNotes,12),
   mcAnswers,mcRight:indices(p.mcRight,12),mcNeeds:indices(p.mcNeeds,12)};
  o[c.id].needs=o[c.id].needs.filter(n=>!o[c.id].right.includes(n));
  o[c.id].mcRight=o[c.id].mcRight.filter(n=>mcAnswers[n]===0);
  o[c.id].mcNeeds=o[c.id].mcNeeds.filter(n=>mcAnswers[n]!==undefined&&mcAnswers[n]!==0);
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
  const stats=make('p','seminar-card-stats',p.studied.length+'/12 θεματικές · '+p.mcRight.length+'/12 επιλογής · '+p.right.length+'/48 ανάπτυξης · '+p.oral.length+'/12 σενάρια');
  info.append(heading,small,stats);
  const button=make('button','btn seminar-start',p.studied.length||p.right.length||p.oral.length?'Συνέχεια':'Έναρξη');
  button.type='button';button.addEventListener('click',()=>openCourse(c.id));
  article.append(info,button);host.append(article);
 }
 if(location.hash&&/^#(bls|pbls|ils|phtls|als)$/.test(location.hash))openCourse(location.hash.slice(1),false);
}
function openCourse(id,updateHash=true){
 const course=COURSES.find(c=>c.id===id);if(!course)return;
 selected=course;unit=0;question=0;mcQuestion=0;oral=0;view='theory';quizFormat='multiple';
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
 $('seminarCourseProgress').textContent=current().studied.length+'/12 θεματικές · '+current().mcRight.length+'/12 επιλογής · '+current().right.length+'/48 ανάπτυξης · '+current().oral.length+'/12 σενάρια';
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
 const multiple=quizFormat==='multiple';
 for(const button of document.querySelectorAll('[data-seminar-format]')){
  const active=button.dataset.seminarFormat===quizFormat;
  button.classList.toggle('active',active);
  button.setAttribute('aria-pressed',String(active));
 }
 $('seminarMultipleBody').hidden=!multiple;
 $('seminarWrittenBody').hidden=multiple;
 if(multiple){renderMultipleChoice();return;}
 $('seminarAIResult').hidden=true;
 $('seminarGradeAI').disabled=false;
 $('seminarGradeAI').textContent='Αξιολόγηση με AI';
 const p=current(),i=question,topic=Math.floor(i/4),type=i%4,u=selected.units[topic];
 $('seminarQuestionCounter').textContent='Ερώτηση '+(i+1)+' / 48 · Ανάπτυξης · Θεματική '+(topic+1);
 $('seminarQuestionTitle').textContent=qPrompts[type](u[0]);
 $('seminarQuestionNotes').value=p.qNotes[i]||'';
 $('seminarQuestionSolution').textContent=u[type+1];$('seminarQuestionSolution').hidden=true;
 $('seminarQuizReveal').hidden=false;$('seminarQuizGrade').hidden=true;
 $('seminarQuestionState').textContent=p.right.includes(i)?'✓ Σωστά στην αυτοαξιολόγηση':p.needs.includes(i)?'↻ Για επανάληψη':'Δεν έχει αξιολογηθεί';
 $('seminarPrevQuestion').disabled=i===0;$('seminarNextQuestion').disabled=i===47;
}
function renderMultipleChoice(){
 const p=current(),i=mcQuestion,q=MCQ[selected.id][i];
 $('seminarQuestionCounter').textContent='Ερώτηση '+(i+1)+' / 12 · Πολλαπλής επιλογής · Θεματική '+(i+1);
 $('seminarQuestionTitle').textContent=q[0];
 const answers=$('seminarMCQChoices');answers.replaceChildren();
 const offset=(i*3+selected.id.length)%4;
 const order=[0,1,2,3].map(n=>(n+offset)%4);
 order.forEach((original,j)=>{
  const option=make('label','seminar-mcq-option');
  const radio=make('input');radio.type='radio';radio.name='seminarMCQAnswer';radio.value=String(original);
  radio.checked=p.mcAnswers[i]===original;
  const content=make('span','seminar-mcq-label',(j+1)+'. '+q[original+1]);
  option.append(radio,content);
  radio.addEventListener('change',()=>{
   $('seminarMCQCheck').disabled=false;
   $('seminarMCQFeedback').hidden=true;
  });
  answers.append(option);
 });
 const saved=p.mcAnswers[i];
 $('seminarMCQCheck').disabled=saved===undefined;
 const feedback=$('seminarMCQFeedback');
 feedback.hidden=saved===undefined;
 feedback.className='seminar-mcq-feedback'+(saved===0?' is-correct':' is-incorrect');
 if(saved!==undefined)feedback.textContent=(saved===0?'Σωστή απάντηση. ':'Χρειάζεται επανάληψη. Σωστή απάντηση: '+q[1]+' ')+q[5];
 $('seminarQuestionState').textContent=p.mcRight.includes(i)?'✓ Σωστό':p.mcNeeds.includes(i)?'↻ Χρειάζεται επανάληψη':'Δεν έχει αξιολογηθεί';
 $('seminarPrevQuestion').disabled=i===0;$('seminarNextQuestion').disabled=i===11;
}
function renderOral(){
 const p=current(),u=selected.units[oral];$('seminarOralCounter').textContent='Κλινικό σενάριο '+(oral+1)+' / 12';
 $('seminarOralTitle').textContent='Περίγραψε προφορικά τις ενέργειές σου: '+u[0];
 $('seminarOralCase').textContent=u[4];$('seminarOralNotes').value=p.oralNotes[oral]||'';
 $('seminarOralHelp').textContent=u[2];$('seminarOralHelp').hidden=true;
 $('seminarOralReveal').hidden=false;
 $('seminarMarkOral').textContent=p.oral.includes(oral)?'✓ Ολοκληρώθηκε':'Ολοκλήρωσα το σενάριο';
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
 document.querySelectorAll('[data-seminar-format]').forEach(b=>b.addEventListener('click',()=>{quizFormat=b.dataset.seminarFormat;renderQuestion();}));
 $('seminarMCQCheck').addEventListener('click',()=>{
  if(quizFormat!=='multiple'||!selected)return;
  const choice=document.querySelector('#seminarMCQChoices input[name="seminarMCQAnswer"]:checked');
  if(!choice)return;
  const p=current(),index=mcQuestion,value=Number(choice.value);
  if(!Number.isInteger(value)||value<0||value>3)return;
  p.mcAnswers[index]=value;
  p.mcRight=p.mcRight.filter(n=>n!==index);
  p.mcNeeds=p.mcNeeds.filter(n=>n!==index);
  p[value===0?'mcRight':'mcNeeds'].push(index);
  save();renderMultipleChoice();
  $('seminarCourseProgress').textContent=p.studied.length+'/12 θεματικές · '+p.mcRight.length+'/12 επιλογής · '+p.right.length+'/48 ανάπτυξης · '+p.oral.length+'/12 σενάρια';
 });
 $('seminarMarkStudied').addEventListener('click',()=>{toggleIn(current().studied,unit);save();switchView('theory')});
 $('seminarPrevUnit').addEventListener('click',()=>{unit=Math.max(0,unit-1);renderTheory()});
 $('seminarNextUnit').addEventListener('click',()=>{unit=Math.min(11,unit+1);renderTheory()});
 $('seminarPrevQuestion').addEventListener('click',()=>{if(quizFormat==='multiple')mcQuestion=Math.max(0,mcQuestion-1);else question=Math.max(0,question-1);renderQuestion()});
 $('seminarNextQuestion').addEventListener('click',()=>{if(quizFormat==='multiple')mcQuestion=Math.min(11,mcQuestion+1);else question=Math.min(47,question+1);renderQuestion()});
 $('seminarQuestionNotes').addEventListener('input',e=>{current().qNotes[question]=e.target.value.slice(0,2000);save()});
 $('seminarGradeAI').addEventListener('click',async ()=>{
  const answer=$('seminarQuestionNotes').value.trim(),ai=window.EkabAIGrade;
  const status=$('seminarAIResult');
  if(!ai){status.hidden=false;status.textContent='Η υπηρεσία αξιολόγησης δεν φορτώθηκε.';return;}
  if(answer.length<3){status.hidden=false;status.textContent='Γράψε πρώτα τη δική σου απάντηση.';return;}
  if(!$('seminarQuestionSolution').hidden){status.hidden=false;status.textContent='Έχεις ήδη ανοίξει την ενδεικτική λύση. Δοκίμασε άλλη ερώτηση χωρίς βοήθεια.';return;}
  const courseId=selected.id,questionId=question,button=$('seminarGradeAI');
  button.disabled=true;button.textContent='Γίνεται αξιολόγηση…';
  status.hidden=false;status.textContent='Έλεγχος νοήματος της απάντησης…';
  try{
   const result=await ai.evaluate({section:'seminar',courseId,questionIndex:questionId,answer});
   if(!selected||courseId!==selected.id||questionId!==question)return;
   // Showing the solution while a request is pending disqualifies automatic credit.
   if(!$('seminarQuestionSolution').hidden){
    ai.render(status,result);
    const note=document.createElement('p');note.textContent='Δεν καταχωρίστηκε βαθμολογία επειδή εμφανίστηκε η λύση.';status.append(note);
    return;
   }
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
if(COURSES.length!==5||COURSES.some(c=>c.units?.length!==12||c.units.some(u=>u.length!==5)||MCQ[c.id]?.length!==12||MCQ[c.id].some(q=>q.length!==6||new Set(q.slice(1,5)).size!==4))){
 $('seminarCards').textContent='Το εκπαιδευτικό υλικό δεν φορτώθηκε πλήρως.';return;
}
bind();showHome();
})();