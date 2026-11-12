/**
 * Εργαστήριο Επικοινωνίας & Παράδοσης: διεπαφή. Όλη η αξιολόγηση γίνεται στο core.mjs.
 * Δεν αποθηκεύει τίποτα· η πρόοδος της συνεδρίας μηδενίζεται με «Νέα εξάσκηση».
 */
import {TOPICS,CASES,ATMIST,CLOSED_LOOP,TRANSFER_STEPS,TRANSFER_FLAW,RECORD_FIELDS,getCase,getTopic,topicSources,
 gradeCapture,gradeReadback,gradeOrder,gradePrealert,gradeStructure,gradeRecord,gradeTransferFlaw,modelHandover} from './core.mjs';

const $=(tag,cls='',text='')=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text)n.textContent=text;return n;};
const params=new URLSearchParams(location.search);
const state={topic:getTopic(params.get('topic'))?.id||'capture',case:getCase(params.get('case'))?.id||CASES[0].id,right:0,total:0};
// Fixed starting orders, so the order exercises never begin already solved.
const START_ORDER={loop:[2,0,1],transfer:[3,0,4,1,2]};

function score(result){
 state.right+=result.correct;state.total+=result.total;
 document.getElementById('hl-score').textContent=`Σωστά σημεία: ${state.right} / ${state.total}`;
}
function verdict(box,result,extra=''){
 const p=$('p','hl-verdict '+(result.correct===result.total?'hl-ok':'hl-partial'),`Σωστά ${result.correct} από ${result.total}.${extra?' '+extra:''}`);
 p.setAttribute('role','status');box.append(p);
}
function mark(ok){return ok?'✓ ':'✗ '}

function narrativeList(c){
 const ol=$('ol','hl-narrative');ol.setAttribute('aria-label','Αφήγηση συνθετικού περιστατικού');
 for(const n of c.narrative){const li=$('li');li.append($('time','',n.t),document.createTextNode(' '+n.text));ol.append(li);}
 return ol;
}
function checkButton(label,onClick){const b=$('button','vs-primary hl-check',label);b.type='button';b.addEventListener('click',onClick);return b;}
function resultBox(){const d=$('div','hl-result');d.setAttribute('aria-live','polite');return d;}

/** Λίστα με κουμπιά ↑/↓ για ασκήσεις σειράς. Επιστρέφει συνάρτηση που δίνει την τρέχουσα σειρά. */
function orderList(items,start,label){
 const ol=$('ol','hl-order');ol.setAttribute('aria-label',label);
 const order=start.map(i=>items[i]);
 const draw=()=>{
  ol.replaceChildren();
  order.forEach((it,i)=>{
   const li=$('li');li.dataset.id=it.id;li.append($('span','',it.text));
   const up=$('button','hl-move','↑');up.type='button';up.disabled=i===0;up.setAttribute('aria-label','Μετακίνηση πάνω: '+it.text);
   const down=$('button','hl-move','↓');down.type='button';down.disabled=i===order.length-1;down.setAttribute('aria-label','Μετακίνηση κάτω: '+it.text);
   up.addEventListener('click',()=>{[order[i-1],order[i]]=[order[i],order[i-1]];draw();ol.querySelectorAll('li')[i-1]?.querySelector('.hl-move')?.focus();});
   down.addEventListener('click',()=>{[order[i+1],order[i]]=[order[i],order[i+1]];draw();ol.querySelectorAll('li')[i+1]?.querySelectorAll('.hl-move')[1]?.focus();});
   li.append(up,down);ol.append(li);
  });
 };
 draw();
 return {el:ol,ids:()=>order.map(x=>x.id)};
}
function choiceGroup(name,options,legend){
 const fs=$('fieldset','hl-choices');fs.append($('legend','',legend));
 options.forEach((o,i)=>{const l=$('label');const r=$('input');r.type='radio';r.name=name;r.value=String(i);l.append(r,document.createTextNode(' '+o));fs.append(l);});
 return {el:fs,value:()=>{const r=fs.querySelector('input:checked');return r?Number(r.value):-1;}};
}

const RENDER={
 capture(c,box){
  box.append($('p','vs-hint','Διάβασε την αφήγηση και συμπλήρωσε τα στοιχεία όπως θα τα κατέγραφες. Ώρες ως ΩΩ:ΛΛ.'),narrativeList(c));
  const form=$('div','hl-fields');const inputs={};
  for(const f of c.capture){
   const l=$('label','',f.label);let input;
   if(f.kind==='choice'){input=$('select');input.append(new Option('— επίλεξε —',''));for(const o of f.options)input.append(new Option(o,o));}
   else{input=$('input');input.inputMode=f.kind==='time'?'text':'numeric';input.placeholder=f.kind==='time'?'ΩΩ:ΛΛ':'';input.autocomplete='off';}
   input.dataset.field=f.id;inputs[f.id]=input;l.append(input);form.append(l);
  }
  const out=resultBox();
  box.append(form,checkButton('Έλεγχος καταγραφής',()=>{
   const r=gradeCapture(c.id,Object.fromEntries(Object.entries(inputs).map(([k,i])=>[k,i.value])));
   out.replaceChildren();verdict(out,r);score(r);
   const ul=$('ul','hl-rows');for(const row of r.rows)ul.append($('li',row.ok?'hl-ok':'hl-bad',mark(row.ok)+row.label+(row.ok?'':' → σωστό: '+row.expected)+(row.why?' · '+row.why:'')));
   out.append(ul);
  }),out);
 },
 dispatch(c,box){
  box.append($('p','vs-hint','Το Κέντρο σού στέλνει ένα κρίσιμο μήνυμα. Διάβασέ το, κρύψ’ το και γράψε την επανάληψη (read-back) όπως θα την έλεγες στον ασύρματο.'));
  const msg=$('blockquote','hl-message',c.dispatch.message);msg.id='hl-dispatch-message';
  const toggle=$('button','vs-secondary','Κρύψε το μήνυμα');toggle.type='button';toggle.setAttribute('aria-controls',msg.id);
  toggle.addEventListener('click',()=>{msg.hidden=!msg.hidden;toggle.textContent=msg.hidden?'Δείξε ξανά το μήνυμα':'Κρύψε το μήνυμα';});
  const l=$('label','hl-wide','Η επανάληψή σου');const ta=$('textarea');ta.rows=3;ta.id='hl-readback';l.append(ta);
  const out=resultBox();
  box.append(msg,toggle,l,checkButton('Έλεγχος επανάληψης',()=>{
   const r=gradeReadback(c.id,ta.value);out.replaceChildren();verdict(out,r,r.complete?'Το Κέντρο μπορεί να επιβεβαιώσει.':'Το Κέντρο θα σε διόρθωνε.');score(r);
   if(r.missing.length)out.append($('p','hl-bad','Λείπουν ή είναι λάθος: '+r.missing.join(', ')+'.'),$('p','vs-hint',c.dispatch.hint));
  }),out);
  box.append($('h3','','Σειρά κλειστού κύκλου'));
  const loop=orderList(CLOSED_LOOP,START_ORDER.loop,'Βήματα κλειστού κύκλου σε σειρά');const out2=resultBox();
  box.append(loop.el,checkButton('Έλεγχος σειράς',()=>{
   const r=gradeOrder(CLOSED_LOOP.map(x=>x.id),loop.ids());out2.replaceChildren();verdict(out2,r,r.complete?'':'Πρώτα το μήνυμα, μετά η επανάληψη από τον αποδέκτη, τέλος η επιβεβαίωση ή διόρθωση.');score(r);
  }),out2);
 },
 prealert(c,box){
  box.append($('p','vs-hint','Ετοιμάζεις σύντομη προαναγγελία προς το ΤΕΠ. Επίλεξε μόνο όσα ανήκουν σε αυτήν.'),narrativeList(c));
  const fs=$('fieldset','hl-checklist');fs.append($('legend','','Τι θα πεις στην προαναγγελία;'));
  for(const s of c.statements){const l=$('label');const cb=$('input');cb.type='checkbox';cb.value=s.id;l.append(cb,document.createTextNode(' '+s.text));fs.append(l);}
  const out=resultBox();
  box.append(fs,checkButton('Έλεγχος προαναγγελίας',()=>{
   const r=gradePrealert(c.id,[...fs.querySelectorAll('input:checked')].map(i=>i.value));out.replaceChildren();verdict(out,r);score(r);
   const ul=$('ul','hl-rows');for(const row of r.rows.filter(x=>!x.ok))ul.append($('li','hl-bad',mark(false)+row.text+' — '+(row.should?'ανήκει στην προαναγγελία.':'δεν ανήκει'+(row.why?': '+row.why:'.'))));
   out.append(ul);
  }),out);
 },
 structure(c,box){
  box.append($('p','vs-hint','Βάλε κάθε πληροφορία στη θέση της στο ATMIST. Ό,τι είναι εικασία ή άσχετο μένει εκτός.'),narrativeList(c));
  const table=$('div','hl-fields hl-structure');const selects={};
  for(const s of c.statements){
   const l=$('label','',s.text);const sel=$('select');sel.append(new Option('— θέση —',''));
   for(const a of ATMIST)sel.append(new Option(a.label,a.id));selects[s.id]=sel;l.append(sel);table.append(l);
  }
  const out=resultBox();
  box.append(table,checkButton('Έλεγχος δομής',()=>{
   const r=gradeStructure(c.id,Object.fromEntries(Object.entries(selects).map(([k,s])=>[k,s.value])));out.replaceChildren();verdict(out,r);score(r);
   const label=id=>ATMIST.find(a=>a.id===id)?.label||'—';
   const ul=$('ul','hl-rows');for(const row of r.rows.filter(x=>!x.ok))ul.append($('li','hl-bad',mark(false)+row.text+' → '+label(row.expected)+(row.why?' · '+row.why:'')));
   out.append(ul);
   const d=$('details','hl-model');d.append($('summary','','Πρότυπη παράδοση ATMIST για σύγκριση'),$('pre','',modelHandover(c.id)));out.append(d);
  }),out);
 },
 record(c,box){
  box.append($('p','vs-hint','Μετάφερε τις δύο μετρήσεις της αφήγησης στο φύλλο καταγραφής και περιέγραψε αντικειμενικά τη μεταβολή.'),narrativeList(c));
  const wrap=$('div','hl-table-wrap');const table=$('table','hl-table');const head=$('tr');head.append($('th','','Μέτρηση'));
  for(const f of RECORD_FIELDS)head.append($('th','',f.label));
  const thead=$('thead');thead.append(head);const tbody=$('tbody');const cells=[];
  c.vitals.forEach((v,i)=>{
   const tr=$('tr');tr.append($('th','',(i+1)+'η'));const row={};
   for(const f of RECORD_FIELDS){const td=$('td');const inp=$('input');inp.autocomplete='off';inp.setAttribute('aria-label',`${i+1}η μέτρηση · ${f.label}`);inp.size=6;row[f.id]=inp;td.append(inp);tr.append(td);}
   cells.push(row);tbody.append(tr);
  });
  table.append(thead,tbody);wrap.append(table);
  const trend=choiceGroup('hl-trend-'+c.id,c.trend.options,c.trend.question);const out=resultBox();
  box.append(wrap,trend.el,checkButton('Έλεγχος καταγραφής',()=>{
   const r=gradeRecord(c.id,cells.map(row=>Object.fromEntries(Object.entries(row).map(([k,i])=>[k,i.value]))),trend.value());
   out.replaceChildren();
   const total={correct:r.correct+(r.trendOk?1:0),total:r.total+1};verdict(out,total);score(total);
   cells.forEach((row,i)=>{for(const f of RECORD_FIELDS){const cell=r.cells.find(x=>x.row===i&&x.field===f.id);row[f.id].classList.toggle('hl-input-bad',!cell.ok);row[f.id].title=cell.ok?'':'Σωστό: '+cell.expected;}});
   const wrong=r.cells.filter(x=>!x.ok);
   if(wrong.length)out.append($('p','hl-bad','Διόρθωσε: '+wrong.map(x=>`${x.row+1}η ${RECORD_FIELDS.find(f=>f.id===x.field).label} = ${x.expected}`).join(' · ')));
   out.append($('p',r.trendOk?'hl-ok':'hl-bad',mark(r.trendOk)+r.trendWhy));
  }),out);
 },
 transfer(c,box){
  box.append($('p','vs-hint','Βάλε σε σειρά τα βήματα της παράδοσης στο ΤΕΠ.'));
  const steps=orderList(TRANSFER_STEPS,START_ORDER.transfer,'Βήματα παράδοσης σε σειρά');const out=resultBox();
  box.append(steps.el,checkButton('Έλεγχος σειράς',()=>{
   const r=gradeOrder(TRANSFER_STEPS.map(x=>x.id),steps.ids());out.replaceChildren();verdict(out,r);score(r);
   if(!r.complete){const ol=$('ol','hl-rows');ol.append(...TRANSFER_STEPS.map(s=>$('li','',s.text)));out.append($('p','vs-hint','Σωστή σειρά:'),ol);}
  }),out);
  box.append($('h3','','Τι λείπει από αυτή την παράδοση;'));
  const ul=$('ul','hl-transcript');for(const line of TRANSFER_FLAW.transcript)ul.append($('li','',line));
  const flaw=choiceGroup('hl-flaw',TRANSFER_FLAW.options,'Επίλεξε το κρίσιμο κενό');const out2=resultBox();
  box.append(ul,flaw.el,checkButton('Έλεγχος',()=>{
   const r=gradeTransferFlaw(flaw.value());out2.replaceChildren();const s={correct:r.ok?1:0,total:1};verdict(out2,s);score(s);
   out2.append($('p',r.ok?'hl-ok':'hl-bad',mark(r.ok)+r.why));
  }),out2);
 }
};

function render(){
 const topic=getTopic(state.topic),c=getCase(state.case),i=TOPICS.indexOf(topic);
 document.getElementById('hl-title').textContent=topic.title;
 document.getElementById('hl-eyebrow').textContent=`ΥΠΟΕΝΟΤΗΤΑ ${i+1} · ${c.title.toUpperCase()}`;
 document.getElementById('hl-index').textContent=`${i+1} / ${TOPICS.length}`;
 document.getElementById('hl-goal').textContent=topic.goal;
 const box=document.getElementById('hl-exercise');box.replaceChildren();RENDER[topic.id](c,box);
 const list=document.getElementById('hl-source-list');list.replaceChildren();
 for(const s of topicSources(topic.id)){const li=$('li');const a=$('a','',s.label);a.href=s.href;li.append(a);list.append(li);}
 for(const a of document.querySelectorAll('#hl-topic-nav button'))a.setAttribute('aria-current',a.dataset.topic===topic.id?'true':'false');
 const url=new URL(location.href);url.searchParams.set('topic',topic.id);url.searchParams.set('case',c.id);history.replaceState(null,'',url);
}

function boot(){
 const nav=document.getElementById('hl-topic-nav');
 TOPICS.forEach((t,i)=>{const b=$('button','',`${i+1}. ${t.title}`);b.type='button';b.dataset.topic=t.id;b.addEventListener('click',()=>{state.topic=t.id;render();document.getElementById('hl-title').focus?.();});nav.append(b);});
 const sel=document.getElementById('hl-case');for(const c of CASES)sel.append(new Option(c.title,c.id));sel.value=state.case;
 sel.addEventListener('change',()=>{state.case=sel.value;render();});
 document.getElementById('hl-reset').addEventListener('click',()=>{state.right=0;state.total=0;document.getElementById('hl-score').textContent='Σωστά σημεία: 0 / 0';render();});
 document.getElementById('hl-title').tabIndex=-1;
 render();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
