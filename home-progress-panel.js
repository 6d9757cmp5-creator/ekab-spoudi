/* EKAB Spoudi — minimal progress panel. Read existing, real saved data only. */
(()=>{'use strict';
const root=document.getElementById('homeMultiTracker');if(!root)return;
const EOP='ekab-eoppep-official-v15',SAEK_EXAMS='ekab.saek.exams.v1',SEM='ekab.seminar-prep.local.v1';
const seminars={bls:'BLS / AED',pbls:'PBLS',ils:'ILS',phtls:'PHTLS',als:'ALS'};
const choices=[['saek','ΣΑΕΚ'],['eoppep','ΕΟΠΠΕΠ'],...Object.entries(seminars)];
const $=(tag,cls,txt)=>{const node=document.createElement(tag);if(cls)node.className=cls;if(txt!==undefined)node.textContent=txt;return node};
const load=key=>{try{const item=JSON.parse(localStorage.getItem(key)||'{}');return item&&typeof item==='object'&&!Array.isArray(item)?item:{}}catch{return {}}};
const validId=id=>/^EOP-([AB])-(\d{3})$/.test(id)&&Number(id.slice(6))>0&&Number(id.slice(6))<=(id[4]==='A'?105:209);
const countOf=(values,max)=>new Set((Array.isArray(values)?values:[]).filter(n=>Number.isInteger(n)&&n>=0&&n<max)).size;
const score=([a,b])=>b?Math.round(100*a/b):null;
let expanded=null,reset=null,message='',panelOpen=false;
function clock(seconds){if(!seconds)return '—';const m=Math.floor(seconds/60),h=Math.floor(m/60);return h?h+'ω'+(m%60?' '+(m%60)+'λ':''):(m||1)+'λ';}
function times(id){
 let theory=0,exam=0;try{
  for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i),m=/^ekab\.activity\.v1\.[a-f0-9]{32}\.(saek|eoppep|bls|pbls|ils|phtls|als|pharma)\.(study|exam)$/.exec(k);
   if(m&&m[1]===id){const v=Number(localStorage.getItem(k));if(Number.isSafeInteger(v)&&v>=0&&v<=315360000){if(m[2]==='study')theory+=v;else exam+=v;}}
  }
 }catch{}return [theory,exam];
}
function stats(){
 let read=0;try{for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);if(/^ekab\.saek\.read\.v1\.(0[1-9]|1\d|20)\.\d{1,2}$/.test(k)&&localStorage.getItem(k)==='1')read++;}}catch{}
 const saekExam=load(SAEK_EXAMS),history=saekExam.history&&typeof saekExam.history==='object'?saekExam.history:{};
 let practiced=0,correct=0,attempts=0,incorrect=0;
 for(const [id,h] of Object.entries(history)){if(!/^saek-(0[1-9]|1\d|20)-\d{1,2}$/.test(id)||!h||typeof h!=='object')continue;
  const a=Math.max(0,Number(h.correct)||0),b=Math.max(0,Number(h.partial)||0),c=Math.max(0,Number(h.incorrect)||0);
  if(a+b+c>0){practiced++;correct+=a;attempts+=a+b+c;if(c>0)incorrect++;}
 }
 const rows=[{id:'saek',label:'ΣΑΕΚ',read:Math.min(read,247),readTotal:247,exam:Math.min(practiced,247),examTotal:247,accuracy:score([correct,attempts]),revisit:incorrect,revisitLabel:'Ερωτήσεις με λάθη'}];
 const eop=load(EOP);let eRead=0,ePracticed=0,eRight=0,eAttempts=0,eDue=0;
 const scheduler=window.EkabStudyScheduler;
 for(const [id,r] of Object.entries(eop)){if(!validId(id)||!r||typeof r!=='object')continue;
  if(typeof r.readCompletedAt==='string'&&Number.isFinite(Date.parse(r.readCompletedAt)))eRead++;
  const a=Math.max(0,Number(r.selfAttempts)||0),c=Math.min(a,Math.max(0,Number(r.selfCorrect)||0));
  if(a>0){ePracticed++;eAttempts+=a;eRight+=c;try{if(scheduler?.isDue(r))eDue++;}catch{}}
 }
 rows.push({id:'eoppep',label:'ΕΟΠΠΕΠ',read:eRead,readTotal:314,exam:ePracticed,examTotal:314,accuracy:score([eRight,eAttempts]),revisit:scheduler?eDue:null,revisitLabel:'Για επανάληψη'});
 const store=load(SEM);
 for(const [id,label] of Object.entries(seminars)){const p=store[id];if(!p||typeof p!=='object')continue;
  const studied=countOf(p.studied,12);
  const answered=countOf([...(p.right||[]),...(p.needs||[])],48);
  const mc=countOf([...(p.mcRight||[]),...(p.mcNeeds||[])],12);
  const scenario=Object.keys(p.scenarioGrades||{}).filter(n=>/^(?:[0-9]|1[01])$/.test(n)).length;
  const mixed=Object.keys(p.mixedRun?.responses||{}).length;
  const attempted=answered+mc+scenario;
  const hasActivity=studied||attempted||mixed||Object.keys(p.qNotes||{}).length||Object.keys(p.oralNotes||{}).length||(p.scenarioHistory?.length||0)>0;
  if(!hasActivity)continue;
  const right=countOf(p.right,48)+countOf(p.mcRight,12)+Object.values(p.scenarioGrades||{}).filter(g=>g?.verdict==='correct').length;
  const wrong=countOf(p.needs,48)+countOf(p.mcNeeds,12)+Object.values(p.scenarioGrades||{}).filter(g=>g?.verdict==='incorrect'||g?.verdict==='partial').length;
  rows.push({id,label,read:studied,readTotal:12,exam:Math.min(72,attempted),examTotal:72,accuracy:score([right,right+wrong]),revisit:wrong,revisitLabel:'Χρειάζονται επανάληψη'});
 }
 return rows.map(row=>({...row,studyPct:Math.round(100*row.read/row.readTotal),examPct:Math.round(100*row.exam/row.examTotal),time:times(row.id)}));
}
function line(label,value){const row=$('div','progress-panel-stat');row.append($('span','',label),$('strong','',String(value)));return row;}
function action(text,handler,cls){const b=$('button',cls||'progress-panel-link',text);b.type='button';b.addEventListener('click',handler);return b;}
function resetPrompt(item){
 const box=$('div','progress-panel-confirm'),stage=reset.step;
 box.append($('strong','',stage===1?'Επιβεβαίωση 1 από 2':'Τελική επιβεβαίωση 2 από 2'));
 box.append($('p','',stage===1?'Να μηδενιστεί μόνο η πρόοδος '+item.label+';':'Θα μηδενιστούν τα διαβασμένα και τα αποτελέσματα εξάσκησης της ενότητας '+item.label+'. Οι υπόλοιπες ενότητες και το ιστορικό ενεργού χρόνου θα παραμείνουν.'));
 const buttons=$('div','progress-panel-confirm-actions');
 buttons.append(action('Ακύρωση',()=>{reset=null;render()},'progress-panel-cancel'));
 buttons.append(action(stage===1?'Συνέχεια':'Οριστικός μηδενισμός',()=>{if(stage===1){reset={id:item.id,step:2};render();return}clearSection(item.id);},'progress-panel-danger'));
 box.append(buttons);return box;
}
async function clearSection(id){
 try{
  if(id==='saek'){
   const names=[];for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);if(/^ekab\.saek\.read\.v1\.(0[1-9]|1\d|20)\.\d{1,2}$/.test(k))names.push(k);}
   for(const key of names)localStorage.removeItem(key);
   localStorage.removeItem(SAEK_EXAMS);
  }else if(id==='eoppep')localStorage.removeItem(EOP);
  else if(Object.hasOwn(seminars,id)){const all=load(SEM);delete all[id];localStorage.setItem(SEM,JSON.stringify(all));}
  else return;
  reset=null;expanded=null;message='Μηδενίστηκε μόνο η πρόοδος '+(choices.find(x=>x[0]===id)?.[1]||id)+'.';
  window.dispatchEvent(new Event('ekab:progress-changed'));
  window.dispatchEvent(new Event('ekab:activity-updated'));
  await window.EkabProgress?.checkpoint?.();
  render();
 }catch{reset=null;message='Ο μηδενισμός ή η αποθήκευσή του δεν ολοκληρώθηκε. Έλεγξε το αντίγραφο ασφαλείας.';render();}
}
// Keep the home screen short; all existing detail controls live in a separate dialog.
const detailDialog=$('dialog','progress-detail-dialog');
detailDialog.id='progressDetailDialog';
detailDialog.setAttribute('aria-labelledby','progressDetailHeading');
const detailRoot=$('div','progress-detail-body');
detailDialog.append(detailRoot);
document.body.append(detailDialog);
detailDialog.addEventListener('close',()=>{panelOpen=false;reset=null;expanded=null;render();});
detailDialog.addEventListener('click',event=>{if(event.target===detailDialog)detailDialog.close();});
function openDetails(){
 panelOpen=true;render();
 if(typeof detailDialog.showModal==='function'&&!detailDialog.open)detailDialog.showModal();
 else detailDialog.setAttribute('open','');
}
function closeDetails(){
 if(typeof detailDialog.close==='function'&&detailDialog.open)detailDialog.close();
 else{detailDialog.removeAttribute('open');panelOpen=false;reset=null;expanded=null;render();}
}
function render(){
 const rows=stats();
 root.replaceChildren();
 const compact=$('section','progress-panel-compact');
 compact.setAttribute('aria-label','Γενική καταγεγραμμένη πρόοδος ΣΑΕΚ, ΕΟΠΠΕΠ και ενεργών σεμιναρίων');
 const heading=$('div','progress-panel-compact-heading');
 heading.append($('h2','','Η πρόοδός μου'));
 const toggle=action('Αναλυτικά ›',openDetails,'progress-panel-compact-toggle');
 toggle.setAttribute('aria-haspopup','dialog');
 toggle.setAttribute('aria-controls','progressDetailDialog');
 heading.append(toggle);compact.append(heading);
 // Weighted by actual saved completed items, not by averaging each section's percent.
 // Only sections with a reliable item count participate (SAEK, EOPPEP, started seminars).
 // Pharmacology currently has study-time only, not persisted per-card completion.
 const aggregate=(numerator,denominator)=>{
  const done=rows.reduce((total,item)=>total+item[numerator],0);
  const available=rows.reduce((total,item)=>total+item[denominator],0);
  if(!available||!done)return 0;
  const percentage=100*done/available;
  return percentage<1?Math.round(percentage*10)/10:Math.round(percentage);
 };
 const summary=$('div','progress-panel-compact-summary');
 for(const [type,label,value] of [
  ['study','Μελέτη',aggregate('read','readTotal')],
  ['exam','Εξάσκηση',aggregate('exam','examTotal')]
 ]){
  const metric=$('div','progress-panel-total-metric '+type);
  const text=$('div','progress-panel-total-label');
  text.append($('span','',label),$('strong','',String(value).replace('.',',')+'%'));
  metric.append(text);
  const track=$('div','progress-panel-total-track');
  track.setAttribute('role','progressbar');
  track.setAttribute('aria-label','Συνολική '+(type==='study'?'μελέτη':'εξάσκηση'));
  track.setAttribute('aria-valuemin','0');
  track.setAttribute('aria-valuemax','100');
  track.setAttribute('aria-valuenow',String(value));
  const fill=$('span','progress-panel-total-fill');
  fill.style.width=value+'%';track.append(fill);metric.append(track);
  summary.append(metric);
 }
 compact.append(summary);root.append(compact);
 if(!panelOpen)return;
 detailRoot.replaceChildren();
 const title=$('div','progress-panel-dialog-heading');
 const h2=$('h2','','Αναλυτική πρόοδος');h2.id='progressDetailHeading';
 const closeButton=action('✕',closeDetails,'progress-panel-dialog-close');
 closeButton.setAttribute('aria-label','Κλείσιμο αναλυτικής προόδου');
 title.append(h2,closeButton);
 detailRoot.append(title);
 if(message)detailRoot.append($('p','progress-panel-notice',message));
 const main=$('div','progress-panel-list'),firstSem=rows.findIndex(x=>x.id!=='saek'&&x.id!=='eoppep');
 rows.forEach((item,index)=>{
  if(index===firstSem)main.append($('div','progress-panel-group','ΣΕΜΙΝΑΡΙΑ'));
  const wrap=$('section','progress-panel-item'),head=$('div','progress-panel-item-head');
  head.append($('h3','',item.label),action('↶ Μηδενισμός',()=>{reset={id:item.id,step:1};expanded=item.id;render();},'progress-panel-reset'));
  wrap.append(head);
  const nums=$('div','progress-panel-numbers');
  const left=$('div',''),right=$('div','');right.className='progress-panel-number-right';
  left.append($('strong','',item.studyPct+'%'),$('span','',' Μελέτη'));
  right.append($('strong','',item.examPct+'%'),$('span','',' Εξάσκηση'));
  nums.append(left,right);wrap.append(nums);
  const bar=$('div','progress-panel-dual');
  bar.setAttribute('role','img');bar.setAttribute('aria-label',item.label+': Μελέτη '+item.studyPct+'%, Εξάσκηση '+item.examPct+'%');
  for(const [name,value] of [['study',item.studyPct],['exam',item.examPct]]){const half=$('div','progress-panel-half '+name),fill=$('span','');fill.style.width=value+'%';half.append(fill);bar.append(half);}
  wrap.append(bar);
  const footer=$('div','progress-panel-footer'),time=item.time[0]+item.time[1];
  footer.append($('span','', '◷ '+clock(time)));
  footer.append(action(expanded===item.id?'Κλείσιμο⌃':'Ανάλυση⌄',()=>{expanded=expanded===item.id?null:item.id;reset=null;render();},'progress-panel-link'));
  wrap.append(footer);
  if(expanded===item.id){
   const detail=$('div','progress-panel-detail');
   detail.append(line('Μελετημένα',item.read+' / '+item.readTotal));
   detail.append(line('Ερωτήσεις / δραστηριότητες εξάσκησης',item.exam+' / '+item.examTotal));
   detail.append(line('Σωστές αξιολογημένες απαντήσεις',item.accuracy===null?'—':item.accuracy+'%'));
   detail.append(line(item.revisitLabel,item.revisit===null?'—':item.revisit));
   detail.append(line('Χρόνος θεωρίας',clock(item.time[0])));
   detail.append(line('Χρόνος τεστ',clock(item.time[1])));
   detail.append($('p','progress-panel-note','Ο χρόνος μετράται από την ενεργοποίηση της νέας έκδοσης, μόνο κατά την ενεργή χρήση.'));
   wrap.append(detail);
  }
  if(reset?.id===item.id)wrap.append(resetPrompt(item));
  main.append(wrap);
 });
 detailRoot.append(main);
 if(!rows.some(x=>Object.hasOwn(seminars,x.id)))detailRoot.append($('p','progress-panel-empty','Τα σεμινάρια εμφανίζονται εδώ μόλις ξεκινήσεις θεωρία ή τεστ.'));
}
window.addEventListener('pageshow',render);
window.addEventListener('focus',render);
window.addEventListener('storage',render);
window.addEventListener('ekab:progress-changed',render);
window.addEventListener('ekab:cloud-applied',render);
window.addEventListener('ekab:activity-updated',render);
render();
})();