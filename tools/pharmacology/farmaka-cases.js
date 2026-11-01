/* Έξυπνη εκπαιδευτική Φαρμακολογία: 152 σενάρια, πεντάδες,
   επανάληψη λαθών. Δεν παρέχει δοσολογίες ή ιατρικές εντολές. */
(()=>{
'use strict';
const bank=window.EKAB_PHARMA_ADAPTIVE_BANK;
if(!bank||!Array.isArray(bank.all)||bank.all.length!==152)return;
const KEY='ekab.pharma.adaptive.v1';
const DAY=86400000;
const $=(tag,cls,value)=>{
 const node=document.createElement(tag);
 if(cls)node.className=cls;
 if(value!==undefined)node.textContent=value;
 return node;
};
function load(){
 try{
  const data=JSON.parse(localStorage.getItem(KEY)||'{}');
  if(!data||typeof data!=='object'||Array.isArray(data))return {};
  const ids=new Set(bank.all.map(c=>c.id));
  return Object.fromEntries(Object.entries(data).filter(([id,h])=>ids.has(id)&&h&&
   Number.isSafeInteger(h.attempts)&&h.attempts>=0&&h.attempts<100000&&
   Number.isSafeInteger(h.correct)&&h.correct>=0&&h.correct<=h.attempts));
 }catch{return {}}
}
function record(history,item,success){
 const p=history[item.id]||{attempts:0,correct:0,streak:0};
 const streak=success?(p.streak||0)+1:0;
 history[item.id]={attempts:p.attempts+1,correct:p.correct+(success?1:0),streak,
  lastAt:Date.now(),dueAt:success?Date.now()+[0,DAY,3*DAY,7*DAY,14*DAY][Math.min(streak,4)]:0};
 try{localStorage.setItem(KEY,JSON.stringify(history))}catch{}
}
function selectFive(history,mode,previous){
 const all=bank.all.filter(c=>mode==='all'||c.kind===mode),seen=new Set(previous);
 const tries=Object.values(history).reduce((sum,h)=>sum+h.attempts,0);
 const right=Object.values(history).reduce((sum,h)=>sum+h.correct,0);
 const advanced=tries>=10&&right/Math.max(1,tries)>=.72;
 const easy=all.filter(c=>advanced||c.difficulty<=2);
 const pool=easy.length>=5?easy:all;
 if(tries===0&&mode==='all'){
  return ['single-23','single-15','single-55','single-31','single-38']
   .map(id=>pool.find(c=>c.id===id)||all.find(c=>c.id===id)).filter(Boolean);
 }
 const candidates=pool.filter(c=>!seen.has(c.id));
 const available=candidates.length>=5?candidates:pool;
 const now=Date.now(),due=available.filter(c=>history[c.id]&&
   (history[c.id].streak===0||history[c.id].dueAt<=now));
 const unseen=available.filter(c=>!history[c.id]);
 const others=available.filter(c=>history[c.id]&&!due.includes(c));
 const sorted=(a)=>[...a].sort((x,y)=>{
  const rank=c=>c.priority*100+(history[c.id]?.lastAt||0)/1e13+
   (history[c.id]?history[c.id].correct/Math.max(1,history[c.id].attempts)*5:0);
  return rank(x)-rank(y)||x.id.localeCompare(y.id);
 });
 const chosen=[],topics={};
 const add=(items,n)=>{
  for(const c of sorted(items)){
   if(chosen.length===5||n<=0)break;
   if(chosen.some(x=>x.id===c.id))continue;
   if((topics[c.topic]||0)>=2&&items.some(x=>
    !chosen.some(z=>z.id===x.id)&&(topics[x.topic]||0)<2))continue;
   chosen.push(c);topics[c.topic]=(topics[c.topic]||0)+1;n--;
  }
 };
 if(tries) add(due,unseen.length?2:4);
 add(unseen,5-chosen.length);add(due,5-chosen.length);
 add(others,5-chosen.length);add(pool,5-chosen.length);
 return chosen;
}
function init(){
 const root=document.getElementById('phCaseStage');if(!root)return;
 let history=load(),mode='all',session=[],index=0,score=0,answered=false,previous=[];
 const toolbar=$('div','ph-case-toolbar'),label=$('label','ph-case-mode-label','Είδος περιστατικών');
 const selector=$('select','ph-case-mode');
 selector.id='phCaseMode';
 for(const [id,title] of [['all','Μικτά'],['single','Μεμονωμένα'],['combo','Συνδυασμοί']]){
  const option=$('option','',title);option.value=id;selector.append(option);
 }
 label.append(selector);const total=$('p','ph-case-stat');
 toolbar.append(label,total);
 const stage=$('div','ph-case-stage-content');
 root.replaceChildren(toolbar,stage);
 function stats(){
  const selected=bank.all.filter(c=>mode==='all'||c.kind===mode);
  const done=selected.filter(c=>history[c.id]);
  const n=done.reduce((a,c)=>a+history[c.id].attempts,0);
  const correct=done.reduce((a,c)=>a+history[c.id].correct,0);
  total.textContent='Τράπεζα '+selected.length+' · Μελετημένα '+done.length+
   ' · Ακρίβεια '+(n?Math.round(100*correct/n)+'%':'—');
 }
 function start(){
  history=load();session=selectFive(history,mode,previous);
  previous=session.map(c=>c.id);index=0;score=0;stats();draw();
 }
 function ending(){
  stage.replaceChildren();
  stage.append($('h3','ph-case-summary-title','Αποτέλεσμα πεντάδας: '+score+' / '+session.length));
  stage.append($('p','ph-case-intro',score===session.length?
   'Πολύ καλά! Στο επόμενο σετ θα εμφανιστούν νέες και σταδιακά δυσκολότερες περιπτώσεις.':
   'Τα λάθη σου θα επανέλθουν για εξάσκηση, ενώ η τράπεζα θα συνεχίσει να εμπλουτίζει τις γνώσεις σου.'));
  stage.append($('p','ph-case-intro','Έχεις δει '+Object.keys(history).length+
   ' από τα 152 περιστατικά. Οι απαντήσεις αποθηκεύονται μόνο σε αυτή τη συσκευή.'));
  const next=$('button','ph-button','Επόμενη πεντάδα');next.type='button';
  next.addEventListener('click',start);stage.append(next);stats();
 }
 function draw(){
  stage.replaceChildren();answered=false;
  if(index>=session.length){ending();return}
  const item=session[index],old=history[item.id];
  stage.append($('p','ph-case-progress','Ερώτηση '+(index+1)+' / '+session.length+' · Σωστές '+score));
  stage.append($('p','ph-case-topic',item.topic+' · '+(item.kind==='combo'?'Συνδυασμός':'Μεμονωμένη καρτέλα')));
  stage.append($('h3','ph-case-question',item.question));
  if(old?.attempts)stage.append($('p','ph-case-return','Επανάληψη · Παλαιότερες προσπάθειες '+old.attempts));
  const options=$('div','ph-case-options'),feedback=$('div','ph-case-feedback');
  options.setAttribute('role','group');options.setAttribute('aria-label','Επιλογές περιστατικού');
  feedback.hidden=true;feedback.setAttribute('role','status');feedback.setAttribute('aria-live','polite');
  const action=$('div','ph-case-actions'),next=$('button','ph-button',
   index===session.length-1?'Αποτελέσματα πεντάδας':'Επόμενη ερώτηση');
  next.type='button';next.hidden=true;
  next.addEventListener('click',()=>{if(answered){index++;draw()}});
  item.options.forEach((answer,i)=>{
   const button=$('button','ph-case-option',(i+1)+'. '+answer);button.type='button';
   button.addEventListener('click',()=>{
    if(answered)return;answered=true;
    const ok=i===item.correct;if(ok)score++;
    record(history,item,ok);
    [...options.children].forEach((b,j)=>{
     b.disabled=true;if(j===item.correct)b.classList.add('correct');
     else if(j===i)b.classList.add('wrong');
    });
    feedback.replaceChildren();
    feedback.append($('strong','',ok?'Σωστή αναγνώριση.':'Επισήμανση για επανάληψη.'));
    feedback.append($('p','',item.why));
    const source=$('a','ph-case-source','Πηγή: '+item.sourceTitle+' ↗');
    source.href=item.sourceUrl;source.target='_blank';source.rel='noopener noreferrer';
    feedback.append(source);
    feedback.append($('p','ph-small',item.kind==='combo'?
     'Ο συνδυασμός δεν είναι καθολικά ασφαλής· απαιτεί συγκεκριμένη ένδειξη, έλεγχο αντενδείξεων και αρμοδιότητα.':
     'Η εκπαιδευτική αναγνώριση δεν αποτελεί οδηγία ή εξουσιοδότηση χορήγησης.'));
    feedback.hidden=false;next.hidden=false;stats();
   });
   options.append(button);
  });
  action.append(next);stage.append(options,feedback,action);
 }
 selector.addEventListener('change',()=>{mode=selector.value;previous=[];start()});
 start();
}
if(typeof document==='undefined')return;
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
else init();
})();
