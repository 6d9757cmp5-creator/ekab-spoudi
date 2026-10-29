/* Manual oral rehearsal with optional device voice. No microphone, network, AI or storage. */
import {QUESTIONS,getOralQuestion,checklistSummary} from './mentor/core/oral-practice.mjs';
const $=id=>document.getElementById(id);
let index=0;
const answers=Array.from({length:QUESTIONS.length},()=>({notes:'',checked:[],revealed:false}));
const create=(tag,content)=>{
 const el=document.createElement(tag);
 if(content!==undefined)el.textContent=content;
 return el;
};
function render(){
 const q=getOralQuestion(index),local=answers[index];
 $('oral-position').textContent='Ερώτηση '+(index+1)+' / '+QUESTIONS.length;
 $('oral-progress-meter').value=index+1;
 $('oral-title').textContent=q.title;
 $('oral-prompt').textContent=q.prompt;
 $('oral-answer').value=local.notes;
 $('oral-prev').disabled=index===0;
 $('oral-next').disabled=index===QUESTIONS.length-1;
 $('oral-review').hidden=!local.revealed;
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
}
function updateReview(){
 const out=checklistSummary(index,answers[index].checked);
 $('oral-review-note').textContent=out.note;
}
$('oral-answer').addEventListener('input',()=>{
 answers[index].notes=$('oral-answer').value.slice(0,1400);
});
$('oral-reveal').addEventListener('click',()=>{
 answers[index].revealed=true;
 $('oral-review').hidden=false;
 updateReview();
});
function change(delta){
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
render();
