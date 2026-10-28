/* ΕΚΑΒ Σπουδή — SAEK adaptive exams. Dedicated local store; original lessons untouched. */
(function(){
'use strict';
const E=window.EkabSaekExamEngine,KEY='ekab.saek.exams.v1';
const $=id=>document.getElementById(id);
const state=(()=>{try{const saved=JSON.parse(localStorage.getItem(KEY)||'{}');return{history:saved.history&&typeof saved.history==='object'&&!Array.isArray(saved.history)?saved.history:{},runs:Array.isArray(saved.runs)?saved.runs.slice(-30):[],active:saved.active&&typeof saved.active==='object'?saved.active:null};}catch{return{history:{},runs:[],active:null}}})();
let bank=[],byId=new Map(),requestPending=false;
const help=$('examStorageStatus');
function save(){try{localStorage.setItem(KEY,JSON.stringify(state));help.textContent='Η πρόοδος εξετάσεων αποθηκεύτηκε.';}catch{help.textContent='Δεν ήταν δυνατή η αποθήκευση προόδου στη συσκευή.';}}
function scope(semester,courseId){return E.scoped(bank,semester,courseId);}
function coursesMenu(){
 const semester=$('examSemester').value,select=$('examCourse'),previous=select.value;
 const courses=[...new Map(bank.filter(q=>semester==='all'||q.semester===semester).map(q=>[q.courseId,q.course])).entries()].sort((a,b)=>a[0].localeCompare(b[0]));
 select.replaceChildren();const all=document.createElement('option');all.value='all';all.textContent='Όλα τα μαθήματα';select.append(all);
 for(const [id,title] of courses){const opt=document.createElement('option');opt.value=id;opt.textContent=title;select.append(opt)}
 select.value=courses.some(x=>x[0]===previous)?previous:'all';
 updateSetup();
}
function updateSetup(){
 const qs=scope($('examSemester').value,$('examCourse').value),stats=E.getLevel(state.history,qs);
 const estimate=stats.total<8?'Αρχικό · ανεπαρκή δεδομένα':'Εκτίμηση: '+stats.label+' · '+Math.round(stats.ratio*100)+'% σε '+stats.total+' προσπάθειες';
 $('examLevel').textContent=estimate;
 $('examPoolInfo').textContent=qs.length+' διαθέσιμες ερωτήσεις από πραγματικά κεφάλαια ΣΑΕΚ'+(qs.length<Number($('examCount').value)?' · η εξέταση θα περιέχει '+qs.length+' ερωτήσεις':'')+'.';
 $('examStart').disabled=qs.length===0||requestPending;
 $('examResume').hidden=!state.active||!Array.isArray(state.active.steps)||!state.active.steps.length;
}
function openView(name){
 for(const id of ['examSetup','examLive','examResults'])$(id).hidden=id!==name;
 window.scrollTo({top:0,behavior:'instant'});
}
function makeStep(){
 const a=state.active,qs=scope(a.semester,a.courseId),used=new Set(a.steps.map(s=>s.id));
 const target=a.mode==='adaptive'?E.getLevel(state.history,qs).level:Number(a.mode);
 const q=E.choose(qs,used,state.history,target);
 if(!q)return false;
 a.steps.push({id:q.id,draft:'',grade:null,method:null,revealed:false,feedback:null,levelAtSelection:target});
 return true;
}
function start(){
 if(requestPending)return;
 const semester=$('examSemester').value,courseId=$('examCourse').value,available=scope(semester,courseId);
 if(!available.length)return;
 if(state.active&&state.active.steps?.length&&!confirm('Υπάρχει ανολοκλήρωτη εξέταση. Να αντικατασταθεί μόνο η τρέχουσα εξέταση; Η προηγούμενη ιστορία επιδόσεων διατηρείται.'))return;
 state.active={id:'exam-'+Date.now()+'-'+Math.random().toString(36).slice(2,9),startedAt:Date.now(),semester,courseId,mode:$('examMode').value,total:Math.min(Number($('examCount').value),available.length),steps:[],index:0};
 makeStep();save();openView('examLive');renderQuestion();
}
function validSession(){
 const a=state.active;
 if(!a||!Array.isArray(a.steps)||!a.steps.length||!Number.isInteger(a.index))return false;
 if(!Number.isInteger(a.total)||a.total<1||a.total>30||a.index<0||a.index>=a.steps.length)return false;
 return a.steps.every(s=>byId.has(s.id));
}
function current(){return state.active?.steps[state.active.index]}
function renderQuestion(){
 if(!validSession()){state.active=null;save();updateSetup();openView('examSetup');return}
 const a=state.active,step=current(),q=byId.get(step.id);
 const graded=a.steps.filter(s=>s.grade).length;
 $('examLiveTitle').textContent=a.mode==='adaptive'?'Προσαρμοστική εξέταση ΣΑΕΚ':'Εξέταση · '+E.levels[Number(a.mode)];
 $('examProgressText').textContent='Ερώτηση '+(a.index+1)+' από '+a.total+' · '+graded+' αξιολογημένες';
 $('examProgressBar').style.width=(100*(a.index+1)/a.total)+'%';
 $('examScopeLabel').textContent=q.semester+'΄ εξάμηνο · '+q.course;
 $('examDifficultyLabel').textContent='Επίπεδο ερώτησης: '+E.levels[q.difficulty];
 $('examQuestion').textContent=q.question;
 $('examDraft').value=step.draft||'';$('examDraft').disabled=Boolean(step.grade||step.revealed||requestPending);
 $('examCheckAI').hidden=Boolean(step.grade||step.revealed);
 $('examCheckAI').disabled=requestPending||Boolean(step.revealed);
 $('examCheckAI').textContent=requestPending?'Γίνεται αξιολόγηση…':'Υποβολή αξιολόγησης';
 $('examReveal').hidden=Boolean(step.revealed)||Boolean(step.grade);$('examReveal').disabled=requestPending;
 $('examReference').hidden=!step.revealed&&!step.grade;
 $('examReferenceText').textContent=q.answer;
 $('examSourceLink').href=q.href;
 $('examManual').hidden=true;
 $('examGradeState').textContent=step.grade?'Καταχωρίστηκε: '+({correct:'Σωστή',partial:'Μερικώς σωστή',incorrect:'Για επανάληψη'}[step.grade]):step.revealed?'Η προσπάθεια ολοκληρώθηκε χωρίς βαθμολογία. Συνέχισε στην επόμενη ερώτηση.':'';
 const result=$('examAIResult');
 result.hidden=true;result.replaceChildren();
 if(step.feedback&&window.EkabAIGrade){window.EkabAIGrade.render(result,step.feedback);}
 $('examPrev').disabled=a.index===0||requestPending;
 $('examNext').disabled=a.index===a.total-1||requestPending;
 $('examNext').textContent=a.index+1===a.total-1?'Τελευταία ερώτηση':'Επόμενη ερώτηση';
 $('examFinish').disabled=requestPending;
}
function manualReveal(){
 if(requestPending)return;
 const step=current();if(!step||step.grade)return;
 step.revealed=true;save();renderQuestion();
}
function recordGrade(grade,method,feedback=null){
 if(!['correct','partial','incorrect'].includes(grade)||method==='self')return;
 const step=current();if(!step||step.grade)return;
 step.grade=grade;step.method=method;step.revealed=true;
 if(feedback)step.feedback=feedback;
 E.recordGrade(state.history,step.id,grade);
 save();renderQuestion();
}
async function gradeAI(){
 if(requestPending)return;
 const step=current(),a=state.active,ai=window.EkabAIGrade,status=$('examAIResult');
 if(!step||step.grade||step.revealed)return;
 const answer=$('examDraft').value.trim();step.draft=answer;save();
 if(answer.length<3){status.hidden=false;status.className='ai-grading-result ai-grading-unavailable';status.textContent='Γράψε πρώτα τη δική σου απάντηση.';return}
 if(!ai){status.hidden=false;status.className='ai-grading-result ai-grading-unavailable';status.textContent='Η υπηρεσία αξιολόγησης δεν είναι διαθέσιμη.';return}
 const sessionId=a.id,qid=step.id,atIndex=a.index;
 requestPending=true;$('examDraft').disabled=true;$('examReveal').disabled=true;$('examCheckAI').disabled=true;$('examCheckAI').textContent='Γίνεται αξιολόγηση…';
 status.hidden=false;status.className='ai-grading-result';status.textContent='Ελέγχεται το νόημα της απάντησης…';
 try{
  const result=await ai.evaluate({section:'saek',questionId:qid,answer});
  if(!state.active||state.active.id!==sessionId||state.active.index!==atIndex||current()?.id!==qid)return;
  // Do not credit an answer if the reference was shown while a request was pending.
  if(result.verdict!=='uncertain'&&!current().revealed&&!current().grade){
   recordGrade(result.verdict,'service',result);
  }else{
   // Uncertain is a completed, locked attempt with no numeric grade.
   current().feedback=result;current().revealed=true;save();renderQuestion();
  }
 }catch(err){
  if(state.active?.id!==sessionId||state.active.index!==atIndex||current()?.id!==qid)return;
  status.hidden=false;status.className='ai-grading-result ai-grading-unavailable';status.textContent=err.message||'Η αξιολόγηση δεν ολοκληρώθηκε. Η απάντησή σου έχει αποθηκευτεί.';
 }finally{
  requestPending=false;
  if(state.active?.id===sessionId&&state.active.index===atIndex){
   $('examCheckAI').disabled=Boolean(current()?.revealed||current()?.grade);
   $('examCheckAI').textContent='Υποβολή αξιολόγησης';
   $('examDraft').disabled=Boolean(current()?.revealed||current()?.grade);
   $('examReveal').disabled=Boolean(current()?.revealed||current()?.grade);
   $('examPrev').disabled=state.active.index===0;
   $('examNext').disabled=state.active.index===state.active.total-1;
   $('examFinish').disabled=false;
  }
 }
}
function next(direction){
 if(requestPending)return;
 const a=state.active;if(!a)return;
 const nextIndex=a.index+direction;
 if(nextIndex<0||nextIndex>=a.total)return;
 if(nextIndex===a.steps.length&&!makeStep())return;
 a.index=nextIndex;save();renderQuestion();
}
function finalize(){
 if(requestPending||!validSession())return;
 const a=state.active,done=a.steps.filter(s=>s.grade);
 if(done.length<a.total&&!confirm('Έχεις αξιολογήσει '+done.length+' από '+a.total+' ερωτήσεις. Θέλεις να ολοκληρώσεις τώρα;'))return;
 const run={date:Date.now(),semester:a.semester,courseId:a.courseId,count:a.total,answered:done.length,correct:done.filter(s=>s.grade==='correct').length,partial:done.filter(s=>s.grade==='partial').length,incorrect:done.filter(s=>s.grade==='incorrect').length,items:a.steps.filter(s=>s.grade==='partial'||s.grade==='incorrect').map(s=>s.id).slice(0,30)};
 state.runs.push(run);state.runs=state.runs.slice(-30);
 state.active=null;save();window.dispatchEvent(new Event('ekab:progress-changed'));
 $('examResultsStats').replaceChildren();
 const figures=[['Ερωτήσεις',run.count],['Αξιολογήθηκαν',run.answered],['Σωστές',run.correct],['Μερικώς σωστές',run.partial],['Για επανάληψη',run.incorrect]];
 for(const [name,value] of figures){const node=document.createElement('div');const strong=document.createElement('strong');strong.textContent=String(value);const label=document.createElement('span');label.textContent=name;node.append(strong,label);$('examResultsStats').append(node)}
 const host=$('examWeakChapters');host.replaceChildren();
 if(!run.items.length){const p=document.createElement('p');p.textContent='Δεν σημειώθηκαν συγκεκριμένα θέματα για επανάληψη. Συνέχισε με νέα τυχαία εξέταση.';host.append(p)}
 else for(const id of run.items.slice(0,12)){const q=byId.get(id);if(!q)continue;const link=document.createElement('a');link.href=q.href;link.textContent=q.course+' · '+q.chapterTitle;host.append(link)}
 updateSetup();openView('examResults');
}
window.addEventListener('ekab:cloud-applied',()=>{
  try{
    const stored=JSON.parse(localStorage.getItem(KEY)||'{}');
    if(stored.history&&typeof stored.history==='object'&&!Array.isArray(stored.history)){
      state.history=stored.history;
      updateSetup();
    }
  }catch{}
});
function bind(){
 $('examSemester').addEventListener('change',coursesMenu);
 $('examCourse').addEventListener('change',updateSetup);
 $('examCount').addEventListener('change',updateSetup);
 $('examMode').addEventListener('change',updateSetup);
 $('examStart').addEventListener('click',start);
 $('examResume').addEventListener('click',()=>{if(!validSession()){state.active=null;save();updateSetup();return}openView('examLive');renderQuestion()});
 $('examLeave').addEventListener('click',()=>{if(requestPending)return;save();updateSetup();openView('examSetup')});
 $('examDraft').addEventListener('input',e=>{const st=current();if(st&&!st.grade&&!st.revealed&&!requestPending){st.draft=e.target.value.slice(0,3500);save()}});
 $('examReveal').addEventListener('click',manualReveal);
 $('examCheckAI').addEventListener('click',gradeAI);
 $('examMarkCorrect').addEventListener('click',()=>recordGrade('correct','self'));
 $('examMarkPartial').addEventListener('click',()=>recordGrade('partial','self'));
 $('examMarkWrong').addEventListener('click',()=>recordGrade('incorrect','self'));
 $('examPrev').addEventListener('click',()=>next(-1));
 $('examNext').addEventListener('click',()=>next(1));
 $('examFinish').addEventListener('click',finalize);
 $('examAgain').addEventListener('click',()=>{updateSetup();openView('examSetup')});
}
async function init(){
 bind();
 try{
  const response=await fetch('saek-exams-bank.json',{cache:'no-cache'});
  if(!response.ok)throw Error('HTTP '+response.status);
  const data=await response.json();
  if(data?.version!==1||data.count!==247||!Array.isArray(data.items)||data.items.length!==247)throw Error('Μη έγκυρη τράπεζα');
  const idSet=new Set();
  for(const q of data.items){
   if(!/^saek-\d{2}-\d+$/.test(q.id)||idSet.has(q.id)||!q.question||!q.answer||!q.href||!['Α','Β','Γ','Δ'].includes(q.semester))throw Error('Ασυμφωνία ερωτήσεων');
   idSet.add(q.id);
  }
  bank=data.items;byId=new Map(bank.map(q=>[q.id,q]));
  coursesMenu();
  if(state.active&&!validSession()){state.active=null;save()}
  updateSetup();
 }catch(error){
  $('examPoolInfo').textContent='Η τράπεζα εξετάσεων δεν φορτώθηκε. Δοκίμασε ενημέρωση εφαρμογής ή έλεγχο σύνδεσης.';
  $('examStart').disabled=true;$('examResume').hidden=true;
 }
}
init();
})();
