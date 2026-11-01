/* Seven old-style EOPPEP written questions. Existing manual progress remains
 * independent of optional, source-controlled AI feedback. */
let items=[],current=null,seen=new Set(),stats={},aiBusy=false,attemptEpoch=0;
const $=s=>document.querySelector(s);
try{stats=JSON.parse(localStorage.getItem('ekab.written.v1'))||{}}catch{}
function save(){localStorage.setItem('ekab.written.v1',JSON.stringify(stats));}
function refresh(){
 const done=items.filter(x=>stats[x.id]?.attempts).length;
 const well=items.filter(x=>(stats[x.id]?.streak||0)>=5).length;
 const weak=items.filter(x=>stats[x.id]?.attempts&&!stats[x.id]?.streak).length;
 $('#metrics').textContent=`Κάλυψη ${done}/${items.length} · 5 συνεχόμενες αυτοαξιολογήσεις: ${well} · Αδύναμα: ${weak}`;
}
function choose(){
 const filtered=items.filter(x=>$('#category').value==='all'||x.category===$('#category').value);
 if(!filtered.length)return null;
 let unshown=filtered.filter(x=>!seen.has(x.id));
 if(!unshown.length){seen.clear();unshown=filtered;}
 const weighted=unshown.map(x=>{
  const st=stats[x.id]||{attempts:0,streak:0,wrong:0};
  return Math.max(.04,(1+(st.wrong||0)*3+(st.attempts?0:4))/(1+(st.streak||0)**2));
 });
 let r=Math.random()*weighted.reduce((a,b)=>a+b,0);
 for(let i=0;i<unshown.length;i++){r-=weighted[i];if(r<=0)return unshown[i];}
 return unshown.at(-1);
}
function next(){
 if(aiBusy)return;
 attemptEpoch++;current=choose();if(!current)return;seen.add(current.id);
 $('#meta').textContent=`ΕΟΠΠΕΠ παλαιού τύπου, αριθμός ${current.number} · ${current.category}`;
 $('#question').textContent=current.question;
 $('#myanswer').value='';
 $('#myanswer').disabled=false;
 $('#model').textContent=current.modelAnswer;
 $('#qsource').href=current.questionUrl;
 $('#asource').href=current.answerUrl;
 $('#asource').textContent=current.answerReference;
 $('#solution').hidden=true;
 $('#ai-evaluation').hidden=true;
 $('#ai-evaluation').replaceChildren();
 $('#ai-grade').disabled=false;
 $('#ai-grade').hidden=false;
 refresh();
}
$('#next').addEventListener('click',next);
$('#reveal').addEventListener('click',()=>{
 $('#solution').hidden=false;
 $('#ai-grade').disabled=true;
 $('#ai-grade').hidden=true;
});
function mark(pass){
 if(!current||aiBusy)return;
 const s=stats[current.id]||{attempts:0,streak:0,wrong:0};
 s.attempts++;
 if(pass)s.streak++;else{s.streak=0;s.wrong++;}
 stats[current.id]=s;save();next();
}
$('#pass').addEventListener('click',()=>mark(true));
$('#fail').addEventListener('click',()=>mark(false));
$('#category').addEventListener('change',()=>{seen.clear();next();});
$('#ai-grade').addEventListener('click',async()=>{
 if(!current||aiBusy||!$('#solution').hidden)return;
 const answer=$('#myanswer').value.trim(),resultBox=$('#ai-evaluation');
 resultBox.hidden=false;resultBox.className='ai-grading-result';
 if(answer.length<3||answer.length>3500){resultBox.textContent='Γράψε μια απάντηση από 3 έως 3500 χαρακτήρες.';return;}
 if(!window.EkabAIGrade){resultBox.textContent='Ο βαθμολογητής AI δεν έχει φορτωθεί. Χρησιμοποίησε την αυτοαξιολόγηση.';return;}
 const id=current.id,epoch=attemptEpoch;
 aiBusy=true;$('#ai-grade').disabled=true;$('#myanswer').disabled=true;
 resultBox.textContent='Ελέγχεται το νόημα της απάντησης…';
 try{
  const grade=await window.EkabAIGrade.evaluate({section:'old_written',questionId:id,answer});
  if(!current||current.id!==id||epoch!==attemptEpoch)return;
  window.EkabAIGrade.render(resultBox,grade);
  $('#solution').hidden=false;
  $('#ai-grade').hidden=true;
 }catch(e){
  if(epoch!==attemptEpoch)return;
  resultBox.className='ai-grading-result ai-grading-unavailable';
  resultBox.textContent=e.message||'Η αξιολόγηση δεν ολοκληρώθηκε. Μπορείς να κάνεις αυτοαξιολόγηση.';
 }finally{
  aiBusy=false;
  if(epoch===attemptEpoch){$('#myanswer').disabled=false;$('#ai-grade').disabled=!$('#solution').hidden;}
 }
});
fetch('old_type_written.json').then(r=>{if(!r.ok)throw Error('HTTP '+r.status);return r.json();}).then(data=>{
 items=data;
 for(const c of [...new Set(items.map(x=>x.category))].sort()){
  const o=document.createElement('option');o.textContent=c;o.value=c;$('#category').append(o);
 }
 next();
}).catch(()=>{$('#question').textContent='Δεν φορτώθηκαν τα θέματα. Άνοιξε την εφαρμογή από τον δημοσιευμένο HTTPS σύνδεσμο.';});
