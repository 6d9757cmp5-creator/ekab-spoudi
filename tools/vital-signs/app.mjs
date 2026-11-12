/** Interactive first-release vital signs skill drills. Synthetic records only.
 * No personal data, diagnostic thresholds, external calls, or progress persistence.
 */
import {TOPICS,SOURCES,EXAMPLES,STRIPS,ratePerMinute,getExample,changesFor,handoverText,topicQuestions,grade} from './core.mjs';
const $=id=>document.getElementById(id);
const create=(tag,cls,content)=>{
 const el=document.createElement(tag);if(cls)el.className=cls;
 if(content!==undefined)el.textContent=content;return el;
};
const names={pulse:'Σφυγμός',bp:'Αρτηριακή πίεση',resp:'Αναπνοές',spo2:'Οξυμετρία',temp:'Θερμοκρασία',conscious:'AVPU',trend:'Επανεκτίμηση'};
let topicIndex=0,exampleIndex=0,recordIndex=0;
const questionIndex=new Map(),answers=new Map(),stripIndex=new Map([['pulse',0],['resp',0]]);
const example=()=>EXAMPLES[exampleIndex];
const current=()=>example().records[recordIndex];
const clear=n=>n.replaceChildren();
const fmtDelta=n=>(n>0?'+':'')+n;
function updateScore(){
 const answered=[...answers.values()];
 const correct=answered.filter(x=>x===true).length;
 $('vs-score').textContent='Ορθές: '+correct+' / '+answered.length+' απαντημένες · '+12+' διαθέσιμες';
}
function wavePath(){
 // Pleth-like visual shape, deliberately NOT a faithful medical waveform.
 let d='M0 61';
 for(let i=0;i<6;i++){
  const x=i*120;
  d+=' L'+(x+13)+' 61 Q'+(x+22)+' 57 '+(x+31)+' 60';
  d+=' Q'+(x+38)+' 64 '+(x+44)+' 50';
  d+=' Q'+(x+52)+' 7 '+(x+61)+' 35';
  d+=' Q'+(x+67)+' 48 '+(x+76)+' 49';
  d+=' Q'+(x+87)+' 50 '+(x+93)+' 61 L'+(x+120)+' 61';
 }
 return d;
}
function renderMonitor(){
 const e=example(),r=current();
 $('vs-example').value=e.id;$('vs-example-note').textContent=e.note;
 for(const [key,val] of [['vs-time',r.time],['vs-hr',r.pulse],['vs-spo2',r.spo2],['vs-rr',r.resp],['vs-bp',r.bp],['vs-temp',r.temp],['vs-avpu',r.conscious]])$(key).textContent=String(val);
 $('vs-quality').dataset.reliable=String(r.spo2Reliable);
 $('vs-quality').textContent=r.spo2Reliable?'Ποιότητα εκπαιδευτικού σήματος: κατάλληλη για σύγκριση στο παράδειγμα':'ΠΡΟΣΟΧΗ: αμφίβολη ένδειξη SpO₂ — μην την παρουσιάζεις ως βέβαιη μέτρηση';
 $('vs-pleth').querySelector('path').setAttribute('d',wavePath());
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
 task.append(create('p','',item.seconds+' δευτερόλεπτα συνθετικού σήματος. Κάθε κορυφή αντιστοιχεί σε έναν κύκλο. Υπολόγισε συχνότητα ανά λεπτό.'));
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
function renderSimpleTask(topic,root){
 const task=create('div','vs-task');
 const details={
  temp:['Τεκμηρίωση θερμομέτρησης','Η τιμή θερμοκρασίας δεν αρκεί μόνη της: γράψε και μέθοδο/θέση, μονάδα και ώρα.','Παράδειγμα: 36,8 °C · μέθοδος: [συμπληρώνεται] · 09:00.'],
  conscious:['Περιγραφή επιπέδου ανταπόκρισης','AVPU = A (Alert), V (Voice), P (Pain), U (Unresponsive). Χρησιμοποίησε τις έννοιες μόνο ως περιγραφή παρατήρησης.','Στο φύλλο Γ το A στις 14:00 γίνεται V στις 14:12. Κατέγραψε τη μεταβολή με ώρα.'],
  trend:['Διαδοχικές καταγραφές και παράδοση','Χρησιμοποίησε το επάνω κουμπί σύγκρισης: διαφορές σφυγμού και αναπνοών, ποιοτική σημείωση του SpO₂, ακριβής ώρα.','Έπειτα διάβασε την εκπαιδευτική αναφορά και άνοιξε το υπάρχον εργαστήριο προφορικής παράδοσης.']
 }[topic];
 task.append(create('h3','',details[0]),create('p','',details[1]));
 task.append(create('p','vs-task-status',details[2]));
 if(topic==='trend'){
  const button=create('button','','Εμφάνισε τη σύγκριση του φύλλου');button.type='button';
  button.addEventListener('click',()=>{renderComparison();$('vs-compare-result').scrollIntoView({block:'nearest'});});
  task.append(button);
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
 if(TOPICS[topicIndex].id==='spo2')renderTask();
});
$('vs-prev-record').addEventListener('click',()=>{recordIndex=Math.max(0,recordIndex-1);renderMonitor();if(TOPICS[topicIndex].id==='spo2')renderTask()});
$('vs-next-record').addEventListener('click',()=>{recordIndex=Math.min(example().records.length-1,recordIndex+1);renderMonitor();if(TOPICS[topicIndex].id==='spo2')renderTask()});
$('vs-compare').addEventListener('click',renderComparison);
$('vs-next-question').addEventListener('click',()=>{const t=TOPICS[topicIndex].id;questionIndex.set(t,((questionIndex.get(t)||0)+1)%topicQuestions(t).length);renderQuestion()});
$('vs-reset').addEventListener('click',()=>{answers.clear();questionIndex.clear();stripIndex.set('pulse',0);stripIndex.set('resp',0);updateScore();renderTopic()});
$('vs-copy').addEventListener('click',async()=>{
 const content=handoverText(example()),status=$('vs-copy-status');
 try{if(!navigator.clipboard?.writeText)throw Error('clipboard unavailable');await navigator.clipboard.writeText(content);status.textContent='Η εκπαιδευτική καταγραφή αντιγράφηκε.';}
 catch{status.textContent='Η αντιγραφή δεν υποστηρίζεται εδώ. Επίλεξε το κείμενο της καταγραφής και αντέγραψέ το χειροκίνητα.';}
});
renderNavigation();renderMonitor();renderTopic();renderSourceList();updateScore();
