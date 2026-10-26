'use strict';
const BANK_URL='official_questions.json', STORAGE='ekab-eoppep-official-v15';
const $=selector=>document.querySelector(selector);
let bank=[], state={}, pool=[], index=-1, shownAnswer=false;
function saved(){try{return JSON.parse(localStorage.getItem(STORAGE))||{}}catch{return{}}}
function save(){try{localStorage.setItem(STORAGE,JSON.stringify(state));window.dispatchEvent(new Event('ekab:progress-changed'))}catch(e){console.warn('Αποτυχία αποθήκευσης',e)}}
function st(q){return state[q.id]||(state[q.id]={seen:0,weak:0,selfCorrect:0,selfAttempts:0,streak:0,draft:''})}
function qSourceLink(q){return `eoppep-source.pdf#page=${Number(q.page)||1}`}
function addLink(parent,href,label){if(typeof href!=='string'||!/^https:\/\//i.test(href)&&!/^eoppep-source\.pdf(?:#page=\d+)?$/.test(href))return null;const a=document.createElement('a');a.href=href;a.textContent=label;a.target='_blank';a.rel='noopener noreferrer';parent.append(a);return a}
function hasDocumentedReview(q){return Boolean(q.sourceChecked||q.reviewAudit20261026||q.reviewAudit20261026Followup||q.finalAudit20261026||q.webResearch20261026)}
function scoped(){const group=$('#group').value,topic=$('#topic').value,status=$('#statusFilter').value,find=$('#search').value.trim().toLocaleLowerCase('el');return bank.filter(q=>(group==='all'||q.group===group)&&(topic==='all'||q.studyTopic===topic)&&(status==='all'||(status==='directly_checked'&&Boolean(q.sourceChecked))||(status==='documented_review'&&hasDocumentedReview(q))||q.answerStatus===status)&&(!find||q.question.toLocaleLowerCase('el').includes(find)||q.id.toLowerCase().includes(find)))}
function labelStatus(q){if(hasDocumentedReview(q))return 'Εκπαιδευτική λύση · ιστορικό ανασκόπησης ⓘ';if(q.answerStatus==='reviewed_educational')return 'Εκπαιδευτική λύση · βιβλιογραφία (χωρίς ειδική καταγραφή ελέγχου) ⓘ';return 'Προσχέδιο · απαιτείται έλεγχος ⓘ'}
// Viewing a question is not evidence of learning it. Only repeated correct self-assessments count.
const STUDIED_CORRECT_STREAK=3, MASTERED_CORRECT_STREAK=5;
function isStudied(q){const s=state[q.id];return Boolean(s&&(s.selfCorrect||0)>=STUDIED_CORRECT_STREAK&&(s.streak||0)>=STUDIED_CORRECT_STREAK)}
function isMastered(q){const s=state[q.id];return Boolean(s&&(s.selfCorrect||0)>=MASTERED_CORRECT_STREAK&&(s.streak||0)>=MASTERED_CORRECT_STREAK)}
function needsReview(q){const s=state[q.id];return Boolean(s&&(s.weak||0)>0&&!isStudied(q))}
function updateMetrics(){
 $('#seenCount').textContent=bank.filter(isStudied).length;
 $('#allCount').textContent=bank.length;
 $('#verifiedCount').textContent=bank.filter(q=>q.answerStatus==='reviewed_educational').length;
 const target=$('#groupProgress');target.replaceChildren();
 for(const [g,title] of [['A','Γενικές Ερωτήσεις'],['B','Ειδικές Ερωτήσεις']]){
   const items=bank.filter(q=>q.group===g);
   const studied=items.filter(isStudied).length;
   const viewed=items.filter(q=>(state[q.id]?.seen||0)>0).length;
   const mastered=items.filter(isMastered).length;
   const weak=items.filter(needsReview).length;
   const percent=items.length?Math.round(100*studied/items.length):0;
   const node=document.createElement('div');node.className='progress-row';
   const top=document.createElement('div');top.className='line';
   const name=document.createElement('strong');name.textContent=`Ομάδα ${g} · ${title}`;
   const label=document.createElement('strong');label.textContent=percent+'%';top.append(name,label);
   const progress=document.createElement('div');progress.className='bar';progress.setAttribute('role','progressbar');
   progress.setAttribute('aria-label',`Μελετημένες ερωτήσεις ομάδας ${g}`);
   progress.setAttribute('aria-valuenow',studied);progress.setAttribute('aria-valuemax',items.length);progress.setAttribute('aria-valuemin','0');
   const fill=document.createElement('span');fill.style.width=percent+'%';progress.append(fill);
   const detail=document.createElement('div');detail.className='detail';
   const left=document.createElement('span');left.textContent=`${studied} / ${items.length} μελετημένες · ${viewed} ανοιγμένες`;
   const right=document.createElement('span');right.textContent=`${mastered} εμπεδωμένες · ${weak} για επανάληψη`;
   detail.append(left,right);node.append(top,progress,detail);target.append(node);
 }
 const bytopic=$('#topicProgress');bytopic.replaceChildren();
 for(const topic of [...new Set(bank.map(q=>q.studyTopic))].sort((a,b)=>a.localeCompare(b,'el'))){
   const subset=bank.filter(q=>q.studyTopic===topic);
   const studied=subset.filter(isStudied).length;
   const opened=subset.filter(q=>(state[q.id]?.seen||0)>0).length;
   const weak=subset.filter(needsReview).length;
   const mastered=subset.filter(isMastered).length;
   const percent=subset.length?Math.round(100*studied/subset.length):0;
   const wrap=document.createElement('div');wrap.className='topic-row';
   const title=document.createElement('div');title.className='title';title.textContent=topic;
   const details=document.createElement('div');details.className='detail';
   details.textContent=`${studied}/${subset.length} μελετημένες (${percent}%) · ${opened} ανοιγμένες · ${mastered} εμπεδωμένες · ${weak} για επανάληψη`;
   wrap.append(title,details);bytopic.append(wrap);
 }
}
function updateMatches(){$('#matches').textContent=`${scoped().length} ερωτήσεις στα τρέχοντα φίλτρα.`}
function shuffle(list){return list.map(q=>({q,r:Math.random()})).sort((a,b)=>a.r-b.r).map(x=>x.q)}
function makePool(){
 const all=scoped(),mode=$('#order').value;
 if(mode==='number')return all;
 if(mode==='weak')return all.slice().sort((a,b)=>{const x=st(a),y=st(b);return(y.weak*4-y.streak*2-y.seen*.05)-(x.weak*4-x.streak*2-x.seen*.05)});
 const unseen=all.filter(q=>!(state[q.id]?.seen>0));
 const practicing=all.filter(q=>(state[q.id]?.seen>0)&&!isStudied(q));
 const learned=all.filter(isStudied);
 const byNeed=(a,b)=>(st(b).weak-st(a).weak)||(st(a).streak-st(b).streak);
 return [...shuffle(unseen),...shuffle(practicing).sort(byNeed),...shuffle(learned).sort(byNeed)];
}
function sourceModal(q){
 const area=$('#sourceDialogContent');area.replaceChildren();
 const text=(str)=>{let p=document.createElement('p');p.textContent=str;area.append(p);return p};
 text(`Πρωτότυπη ερώτηση: ΕΟΠΠΕΠ, Ομάδα ${q.group}, αριθμός ${q.number}, σελίδα ${q.page} του 18σέλιδου καταλόγου.`);
 const base=document.createElement('p');addLink(base,qSourceLink(q),'Άνοιγμα πρωτότυπου PDF στην αντίστοιχη σελίδα');area.append(base);
 if(q.answerStatus==='reviewed_educational'){
  text(hasDocumentedReview(q)?'Υπάρχει παλαιότερη καταγεγραμμένη στοχευμένη ανασκόπηση, διαφορετικού βάθους και πιθανώς με επιφυλάξεις. Αυτό δεν αποτελεί επίσημη απάντηση ή ανεξάρτητη επιστημονική πιστοποίηση.':'Υπάρχει εκπαιδευτική απάντηση με βιβλιογραφικό σύνδεσμο, αλλά δεν υπάρχει ξεχωριστή καταγραφή στοχευμένης ανασκόπησης για το συγκεκριμένο θέμα. Αυτό δεν αποδεικνύει ότι κανείς δεν το διάβασε παλιότερα.');
 }else{
  text('Η απάντηση είναι ΠΡΟΣΧΕΔΙΟ σε εκκρεμή επιστημονικό έλεγχο και δεν βαθμολογείται.');
 }
 if(q.sourceUrl){const p=document.createElement('p');addLink(p,q.sourceUrl,'Άνοιγμα βιβλιογραφικής πηγής');area.append(p)}
 if(q.sourceLocation)text(`Παραπομπή: ${q.sourceLocation}`);
 if(q.sourceChecked)text(`Καταγραφή ελέγχου: ${q.sourceChecked}`);
 if(q.reviewAudit20261026?.finding)text(`Παλαιότερος στοχευμένος έλεγχος: ${q.reviewAudit20261026.finding}`);
 if(q.reviewAudit20261026Followup?.finding)text(`Επανέλεγχος: ${q.reviewAudit20261026Followup.finding}`);
 if(q.finalAudit20261026?.finding)text(`Τελική επανεξέταση: ${q.finalAudit20261026.finding}`);
 if(q.webResearch20261026?.qualification)text(`Διευκρίνιση: ${q.webResearch20261026.qualification}`);
 if(q.reviewNote)text(`Σημείωση επιστημονικού ελέγχου: ${q.reviewNote}`);
 if(q.answerProvenance)text(q.answerProvenance);
 $('#sourceDialog').showModal();
}
function showHome(){if(pool[index]&&$('#draft'))st(pool[index]).draft=$('#draft').value;save();$('#homeView').classList.remove('hidden');$('#examView').classList.add('hidden');updateMetrics();window.scrollTo({top:0,behavior:'smooth'})}
function showExam(){$('#homeView').classList.add('hidden');$('#examView').classList.remove('hidden');$('#setup').classList.remove('hidden');$('#study').classList.add('hidden');updateMatches();window.scrollTo({top:0,behavior:'smooth'})}
function present(){
 if(!pool.length){$('#study').classList.add('hidden');$('#setup').classList.remove('hidden');return}
 const q=pool[index],s=st(q);s.seen=(s.seen||0)+1;save();updateMetrics();shownAnswer=false;
 $('#qmeta').textContent=`Ομάδα ${q.group} · Θέμα ${q.number}`;
 $('#qOriginal').href=qSourceLink(q);
 $('#qcount').textContent=`${index+1} / ${pool.length}`;
 $('#qstatus').textContent=labelStatus(q);
 $('#qstatus').classList.toggle('review',q.answerStatus==='editorial_review_needed');
 $('#qtitle').textContent=q.question;
 $('#qtopic').textContent=q.studyTopic+' · βοηθητική θεματική';
 $('#draft').value=s.draft||'';
 $('#answerPanel').classList.add('hidden');$('#assessment').classList.add('hidden');$('#prev').disabled=index===0;
 $('#study').scrollIntoView({behavior:'smooth',block:'start'});
}
function showAnswer(){const q=pool[index];shownAnswer=true;$('#answerPanel').classList.remove('hidden');const known=q.answerStatus==='reviewed_educational',draft=q.answerStatus==='editorial_review_needed';$('#solution').classList.toggle('hidden',!(known||draft));$('#solution').classList.toggle('review',!known);$('#nosolution').classList.toggle('hidden',known||draft);$('#assessment').classList.toggle('hidden',!known);$('#solution').textContent=(known?'Ενδεικτική εκπαιδευτική απάντηση — όχι επίσημο λυσάρι:\n\n':'ΠΡΟΣΧΕΔΙΟ — σε ειδικό έλεγχο, χωρίς βαθμολογία:\n\n')+(q.answer||'');const p=$('#sourceLine');p.replaceChildren();addLink(p,qSourceLink(q),'ΕΟΠΠΕΠ — πρωτότυπο θέμα');p.append(document.createTextNode(' · '));if(!addLink(p,q.sourceUrl,'Βιβλιογραφική πηγή'))p.append(document.createTextNode('Πηγή μη διαθέσιμη'));let b=document.createElement('button');b.type='button';b.className='pill-button';b.style.marginLeft='8px';b.textContent='Λεπτομέρειες πηγής ⓘ';b.onclick=()=>sourceModal(q);p.append(b)}
function assess(correct){const q=pool[index];if(!shownAnswer||q.answerStatus!=='reviewed_educational')return;const s=st(q);s.selfAttempts=(s.selfAttempts||0)+1;if(correct){s.selfCorrect=(s.selfCorrect||0)+1;s.streak=(s.streak||0)+1}else{s.streak=0;s.weak=(s.weak||0)+1}save();updateMetrics();$('#assessment').classList.add('hidden');$('#sourceLine').append(document.createTextNode(' · Αυτοαξιολόγηση καταχωρίστηκε.'))}
function advance(n){index+=n;if(index>=pool.length){pool=makePool();index=0}if(index<0)index=0;present()}
// Browse all 314 official questions without starting a random practice session.
let allQuestionsRendered=false;
function renderAllQuestions(){
 const host=$('#allQuestionsList');
 if(!host||allQuestionsRendered)return;
 if(!bank.length){host.textContent='Φόρτωση ερωτήσεων…';return;}
 host.replaceChildren();
 for(const group of ['A','B']){
  const heading=document.createElement('h3');
  heading.className='all-questions-heading';
  heading.textContent=group==='A'?'Ομάδα Α · Γενικές (105)':'Ομάδα Β · Ειδικές (209)';
  host.append(heading);
  const list=document.createElement('ol');
  list.className='all-questions-group';
  for(const q of bank.filter(q=>q.group===group).sort((a,b)=>Number(a.number)-Number(b.number))){
   const li=document.createElement('li');
   const button=document.createElement('button');
   button.type='button';
   button.className='all-question-item';
   button.textContent=String(q.number)+'. '+q.question;
   button.addEventListener('click',()=>openCatalogQuestion(q.id));
   li.append(button);list.append(li);
  }
  host.append(list);
 }
 allQuestionsRendered=true;
}
function openCatalogQuestion(questionId){
 if(!bank.length)return;
 $('#group').value='all';
 $('#statusFilter').value='all';
 $('#topic').value='all';
 $('#search').value='';
 $('#order').value='number';
 pool=bank.slice().sort((a,b)=>a.group.localeCompare(b.group)||Number(a.number)-Number(b.number));
 index=pool.findIndex(q=>q.id===questionId);
 if(index<0)return;
 showExam();
 $('#setup').classList.add('hidden');
 $('#study').classList.remove('hidden');
 present();
}
const allQuestionsPanel=$('#allQuestionsPanel'),allQuestionsToggle=$('#allQuestionsToggle');
if(allQuestionsPanel&&allQuestionsToggle){
 const home=$('#homeView');
 const originalParent=allQuestionsPanel.parentNode;
 const originalAnchor=document.createComment('restore-catalog-here');
 allQuestionsPanel.after(originalAnchor);
 const desktop=window.matchMedia('(min-width:960px)');
 function syncCatalogLayout(){
  const asSide=desktop.matches&&allQuestionsPanel.open;
  if(asSide){
   if(allQuestionsPanel.parentNode!==home)home.insertBefore(allQuestionsPanel,home.firstElementChild.nextSibling);
  }else if(allQuestionsPanel.parentNode!==originalParent){
   originalParent.insertBefore(allQuestionsPanel,originalAnchor);
  }
  allQuestionsPanel.classList.toggle('catalog-side-panel',asSide);
  home.classList.toggle('catalog-open-desktop',asSide);
 }
 desktop.addEventListener('change',syncCatalogLayout);
 allQuestionsPanel.addEventListener('toggle',()=>{
  allQuestionsToggle.setAttribute('aria-expanded',String(allQuestionsPanel.open));
  if(allQuestionsPanel.open)renderAllQuestions();
  syncCatalogLayout();
 });
 allQuestionsToggle.addEventListener('click',()=>{
  allQuestionsPanel.open=!allQuestionsPanel.open;
  syncCatalogLayout();
  allQuestionsToggle.setAttribute('aria-expanded',String(allQuestionsPanel.open));
  if(allQuestionsPanel.open){
   renderAllQuestions();
   if(!desktop.matches)allQuestionsPanel.scrollIntoView({behavior:'smooth',block:'start'});
  }
 });
 syncCatalogLayout();
}
$('#openExam').onclick=showExam;$('#goHome').onclick=showHome;
$('#begin').onclick=()=>{pool=makePool();if(!pool.length)return updateMatches();index=0;$('#setup').classList.add('hidden');$('#study').classList.remove('hidden');present()};
$('#end').onclick=()=>{$('#study').classList.add('hidden');$('#setup').classList.remove('hidden');updateMatches()};
$('#resetFilters').onclick=()=>{$('#group').value='all';$('#statusFilter').value='all';$('#topic').value='all';$('#order').value='coverage';$('#search').value='';updateMatches()};
for(const el of ['#group','#topic','#order','#statusFilter','#search'])$(el).addEventListener('input',updateMatches);
$('#draft').oninput=e=>{if(pool[index]){st(pool[index]).draft=e.target.value;save()}};
$('#qstatus').onclick=()=>{if(pool[index])sourceModal(pool[index])};
$('#closeDialog').onclick=()=>$('#sourceDialog').close();$('#sourceDialog').onclick=e=>{if(e.target===$('#sourceDialog'))$('#sourceDialog').close()};
$('#showAnswer').onclick=showAnswer;$('#markReview').onclick=()=>{const q=pool[index];if(!q)return;const s=st(q);s.weak=(s.weak||0)+1;s.streak=0;save();updateMetrics();$('#qstatus').textContent='Σημειώθηκε για επανάληψη · πηγή ⓘ'};
$('#selfCorrect').onclick=()=>assess(true);$('#selfIncorrect').onclick=()=>assess(false);
$('#next').onclick=()=>advance(1);$('#prev').onclick=()=>advance(-1);
// Older pages may still have the legacy single-section export button.
if ($('#export')) $('#export').onclick=()=>{let blob=new Blob([JSON.stringify({schema:'ekab-official-progress-v19',date:new Date().toISOString(),progress:state},null,2)],{type:'application/json'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='ekab-eoppep-progress-v19.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)};
$('#reset').onclick=()=>{if(confirm('Πρώτη επιβεβαίωση: να μηδενιστεί η πρόοδος στις 314 ερωτήσεις ΕΟΠΠΕΠ;')&&confirm('Τελική επιβεβαίωση: η πρόοδος ΕΟΠΠΕΠ θα διαγραφεί από τη συσκευή. Τα κεφάλαια ΣΑΕΚ και τα PDF δεν θα επηρεαστούν. Συνέχεια;')){state={};save();updateMetrics()}};
$('#restore').onchange=async e=>{try{let f=e.target.files?.[0];if(!f)return;if(f.size>2000000)throw Error('Το αρχείο είναι πολύ μεγάλο.');const data=JSON.parse(await f.text());if(!['ekab-official-progress-v15','ekab-official-progress-v16','ekab-official-progress-v17','ekab-official-progress-v18','ekab-official-progress-v19'].includes(data.schema)||!data.progress||typeof data.progress!=='object'||Array.isArray(data.progress))throw Error('Δεν αναγνωρίστηκε αρχείο προόδου v15–v19.');const allowed=new Set(bank.map(q=>q.id)),clean={};for(const [id,v] of Object.entries(data.progress)){if(!allowed.has(id))continue;if(!v||!Number.isInteger(v.seen)||v.seen<0||!Number.isInteger(v.weak)||v.weak<0||!Number.isInteger(v.streak)||v.streak<0||typeof v.draft!=='string'||v.draft.length>25000)throw Error('Μη έγκυρα δεδομένα προόδου.');clean[id]={seen:v.seen,weak:v.weak,streak:v.streak,selfCorrect:Number(v.selfCorrect)||0,selfAttempts:Number(v.selfAttempts)||0,draft:v.draft}}if(!confirm('Να αντικατασταθεί η τωρινή πρόοδος;'))return;state=clean;save();updateMetrics();$('#restoreNotice').textContent='Η πρόοδος επαναφέρθηκε.'}catch(err){$('#restoreNotice').textContent='Σφάλμα: '+err.message}e.target.value=''};
async function init(){state=saved();try{const response=await fetch(BANK_URL);if(!response.ok)throw Error('HTTP '+response.status);bank=await response.json();if(bank.length!==314||bank.filter(q=>q.group==='A').length!==105||bank.filter(q=>q.group==='B').length!==209)throw Error('Ασυμφωνία πλήθους επίσημων θεμάτων.')}catch(err){console.error(err);$('.intro-note').textContent='Δεν φορτώθηκε η επίσημη τράπεζα. Ανέβασε όλα τα αρχεία αποσυμπιεσμένα στον ίδιο φάκελο GitHub Pages.';return}for(const topic of [...new Set(bank.map(q=>q.studyTopic))].sort((a,b)=>a.localeCompare(b,'el'))){let option=document.createElement('option');option.value=topic;option.textContent=topic;$('#topic').append(option)}const documentedOption=$('#statusFilter option[value="documented_review"]');if(documentedOption)documentedOption.textContent=`Ιστορικό στοχευμένης ανασκόπησης (${bank.filter(hasDocumentedReview).length})`;const directOption=$('#statusFilter option[value="directly_checked"]');if(directOption)directOption.textContent=`Καταγεγραμμένος έλεγχος πηγής / sourceChecked (${bank.filter(q=>Boolean(q.sourceChecked)).length})`;updateMetrics();updateMatches();if($('#allQuestionsPanel')?.open)renderAllQuestions()}
init(); // Service worker registration is managed by updates.js on every page.
