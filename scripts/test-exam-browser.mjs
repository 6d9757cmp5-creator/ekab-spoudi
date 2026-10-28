/* Browser interaction smoke tests — simulated evaluation responses, no live account. */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
const read=path=>readFileSync(path,'utf8');
const sleep=t=>new Promise(resolve=>setTimeout(resolve,t));
async function wait(pred,label){for(let n=0;n<600;n++){if(pred())return;await sleep(10)}throw Error('Timeout: '+label)}
function open(page,scripts,data={}){
 const dom=new JSDOM(read(page),{url:'https://test.example/'+page,runScripts:'outside-only',pretendToBeVisual:true});
 const w=dom.window,d=w.document;
 w.confirm=()=>true;w.scrollTo=()=>{};
 w.HTMLElement.prototype.scrollIntoView=()=>{};
 w.matchMedia=()=>({matches:false,addEventListener(){},removeEventListener(){},addListener(){},removeListener(){}});
 w.requestAnimationFrame=callback=>w.setTimeout(callback,0);
 const nativeSetTimeout=w.setTimeout.bind(w);
 w.setTimeout=(fn,ms,...rest)=>nativeSetTimeout(fn,ms>=1100?10:ms,...rest);
 w.fetch=async path=>{
  const p=String(path).split('?')[0];
  return Object.hasOwn(data,p)?{ok:true,json:async()=>data[p]}:{ok:false,status:404,json:async()=>({})};
 };
 w.eval(read('ai-grading-client.js'));
 let verdict='correct',calls=[];
 const grader=w.EkabAIGrade;
 w.EkabAIGrade=Object.freeze({...grader,available:()=>true,evaluate:async input=>{
  calls.push(input);
  if(verdict==='fail')throw Error('Δοκιμαστική αποτυχία σύνδεσης');
  return{verdict,studentAnswer:input.answer,referenceAnswer:'Ενδεικτική σωστή απάντηση από ελεγχόμενη πηγή.',
    explanation:verdict==='uncertain'?'Δεν προκύπτει ασφαλές συμπέρασμα.':'Οι ενέργειες αξιολογούνται σε σωστή σειρά.',
    takeaway:'Πρώτα ασφάλεια και αρχική εκτίμηση.',criticalError:false,correctPoints:[],missingPoints:[]};
 }});
 for(const path of scripts)w.eval(read(path));
 return{dom,w,d,calls,setMode:value=>{verdict=value}};
}
const el=(d,k)=>{const node=d.getElementById(k);assert(node,'Missing '+k);return node};
function action(d,k){const e=el(d,k);assert(!e.disabled,'Disabled '+k);e.click();}
function answer(d,k,t){const e=el(d,k);assert(!e.readOnly&&!e.disabled,'Input locked: '+k);e.value=t;e.dispatchEvent(new d.defaultView.Event('input',{bubbles:true}))}
async function seminar(){
 const b=open('seminar-prep.html',['seminar-tracks.js','seminar-prep.js']);
 const d=b.d;
 assert.equal(d.querySelectorAll('.seminar-card').length,5);
 d.querySelector('.seminar-card .seminar-start').click();
 d.querySelector('[data-seminar-tab="quiz"]').click();
 let mc=0,wr=0;
 for(let i=0;i<10;i++){
  await wait(()=>!el(d,'seminarMixedQuestion').hidden,'seminar question');
  assert.match(el(d,'seminarQuestionCounter').textContent,new RegExp('Ερώτηση '+(i+1)+' / 10'));
  if(!el(d,'seminarMultipleBody').hidden){
   const radios=[...d.querySelectorAll('#seminarMCQChoices input')];
   assert.equal(radios.length,4);
   const picked=i%2?radios.find(e=>e.value==='0'):radios.find(e=>e.value!=='0');
   picked.checked=true;picked.dispatchEvent(new b.w.Event('change',{bubbles:true}));
   assert(radios.every(e=>e.disabled),'all MCQ options locked');
   assert.equal(d.querySelectorAll('.seminar-mcq-option.is-correct').length,1);
   if(picked.value!=='0')assert.equal(d.querySelectorAll('.seminar-mcq-option.is-incorrect').length,1);
   mc++;
   await wait(()=>!el(d,'seminarMixedResults').hidden||el(d,'seminarQuestionCounter').textContent.includes('Ερώτηση '+(i+2)+' / 10'),'MCQ automatic next');
  }else{
   wr++;b.setMode(wr===2?'uncertain':'correct');
   answer(d,'seminarQuestionNotes','Ελέγχω τη σκηνή, ζητώ βοήθεια και εκτιμώ την αναπνοή.');
   action(d,'seminarGradeAI');
   await wait(()=>el(d,'seminarQuestionNotes').readOnly&&!el(d,'seminarNextQuestion').hidden&&!el(d,'seminarNextQuestion').disabled,'written grading complete');
   assert.equal(el(d,'seminarGradeAI').disabled,true);
   assert.equal(el(d,'seminarNextQuestion').hidden,false);
   action(d,'seminarNextQuestion');
  }
 }
 assert.equal(mc,7);assert.equal(wr,3);
 assert.equal(el(d,'seminarMixedResults').hidden,false);
 assert.match(el(d,'seminarMixedBreakdown').textContent,/7.*3/);
 const stored=JSON.parse(b.w.localStorage.getItem('ekab.seminar-prep.local.v1'));
 assert.equal(Object.keys(stored.bls.mixedRun.responses).length,10);
 d.querySelector('[data-seminar-tab="oral"]').click();
 b.setMode('partial');
 answer(d,'seminarOralNotes','Ελέγχω ασφάλεια σκηνής, εκτιμώ τον ασθενή και καλώ βοήθεια.');
 action(d,'seminarScenarioSubmit');
 await wait(()=>el(d,'seminarOralNotes').readOnly&&el(d,'seminarScenarioSubmit').hidden,'clinical result complete');
 assert.equal(el(d,'seminarScenarioSubmit').hidden,true);
 assert.equal(el(d,'seminarScenarioResult').hidden,false);
 action(d,'seminarNextOral');
 assert.equal(el(d,'seminarOralNotes').readOnly,false);
 action(d,'seminarPrevOral');
 assert.equal(el(d,'seminarOralNotes').readOnly,true);
 b.dom.window.close();
 console.log('PASS SEMINARS: 7/3 test, red/green MCQ, auto-next, saved scores, locked written and clinical scenarios');
}
async function saek(){
 const b=open('saek-exams.html',['saek-exam-engine.js','saek-exams.js'],{'saek-exams-bank.json':JSON.parse(read('saek-exams-bank.json'))});
 const d=b.d;
 await wait(()=>!el(d,'examStart').disabled,'247 SAEK bank');
 assert.match(el(d,'examPoolInfo').textContent,/247/);
 action(d,'examStart');
 answer(d,'examDraft','Ελέγχω τον ασθενή και εφαρμόζω την ενδεικνυόμενη διαδικασία.');
 b.setMode('partial');action(d,'examCheckAI');
 await wait(()=>el(d,'examCheckAI').hidden,'graded SAEK');
 assert.equal(el(d,'examDraft').disabled,true);
 assert.equal(el(d,'examReference').hidden,false);
 action(d,'examNext');
 assert.equal(el(d,'examDraft').disabled,false);
 answer(d,'examDraft','Η απάντηση απαιτεί πρόσθετη αξιολόγηση.');
 b.setMode('uncertain');action(d,'examCheckAI');
 await wait(()=>el(d,'examCheckAI').hidden,'uncertain SAEK');
 assert.match(el(d,'examGradeState').textContent,/χωρίς βαθμολογία/);
 action(d,'examNext');
 answer(d,'examDraft','Η εκτίμηση είναι ασφαλής και οργανωμένη.');
 b.setMode('fail');action(d,'examCheckAI');
 await wait(()=>!el(d,'examDraft').disabled,'network error does not lock falsely');
 assert.equal(el(d,'examCheckAI').hidden,false);
 b.dom.window.close();
 console.log('PASS SAEK: 247-item bank, scoring, result, uncertain ungraded, next and safe network failure');
}
async function eoppep(){
 const rawBank=JSON.parse(read('official_questions.json'));
 const statusCounts={};for(const q of rawBank)statusCounts[q.answerStatus||'undefined']=(statusCounts[q.answerStatus||'undefined']||0)+1;
 console.log('EOPPEP bank status counts:',JSON.stringify(statusCounts));
 const b=open('theory.html',['study-scheduler.js','app.js'],{'official_questions.json':rawBank});
 const d=b.d;
 await wait(()=>el(d,'allCount').textContent==='314','314 EOPPEP bank');
 action(d,'openExam');
 el(d,'statusFilter').value='reviewed_educational';
 el(d,'statusFilter').dispatchEvent(new b.w.Event('input',{bubbles:true}));
 console.log('EOPPEP matching questions:',el(d,'matches').textContent,'selected status:',el(d,'statusFilter').value);
 action(d,'begin');
 console.log('EOPPEP after begin:',el(d,'qtitle').textContent.slice(0,100),'study hidden:',el(d,'study').classList.contains('hidden'));
 assert(el(d,'qtitle').textContent.length>6);
 answer(d,'draft','Εξετάζω την ασφάλεια σκηνής και ακολουθώ την ορθή διαδικασία.');
 b.setMode('incorrect');action(d,'eoppepGradeAI');
 await wait(()=>el(d,'draft').readOnly,'EOPPEP first lock');
 assert.equal(el(d,'eoppepGradeAI').hidden,true);
 assert.equal(el(d,'answerPanel').classList.contains('hidden'),false);
 const count=b.calls.length;el(d,'eoppepGradeAI').click();assert.equal(b.calls.length,count);
 action(d,'next');
 assert.equal(el(d,'draft').readOnly,false);
 answer(d,'draft','Δεν υπάρχουν αρκετά στοιχεία.');
 b.setMode('uncertain');action(d,'eoppepGradeAI');
 await wait(()=>el(d,'draft').readOnly,'EOPPEP uncertain lock');
 assert.match(el(d,'eoppepAIResult').textContent,/Χωρίς βαθμολογία/);
 action(d,'prev');assert.equal(el(d,'draft').readOnly,true);
 b.dom.window.close();
 console.log('PASS EOPPEP: 314-item bank, wrong/uncertain assessment, correct answer, no retries and navigation locks');
}
await seminar();await saek();await eoppep();
console.log('ALL THREE SIMULATED BROWSER FLOWS PASS; live authenticated Appwrite is separate.');
