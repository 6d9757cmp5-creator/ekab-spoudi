/* ΕΚΑΒ Σπουδή — independent educational revision, not ERC certification.
 * One continuous mixed practice run: 7 multiple-choice + 3 written questions.
 * The 70/30 split is an editorial rule of this app, NOT an ERC requirement.
 */
(function(){
'use strict';
const COURSES=window.EkabSeminarTracks||[];
const MCQ=window.EkabSeminarMCQ||{};
const STORE='ekab.seminar-prep.local.v1';
const TOTAL=10, MULTIPLE=7, WRITTEN=3;
const $=id=>document.getElementById(id);
const make=(tag,cls,txt)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(txt!==undefined)e.textContent=txt;return e;};
const qPrompts=[
 title=>'Ποια είναι η βασική γνώση που πρέπει να θυμάσαι για «'+title+'»;',
 title=>'Ποια είναι η κύρια προτεραιότητα στο θέμα «'+title+'»;',
 title=>'Ποιο σφάλμα πρέπει να αποφεύγεται κατά το «'+title+'»;',
 title=>'Πώς θα αντιμετώπιζες ένα ενδεικτικό σενάριο για «'+title+'»;'
];
const shuffle=items=>{
 const arr=Array.from(items);
 for(let i=arr.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[arr[i],arr[j]]=[arr[j],arr[i]];}
 return arr;
};
function createRun(){
 const units=shuffle(Array.from({length:12},(_,i)=>i)).slice(0,TOTAL);
 const questions=units.map((unit,index)=>index<MULTIPLE?
  {type:'multiple',unit,order:shuffle([0,1,2,3])}:
  {type:'written',unit,prompt:Math.floor(Math.random()*4)});
 return {items:shuffle(questions),responses:{},pos:0};
}
function validRun(raw){
 if(!raw||typeof raw!=='object'||!Array.isArray(raw.items)||raw.items.length!==TOTAL)return null;
 let mcCount=0,writeCount=0;const seen=new Set(),items=[];
 for(const item of raw.items){
  if(!item||!Number.isInteger(item.unit)||item.unit<0||item.unit>=12||seen.has(item.unit))return null;
  seen.add(item.unit);
  if(item.type==='multiple'){
   const a=item.order;
   if(!Array.isArray(a)||a.length!==4||new Set(a).size!==4||a.some(n=>!Number.isInteger(n)||n<0||n>3))return null;
   items.push({type:'multiple',unit:item.unit,order:[...a]});mcCount++;
  }else if(item.type==='written'){
   if(!Number.isInteger(item.prompt)||item.prompt<0||item.prompt>3)return null;
   items.push({type:'written',unit:item.unit,prompt:item.prompt});writeCount++;
  }else return null;
 }
 if(mcCount!==MULTIPLE||writeCount!==WRITTEN)return null;
 const responses={};
 if(raw.responses&&typeof raw.responses==='object'&&!Array.isArray(raw.responses)){
  for(const [key,result] of Object.entries(raw.responses)){
   const i=Number(key),item=items[i];
   if(!Number.isInteger(i)||i<0||i>=TOTAL||!item||!result||typeof result!=='object')continue;
   if(item.type==='multiple'&&Number.isInteger(result.choice)&&result.choice>=0&&result.choice<4){
    responses[i]={grade:result.choice===0?'right':'needs',choice:result.choice};
   }else if(item.type==='written'&&['right','needs','skipped'].includes(result.grade)){
    responses[i]={grade:result.grade};
   }
  }
 }
 let pos=Number.isInteger(raw.pos)?Math.max(0,Math.min(TOTAL,raw.pos)):0;
 return {items,responses,pos};
}
function cleanRecord(raw){
 const obj={};for(const c of COURSES){
  const p=raw&&typeof raw==='object'?raw[c.id]||{}:{};
  const indices=(arr,max)=>Array.isArray(arr)?[...new Set(arr.filter(x=>Number.isInteger(x)&&x>=0&&x<max))]:[];
  const strings=(data,max)=>{
   const out={};
   if(data&&typeof data==='object'&&!Array.isArray(data))
    for(const [key,value] of Object.entries(data)){
     const i=Number(key);if(Number.isInteger(i)&&i>=0&&i<max&&typeof value==='string')out[i]=value.slice(0,max===12?3500:2000);
    }
   return out;
  };
  const mcAnswers={};
  if(p.mcAnswers&&typeof p.mcAnswers==='object'&&!Array.isArray(p.mcAnswers))
   for(const [key,value] of Object.entries(p.mcAnswers)){
    const i=Number(key);
    if(Number.isInteger(i)&&i>=0&&i<12&&Number.isInteger(value)&&value>=0&&value<4)mcAnswers[i]=value;
   }
  obj[c.id]={
   studied:indices(p.studied,12),
   right:indices(p.right,48),
   needs:indices(p.needs,48),
   oral:indices(p.oral,12),
   qNotes:strings(p.qNotes,48),
   oralNotes:strings(p.oralNotes,12),
   scenarioFeedback:Object.fromEntries(Object.entries(p.scenarioFeedback&&typeof p.scenarioFeedback==='object'&&!Array.isArray(p.scenarioFeedback)?p.scenarioFeedback:{}).filter(([key,val])=>
    Number.isInteger(Number(key))&&Number(key)>=0&&Number(key)<12&&val&&typeof val==='object'
   ).map(([key,val])=>[key,{
    verdict:['correct','partial','incorrect','uncertain'].includes(val.verdict)?val.verdict:'uncertain',
    criticalError:!!val.criticalError,
    explanation:typeof val.explanation==='string'?val.explanation.slice(0,1100):'',
    takeaway:typeof val.takeaway==='string'?val.takeaway.slice(0,350):'',
    modelAnswer:typeof val.modelAnswer==='string'?val.modelAnswer.slice(0,700):''
   }])),
   scenarioGrades:Object.fromEntries(Object.entries(p.scenarioGrades&&typeof p.scenarioGrades==='object'&&!Array.isArray(p.scenarioGrades)?p.scenarioGrades:{}).filter(([key,val])=>
    Number.isInteger(Number(key))&&Number(key)>=0&&Number(key)<12&&val&&['correct','partial','incorrect','uncertain'].includes(val.verdict)
   ).map(([key,val])=>[key,{verdict:val.verdict,criticalError:!!val.criticalError}])),
   mcAnswers,mcRight:indices(p.mcRight,12),mcNeeds:indices(p.mcNeeds,12),
   scenarioHistory:Array.isArray(p.scenarioHistory)?p.scenarioHistory.slice(-20):[],
   retryIndices:indices(p.retryIndices,12),
   mixedRun:validRun(p.mixedRun)
  };
  obj[c.id].needs=obj[c.id].needs.filter(i=>!obj[c.id].right.includes(i));
 }
 return obj;
}
let progress;
try{progress=cleanRecord(JSON.parse(localStorage.getItem(STORE)||'{}'));}
catch{progress=cleanRecord({});}
let selected=null,unit=0,oral=0,view='theory',scenarioEpoch=0;
let scenarioSubmitting=false,scenarioError='';
// Only drafts written or explicitly restored during this page visit appear in editable fields.
// Previously saved drafts remain in localStorage until the learner chooses to restore them.
const visibleOralDrafts=new Set();
const oralDraftKey=(courseId,index)=>courseId+':'+index;
const current=()=>selected?progress[selected.id]:null;
function save(){
 try{
  localStorage.setItem(STORE,JSON.stringify(progress));
  window.dispatchEvent(new Event('ekab:progress-changed'));
  $('seminarSaveStatus').textContent='Αποθηκεύτηκε στη συσκευή.';
 }catch{
  $('seminarSaveStatus').textContent='Αδυναμία αποθήκευσης στη συσκευή· χρησιμοποίησε αντίγραφο.';
 }
}
function toggleIn(arr,i){const k=arr.indexOf(i);if(k<0)arr.push(i);else arr.splice(k,1);}
function completedCount(run){return run?Object.keys(run.responses).length:0;}
function updateCourseProgress(){
 if(!selected)return;
 const p=current();
 $('seminarCourseProgress').textContent=p.studied.length+'/12 θεματικές · '+completedCount(p.mixedRun)+'/10 τεστ · '+Object.keys(p.scenarioGrades).length+'/12 σενάρια';
}
function showHome(){
 if(scenarioSubmitting)return;
 selected=null;
 $('seminarHome').hidden=false;$('seminarCourse').hidden=true;
 const host=$('seminarCards');host.replaceChildren();
 for(const c of COURSES){
  const p=progress[c.id];
  const card=make('article','seminar-card'),info=make('div','seminar-card-text');
  const heading=make('h2',null,c.name);
  const subtitle=make('p','seminar-card-sub',c.subtitle);
  const stats=make('p','seminar-card-stats',p.studied.length+'/12 θεματικές · '+completedCount(p.mixedRun)+'/10 τεστ · '+Object.keys(p.scenarioGrades).length+'/12 σενάρια');
  info.append(heading,subtitle,stats);
  const btn=make('button','btn seminar-start',p.studied.length||completedCount(p.mixedRun)||p.right.length||p.mcRight.length||Object.keys(p.scenarioGrades).length||p.oral.length?'Συνέχεια':'Έναρξη');
  btn.type='button';btn.addEventListener('click',()=>openCourse(c.id));
  card.append(info,btn);host.append(card);
 }
 if(/^#(bls|pbls|ils|phtls|als)$/.test(location.hash))openCourse(location.hash.slice(1),false);
}
function openCourse(id,updateHash=true){
 if(scenarioSubmitting)return;
 const course=COURSES.find(c=>c.id===id);if(!course)return;
 selected=course;unit=0;
 // Opening a course is a fresh visit: prior editable drafts require explicit restoration.
 for(let i=0;i<12;i++)visibleOralDrafts.delete(oralDraftKey(id,i));
 // Resume at the first unassessed case; reviewing assessed cases keeps their answer read-only.
 oral=progress[id].retryIndices.find(i=>!progress[id].scenarioGrades[i])??
  (Array.from({length:12},(_,i)=>i).find(i=>!progress[id].scenarioGrades[i])??11);
 view='theory';
 $('seminarHome').hidden=true;$('seminarCourse').hidden=false;
 $('seminarCourseTitle').textContent=course.name;
 $('seminarCourseSub').textContent=course.subtitle;
 if(updateHash)history.replaceState(null,'','#'+id);
 switchView('theory');window.scrollTo({top:0,behavior:'instant'});
}
function switchView(target){
 if(scenarioSubmitting&&target!=='oral')return;
 
 view=target;
 for(const b of document.querySelectorAll('[data-seminar-tab]')){
  const active=b.dataset.seminarTab===view;
  b.classList.toggle('active',active);b.setAttribute('aria-selected',String(active));
 }
 $('seminarTheory').hidden=view!=='theory';
 $('seminarQuiz').hidden=view!=='quiz';
 $('seminarOral').hidden=view!=='oral';
 if(target==='quiz'&&!current().mixedRun){current().mixedRun=createRun();save();}
 updateCourseProgress();
 if(target==='theory')renderTheory();
 else if(target==='quiz')renderMixed();
 else renderOral();
}
function renderTheory(){
 const list=$('seminarUnits'),p=current();list.replaceChildren();
 selected.units.forEach((u,i)=>{
  const b=make('button','seminar-unit'+(unit===i?' active':''),(p.studied.includes(i)?'✓ ':'')+(i+1)+'. '+u[0]);
  b.type='button';b.addEventListener('click',()=>{unit=i;renderTheory();});list.append(b);
 });
 const u=selected.units[unit];
 $('seminarUnitNumber').textContent='Θεματική '+(unit+1)+' / 12';
 $('seminarUnitTitle').textContent=u[0];$('seminarUnitTheory').textContent=u[1];
 $('seminarUnitPriority').textContent=u[2];$('seminarUnitAvoid').textContent=u[3];
 $('seminarUnitCase').textContent=u[4];
 $('seminarMarkStudied').textContent=p.studied.includes(unit)?'✓ Μελετημένη':'Σημείωσε ως μελετημένη';
 $('seminarPrevUnit').disabled=unit===0;$('seminarNextUnit').disabled=unit===11;
}
function renderMixed(){
 const run=current()?.mixedRun;if(!run)return;
 
 // Do not advance completed questions until Next is pressed.
 const finished=run.pos===TOTAL;
 $('seminarMixedQuestion').hidden=finished;
 $('seminarMixedResults').hidden=!finished;
 if(finished){renderResults();save();return;}
 const item=run.items[run.pos];
 $('seminarQuestionCounter').textContent='Ερώτηση '+(run.pos+1)+' / '+TOTAL+' · '+(item.type==='multiple'?'Πολλαπλής επιλογής':'Ανάπτυξης')+' · Θεματική '+(item.unit+1);
 $('seminarMultipleBody').hidden=item.type!=='multiple';
 $('seminarWrittenBody').hidden=item.type!=='written';
 $('seminarNextQuestion').hidden=true;
 $('seminarPrevQuestion').hidden=true;
 $('seminarQuestionState').textContent='';
 if(item.type==='multiple')renderMultiple(item);
 else renderWritten(item);
}
function renderMultiple(item){
 const run=current().mixedRun,pos=run.pos,q=MCQ[selected.id][item.unit];
 $('seminarQuestionTitle').textContent=q[0];
 const host=$('seminarMCQChoices');host.replaceChildren();
 const feedback=$('seminarMCQFeedback');feedback.hidden=true;
 function showFeedback(){
  const saved=run.responses[pos];if(!saved)return;
  const correct=saved.choice===0;
  for(const label of host.querySelectorAll('.seminar-mcq-option')){
   const input=label.querySelector('input'),value=Number(input.value);
   input.checked=value===saved.choice;input.disabled=true;
   label.classList.remove('is-correct','is-incorrect');
   if(value===saved.choice)label.classList.add(correct?'is-correct':'is-incorrect');
   else if(value===0)label.classList.add('is-correct');
  }
  feedback.className='seminar-mcq-feedback '+(correct?'is-correct':'is-incorrect');
  feedback.textContent=(correct?'✓ Σωστό. ':'✗ Λάθος. Σωστή απάντηση: '+q[1]+' ')+q[5];
  feedback.hidden=false;
  $('seminarQuestionState').textContent=correct?
   '✓ Σωστή απάντηση. Μελέτησε την εξήγηση και συνέχισε όταν είσαι έτοιμος.':
   '✗ Λάθος απάντηση. Διάβασε την επεξήγηση και συνέχισε όταν είσαι έτοιμος.';
  const next=$('seminarNextQuestion');
  next.hidden=false;next.disabled=false;
  next.textContent=pos===TOTAL-1?'Δες αποτελέσματα':'Επόμενη ερώτηση';
 }
 item.order.forEach((original,j)=>{
  const label=make('label','seminar-mcq-option');
  const radio=make('input');radio.type='radio';radio.name='seminarMCQAnswer';radio.value=String(original);
  label.append(radio,make('span','seminar-mcq-label',String.fromCharCode(65+j)+'. '+q[original+1]));
  radio.addEventListener('change',()=>{
   if(!selected||view!=='quiz'||current().mixedRun!==run||run.pos!==pos||run.responses[pos])return;
   const correct=original===0;
   run.responses[pos]={grade:correct?'right':'needs',choice:original};
   const p=current(),index=item.unit;
   p.mcAnswers[index]=original;
   p.mcRight=p.mcRight.filter(n=>n!==index);
   p.mcNeeds=p.mcNeeds.filter(n=>n!==index);
   p[correct?'mcRight':'mcNeeds'].push(index);
   save();updateCourseProgress();showFeedback();
  });
  host.append(label);
 });
 // Support refresh and revisiting this tab before manually pressing Next.
 if(run.responses[pos])showFeedback();
}
function renderWritten(item){
 const run=current().mixedRun,prior=run.responses[run.pos];
 const index=item.unit*4+item.prompt,u=selected.units[item.unit],p=current();
 $('seminarQuestionTitle').textContent=qPrompts[item.prompt](u[0]);
 $('seminarQuestionNotes').value=p.qNotes[index]||'';
 $('seminarQuestionNotes').readOnly=!!prior;
 $('seminarQuestionSolution').textContent=u[item.prompt+1];
 $('seminarQuestionSolution').hidden=!prior;
 $('seminarQuizReveal').hidden=!!prior;$('seminarQuizReveal').disabled=!!prior;
 $('seminarNextQuestion').disabled=false;
 $('seminarAIResult').hidden=true;
 $('seminarAIResult').className='ai-grading-result';
 $('seminarGradeAI').disabled=!!prior;
 $('seminarGradeAI').textContent=prior?'Ολοκληρώθηκε':'Υποβολή αξιολόγησης';
 $('seminarNextQuestion').hidden=false;
 $('seminarNextQuestion').textContent=prior?(run.pos===TOTAL-1?'Δες αποτελέσματα':'Επόμενη ερώτηση'):'Παράλειψη (χωρίς βαθμό)';
 $('seminarQuestionState').textContent=prior?'Η απάντηση καταχωρίστηκε. Διάβασε τη λύση και πάτησε Επόμενη όταν είσαι έτοιμος.':
  window.EkabAIGrade?.available()?'Γράψε την απάντησή σου και πάτησε «Υποβολή αξιολόγησης».':'Η υπηρεσία αξιολόγησης δεν είναι διαθέσιμη. Η απάντησή σου διατηρείται.';
}
function renderResults(){
 const run=current().mixedRun,items=Object.entries(run.responses);
 const correct=items.filter(([,r])=>r.grade==='right').length;
 const wrong=items.filter(([,r])=>r.grade==='needs').length;
 const skip=items.filter(([,r])=>r.grade==='skipped').length;
 const mcCorrect=items.filter(([k,r])=>run.items[Number(k)].type==='multiple'&&r.grade==='right').length;
 const writtenCorrect=items.filter(([k,r])=>run.items[Number(k)].type==='written'&&r.grade==='right').length;
 $('seminarMixedScore').textContent='Σωστές: '+correct+'/10 · Λάθος: '+wrong+' · Παραλείψεις: '+skip;
 $('seminarMixedBreakdown').textContent='Πολλαπλής επιλογής: '+mcCorrect+'/7 · Ανάπτυξης: '+writtenCorrect+'/3';
}
function nextMixed(){
 
 const run=current()?.mixedRun;if(!run)return;
 run.pos=Math.min(TOTAL,run.pos+1);
 save();renderMixed();
}
function gradeWritten(kind){
 const p=current(),run=p?.mixedRun,item=run?.items[run.pos];
 if(!item||item.type!=='written'||run.responses[run.pos]||!['right','needs','skipped'].includes(kind))return;
 run.responses[run.pos]={grade:kind,checkedBy:kind==='skipped'?'no_grade':'service'};
 const index=item.unit*4+item.prompt;
 if(kind!=='skipped'){
  p.right=p.right.filter(i=>i!==index);p.needs=p.needs.filter(i=>i!==index);
  p[kind==='right'?'right':'needs'].push(index);
 }
 save();updateCourseProgress();
 $('seminarQuestionState').textContent=kind==='skipped'?'Δεν καταχωρίστηκε βαθμολογία. Συνέχισε στην επόμενη.':
  kind==='right'?'✓ Σωστή απάντηση.':'Χρειάζεται διόρθωση. Δες τη σωστή απάντηση.';
 $('seminarGradeAI').disabled=true;$('seminarQuizReveal').hidden=true;
 $('seminarQuestionNotes').readOnly=true;
 $('seminarNextQuestion').textContent=run.pos===TOTAL-1?'Αποτελέσματα':'Επόμενη ερώτηση';
 $('seminarNextQuestion').hidden=false;
}
function repeatMixed(){
 if(!selected)return;
 const p=current(),run=p.mixedRun;
 if(run&&run.pos<TOTAL&&completedCount(run)<TOTAL){
  if(!confirm('Νέο τεστ; Η τρέχουσα προσπάθεια θα αντικατασταθεί. Η πρόοδος της τρέχουσας προσπάθειας θα μηδενιστεί. Το ιστορικό άλλων ενοτήτων δεν επηρεάζεται.'))return;
 }
 p.mixedRun=createRun();save();updateCourseProgress();renderMixed();
}
function restartOralCycle(){
 if(!selected||scenarioSubmitting)return;
 if(!confirm('Νέος κύκλος 12 κλινικών σεναρίων για '+selected.name+'; Οι απαντήσεις και η πρόοδος του προηγούμενου κύκλου θα μηδενιστούν. Η θεωρία και τα τεστ δεν επηρεάζονται.'))return;
 const p=current();
 p.scenarioHistory.push({completed:Object.keys(p.scenarioGrades).length,grades:Object.values(p.scenarioGrades).map(x=>x.verdict)});
 p.scenarioHistory=p.scenarioHistory.slice(-20);
 scenarioEpoch++;scenarioError='';
 for(let i=0;i<12;i++)visibleOralDrafts.delete(oralDraftKey(selected.id,i));
 p.scenarioGrades={};p.scenarioFeedback={};p.oralNotes={};p.oral=[];p.retryIndices=[];
 oral=0;save();updateCourseProgress();renderOral();
}
const activeOralIndices=p=>p.retryIndices.length?p.retryIndices:Array.from({length:12},(_,i)=>i);
function startIncorrectRetry(){
 if(!selected||scenarioSubmitting)return;
 const p=current();
 if(p.retryIndices.length||!selected.units.every((_,i)=>!!p.scenarioGrades[i]))return;
 const incorrect=Array.from({length:12},(_,i)=>i).filter(i=>p.scenarioGrades[i].verdict==='incorrect');
 if(!incorrect.length)return;
 if(!confirm('Να επαναλάβεις '+incorrect.length+' λανθασμένα σενάρια; Οι υπόλοιπες βαθμολογίες δεν θα αλλάξουν.'))return;
 p.scenarioHistory.push({kind:'incorrect_retry',at:new Date().toISOString(),before:incorrect.map(index=>({
  index,answer:p.oralNotes[index]||'',grade:{...p.scenarioGrades[index]},
  feedback:p.scenarioFeedback[index]?{...p.scenarioFeedback[index]}:null
 }))});
 p.scenarioHistory=p.scenarioHistory.slice(-20);p.retryIndices=incorrect;
 scenarioEpoch++;scenarioError='';
 for(const i of incorrect){
  delete p.scenarioGrades[i];delete p.scenarioFeedback[i];delete p.oralNotes[i];
  visibleOralDrafts.delete(oralDraftKey(selected.id,i));
 }
 oral=incorrect[0];save();updateCourseProgress();renderOral();
}
function finishIncorrectRetry(p){
 if(!p.retryIndices.length||!p.retryIndices.every(i=>!!p.scenarioGrades[i]))return;
 const attempt=[...p.scenarioHistory].reverse().find(x=>x?.kind==='incorrect_retry'&&!x.after);
 if(attempt)attempt.after=p.retryIndices.map(index=>({index,verdict:p.scenarioGrades[index].verdict}));
 p.retryIndices=[];save();updateCourseProgress();
}
const oralAnswerReady=(p,i)=>!!p.scenarioGrades[i]||
 (visibleOralDrafts.has(oralDraftKey(selected.id,i))&&(p.oralNotes[i]||'').trim().length>=20);
function renderOralDraftProgress(){
 const p=current(),active=activeOralIndices(p),ready=active.filter(i=>oralAnswerReady(p,i)).length;
 $('seminarDraftProgress').textContent='Απαντημένα: '+ready+'/'+active.length+(p.retryIndices.length?' · Επανάληψη λανθασμένων σεναρίων.':' · Μπορείς να διορθώσεις τις απαντήσεις πριν από την τελική υποβολή.');
 const submit=$('seminarScenarioSubmit');
 submit.disabled=scenarioSubmitting||ready!==active.length;
 submit.textContent=scenarioSubmitting?'Αξιολογούνται τα σενάρια…':
  p.retryIndices.length?'Υποβολή επανάληψης ('+active.length+' σενάρια)':
  Object.keys(p.scenarioGrades).length?'Συνέχεια τελικής αξιολόγησης':'Τελική υποβολή και αξιολόγηση (12 σενάρια)';
}
function renderOralResults(){
 const p=current(),host=$('seminarOralResultsList');
 $('seminarOralQuestion').hidden=true;$('seminarOralResults').hidden=false;
 host.replaceChildren();
 const counts={correct:0,incorrect:0,partial:0,uncertain:0};
 const labels={correct:'Σωστό',incorrect:'Λάθος',partial:'Μερικώς σωστό',uncertain:'Χρειάζεται επανέλεγχο'};
 for(let i=0;i<12;i++){
  const u=selected.units[i],grade=p.scenarioGrades[i],verdict=grade?.verdict||'uncertain';
  counts[verdict]++;
  const item=make('details','seminar-result-item seminar-result-'+verdict);
  const heading=make('summary','seminar-result-heading');
  const name=make('span','seminar-result-name',(i+1)+'. '+u[0]);
  const flag=make('span','seminar-result-flag',labels[verdict]||labels.uncertain);
  heading.append(name,flag);item.append(heading);
  const body=make('div','seminar-result-detail');
  const caseTitle=make('strong',null,'Σενάριο');
  const caseText=make('p',null,u[4]);
  body.append(caseTitle,caseText);
  const result=make('div','ai-grading-result');
  const feedback=p.scenarioFeedback[i];
  if(window.EkabAIGrade&&feedback)
   window.EkabAIGrade.render(result,{...feedback,studentAnswer:p.oralNotes[i]||'',referenceAnswer:u[2]});
  else{
   result.textContent='Η απάντησή σου: '+(p.oralNotes[i]||'')+' · Εκπαιδευτική προτεραιότητα: '+u[2];
  }
  body.append(result);item.append(body);host.append(item);
 }
 $('seminarOralSummary').textContent=
  '✓ '+counts.correct+' σωστά · ✗ '+counts.incorrect+' λάθη · '+counts.partial+' μερικώς σωστά · '+counts.uncertain+' για επανέλεγχο';
 $('seminarScenarioStatus').textContent='';
 const retry=$('seminarRetryIncorrect');retry.hidden=!counts.incorrect;
 retry.textContent='Επανάληψη '+counts.incorrect+' λανθασμένων σεναρίων';
 const archive=$('seminarRetryHistoryList');archive.replaceChildren();
 const history=p.scenarioHistory.filter(x=>x?.kind==='incorrect_retry').slice(-10).reverse();
 $('seminarRetryHistory').hidden=history.length===0;
 for(const attempt of history){
  const details=make('details','seminar-retry-history-item');
  details.append(make('summary',null,'Επανάληψη · '+(attempt.at||'').slice(0,10)));
  for(const before of (Array.isArray(attempt.before)?attempt.before:[]).slice(0,12)){
   if(!Number.isInteger(before.index)||before.index<0||before.index>=12)continue;
   const after=attempt.after?.find(x=>x.index===before.index);
   const entry=make('div','seminar-retry-archive');
   entry.append(make('strong',null,(before.index+1)+'. '+selected.units[before.index][0]+
    ' · Πριν: '+(before.grade?.verdict||'χωρίς βαθμό')+' · Μετά: '+(after?.verdict||'εκκρεμεί')));
   if(before.answer)entry.append(make('p',null,'Προηγούμενη απάντηση: '+before.answer));
   if(before.feedback?.explanation)entry.append(make('p',null,'Παλαιότερη αξιολόγηση: '+before.feedback.explanation));
   details.append(entry);
  }
  archive.append(details);
 }
}
function renderOral(){
 if(!selected)return;
 const p=current();finishIncorrectRetry(p);
 const active=activeOralIndices(p),finished=selected.units.every((_,i)=>Boolean(p.scenarioGrades[i]));
 $('seminarRestartOral').hidden=false;
 $('seminarRestartOral').disabled=scenarioSubmitting;
 if(finished){renderOralResults();return;}
 $('seminarOralQuestion').hidden=false;$('seminarOralResults').hidden=true;
 if(!active.includes(oral))oral=active[0];
 const step=active.indexOf(oral),u=selected.units[oral],prior=p.scenarioGrades[oral];
 $('seminarOralCounter').textContent=(p.retryIndices.length?'Επανάληψη ':'Κλινικό σενάριο ')+(step+1)+' / '+active.length+(p.retryIndices.length?' · Αρχικό '+(oral+1):'');
 $('seminarOralTitle').textContent='Περιέγραψε τις ενέργειές σου, με σωστή σειρά: '+u[0];
 $('seminarOralCase').textContent=u[4];
 const savedDraft=p.oralNotes[oral]||'',isVisible=!!prior||visibleOralDrafts.has(oralDraftKey(selected.id,oral));
 $('seminarOralNotes').value=isVisible?savedDraft:'';
 $('seminarOralNotes').readOnly=!!prior||scenarioSubmitting;
 $('seminarRestoreOralDraft').hidden=!!prior||!savedDraft||isVisible;
 $('seminarRestoreOralDraft').disabled=scenarioSubmitting;
 $('seminarScenarioResult').hidden=true;$('seminarScenarioResult').replaceChildren();
 $('seminarScenarioStatus').textContent=scenarioError||(prior?
  'Η απάντηση καταχωρίστηκε. Η αξιολόγηση θα εμφανιστεί συγκεντρωτικά όταν ολοκληρωθούν και τα 12.':
  'Συμπλήρωσε το σενάριο και προχώρησε στο επόμενο.');
 $('seminarPrevOral').disabled=scenarioSubmitting||step===0;
 $('seminarNextOral').disabled=scenarioSubmitting||step===active.length-1;
 $('seminarNextOral').textContent=step===active.length-1?'Τελευταίο σενάριο':'Επόμενο';
 renderOralDraftProgress();
}
async function submitOralBatch(){
 if(!selected||scenarioSubmitting)return;
 const p=current(),courseId=selected.id,epoch=scenarioEpoch;
 const active=activeOralIndices(p),missing=active.find(i=>!oralAnswerReady(p,i))??-1;
 if(missing!==-1){
  oral=missing;renderOral();$('seminarScenarioStatus').textContent='Χρειάζονται απαντήσεις σε όλα τα σενάρια αυτής της προσπάθειας (τουλάχιστον 20 χαρακτήρες το καθένα).';
  return;
 }
 const ai=window.EkabAIGrade;
 if(!ai||!ai.available()){
  scenarioError='Η υπηρεσία αξιολόγησης δεν είναι διαθέσιμη. Όλες οι απαντήσεις σου παραμένουν αποθηκευμένες.';
  renderOral();return;
 }
 if(!confirm('Να υποβληθούν τώρα τα σενάρια της προσπάθειας; Οι απαντήσεις που αξιολογούνται κλειδώνουν. Οι βαθμολογίες θα εμφανιστούν όλες μαζί στο τέλος.'))return;
 scenarioSubmitting=true;scenarioError='';
 $('seminarOralNotes').readOnly=true;
 $('seminarPrevOral').disabled=true;$('seminarNextOral').disabled=true;
 $('seminarRestartOral').disabled=true;
 renderOralDraftProgress();
 try{
  for(const caseId of active){
   // A previous interrupted run can resume without spending requests on already graded cases.
   if(p.scenarioGrades[caseId])continue;
   $('seminarScenarioStatus').textContent='Αξιολογείται το σενάριο '+(active.indexOf(caseId)+1)+'/'+active.length+'. Τα αποτελέσματα θα εμφανιστούν μαζί στο τέλος.';
   const answer=(p.oralNotes[caseId]||'').trim();
   const result=await ai.evaluate({section:'seminar_case',courseId,caseIndex:caseId,answer});
   if(scenarioEpoch!==epoch||!selected||selected.id!==courseId)return;
   current().scenarioGrades[caseId]={verdict:result.verdict,criticalError:!!result.criticalError};
   current().scenarioFeedback[caseId]={
    verdict:result.verdict,criticalError:!!result.criticalError,
    explanation:typeof result.explanation==='string'?result.explanation.slice(0,1100):'',
    takeaway:typeof result.takeaway==='string'?result.takeaway.slice(0,350):'',
    modelAnswer:typeof result.modelAnswer==='string'?result.modelAnswer.slice(0,700):''
   };
   save();updateCourseProgress();
  }
 }catch(err){
  scenarioError='Η αξιολόγηση διακόπηκε: '+(err.message||'Προσωρινό πρόβλημα.')+
   ' Οι ήδη αξιολογημένες απαντήσεις αποθηκεύτηκαν. Μπορείς να συνεχίσεις χωρίς να τις επαναυποβάλεις.';
 }finally{
  scenarioSubmitting=false;
  if(selected?.id===courseId&&scenarioEpoch===epoch)renderOral();
 }
}
function bind(){
 $('seminarBack').addEventListener('click',()=>{if(scenarioSubmitting)return;history.replaceState(null,'',location.pathname);showHome();});
 document.querySelectorAll('[data-seminar-tab]').forEach(b=>b.addEventListener('click',()=>switchView(b.dataset.seminarTab)));
 $('seminarRestartQuiz').addEventListener('click',repeatMixed);
 $('seminarRestartOral').addEventListener('click',restartOralCycle);
 $('seminarRepeatQuiz').addEventListener('click',repeatMixed);
 $('seminarMarkStudied').addEventListener('click',()=>{toggleIn(current().studied,unit);save();switchView('theory');});
 $('seminarPrevUnit').addEventListener('click',()=>{unit=Math.max(0,unit-1);renderTheory();});
 $('seminarNextUnit').addEventListener('click',()=>{unit=Math.min(11,unit+1);renderTheory();});
 $('seminarNextQuestion').addEventListener('click',()=>{
  const run=current()?.mixedRun,item=run?.items[run.pos];
  if(!item)return;
  if(item.type==='multiple'){
   if(!run.responses[run.pos])return;
  }else if(!run.responses[run.pos]){
   run.responses[run.pos]={grade:'skipped'};save();updateCourseProgress();
  }
  nextMixed();
 });
 $('seminarQuestionNotes').addEventListener('input',event=>{
  const run=current()?.mixedRun,item=run?.items[run.pos];
  if(!item||item.type!=='written'||run.responses[run.pos])return;
  current().qNotes[item.unit*4+item.prompt]=event.target.value.slice(0,2000);save();
 });
 $('seminarGradeAI').addEventListener('click',async()=>{
  const run=current()?.mixedRun,item=run?.items[run.pos],ai=window.EkabAIGrade,status=$('seminarAIResult');
  if(!run||!item||item.type!=='written'||run.responses[run.pos])return;
  const answer=$('seminarQuestionNotes').value.trim();
  if(!ai){status.hidden=false;status.textContent='Η υπηρεσία αξιολόγησης δεν είναι διαθέσιμη.';return;}
  if(answer.length<3){status.hidden=false;status.textContent='Γράψε πρώτα τη δική σου απάντηση.';return;}
  if(!$('seminarQuestionSolution').hidden){status.hidden=false;status.textContent='Η ενδεικτική λύση έχει ήδη εμφανιστεί. Αυτή η απάντηση παραμένει χωρίς βαθμό.';return;}
  const courseId=selected.id,pos=run.pos,index=item.unit*4+item.prompt,button=$('seminarGradeAI');
  button.disabled=true;button.textContent='Γίνεται αξιολόγηση…';
  $('seminarQuestionNotes').readOnly=true;$('seminarQuizReveal').disabled=true;$('seminarNextQuestion').disabled=true;
  status.hidden=false;status.textContent='Έλεγχος γραπτής απάντησης…';
  try{
   const result=await ai.evaluate({section:'seminar',courseId,questionIndex:index,answer});
   if(selected?.id!==courseId||view!=='quiz'||current().mixedRun!==run||run.pos!==pos)return;
   if(!$('seminarQuestionSolution').hidden){status.textContent='Δεν καταχωρίστηκε αποτέλεσμα επειδή εμφανίστηκε η λύση.';return;}
   ai.render(status,result);
   if(result.verdict==='correct')gradeWritten('right');
   else if(result.verdict==='partial'||result.verdict==='incorrect')gradeWritten('needs');
   else gradeWritten('skipped');
  }catch(error){
   if(selected?.id!==courseId||view!=='quiz'||current().mixedRun!==run||run.pos!==pos)return;
   status.className='ai-grading-result ai-grading-unavailable';
   status.textContent=error.message||'Η αξιολόγηση δεν ολοκληρώθηκε.';
  }finally{
   if(selected?.id===courseId&&view==='quiz'&&current().mixedRun===run&&run.pos===pos){
    button.disabled=!!run.responses[pos];button.textContent=run.responses[pos]?'Ολοκληρώθηκε':'Υποβολή αξιολόγησης';
    $('seminarQuestionNotes').readOnly=!!run.responses[pos];
    $('seminarQuizReveal').disabled=!!run.responses[pos];$('seminarNextQuestion').disabled=false;
   }
  }
 });
 $('seminarQuizReveal').addEventListener('click',()=>{
  $('seminarQuestionSolution').hidden=false;
  gradeWritten('skipped');
 });
 $('seminarPrevOral').addEventListener('click',()=>{if(scenarioSubmitting)return;const a=activeOralIndices(current()),i=a.indexOf(oral);oral=a[Math.max(0,i-1)]??oral;renderOral();});
 $('seminarNextOral').addEventListener('click',()=>{if(scenarioSubmitting)return;const a=activeOralIndices(current()),i=a.indexOf(oral);oral=a[Math.min(a.length-1,i+1)]??oral;renderOral();});
 $('seminarRestoreOralDraft').addEventListener('click',()=>{
  const p=current();if(!p||scenarioSubmitting||p.scenarioGrades[oral])return;
  visibleOralDrafts.add(oralDraftKey(selected.id,oral));
  $('seminarOralNotes').value=p.oralNotes[oral]||'';
  $('seminarRestoreOralDraft').hidden=true;
  renderOralDraftProgress();$('seminarOralNotes').focus();
 });
 $('seminarOralNotes').addEventListener('input',e=>{
  const p=current();if(!p||scenarioSubmitting||p.scenarioGrades[oral])return;
  scenarioError='';
  visibleOralDrafts.add(oralDraftKey(selected.id,oral));
  $('seminarRestoreOralDraft').hidden=true;
  p.oralNotes[oral]=e.target.value.slice(0,3500);save();
  $('seminarScenarioStatus').textContent='Η απάντηση αποθηκεύτηκε. Συνέχισε όταν είσαι έτοιμος.';
  renderOralDraftProgress();
 });
 $('seminarScenarioSubmit').addEventListener('click',submitOralBatch);
 $('seminarRetryIncorrect').addEventListener('click',startIncorrectRetry);
 $('seminarExport').addEventListener('click',()=>{
  const payload={type:'ekab-seminar-prep',version:1,exportedAt:new Date().toISOString(),progress};
  const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'});
  const url=URL.createObjectURL(blob),a=make('a');
  a.href=url;a.download='ekab-seminars-progress.json';document.body.append(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
 });
 $('seminarImport').addEventListener('change',async e=>{
  const file=e.target.files?.[0];e.target.value='';if(!file||scenarioSubmitting)return;
  try{
   if(file.size>3000000)throw Error('Το αντίγραφο είναι πολύ μεγάλο.');
   const data=JSON.parse(await file.text());
   if(data?.type!=='ekab-seminar-prep'||data.version!==1||!data.progress||typeof data.progress!=='object')throw Error('Μη αναγνωρισμένο αντίγραφο σεμιναρίων.');
   if(!confirm('Να αντικατασταθεί ΜΟΝΟ η πρόοδος σεμιναρίων αυτής της συσκευής; ΕΟΠΠΕΠ και ΣΑΕΚ δεν επηρεάζονται.'))return;
   scenarioError='';visibleOralDrafts.clear();progress=cleanRecord(data.progress);save();
   if(selected)switchView(view);else showHome();
   $('seminarSaveStatus').textContent='Το αντίγραφο προετοιμασίας σεμιναρίων εισήχθη.';
  }catch(error){$('seminarSaveStatus').textContent=error.message||'Αποτυχία εισαγωγής.';}
 });
 window.addEventListener('hashchange',()=>{
  if(scenarioSubmitting)return;
  const id=location.hash.slice(1),next=COURSES.find(c=>c.id===id);
  if(next&&(!selected||selected.id!==id))openCourse(id,false);
  else if(!next&&selected)showHome();
 });
}
// Refresh the displayed seminar course after a cloud merge.
window.addEventListener('ekab:cloud-applied',()=>{
 if(scenarioSubmitting)return;
 try{
  progress=cleanRecord(JSON.parse(localStorage.getItem(STORE)||'{}'));
  if(!selected){showHome();return;}
  updateCourseProgress();
  if(view==='theory')renderTheory();
  else if(view==='quiz')renderMixed();
  else renderOral();
 }catch{
  $('seminarSaveStatus').textContent='Η πρόοδος δεν ανανεώθηκε στην οθόνη. Ανανέωσε τη σελίδα πριν συνεχίσεις.';
 }
});
if(COURSES.length!==5||COURSES.some(c=>c.units?.length!==12||c.units.some(u=>u.length!==5)||MCQ[c.id]?.length!==12||MCQ[c.id].some(q=>q.length!==6||new Set(q.slice(1,5)).size!==4))){
 $('seminarCards').textContent='Το εκπαιδευτικό υλικό δεν φορτώθηκε πλήρως.';
}else{bind();showHome();}
})();
