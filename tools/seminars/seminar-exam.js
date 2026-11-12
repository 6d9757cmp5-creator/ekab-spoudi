/* ΕΚΑΒ Σπουδή — seminar practice exam: a timed written test with no feedback until the end,
 * and a step-by-step practical scenario debriefed at the end, as in the real courses.
 * Results stay on this device under their own key; seminar study progress is not touched. */
(function(){
'use strict';
const EXAM=window.EkabSeminarExam||{},MCQ=window.EkabSeminarMCQ||{};
const STORE='ekab.seminar-exam.v1';
const QUESTIONS=20,SECONDS_PER_QUESTION=60,TARGET=80;
const $=id=>document.getElementById(id);
const make=(tag,cls,txt)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(txt!==undefined)e.textContent=txt;return e;};
const shuffle=items=>{const a=Array.from(items);for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;};
let course=null,state=null,timer=null;

function history(){try{const v=JSON.parse(localStorage.getItem(STORE)||'{}');return v&&typeof v==='object'&&!Array.isArray(v)?v:{};}catch{return {};}}
function record(kind,result){
 const all=history(),mine=all[course.id]&&typeof all[course.id]==='object'?all[course.id]:{};
 mine[kind]=[{...result,at:Date.now()},...(Array.isArray(mine[kind])?mine[kind]:[])].slice(0,10);
 all[course.id]=mine;
 try{localStorage.setItem(STORE,JSON.stringify(all));}catch{/* The result is still shown; only the history is lost. */}
}
function lastLine(kind){
 const last=history()[course.id]?.[kind]?.[0];
 if(!last)return 'Δεν έχεις δώσει ακόμη.';
 return 'Τελευταία φορά: '+last.score+'/'+last.total+' ('+Math.round(100*last.score/last.total)+'%)'+(kind==='scenario'&&last.critical?' · κρίσιμα λάθη: '+last.critical:'')+'.';
}
function stopTimer(){if(timer){clearInterval(timer);timer=null;}}
function root(){const r=$('seminarExam');r.replaceChildren();return r;}

function home(){
 stopTimer();state=null;
 const exam=EXAM[course.id],r=root();
 const intro=make('div','panel seminar-exam-intro');
 intro.append(make('h3',null,'Δοκιμαστική εξέταση '+course.name),make('p',null,exam.format),
  make('p','small muted','Οι ερωτήσεις γράφτηκαν για την εφαρμογή από τις οδηγίες· δεν είναι οι επίσημες ερωτήσεις του σεμιναρίου και δεν αποτελούν πιστοποίηση. Το όριο επιτυχίας το ορίζει το κέντρο εκπαίδευσης· εδώ στόχος εξάσκησης είναι '+TARGET+'%.'));
 const written=make('section','panel seminar-exam-card');
 const startWritten=make('button','btn','Ξεκίνα γραπτό τεστ');startWritten.type='button';startWritten.dataset.examStart='written';
 startWritten.addEventListener('click',startWrittenExam);
 written.append(make('h4',null,'Γραπτό τεστ'),make('p',null,QUESTIONS+' ερωτήσεις πολλαπλής επιλογής, '+QUESTIONS+' λεπτά. Τα αποτελέσματα φαίνονται μόνο στο τέλος, όπως στην πραγματική εξέταση.'),make('p','small muted',lastLine('written')),startWritten);
 const practical=make('section','panel seminar-exam-card');
 const startScenario=make('button','btn','Ξεκίνα πρακτικό σενάριο');startScenario.type='button';startScenario.dataset.examStart='scenario';
 startScenario.addEventListener('click',startScenarioExam);
 practical.append(make('h4',null,exam.scenario.title),make('p',null,'Βήμα-βήμα αποφάσεις σε πραγματικό χρόνο. Η αξιολόγηση και τα κρίσιμα λάθη φαίνονται στο τέλος.'),make('p','small muted',lastLine('scenario')),startScenario);
 r.append(intro,written,practical);
}

function startWrittenExam(){
 const exam=EXAM[course.id];
 const bank=[...(MCQ[course.id]||[]),...exam.written];
 const items=shuffle(bank).slice(0,QUESTIONS).map(q=>({q,order:shuffle([0,1,2,3]),choice:null}));
 state={kind:'written',items,pos:0,deadline:Date.now()+items.length*SECONDS_PER_QUESTION*1000};
 timer=setInterval(()=>{if(state?.kind!=='written')return stopTimer();paintClock();if(Date.now()>=state.deadline)finishWritten(true);},1000);
 renderQuestion();
}
function paintClock(){
 const el=$('seminarExamClock');if(!el)return;
 const left=Math.max(0,Math.round((state.deadline-Date.now())/1000));
 el.textContent='⏱ '+Math.floor(left/60)+':'+String(left%60).padStart(2,'0');
 el.classList.toggle('is-low',left<120);
}
function renderQuestion(){
 const r=root(),item=state.items[state.pos],q=item.q;
 const box=make('section','panel seminar-practice seminar-exam-run');
 const head=make('div','seminar-exam-head');
 const clock=make('span','seminar-exam-clock');clock.id='seminarExamClock';clock.setAttribute('role','timer');
 head.append(make('span',null,'Ερώτηση '+(state.pos+1)+' από '+state.items.length),clock);
 const answered=state.items.filter(i=>i.choice!==null).length;
 const bar=make('div','seminar-exam-bar');const fill=make('span');fill.style.width=Math.round(100*answered/state.items.length)+'%';bar.append(fill);
 box.append(head,bar,make('h3',null,q[0]));
 const choices=make('div','seminar-exam-choices');
 item.order.forEach((original,j)=>{
  const label=make('label','seminar-mcq-option');
  const radio=make('input');radio.type='radio';radio.name='seminarExamAnswer';radio.value=String(original);radio.checked=item.choice===original;
  radio.addEventListener('change',()=>{item.choice=original;fill.style.width=Math.round(100*state.items.filter(i=>i.choice!==null).length/state.items.length)+'%';});
  label.append(radio,make('span','seminar-mcq-label',String.fromCharCode(913+j)+'. '+q[original+1]));
  choices.append(label);
 });
 const nav=make('div','seminar-practice-actions');
 const prev=make('button','btn compact ghost','Προηγούμενη');prev.type='button';prev.disabled=state.pos===0;
 prev.addEventListener('click',()=>{state.pos--;renderQuestion();});
 const last=state.pos===state.items.length-1;
 const next=make('button','btn compact',last?'Υποβολή τεστ':'Επόμενη');next.type='button';next.dataset.examNext='';
 next.addEventListener('click',()=>{
  if(!last){state.pos++;renderQuestion();return;}
  const blank=state.items.filter(i=>i.choice===null).length;
  if(blank&&!confirm('Έχεις '+blank+' αναπάντητες ερωτήσεις. Υποβολή;'))return;
  finishWritten(false);
 });
 const quit=make('button','btn compact ghost','Διακοπή');quit.type='button';quit.addEventListener('click',()=>{if(confirm('Διακοπή του τεστ χωρίς αποτέλεσμα;'))home();});
 nav.append(prev,next,quit);
 box.append(choices,nav);r.append(box);paintClock();
}
function finishWritten(timeUp){
 stopTimer();
 const items=state.items,score=items.filter(i=>i.choice===0).length,total=items.length,pct=Math.round(100*score/total);
 record('written',{score,total});
 const r=root(),box=make('section','panel seminar-practice seminar-exam-result');
 box.append(make('h3',null,(timeUp?'Τέλος χρόνου. ':'')+'Αποτέλεσμα: '+score+'/'+total+' ('+pct+'%)'),
  make('p','seminar-exam-verdict '+(pct>=TARGET?'is-pass':'is-fail'),pct>=TARGET?'✓ Πάνω από τον στόχο εξάσκησης '+TARGET+'%.':'✗ Κάτω από τον στόχο εξάσκησης '+TARGET+'%. Ξαναδιάβασε τις θεματικές παρακάτω.'));
 const wrong=items.filter(i=>i.choice!==0);
 if(wrong.length){
  box.append(make('h4',null,'Ερωτήσεις για επανάληψη'));
  const list=make('ol','seminar-exam-review');
  for(const i of wrong){
   const li=make('li');
   li.append(make('strong',null,i.q[0]),make('p',null,'Η απάντησή σου: '+(i.choice===null?'καμία':i.q[i.choice+1])),make('p','is-correct','Σωστή: '+i.q[1]),make('p','small muted',i.q[5]));
   list.append(li);
  }
  box.append(list);
 }
 const again=make('button','btn','Νέο τεστ');again.type='button';again.addEventListener('click',startWrittenExam);
 const back=make('button','btn secondary','Πίσω στην εξέταση');back.type='button';back.addEventListener('click',home);
 const nav=make('div','seminar-practice-actions');nav.append(again,back);box.append(nav);
 state=null;r.append(box);window.scrollTo({top:0,behavior:'instant'});
}

function startScenarioExam(){
 stopTimer();
 state={kind:'scenario',steps:EXAM[course.id].scenario.steps.map(s=>({s,order:shuffle(s.options.map((_,i)=>i)),choice:null})),pos:0};
 renderStep();
}
function renderStep(){
 const sc=EXAM[course.id].scenario,item=state.steps[state.pos],r=root();
 const box=make('section','panel seminar-practice seminar-exam-run');
 const head=make('div','seminar-exam-head');head.append(make('span',null,'Βήμα '+(state.pos+1)+' από '+state.steps.length));
 box.append(head,make('h3',null,sc.title));
 if(state.pos===0)box.append(make('p','seminar-exam-scene',sc.intro));
 box.append(make('p','seminar-exam-situation',item.s.situation));
 const choices=make('div','seminar-exam-choices');
 const next=make('button','btn compact',state.pos===state.steps.length-1?'Τέλος σεναρίου':'Επόμενο βήμα');next.type='button';next.disabled=item.choice===null;next.dataset.examNext='';
 item.order.forEach((original,j)=>{
  const label=make('label','seminar-mcq-option');
  const radio=make('input');radio.type='radio';radio.name='seminarExamStep';radio.value=String(original);radio.checked=item.choice===original;
  radio.addEventListener('change',()=>{item.choice=original;next.disabled=false;});
  label.append(radio,make('span','seminar-mcq-label',String.fromCharCode(913+j)+'. '+item.s.options[original][0]));
  choices.append(label);
 });
 next.addEventListener('click',()=>{if(item.choice===null)return;if(state.pos<state.steps.length-1){state.pos++;renderStep();}else finishScenario();});
 const quit=make('button','btn compact ghost','Διακοπή');quit.type='button';quit.addEventListener('click',()=>{if(confirm('Διακοπή του σεναρίου χωρίς αποτέλεσμα;'))home();});
 const nav=make('div','seminar-practice-actions');nav.append(next,quit);
 box.append(choices,nav);r.append(box);
}
function finishScenario(){
 const steps=state.steps,total=steps.length;
 const picked=steps.map(i=>i.s.options[i.choice]);
 const score=picked.filter(o=>o[1]).length,critical=picked.filter(o=>!o[1]&&o[3]).length;
 record('scenario',{score,total,critical});
 const r=root(),box=make('section','panel seminar-practice seminar-exam-result');
 const passed=!critical&&score===total;
 box.append(make('h3',null,'Αξιολόγηση σεναρίου: '+score+'/'+total+' σωστά βήματα'),
  make('p','seminar-exam-verdict '+(passed?'is-pass':'is-fail'),passed?'✓ Όλα τα βήματα σωστά, χωρίς κρίσιμο λάθος.':critical?'✗ '+critical+' κρίσιμα λάθη: στην πραγματική αξιολόγηση ένα κρίσιμο λάθος συνήθως σημαίνει επανάληψη.':'Χωρίς κρίσιμο λάθος, αλλά με βήματα για βελτίωση.'));
 const list=make('ol','seminar-exam-review');
 steps.forEach((i,n)=>{
  const o=picked[n],li=make('li',o[1]?'is-right':'is-wrong');
  li.append(make('strong',null,i.s.situation),make('p',null,(o[1]?'✓ ':(o[3]?'✗ Κρίσιμο λάθος: ':'✗ '))+o[0]),make('p','small muted',o[2]));
  if(!o[1])li.append(make('p','is-correct','Σωστή ενέργεια: '+i.s.options.find(x=>x[1])[0]));
  list.append(li);
 });
 box.append(list);
 const again=make('button','btn','Ξανά το σενάριο');again.type='button';again.addEventListener('click',startScenarioExam);
 const back=make('button','btn secondary','Πίσω στην εξέταση');back.type='button';back.addEventListener('click',home);
 const nav=make('div','seminar-practice-actions');nav.append(again,back);box.append(nav);
 state=null;r.append(box);window.scrollTo({top:0,behavior:'instant'});
}

window.EkabSeminarExamUI={
 // Called by the seminar page when the exam tab opens; an exam in progress for the same course is kept.
 open(selected){
  if(!selected||!EXAM[selected.id]||!$('seminarExam'))return;
  if(state&&course?.id===selected.id)return;
  course=selected;home();
 },
 close(){stopTimer();state=null;course=null;}
};
})();
