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
   scenarioGrades:Object.fromEntries(Object.entries(p.scenarioGrades&&typeof p.scenarioGrades==='object'&&!Array.isArray(p.scenarioGrades)?p.scenarioGrades:{}).filter(([key,val])=>
    Number.isInteger(Number(key))&&Number(key)>=0&&Number(key)<12&&val&&['correct','partial','incorrect','uncertain'].includes(val.verdict)
   ).map(([key,val])=>[key,{verdict:val.verdict,criticalError:!!val.criticalError}])),
   mcAnswers,mcRight:indices(p.mcRight,12),mcNeeds:indices(p.mcNeeds,12),
   mixedRun:validRun(p.mixedRun)
  };
  obj[c.id].needs=obj[c.id].needs.filter(i=>!obj[c.id].right.includes(i));
 }
 return obj;
}
let progress;
try{progress=cleanRecord(JSON.parse(localStorage.getItem(STORE)||'{}'));}
catch{progress=cleanRecord({});}
let selected=null,unit=0,oral=0,view='theory',autoTimer=null;
const current=()=>selected?progress[selected.id]:null;
function save(){
 try{
  localStorage.setItem(STORE,JSON.stringify(progress));
  $('seminarSaveStatus').textContent='Αποθηκεύτηκε στη συσκευή.';
 }catch{
  $('seminarSaveStatus').textContent='Αδυναμία αποθήκευσης στη συσκευή· χρησιμοποίησε αντίγραφο.';
 }
}
function stopAuto(){if(autoTimer!==null){clearTimeout(autoTimer);autoTimer=null;}}
function toggleIn(arr,i){const k=arr.indexOf(i);if(k<0)arr.push(i);else arr.splice(k,1);}
function completedCount(run){return run?Object.keys(run.responses).length:0;}
function updateCourseProgress(){
 if(!selected)return;
 const p=current();
 $('seminarCourseProgress').textContent=p.studied.length+'/12 θεματικές · '+completedCount(p.mixedRun)+'/10 τεστ · '+Object.keys(p.scenarioGrades).length+'/12 σενάρια (AI)';
}
function showHome(){
 stopAuto();selected=null;
 $('seminarHome').hidden=false;$('seminarCourse').hidden=true;
 const host=$('seminarCards');host.replaceChildren();
 for(const c of COURSES){
  const p=progress[c.id];
  const card=make('article','seminar-card'),info=make('div','seminar-card-text');
  const heading=make('h2',null,c.name);
  const subtitle=make('p','seminar-card-sub',c.subtitle);
  const stats=make('p','seminar-card-stats',p.studied.length+'/12 θεματικές · '+completedCount(p.mixedRun)+'/10 τεστ · '+Object.keys(p.scenarioGrades).length+'/12 σενάρια (AI)');
  info.append(heading,subtitle,stats);
  const btn=make('button','btn seminar-start',p.studied.length||completedCount(p.mixedRun)||p.right.length||p.mcRight.length||Object.keys(p.scenarioGrades).length||p.oral.length?'Συνέχεια':'Έναρξη');
  btn.type='button';btn.addEventListener('click',()=>openCourse(c.id));
  card.append(info,btn);host.append(card);
 }
 if(/^#(bls|pbls|ils|phtls|als)$/.test(location.hash))openCourse(location.hash.slice(1),false);
}
function openCourse(id,updateHash=true){
 const course=COURSES.find(c=>c.id===id);if(!course)return;
 stopAuto();selected=course;unit=0;oral=0;view='theory';
 $('seminarHome').hidden=true;$('seminarCourse').hidden=false;
 $('seminarCourseTitle').textContent=course.name;
 $('seminarCourseSub').textContent=course.subtitle;
 if(updateHash)history.replaceState(null,'','#'+id);
 switchView('theory');window.scrollTo({top:0,behavior:'instant'});
}
function switchView(target){
 stopAuto();
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
 stopAuto();
 while(run.pos<TOTAL&&run.responses[run.pos])run.pos++;
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
 const run=current().mixedRun,q=MCQ[selected.id][item.unit];
 $('seminarQuestionTitle').textContent=q[0];
 const host=$('seminarMCQChoices');host.replaceChildren();
 const feedback=$('seminarMCQFeedback');feedback.hidden=true;
 item.order.forEach((original,j)=>{
  const label=make('label','seminar-mcq-option');
  const radio=make('input');radio.type='radio';radio.name='seminarMCQAnswer';radio.value=String(original);
  label.append(radio,make('span','seminar-mcq-label',String.fromCharCode(65+j)+'. '+q[original+1]));
  radio.addEventListener('change',()=>{
   if(!selected||view!=='quiz'||current().mixedRun!==run||run.responses[run.pos])return;
   const correct=original===0;
   run.responses[run.pos]={grade:correct?'right':'needs',choice:original};
   const p=current(),index=item.unit;
   p.mcAnswers[index]=original;
   p.mcRight=p.mcRight.filter(n=>n!==index);
   p.mcNeeds=p.mcNeeds.filter(n=>n!==index);
   p[correct?'mcRight':'mcNeeds'].push(index);
   save();updateCourseProgress();
   for(const choice of host.querySelectorAll('.seminar-mcq-option')){
    const input=choice.querySelector('input'),value=Number(input.value);input.disabled=true;
    if(value===original)choice.classList.add(correct?'is-correct':'is-incorrect');
    else if(value===0)choice.classList.add('is-correct');
   }
   feedback.className='seminar-mcq-feedback '+(correct?'is-correct':'is-incorrect');
   feedback.textContent=(correct?'✓ Σωστό. ':'✗ Λάθος. Σωστή απάντηση: '+q[1]+' ')+q[5];
   feedback.hidden=false;
   $('seminarQuestionState').textContent=correct?'✓ Καταχωρίστηκε σωστά.':'✗ Καταχωρίστηκε ως λάθος.';
   const courseId=selected.id;
   stopAuto();
   autoTimer=setTimeout(()=>{
    autoTimer=null;
    if(view==='quiz'&&selected?.id===courseId&&current().mixedRun===run)nextMixed();
   },1350);
  });
  host.append(label);
 });
}
function renderWritten(item){
 const index=item.unit*4+item.prompt,u=selected.units[item.unit],p=current();
 $('seminarQuestionTitle').textContent=qPrompts[item.prompt](u[0]);
 $('seminarQuestionNotes').value=p.qNotes[index]||'';
 $('seminarQuestionNotes').readOnly=false;
 $('seminarQuestionSolution').textContent=u[item.prompt+1];
 $('seminarQuestionSolution').hidden=true;
 $('seminarQuizReveal').hidden=false;
 $('seminarAIResult').hidden=true;
 $('seminarAIResult').className='ai-grading-result';
 $('seminarGradeAI').disabled=false;
 $('seminarGradeAI').textContent='Υποβολή αξιολόγησης';
 $('seminarNextQuestion').hidden=false;$('seminarNextQuestion').textContent='Παράλειψη (χωρίς βαθμό)';
 $('seminarQuestionState').textContent=window.EkabAIGrade?.available()?'Γράψε την απάντησή σου και πάτησε «Υποβολή αξιολόγησης».':'Η υπηρεσία αξιολόγησης δεν είναι διαθέσιμη. Η απάντησή σου διατηρείται.';
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
 stopAuto();
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
  if(!confirm('Νέο τεστ; Η τρέχουσα προσπάθεια θα αντικατασταθεί. Η προηγούμενη πρόοδός σου θα παραμείνει.'))return;
 }
 p.mixedRun=createRun();save();updateCourseProgress();renderMixed();
}
function renderOral(){
 const p=current(),u=selected.units[oral];
 $('seminarOralCounter').textContent='Κλινικό σενάριο '+(oral+1)+' / 12';
 $('seminarOralTitle').textContent='Περιέγραψε τις ενέργειές σου, με σωστή σειρά: '+u[0];
 $('seminarOralCase').textContent=u[4];$('seminarOralNotes').value=p.oralNotes[oral]||'';
 $('seminarOralHelp').textContent=u[2];$('seminarOralHelp').hidden=true;
 $('seminarOralReveal').hidden=false;
 const prior=p.scenarioGrades[oral];
 $('seminarScenarioStatus').textContent=prior?'Προηγούμενη αξιολόγηση AI: '+({correct:'Σωστή',partial:'Μερικώς σωστή',incorrect:'Λανθασμένη',uncertain:'Απαιτεί επανέλεγχο'}[prior.verdict]||'Άγνωστη')+'. Μπορείς να υποβάλεις βελτιωμένη απάντηση.':
  (window.EkabAIGrade?.available()?'Περιέγραψε το περιστατικό βήμα προς βήμα και υπέβαλε την απάντηση.':'Η υπηρεσία AI δεν έχει ενεργοποιηθεί. Δεν μπορεί να δοθεί βαθμός.');
 $('seminarScenarioResult').hidden=true;
 $('seminarScenarioSubmit').disabled=false;
 $('seminarScenarioSubmit').textContent='Υποβολή · Αυτόματη αξιολόγηση AI';
 $('seminarPrevOral').disabled=oral===0;$('seminarNextOral').disabled=oral===11;
}
function bind(){
 $('seminarBack').addEventListener('click',()=>{history.replaceState(null,'',location.pathname);showHome();});
 document.querySelectorAll('[data-seminar-tab]').forEach(b=>b.addEventListener('click',()=>switchView(b.dataset.seminarTab)));
 $('seminarRestartQuiz').addEventListener('click',repeatMixed);
 $('seminarRepeatQuiz').addEventListener('click',repeatMixed);
 $('seminarMarkStudied').addEventListener('click',()=>{toggleIn(current().studied,unit);save();switchView('theory');});
 $('seminarPrevUnit').addEventListener('click',()=>{unit=Math.max(0,unit-1);renderTheory();});
 $('seminarNextUnit').addEventListener('click',()=>{unit=Math.min(11,unit+1);renderTheory();});
 $('seminarNextQuestion').addEventListener('click',()=>{
  const run=current().mixedRun,item=run.items[run.pos];
  if(!item||item.type!=='written')return;
  if(!run.responses[run.pos]){run.responses[run.pos]={grade:'skipped'};save();updateCourseProgress();}
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
   }
  }
 });
 $('seminarQuizReveal').addEventListener('click',()=>{
  $('seminarQuestionSolution').hidden=false;
  gradeWritten('skipped');
 });
 $('seminarPrevOral').addEventListener('click',()=>{oral=Math.max(0,oral-1);renderOral();});
 $('seminarNextOral').addEventListener('click',()=>{oral=Math.min(11,oral+1);renderOral();});
 $('seminarOralNotes').addEventListener('input',e=>{
  const p=current();
  p.oralNotes[oral]=e.target.value.slice(0,3500);
  // A previously graded answer must never appear to verify newly edited steps.
  if(p.scenarioGrades[oral]){delete p.scenarioGrades[oral];updateCourseProgress();}
  save();
  $('seminarScenarioResult').hidden=true;
  $('seminarScenarioStatus').textContent='Αποθηκεύτηκε η νέα περιγραφή. Η προηγούμενη βαθμολογία δεν ισχύει πλέον· πάτησε «Υποβολή» για επανέλεγχο AI.';
 });
 $('seminarOralReveal').addEventListener('click',()=>{
  $('seminarOralHelp').hidden=false;$('seminarOralReveal').hidden=true;
  $('seminarScenarioStatus').textContent='Εμφανίστηκε η ενδεικτική προτεραιότητα. Η προβολή αυτή δεν αποτελεί αξιολόγηση.';
 });
 $('seminarScenarioSubmit').addEventListener('click',async()=>{
  if(!selected||view!=='oral')return;
  const ai=window.EkabAIGrade,answer=$('seminarOralNotes').value.trim(),
        status=$('seminarScenarioResult'),info=$('seminarScenarioStatus');
  if(answer.length<20){
   info.textContent='Περιέγραψε αναλυτικά τις ενέργειές σου (τουλάχιστον 20 χαρακτήρες).';return;
  }
  if(!ai||!ai.available()){
   info.textContent='Η πραγματική υπηρεσία AI δεν έχει ενεργοποιηθεί. Δεν δόθηκε βαθμός.';
   status.hidden=false;status.className='ai-grading-result ai-grading-unavailable';
   status.textContent='Δεν είναι διαθέσιμη η αυτόματη αξιολόγηση. Η απάντησή σου παραμένει στη συσκευή.';
   return;
  }
  if(!$('seminarOralHelp').hidden){
   info.textContent='Είδες την ενδεικτική προτεραιότητα. Συνέχισε για εξάσκηση, αλλά μην εκλάβεις το αποτέλεσμα ως αδιάβλητη εξέταση.';
  }
  const courseId=selected.id,caseId=oral,button=$('seminarScenarioSubmit');
  button.disabled=true;button.textContent='Ελέγχονται διαδικασίες και προτεραιότητες…';
  status.hidden=false;status.className='ai-grading-result';status.textContent='Γίνεται έλεγχος ασφάλειας, σειράς ενεργειών, παραλείψεων και κρίσιμων λαθών…';
  try{
   const result=await ai.evaluate({section:'seminar_case',courseId,caseIndex:caseId,answer});
   if(!selected||selected.id!==courseId||view!=='oral'||oral!==caseId)return;
   ai.render(status,result);
   current().scenarioGrades[caseId]={verdict:result.verdict,criticalError:!!result.criticalError};
   save();updateCourseProgress();
   info.textContent=result.criticalError?
    'Προσοχή: το AI εντόπισε πιθανό επικίνδυνο λάθος. Διάβασε την ανατροφοδότηση και επανάλαβε την άσκηση.':
    result.verdict==='correct'?'✓ AI: οι κύριες εκπαιδευτικές ενέργειες κρίθηκαν σωστές.':
    result.verdict==='partial'?'AI: μερικώς σωστό. Δες ποια βήματα λείπουν.':
    result.verdict==='incorrect'?'AI: λανθασμένη προσέγγιση. Δες τη σειρά ενεργειών.':
    'Το AI δεν μπορεί να αποφανθεί με ασφάλεια. Απαιτείται επανέλεγχος.';
  }catch(err){
   if(!selected||selected.id!==courseId||view!=='oral'||oral!==caseId)return;
   status.hidden=false;status.className='ai-grading-result ai-grading-unavailable';
   status.textContent=err.message||'Η αξιολόγηση δεν ολοκληρώθηκε.';
   info.textContent='Δεν αποδόθηκε νέα βαθμολογία. Έλεγξε τη σύνδεση και ξαναπροσπάθησε.';
  }finally{
   if(selected?.id===courseId&&view==='oral'&&oral===caseId){
    button.disabled=false;button.textContent='Υποβολή · Αυτόματη αξιολόγηση AI';
   }
  }
 });
 $('seminarExport').addEventListener('click',()=>{
  const payload={type:'ekab-seminar-prep',version:1,exportedAt:new Date().toISOString(),progress};
  const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'});
  const url=URL.createObjectURL(blob),a=make('a');
  a.href=url;a.download='ekab-seminars-progress.json';document.body.append(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
 });
 $('seminarImport').addEventListener('change',async e=>{
  const file=e.target.files?.[0];e.target.value='';if(!file)return;
  try{
   if(file.size>3000000)throw Error('Το αντίγραφο είναι πολύ μεγάλο.');
   const data=JSON.parse(await file.text());
   if(data?.type!=='ekab-seminar-prep'||data.version!==1||!data.progress||typeof data.progress!=='object')throw Error('Μη αναγνωρισμένο αντίγραφο σεμιναρίων.');
   if(!confirm('Να αντικατασταθεί ΜΟΝΟ η πρόοδος σεμιναρίων αυτής της συσκευής; ΕΟΠΠΕΠ και ΣΑΕΚ δεν επηρεάζονται.'))return;
   stopAuto();progress=cleanRecord(data.progress);save();
   if(selected)switchView(view);else showHome();
   $('seminarSaveStatus').textContent='Το αντίγραφο προετοιμασίας σεμιναρίων εισήχθη.';
  }catch(error){$('seminarSaveStatus').textContent=error.message||'Αποτυχία εισαγωγής.';}
 });
 window.addEventListener('hashchange',()=>{
  const id=location.hash.slice(1),next=COURSES.find(c=>c.id===id);
  if(next&&(!selected||selected.id!==id))openCourse(id,false);
  else if(!next&&selected)showHome();
 });
}
if(COURSES.length!==5||COURSES.some(c=>c.units?.length!==12||c.units.some(u=>u.length!==5)||MCQ[c.id]?.length!==12||MCQ[c.id].some(q=>q.length!==6||new Set(q.slice(1,5)).size!==4))){
 $('seminarCards').textContent='Το εκπαιδευτικό υλικό δεν φορτώθηκε πλήρως.';
}else{bind();showHome();}
})();
