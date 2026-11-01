/* MENTOR oral rehearsal: optional written AI review; no recording, STT or persistence.
 * The project server, never the browser, chooses the reference checklist. */
import {QUESTIONS,getOralQuestion,checklistSummary} from '../core/oral-practice.mjs';
const $=id=>document.getElementById(id);
const examBox=$('oral-exam-mode');
let index=0,busy=false;
const answers=Array.from({length:QUESTIONS.length},()=>({notes:'',checked:[],revealed:false,feedback:null,feedbackFor:''}));
const create=(tag,content)=>{
 const el=document.createElement(tag);
 if(content!==undefined)el.textContent=content;
 return el;
};
function renderAI(){
 const local=answers[index],out=$('oral-ai-result');
 out.replaceChildren();out.hidden=true;
 if(!examBox.checked&&local.feedback&&local.feedbackFor===local.notes.trim()&&window.EkabAIGrade){
  window.EkabAIGrade.render(out,local.feedback);
 }
 $('oral-grade-ai').disabled=busy||examBox.checked||local.revealed||!!local.feedback;
}
function render(){
 const q=getOralQuestion(index),local=answers[index];
 $('oral-position').textContent='Ερώτηση '+(index+1)+' / '+QUESTIONS.length;
 $('oral-progress-meter').value=index+1;
 $('oral-title').textContent=q.title;
 $('oral-prompt').textContent=q.prompt;
 $('oral-answer').value=local.notes;
 $('oral-answer').disabled=busy;
 $('oral-prev').disabled=busy||index===0;
 $('oral-next').disabled=busy||index===QUESTIONS.length-1;
 $('oral-review').hidden=examBox.checked||!local.revealed;
 $('oral-reveal').disabled=busy||examBox.checked||local.revealed;
 $('oral-checks').replaceChildren();
 for(const [i,text] of q.checks.entries()){
  const label=create('label'),input=create('input'),copy=create('span',text);
  label.className='oral-tick';input.type='checkbox';input.checked=local.checked.includes(i);
  input.addEventListener('change',()=>{
   local.checked=local.checked.filter(x=>x!==i);
   if(input.checked)local.checked.push(i);
   updateReview();
  });
  label.append(input,copy);$('oral-checks').append(label);
 }
 updateReview();
 renderAI();
}
function updateReview(){
 const out=checklistSummary(index,answers[index].checked);
 $('oral-review-note').textContent=out.note;
}
$('oral-answer').addEventListener('input',()=>{
 const local=answers[index];
 local.notes=$('oral-answer').value.slice(0,1400);
 local.feedback=null;local.feedbackFor='';
 $('oral-ai-result').hidden=true;
 $('oral-grade-ai').disabled=busy||examBox.checked||local.revealed;
});
$('oral-reveal').addEventListener('click',()=>{
 if(busy||examBox.checked)return;
 answers[index].revealed=true;
 $('oral-review').hidden=false;
 $('oral-grade-ai').disabled=true;
 $('oral-reveal').disabled=true;
 updateReview();
});
$('oral-grade-ai').addEventListener('click',async()=>{
 if(busy||examBox.checked||answers[index].revealed)return;
 const ai=window.EkabAIGrade,local=answers[index],answer=local.notes.trim();
 const out=$('oral-ai-result');
 out.hidden=false;out.className='ai-grading-result';
 if(answer.length<3){out.textContent='Γράψε μια απάντηση πριν από την αξιολόγηση.';return;}
 if(!ai){out.textContent='Η υπηρεσία AI δεν φορτώθηκε. Χρησιμοποίησε τα σημεία αυτοελέγχου.';return;}
 const question=getOralQuestion(index),originalIndex=index;
 busy=true;
 $('oral-grade-ai').disabled=true;$('oral-answer').disabled=true;
 $('oral-prev').disabled=true;$('oral-next').disabled=true;$('oral-reveal').disabled=true;
 out.textContent='Ελέγχεται το νόημα της γραπτής απάντησης…';
 try{
  const feedback=await ai.evaluate({section:'mentor_oral',questionId:question.id,answer});
  if(index!==originalIndex||local.notes.trim()!==answer)return;
  local.feedback=feedback;local.feedbackFor=answer;
  ai.render(out,feedback);
 }catch(error){
  if(index!==originalIndex)return;
  out.className='ai-grading-result ai-grading-unavailable';
  out.textContent=error.message||'Η αξιολόγηση δεν ολοκληρώθηκε. Χρησιμοποίησε την αυτοαξιολόγηση.';
 }finally{
  busy=false;
  $('oral-answer').disabled=false;
  $('oral-prev').disabled=index===0;
  $('oral-next').disabled=index===QUESTIONS.length-1;
  $('oral-reveal').disabled=examBox.checked||local.revealed;
  $('oral-grade-ai').disabled=examBox.checked||local.revealed||!!local.feedback;
 }
});
function change(delta){
 if(busy)return;
 const candidate=index+delta;
 if(candidate<0||candidate>=QUESTIONS.length)return;
 if(typeof speechSynthesis!=='undefined')speechSynthesis.cancel();
 index=candidate;render();
}
$('oral-next').addEventListener('click',()=>change(1));
$('oral-prev').addEventListener('click',()=>change(-1));
const speechAvailable=typeof speechSynthesis!=='undefined'&&typeof SpeechSynthesisUtterance!=='undefined';
$('oral-listen').disabled=!speechAvailable;
$('oral-stop').disabled=!speechAvailable;
$('oral-listen').addEventListener('click',()=>{
 if(!speechAvailable)return;
 speechSynthesis.cancel();
 const utterance=new SpeechSynthesisUtterance(getOralQuestion(index).prompt);
 utterance.lang='el-GR';utterance.rate=.93;speechSynthesis.speak(utterance);
});
$('oral-stop').addEventListener('click',()=>{if(speechAvailable)speechSynthesis.cancel();});
// Active examination: do not expose grading hints or checklists.
function announceMode(){
 const exam=examBox.checked;
 $('oral-reveal').disabled=busy||exam||answers[index].revealed;
 $('oral-grade-ai').disabled=busy||exam||answers[index].revealed||!!answers[index].feedback;
 $('oral-review').hidden=exam||!answers[index].revealed;
 if(exam)$('oral-ai-result').hidden=true;
 else renderAI();
 window.dispatchEvent(new CustomEvent('mentor:context',{detail:exam
  ?{kind:'exam',id:'oral-exam',label:'Προφορική εξέταση',active:true}
  :{kind:'study-mode',id:'oral-practice',label:'Προφορική εξάσκηση με καθοδήγηση'}}));
}
examBox.addEventListener('change',announceMode);
window.addEventListener('load',announceMode);
render();announceMode();
