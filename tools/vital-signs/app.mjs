/** Interactive first-release vital signs skill drills. Synthetic records only.
 * No personal data, diagnostic thresholds, external calls, or progress persistence.
 */
import {TOPICS,SOURCES,EXAMPLES,STRIPS,QUESTIONS,AVPU_EXERCISES,gradeAvpu,gradeTrend,annotateTemperature,ratePerMinute,getExample,changesFor,handoverText,topicQuestions,grade} from './core.mjs';
const $=id=>document.getElementById(id);
const create=(tag,cls,content)=>{
 const el=document.createElement(tag);if(cls)el.className=cls;
 if(content!==undefined)el.textContent=content;return el;
};
const names={pulse:'Σφυγμός',bp:'Αρτηριακή πίεση',resp:'Αναπνοές',spo2:'Οξυμετρία',temp:'Θερμοκρασία',conscious:'AVPU',trend:'Επανεκτίμηση'};
const requestedTopic=new URLSearchParams(location.search).get('topic');
const requestedIndex=TOPICS.findIndex(topic=>topic.id===requestedTopic);
let topicIndex=requestedIndex>=0?requestedIndex:0,exampleIndex=0,recordIndex=0;
const questionIndex=new Map(),answers=new Map(),stripIndex=new Map([['pulse',0],['resp',0]]);
const example=()=>EXAMPLES[exampleIndex];
const current=()=>example().records[recordIndex];
const clear=n=>n.replaceChildren();
const fmtDelta=n=>(n>0?'+':'')+n;
function updateScore(){
 const answered=[...answers.values()];
 const correct=[...answers.entries()].filter(([id,index])=>{const q=QUESTIONS.find(item=>item.id===id);return q&&q.correct===index;}).length;
 $('vs-score').textContent='Ορθές: '+correct+' / '+answered.length+' απαντημένες · '+12+' διαθέσιμες';
}

/** Educational signal motion only. The waveform shapes are synthetic and
 * must not be interpreted as physiological recordings or used diagnostically.
 * The displayed numbers are fixed to the selected synthetic observation. */
const reducedMotion=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
let traceActive=!reducedMotion;
let traceFrame=0,elapsedSeconds=0,lastFrameTime=0;
let bpFrame=0,bpStartedAt=0;
const wrapPhase=x=>((x%1)+1)%1;
const respiratoryShape=phase=>Math.sin(2*Math.PI*phase);
function plethShape(phase){
 if(phase<.2)return Math.pow(Math.sin(Math.PI*phase/.2),2);
 if(phase<.38)return .22*Math.pow(Math.sin(Math.PI*(phase-.2)/.18),2);
 return .075*Math.exp(-(phase-.38)*4);
}
function educationalPath(kind,rate,seconds){
 const baseline=kind==='pleth'?78:50;
 const verticalScale=kind==='pleth'?59:25;
 let path='';
 for(let x=0;x<=720;x+=3){
  const t=seconds-(720-x)/125;
  const phase=wrapPhase(t*rate/60);
  const y=baseline-verticalScale*(kind==='pleth'?plethShape(phase):respiratoryShape(phase));
  path+=(x===0?'M':'L')+x+' '+y.toFixed(2)+' ';
 }
 return path.trim();
}
function drawEducationalTraces(){
 const record=current();
 $('vs-pleth').querySelector('path').setAttribute('d',record.spo2Reliable?educationalPath('pleth',record.pulse,elapsedSeconds):'');
 $('vs-resp-trace').querySelector('path').setAttribute('d',educationalPath('resp',record.resp,elapsedSeconds));
 $('vs-wave-warning').hidden=record.spo2Reliable;
}
function nextTraceFrame(now){
 if(!traceActive){traceFrame=0;return;}
 if(!lastFrameTime)lastFrameTime=now;
 const delta=Math.min(Math.max((now-lastFrameTime)/1000,0),.12);
 if(delta>=.028){elapsedSeconds+=delta;drawEducationalTraces();lastFrameTime=now;}
 traceFrame=requestAnimationFrame(nextTraceFrame);
}
function setTraceActive(active){
 traceActive=Boolean(active);cancelAnimationFrame(traceFrame);traceFrame=0;lastFrameTime=0;
 const b=$('vs-animation-toggle');b.textContent=traceActive?'Παύση κίνησης':'Συνέχεια κίνησης';
 b.setAttribute('aria-pressed',String(traceActive));
 $('vs-wave-mode').textContent=traceActive?'Κίνηση εκπαιδευτικού σήματος · χωρίς κλινική πιστότητα':'Προβολή σε παύση · εκπαιδευτικό σήμα';
 drawEducationalTraces();
 if(traceActive)traceFrame=requestAnimationFrame(nextTraceFrame);
}
const steps=['practice','quiz','handover'];
function setStep(step){
 if(!steps.includes(step))return;
 $('vs-workspace').dataset.step=step;
 $('vs-observation-panel').hidden=step!=='practice';
 $('vs-exercise-panel').hidden=step!=='practice';
 $('vs-quiz-panel').hidden=step!=='quiz';
 $('vs-handover-panel').hidden=step!=='handover';
 document.querySelectorAll('[data-vs-step]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.vsStep===step)));
}
function resetBpDemo(){
 cancelAnimationFrame(bpFrame);bpFrame=0;
 $('vs-bp-start').disabled=false;$('vs-bp-fill').style.width='0%';
 $('vs-bp-state').textContent='Συνθετική επίδειξη — η καταγραφή πάνω είναι ήδη συμπληρωμένη.';
}
function runBpDemo(){
 resetBpDemo();
 const btn=$('vs-bp-start'),status=$('vs-bp-state'),fill=$('vs-bp-fill');
 const result=current().bp;
 if(reducedMotion){status.textContent='Επίδειξη ολοκληρώθηκε χωρίς κίνηση. Καταγραφή: '+result+' mmHg (συνθετική).';return;}
 btn.disabled=true;bpStartedAt=0;
 const progress=now=>{
  if(!bpStartedAt)bpStartedAt=now;
  const p=Math.min((now-bpStartedAt)/3500,1);
  fill.style.width=(p<.48?p/.48*100:(1-p)/.52*100).toFixed(1)+'%';
  status.textContent=p<.48?'Επίδειξη: σταδιακή διόγκωση περιχειρίδας…':p<1?'Επίδειξη: εκτόνωση και υπολογισμός καταγραφής…':'Ολοκληρώθηκε · '+result+' mmHg (συνθετικό αποτέλεσμα).';
  if(p<1)bpFrame=requestAnimationFrame(progress);
  else{bpFrame=0;btn.disabled=false;fill.style.width='0%';}
 };
 bpFrame=requestAnimationFrame(progress);
}
function renderMonitor(){
 const e=example(),r=current();
 $('vs-example').value=e.id;$('vs-example-note').textContent=e.note;
 for(const [key,val] of [['vs-time',r.time],['vs-hr',r.pulse],['vs-spo2',r.spo2],['vs-rr',r.resp],['vs-bp',r.bp],['vs-temp',r.temp],['vs-avpu',r.conscious]])$(key).textContent=String(val);
 $('vs-quality').dataset.reliable=String(r.spo2Reliable);
 $('vs-quality').textContent=r.spo2Reliable?'Ποιότητα εκπαιδευτικού σήματος: κατάλληλη για σύγκριση στο παράδειγμα':'ΠΡΟΣΟΧΗ: αμφίβολη ένδειξη SpO₂ — μην την παρουσιάζεις ως βέβαιη μέτρηση';
 $('vs-pleth').setAttribute('aria-label',r.spo2Reliable?'Κινούμενη σχηματική pleth: συνθετικό εκπαιδευτικό σήμα':'Αμφίβολο οξυμετρικό σήμα: χωρίς αξιολογήσιμη κυματομορφή');
 drawEducationalTraces();
 resetBpDemo();
 $('vs-record-position').textContent=(recordIndex+1)+' / '+e.records.length;
 $('vs-prev-record').disabled=recordIndex===0;
 $('vs-next-record').disabled=recordIndex>=e.records.length-1;
 $('vs-compare-result').hidden=true;
 $('vs-handover').textContent=handoverText(e);
 $('vs-copy-status').textContent='';
}
function renderComparison(){
 const e=example(),c=changesFor(e);
 const parts=['Διάστημα '+c.times[0]+' → '+c.times[1]+'.','Σφυγμός: '+fmtDelta(c.pulse)+'/min.','Αναπνοές: '+fmtDelta(c.resp)+'/min.','ΑΠ: '+c.bp+'.'];
 if(c.needSignalCheck)parts.push('SpO₂: δεν υπολογίζεται ασφαλής διαφορά επειδή η δεύτερη ένδειξη έχει δηλωμένο αμφίβολο σήμα.');
 else parts.push('SpO₂: '+fmtDelta(c.spo2)+' ποσοστιαίες μονάδες.');
 parts.push('Αυτό είναι περιγραφή συνθετικών αλλαγών, όχι κλινική αξιολόγηση.');
 $('vs-compare-result').textContent=parts.join(' ');
 $('vs-compare-result').hidden=false;
}
function renderNavigation(){
 const nav=$('vs-topic-nav');clear(nav);
 TOPICS.forEach((topic,i)=>{
  const btn=create('button','',topic.name);
  btn.type='button';btn.setAttribute('aria-current',String(i===topicIndex));
  btn.addEventListener('click',()=>{topicIndex=i;renderNavigation();renderTopic();});
  nav.append(btn);
 });
 const ecg=create('a','','〽️ Ηλεκτροκαρδιογράφημα');
 ecg.href='mentor-ecg.html';ecg.title='Άνοιξε το υπάρχον εργαστήριο ΗΚΓ';
 nav.append(ecg);
}
function stripPath(count){
 // Discrete, counting-focused marks. Each peak represents ONE synthetic event,
 // not an imported recording or a clinically validated respiratory/pulse trace.
 let d='M4 64';const span=704/count;
 for(let i=0;i<count;i++){
  const x=4+i*span;
  d+=' L'+(x+span*.18).toFixed(1)+' 64';
  d+=' Q'+(x+span*.31).toFixed(1)+' 18 '+(x+span*.48).toFixed(1)+' 45';
  d+=' Q'+(x+span*.60).toFixed(1)+' 69 '+(x+span*.81).toFixed(1)+' 64';
  d+=' L'+(x+span).toFixed(1)+' 64';
 }
 return d;
}
function renderCountTask(topic,root){
 const strips=STRIPS[topic],index=stripIndex.get(topic)||0,item=strips[index];
 const task=create('div','vs-task');const isResp=topic==='resp';
 task.append(create('h3','',isResp?'Μέτρησε τους αναπνευστικούς κύκλους':'Μέτρησε τους παλμούς'));
 task.append(create('p','',item.seconds+' δευτερόλεπτα συνθετικού τακτικού σήματος (αριθμητική άσκηση, όχι κλινική καταγραφή). Κάθε κορυφή αντιστοιχεί σε έναν κύκλο. Υπολόγισε συχνότητα ανά λεπτό.'));
 const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');
 svg.setAttribute('viewBox','0 0 720 95');svg.setAttribute('role','img');
 svg.setAttribute('aria-label','Εκπαιδευτική λωρίδα '+item.seconds+' δευτερολέπτων με κορυφές για καταμέτρηση');
 const path=document.createElementNS('http://www.w3.org/2000/svg','path');
 path.setAttribute('d',stripPath(item.beats));svg.append(path);task.append(svg);
 const row=create('div','vs-task-row');const inp=create('input');
 inp.type='number';inp.min='0';inp.max='300';inp.step='1';inp.id='vs-count-answer';inp.placeholder='/min';inp.setAttribute('aria-label','Υπολόγισε συχνότητα ανά λεπτό');
 const check=create('button','','Έλεγχος υπολογισμού');check.type='button';
 const next=create('button','','Άλλη λωρίδα');next.type='button';
 const status=create('p','vs-task-status');status.setAttribute('role','status');status.hidden=true;
 check.addEventListener('click',()=>{
  const expected=ratePerMinute(item.beats,item.seconds);
  const val=Number(inp.value);
  if(!inp.value.trim()||!Number.isInteger(val)||val<0){status.textContent='Γράψε έναν ακέραιο αριθμό συχνότητας ανά λεπτό.';}
  else status.textContent=val===expected?'Σωστά: '+item.beats+' × 60 / '+item.seconds+' = '+expected+'/min.':'Η αναλογία είναι '+item.beats+' × 60 / '+item.seconds+' = '+expected+'/min. Δοκίμασε ξανά με νέα λωρίδα.';
  status.hidden=false;
 });
 next.addEventListener('click',()=>{stripIndex.set(topic,(index+1)%strips.length);renderTask()});
 row.append(inp,check,next);task.append(row,status);root.append(task);
}
function renderBPTask(root){
 const task=create('div','vs-task');
 task.append(create('h3','','Έλεγχος τεχνικής μέτρησης ΑΠ'));
 task.append(create('p','','Επίλεξε μόνο τις ενέργειες που βοηθούν στην αξιοπιστία μιας τυπικής μέτρησης με περιχειρίδα.'));
 const rows=[
 ['Επιλέγω κατάλληλο μέγεθος περιχειρίδας',true],
 ['Τοποθετώ την περιχειρίδα πάνω από ρούχα',false],
 ['Στηρίζω τον βραχίονα στο ύψος της καρδιάς',true],
 ['Αφήνω το άτομο να μιλά κατά τη μέτρηση',false],
 ['Εξασφαλίζω ηρεμία και κατάλληλη θέση, εφόσον το επιτρέπουν οι συνθήκες',true],
 ['Καταγράφω την τιμή με μονάδα και χρόνο',true]
 ];
 const checks=[];
 for(const [labelText] of rows){
  const label=create('label');const input=create('input');input.type='checkbox';
  label.append(input,create('span','',labelText));task.append(label);checks.push(input);
 }
 const button=create('button','','Έλεγχος επιλογών');const status=create('p','vs-task-status');
 status.hidden=true;status.setAttribute('role','status');button.type='button';
 button.addEventListener('click',()=>{
  const wrong=rows.flatMap((r,i)=>r[1]!==checks[i].checked?[i+1]:[]);
  status.textContent=wrong.length?'Χρειάζεται διόρθωση στις επιλογές '+wrong.join(', ')+'. Χρησιμοποίησε τις εξηγήσεις της θεωρίας.':'Σωστά. Η κατάλληλη περιχειρίδα, η θέση, η ακινησία και η πλήρης καταγραφή είναι σημαντικά.';
  status.hidden=false;
 });
 task.append(button,status);root.append(task);
}
function renderSpo2Task(root){
 const task=create('div','vs-task');task.append(create('h3','','Πότε εμπιστευόμαστε ένα σήμα;'));
 const r=current();task.append(create('p','','Τρέχουσα συνθετική ένδειξη: '+r.spo2+'% ('+r.time+'). Ελέγχεις πρώτα την ποιότητα σήματος, όχι μόνο τον αριθμό.'));
 const row=create('div','vs-task-row');
 const good=create('button','','Αξιόπιστο σήμα στο παράδειγμα'),bad=create('button','','Αμφίβολο σήμα · απαιτεί έλεγχο');
 const status=create('p','vs-task-status');status.hidden=true;status.setAttribute('role','status');
 for(const [button,pick] of [[good,true],[bad,false]]){
  button.type='button';button.addEventListener('click',()=>{
   status.textContent=r.spo2Reliable===pick?'Σωστά. Αναφέρουμε πάντα την ποιότητα και τους περιορισμούς της μέτρησης.':'Η περιγραφή του φύλλου αναφέρει '+(r.spo2Reliable?'κατάλληλο':'αμφίβολο')+' σήμα. Επανέλεγξε το πρόβλημα πριν βγάλεις συμπέρασμα.';
   status.hidden=false;
  });
 }
 row.append(good,bad);task.append(row,status);root.append(task);
}

let avpuIndex=0;
function renderSimpleTask(topic,root){
 const task=create('div','vs-task'),status=create('p','vs-task-status');
 status.hidden=true;status.setAttribute('role','status');
 if(topic==='temp'){
  const r=example().records[0];
  task.append(create('h3','','Πλήρης καταγραφή χωρίς αυθαίρετα στοιχεία'));
  task.append(create('p','','Στις '+r.time+' καταγράφηκαν '+r.temp+' °C. Η μέθοδος μέτρησης δεν έχει καταχωριστεί. Τι θα αναφέρεις;'));
  const label=create('label','vs-select-label','Μέθοδος στην αναφορά');
  const sel=create('select');sel.setAttribute('aria-label','Μέθοδος καταγραφής θερμοκρασίας');
  for(const [id,name] of [['','— Επιλογή —'],['tympanic','Τυμπανική'],['axillary','Μασχαλιαία'],['unknown','Μη καταγεγραμμένη']]){
   const opt=create('option','',name);opt.value=id;sel.append(opt);
  }
  label.append(sel);task.append(label);
  const btn=create('button','','Έλεγξε την καταγραφή');btn.type='button';
  btn.addEventListener('click',()=>{
   if(!sel.value){status.textContent='Επίλεξε τι θα καταγράψεις.';status.hidden=false;return;}
   const answer=annotateTemperature(example(),sel.value);
   status.textContent=(answer.correct?'Σωστά. ':'Χρειάζεται διόρθωση. ')+answer.text+'. '+answer.explain;
   status.hidden=false;
  });
  task.append(btn,status);
 }
 if(topic==='conscious'){
  const caseItem=AVPU_EXERCISES[avpuIndex];
  task.append(create('h3','','Αναγνώριση AVPU από καταγεγραμμένη παρατήρηση'));
  task.append(create('p','',caseItem.observation));
  const row=create('div','vs-task-row');
  for(const val of ['A','V','P','U']){
   const btn=create('button','',val);btn.type='button';btn.setAttribute('aria-label','Επιλογή '+val+' κατά AVPU');
   btn.addEventListener('click',()=>{
    const ans=gradeAvpu(caseItem.id,val);
    status.textContent=(ans.correct?'Σωστά. ':'Χρειάζεται διόρθωση. ')+ans.explain;status.hidden=false;
   });row.append(btn);
  }
  task.append(row,status);
  const next=create('button','','Άλλη παρατήρηση');next.type='button';
  next.addEventListener('click',()=>{avpuIndex=(avpuIndex+1)%AVPU_EXERCISES.length;renderTask()});
  task.append(next,create('p','vs-hint','Μόνο αναγνώριση περιγραφών· όχι εφαρμογή επώδυνων ερεθισμάτων.'));
 }
 if(topic==='trend'){
  const ex=example(),r1=ex.records[0],r2=ex.records.at(-1);
  task.append(create('h3','','Υπολόγισε και τεκμηρίωσε την πραγματική μεταβολή τιμών του φύλλου'));
  task.append(create('p','',r1.time+' → '+r2.time+': σφυγμός '+r1.pulse+' → '+r2.pulse+'/min, αναπνοές '+r1.resp+' → '+r2.resp+'/min. Γράψε τη διαφορά με πρόσημο.'));
  const row=create('div','vs-task-row');
  const lp=create('label','vs-inline-label','Μεταβολή σφυγμού /min');
  const pr=create('input');pr.type='number';pr.step='1';pr.setAttribute('aria-label','Αριθμητική διαφορά σφυγμού');
  const lr=create('label','vs-inline-label','Μεταβολή αναπνοών /min');
  const rr=create('input');rr.type='number';rr.step='1';rr.setAttribute('aria-label','Αριθμητική διαφορά αναπνοών');
  lp.append(pr);lr.append(rr);row.append(lp,lr);task.append(row);
  const qual=create('label','vs-uncertainty');
  const flag=create('input');flag.type='checkbox';
  qual.append(flag,create('span','','Η δεύτερη τιμή SpO₂ έχει αμφίβολο σήμα.'));
  task.append(qual);
  const btn=create('button','','Έλεγξε τις μεταβολές');btn.type='button';
  btn.addEventListener('click',()=>{
   if(!pr.value.trim()||!rr.value.trim()||!Number.isInteger(Number(pr.value))||!Number.isInteger(Number(rr.value))){
    status.textContent='Συμπλήρωσε τις δύο αριθμητικές διαφορές.';status.hidden=false;return;
   }
   const ans=gradeTrend(ex,Number(pr.value),Number(rr.value),flag.checked);
   status.textContent=(ans.correct?'Σωστά. ':'Χρειάζεται διόρθωση. ')+
    'Σφυγμός '+ans.expectedPulse+'/min, αναπνοές '+ans.expectedResp+
    '/min. '+(ans.needSignalCheck?'Η μεταβολή SpO₂ δεν υπολογίζεται ως αξιόπιστη.':'Το σήμα SpO₂ είναι κατάλληλο για σύγκριση μόνο στο παράδειγμα.');
   status.hidden=false;
  });
  task.append(btn,status);
 }
 root.append(task);
}

function renderTask(){
 const topic=TOPICS[topicIndex],root=$('vs-interaction');clear(root);
 if(topic.id==='pulse'||topic.id==='resp')renderCountTask(topic.id,root);
 else if(topic.id==='bp')renderBPTask(root);
 else if(topic.id==='spo2')renderSpo2Task(root);
 else renderSimpleTask(topic.id,root);
}
function renderQuestion(){
 const topic=TOPICS[topicIndex],items=topicQuestions(topic.id);
 const offset=questionIndex.get(topic.id)||0,q=items[offset%items.length];
 $('vs-question').textContent=q.question;
 const choices=$('vs-choices'),feedback=$('vs-feedback');clear(choices);clear(feedback);
 const existing=answers.get(q.id);
 q.choices.forEach((label,i)=>{
  const button=create('button','',String.fromCharCode(65+i)+'. '+label);
  button.type='button';
  if(existing!==undefined){button.disabled=true;if(i===q.correct)button.classList.add('vs-right');else if(i===existing)button.classList.add('vs-wrong');}
  else button.addEventListener('click',()=>{
   answers.set(q.id,i);updateScore();renderQuestion();
  });
  choices.append(button);
 });
 if(existing!==undefined){
  const result=grade(q.id,existing);
  feedback.className='vs-feedback';
  feedback.textContent=(result.correct?'Σωστή απάντηση. ':'Χρειάζεται επανάληψη. ')+result.explain;
 }
 $('vs-next-question').disabled=items.length<2;
}
function renderTopic(){
 const t=TOPICS[topicIndex];
 $('vs-workspace').dataset.topic=t.id;
 $('vs-monitor').dataset.focus=t.id;
 $('vs-bp-demo').hidden=t.id!=='bp';
 setStep('practice');
 $('vs-exercise-heading').textContent=t.name;
 $('vs-topic-hint').textContent=t.hint;
 $('vs-topic-number').textContent=(topicIndex+1)+' / '+TOPICS.length;
 renderTask();renderQuestion();
}
function renderSourceList(){
 const ul=$('vs-source-list');clear(ul);
 for(const s of SOURCES){
  const li=create('li'),a=create('a','',s.name);a.href=s.url;a.target='_blank';a.rel='noopener noreferrer';
  li.append(a);ul.append(li);
 }
 const li=create('li'),a=create('a','','Α΄ εξάμηνο · Ζωτικά σημεία (ΣΑΕΚ)');
 a.href='saek-course-05.html#lesson-11';li.append(a);ul.append(li);
}
$('vs-example').addEventListener('change',e=>{
 const next=EXAMPLES.findIndex(x=>x.id===e.target.value);
 if(next<0)return;exampleIndex=next;recordIndex=0;renderMonitor();
 if(['spo2','temp','trend'].includes(TOPICS[topicIndex].id))renderTask();
});
$('vs-prev-record').addEventListener('click',()=>{recordIndex=Math.max(0,recordIndex-1);renderMonitor();if(['spo2','temp','trend'].includes(TOPICS[topicIndex].id))renderTask()});
$('vs-next-record').addEventListener('click',()=>{recordIndex=Math.min(example().records.length-1,recordIndex+1);renderMonitor();if(['spo2','temp','trend'].includes(TOPICS[topicIndex].id))renderTask()});
$('vs-compare').addEventListener('click',renderComparison);
$('vs-next-question').addEventListener('click',()=>{const t=TOPICS[topicIndex].id;questionIndex.set(t,((questionIndex.get(t)||0)+1)%topicQuestions(t).length);renderQuestion()});
$('vs-reset').addEventListener('click',()=>{answers.clear();questionIndex.clear();stripIndex.set('pulse',0);stripIndex.set('resp',0);updateScore();renderTopic()});
$('vs-copy').addEventListener('click',async()=>{
 const content=handoverText(example()),status=$('vs-copy-status');
 try{if(!navigator.clipboard?.writeText)throw Error('clipboard unavailable');await navigator.clipboard.writeText(content);status.textContent='Η εκπαιδευτική καταγραφή αντιγράφηκε.';}
 catch{status.textContent='Η αντιγραφή δεν υποστηρίζεται εδώ. Επίλεξε το κείμενο της καταγραφής και αντέγραψέ το χειροκίνητα.';}
});
document.querySelectorAll('[data-vs-step]').forEach(btn=>btn.addEventListener('click',()=>setStep(btn.dataset.vsStep)));
$('vs-animation-toggle').addEventListener('click',()=>setTraceActive(!traceActive));
$('vs-bp-start').addEventListener('click',runBpDemo);
document.addEventListener('visibilitychange',()=>{if(document.hidden)setTraceActive(false);});
renderNavigation();renderMonitor();renderTopic();renderSourceList();updateScore();setTraceActive(traceActive);
