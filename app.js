'use strict';
const BANK_URL='official_questions.json', STORAGE='ekab-eoppep-official-v15';
const $=selector=>document.querySelector(selector);
let bank=[], state={}, pool=[], index=-1, shownAnswer=false;
const lockedThisRun=new Set(), gradedFeedback=new Map();
let gradingPending=false;
const scheduler=window.EkabStudyScheduler;
if(!scheduler)throw new Error('Δεν φορτώθηκε ο προγραμματισμός επαναλήψεων. Ενημέρωσε την εφαρμογή.');
let catalogSelectedId=null;
let eoppepSos=null,eoppepSosPromise=null;
function renderReadySos(questionId){
 const host=$('#catalogReaderReadySos');if(!host)return;
 host.replaceChildren();
 if(!eoppepSos){host.textContent='Φόρτωση έτοιμων SOS…';return}
 const entry=eoppepSos.get(questionId);
 const question=bank.find(q=>q.id===questionId);
 if(!question){host.textContent='Δεν βρέθηκε η ερώτηση.';return}
 const source=String(question.answer||'').replace(/\s+/g,' ').trim();
 const listed=entry?.points||[];
 // If another scientific review edited the official answer, never display stale SOS.
 const exact=listed.length>0&&listed.every(point=>source.includes(point));
 let points=exact?listed:source.split(/(?<=[.!?;])\s+(?=[Α-ΩΆΈΉΊΌΎΏA-Zα-ωάέήίόύώ0-9(«])/u).map(s=>s.trim()).filter(s=>s.length>=16).slice(0,4);
 if(!points.length&&source)points=[source];
 if(!points.length){host.textContent='Δεν υπάρχει ακόμη διαθέσιμη ενδεικτική απάντηση για SOS.';return}
 const list=document.createElement('ul');
 for(const point of points){const li=document.createElement('li');li.textContent=point;list.append(li)}
 host.append(list);
 if(!exact){const note=document.createElement('p');note.className='small muted';note.textContent='Τα AI Hint SOS ενημερώθηκαν σύμφωνα με το νεότερο εκπαιδευτικό περιεχόμενο.';host.append(note)}
}
function loadReadySos(questionId){
 renderReadySos(questionId);
 if(eoppepSos)return;
 if(!eoppepSosPromise)eoppepSosPromise=fetch('eoppep-sos.json').then(r=>{if(!r.ok)throw Error('SOS HTTP '+r.status);return r.json()}).then(json=>{if(json.count!==314||json.items?.length!==314)throw Error('SOS inventory mismatch');eoppepSos=new Map(json.items.map(x=>[x.id,x]));return eoppepSos}).catch(err=>{eoppepSosPromise=null;console.warn('SOS',err);const host=$('#catalogReaderReadySos');if(host)host.textContent='Τα έτοιμα SOS δεν φορτώθηκαν. Δοκίμασε ενημέρωση της εφαρμογής.'});
 eoppepSosPromise.then(()=>{if(catalogSelectedId===questionId)renderReadySos(questionId)});
}

function saved(){try{return JSON.parse(localStorage.getItem(STORAGE))||{}}catch{return{}}}
function save(){try{localStorage.setItem(STORAGE,JSON.stringify(state));window.dispatchEvent(new Event('ekab:progress-changed'))}catch(e){console.warn('Αποτυχία αποθήκευσης',e)}}
function st(q){return state[q.id]||(state[q.id]={seen:0,weak:0,selfCorrect:0,selfAttempts:0,streak:0,draft:''})}
function qSourceLink(q){return `eoppep-source.pdf#page=${Number(q.page)||1}`}
function addLink(parent,href,label){if(typeof href!=='string'||!/^https:\/\//i.test(href)&&!/^eoppep-source\.pdf(?:#page=\d+)?$/.test(href))return null;const a=document.createElement('a');a.href=href;a.textContent=label;a.target='_blank';a.rel='noopener noreferrer';parent.append(a);return a}
function hasDocumentedReview(q){return Boolean(q.sourceChecked||q.reviewAudit20261026||q.reviewAudit20261026Followup||q.finalAudit20261026||q.webResearch20261026)}
function scoped(){const group=$('#group').value,topic=$('#topic').value,status=$('#statusFilter').value,find=$('#search').value.trim().toLocaleLowerCase('el');return bank.filter(q=>(group==='all'||q.group===group)&&(topic==='all'||q.studyTopic===topic)&&(status==='all'||(status==='directly_checked'&&Boolean(q.sourceChecked))||(status==='documented_review'&&hasDocumentedReview(q))||(status==='passage_check_pending'&&q.sourceReview?.status==='citation_indexed_pending_passage_check')||q.answerStatus===status)&&(!find||q.question.toLocaleLowerCase('el').includes(find)||q.id.toLowerCase().includes(find)))}
function labelStatus(q){const status=q.sourceReview?.status;if(status==='documented_source_check')return 'Απάντηση · καταγεγραμμένος έλεγχος πηγής ⓘ';if(status==='historical_targeted_review')return 'Απάντηση · ιστορική ανασκόπηση ⓘ';if(status==='citation_indexed_pending_passage_check')return 'Απάντηση με πηγή · εκκρεμεί έλεγχος χωρίου ⓘ';if(hasDocumentedReview(q))return 'Απάντηση · ιστορικό ανασκόπησης ⓘ';return 'Εκπαιδευτική απάντηση · δείτε την τεκμηρίωση ⓘ'}
// A question is learned only after successful recalls on separate dates.
function learning(q){return scheduler.evaluate(state[q.id])}
function isStudied(q){return learning(q).studied}
function isRead(q){return typeof state[q.id]?.readCompletedAt==='string'&&Number.isFinite(Date.parse(state[q.id].readCompletedAt))}
function isMastered(q){return learning(q).mastered}
function needsReview(q){const s=state[q.id];return Boolean(s&&scheduler.isDue(s))}
function renderDueToday(){
 const container=$('#dueTodayList'),count=$('#dueTodayCount');
 if(!container||!count)return;
 const due=bank.filter(needsReview).sort((a,b)=>{
  const x=state[a.id]||{},y=state[b.id]||{};
  return (Number(y.weak)||0)-(Number(x.weak)||0)||Date.parse(x.nextReviewAt||'9999-01-01')-Date.parse(y.nextReviewAt||'9999-01-01');
 });
 count.textContent=String(due.length);
 container.replaceChildren();
 if(!due.length){const p=document.createElement('p');p.className='small muted';p.textContent='Δεν υπάρχουν προγραμματισμένες επαναλήψεις τώρα. Όταν απαντάς σωστά ή δυσκολεύεσαι, η εφαρμογή θα σου προτείνει πότε να επανέλθεις.';container.append(p);return}
 for(const q of due.slice(0,8)){
  const button=document.createElement('button');button.type='button';button.className='due-item';
  const preview=q.question.length>105?q.question.slice(0,105)+'…':q.question;
  button.textContent=`Ομάδα ${q.group} · ${q.number} — ${preview}`;
  button.addEventListener('click',()=>openScheduledQuestion(q.id));
  container.append(button);
 }
 if(due.length>8){const more=document.createElement('p');more.className='small muted';more.textContent=`Εμφανίζονται οι 8 πιο επείγουσες από ${due.length} εκκρεμείς επαναλήψεις.`;container.append(more)}
}
function updateMetrics(){
 $('#seenCount').textContent=bank.filter(isStudied).length;
  $('#readCount').textContent=String(bank.filter(isRead).length);
 $('#allCount').textContent=bank.length;
 $('#verifiedCount').textContent=bank.filter(q=>q.answerStatus==='reviewed_educational').length;
 const old=bank.filter(q=>{const s=state[q.id];return s&&(s.selfCorrect||0)>0&&!(Array.isArray(s.reviewHistory)&&s.reviewHistory.length)}).length;
 const oldNotice=$('#legacyProgressNotice');
 if(oldNotice){oldNotice.hidden=old===0;oldNotice.textContent=old?`${old} ερωτήσεις έχουν παλαιότερες σωστές προσπάθειες χωρίς ημερομηνίες. Το ιστορικό διατηρείται, αλλά δεν θεωρείται αυτόματα επιτυχία με χρονική απόσταση.`:''}
 const target=$('#groupProgress');target.replaceChildren();
 for(const [g,title] of [['A','Γενικές Ερωτήσεις'],['B','Ειδικές Ερωτήσεις']]){
  const items=bank.filter(q=>q.group===g),studied=items.filter(isStudied).length,opened=items.filter(q=>(state[q.id]?.seen||0)>0).length,mastered=items.filter(isMastered).length,weak=items.filter(needsReview).length;
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
  const left=document.createElement('span');left.textContent=`${studied} / ${items.length} μελετημένες · ${opened} ανοιγμένες`;
  const right=document.createElement('span');right.textContent=`${mastered} εμπεδωμένες · ${weak} για επανάληψη`;
  detail.append(left,right);node.append(top,progress,detail);target.append(node);
 }
 const bytopic=$('#topicProgress');bytopic.replaceChildren();
 for(const topic of [...new Set(bank.map(q=>q.studyTopic))].sort((a,b)=>a.localeCompare(b,'el'))){
  const subset=bank.filter(q=>q.studyTopic===topic),studied=subset.filter(isStudied).length,opened=subset.filter(q=>(state[q.id]?.seen||0)>0).length,mastered=subset.filter(isMastered).length,weak=subset.filter(needsReview).length;
  const percent=subset.length?Math.round(100*studied/subset.length):0;
  const wrap=document.createElement('div');wrap.className='topic-row';
  const title=document.createElement('div');title.className='title';title.textContent=topic;
  const details=document.createElement('div');details.className='detail';
  details.textContent=`${studied}/${subset.length} μελετημένες (${percent}%) · ${opened} ανοιγμένες · ${mastered} εμπεδωμένες · ${weak} για επανάληψη`;
  wrap.append(title,details);bytopic.append(wrap);
 }
 renderDueToday();
}
function updateMatches(){$('#matches').textContent=`${scoped().length} ερωτήσεις στα τρέχοντα φίλτρα.`}
function shuffle(list){return list.map(q=>({q,r:Math.random()})).sort((a,b)=>a.r-b.r).map(x=>x.q)}
function makePool(){
 const all=scoped(),mode=$('#order').value;
 if(mode==='number')return all;
 if(mode==='weak')return all.slice().sort((a,b)=>Number(needsReview(b))-Number(needsReview(a))||(st(b).weak*4-st(b).streak*2)-(st(a).weak*4-st(a).streak*2));
 const unseen=all.filter(q=>!st(q).seen),due=all.filter(q=>st(q).seen&&needsReview(q)),practicing=all.filter(q=>st(q).seen&&!isStudied(q)&&!needsReview(q)),learned=all.filter(q=>isStudied(q)&&!needsReview(q));
 return [...shuffle(unseen),...shuffle(due).sort((a,b)=>(st(b).weak||0)-(st(a).weak||0)),...shuffle(practicing),...shuffle(learned)];
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
 if(q.sourceReview){const titles={documented_source_check:'Καταγεγραμμένος έλεγχος πηγής',historical_targeted_review:'Παλαιότερη στοχευμένη ανασκόπηση',citation_indexed_pending_passage_check:'Πηγή καταχωρισμένη — εκκρεμεί επαλήθευση σχετικού χωρίου'};text('Ατομική καρτέλα τεκμηρίωσης: '+(titles[q.sourceReview.status]||'Καταγραφή πηγής'));text(q.sourceReview.reviewNote||'');if(q.sourceReview.sourceKind?.startsWith('γενική'))text('Σημείωση: η παρούσα παραπομπή είναι γενική και χρειάζεται ακριβέστερη υποενότητα.');text('Ο έλεγχος δεν αποτελεί επίσημο λυσάρι ή κλινική πιστοποίηση.');}
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
function showExam(){lockedThisRun.clear();gradedFeedback.clear();$('#homeView').classList.add('hidden');$('#examView').classList.remove('hidden');$('#setup').classList.remove('hidden');$('#study').classList.add('hidden');updateMatches();window.scrollTo({top:0,behavior:'smooth'})}
function present(){
 if(!pool.length){$('#study').classList.add('hidden');$('#setup').classList.remove('hidden');return}
 const q=pool[index],s=st(q);s.seen=(s.seen||0)+1;save();updateMetrics();shownAnswer=false;
 $('#eoppepAIResult').hidden=true;$('#eoppepGradeAI').disabled=false;$('#eoppepGradeAI').hidden=false;$('#showAnswer').hidden=false;$('#showAnswer').disabled=false;$('#eoppepGradeAI').textContent='Υποβολή αξιολόγησης';
 $('#qmeta').textContent=`Ομάδα ${q.group} · Θέμα ${q.number}`;
 $('#qOriginal').href=qSourceLink(q);
 $('#qcount').textContent=`${index+1} / ${pool.length}`;
 $('#qstatus').textContent=labelStatus(q);
 $('#qstatus').classList.toggle('review',q.answerStatus==='editorial_review_needed');
 $('#qtitle').textContent=q.question;
 $('#qtopic').textContent=q.studyTopic+' · βοηθητική θεματική';
 $('#draft').value=s.draft||'';$('#draft').readOnly=lockedThisRun.has(q.id);
 $('#answerPanel').classList.add('hidden');$('#assessment').classList.add('hidden');$('#prev').disabled=index===0;
 if(lockedThisRun.has(q.id)){
  showAnswer();lockExamAnswer();
  const previous=gradedFeedback.get(q.id);
  if(previous&&window.EkabAIGrade)window.EkabAIGrade.render($('#eoppepAIResult'),previous);
 }
 $('#study').scrollIntoView({behavior:'smooth',block:'start'});
}
function lockExamAnswer(){
 $('#draft').readOnly=true;
 $('#eoppepGradeAI').disabled=true;$('#eoppepGradeAI').hidden=true;
 $('#showAnswer').disabled=true;$('#showAnswer').hidden=true;
 $('#assessment').classList.add('hidden');
}
function showAnswer(){const q=pool[index];shownAnswer=true;$('#answerPanel').classList.remove('hidden');const known=q.answerStatus==='reviewed_educational',draft=q.answerStatus==='editorial_review_needed';$('#solution').classList.toggle('hidden',!(known||draft));$('#solution').classList.toggle('review',!known);$('#nosolution').classList.toggle('hidden',known||draft);$('#assessment').classList.toggle('hidden',!known);$('#solution').textContent=(known?'Ενδεικτική εκπαιδευτική απάντηση — όχι επίσημο λυσάρι:\n\n':'ΠΡΟΣΧΕΔΙΟ — σε ειδικό έλεγχο, χωρίς βαθμολογία:\n\n')+(q.answer||'');const p=$('#sourceLine');p.replaceChildren();addLink(p,qSourceLink(q),'ΕΟΠΠΕΠ — πρωτότυπο θέμα');p.append(document.createTextNode(' · '));if(!addLink(p,q.sourceUrl,'Βιβλιογραφική πηγή'))p.append(document.createTextNode('Πηγή μη διαθέσιμη'));let b=document.createElement('button');b.type='button';b.className='pill-button';b.style.marginLeft='8px';b.textContent='Λεπτομέρειες πηγής ⓘ';b.onclick=()=>sourceModal(q);p.append(b)}
function assess(result){
 const q=pool[index];if(!q||!shownAnswer||q.answerStatus!=='reviewed_educational')return;
 const s=st(q),outcome=scheduler.record(s,result);
 save();updateMetrics();
 $('#assessment').classList.add('hidden');
 const label=result==='correct'?'Ανάκληση χωρίς βοήθεια':result==='assisted'?'Χρειάστηκα βοήθεια':'Δεν το θυμήθηκα';
 const next=outcome.nextReviewAt?scheduler.dateLabel(outcome.nextReviewAt):'';
 $('#sourceLine').append(document.createTextNode(` · ${label} καταχωρίστηκε.${next?' Επόμενη επανάληψη: '+next+'.':''}`));
}
function openScheduledQuestion(questionId){
 $('#group').value='all';$('#statusFilter').value='all';$('#topic').value='all';$('#search').value='';$('#order').value='weak';
 const due=bank.filter(needsReview);
 pool=due.length?due:bank.slice();
 index=pool.findIndex(q=>q.id===questionId);
 if(index<0){pool=bank.slice();index=pool.findIndex(q=>q.id===questionId)}
 if(index<0)return;
 showExam();$('#setup').classList.add('hidden');$('#study').classList.remove('hidden');present();
}
function advance(n){index+=n;if(index>=pool.length){pool=makePool();index=0}if(index<0)index=0;present()}
// The 314-question catalog is a READER, not the exam/self-assessment flow.
// Read-only 314-question catalog. Page results so the bottom is never clipped.
let allQuestionsRendered=false,catalogVisibleLimit=24;
function normalizeCatalogText(s){return String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('el').replace(/ς/g,'σ')}
function renderAllQuestions(){
 const host=$('#allQuestionsList');
 if(!host||allQuestionsRendered)return;
 if(!bank.length){host.textContent='Φόρτωση ερωτήσεων…';return}
 host.replaceChildren();
 for(const group of ['A','B']){
  const heading=document.createElement('h3');heading.className='all-questions-heading';
  heading.textContent=group==='A'?'Ομάδα Α · Γενικές (105)':'Ομάδα Β · Ειδικές (209)';
  host.append(heading);
  const list=document.createElement('ol');list.className='all-questions-group';
  for(const q of bank.filter(q=>q.group===group).sort((x,y)=>Number(x.number)-Number(y.number))){
   const li=document.createElement('li'),button=document.createElement('button');
   button.type='button';button.className='all-question-item';
   button.dataset.questionId=q.id;button.dataset.group=q.group;
   button.textContent=String(q.number)+'. '+q.question;
   button.addEventListener('click',()=>openCatalogQuestion(q.id));
   li.append(button);list.append(li);
  }
  host.append(list);
 }
 allQuestionsRendered=true;filterCatalog();
}
function filterCatalog(){
 const q=normalizeCatalogText($('#catalogSearch')?.value||'').trim();
 const group=$('#catalogGroupFilter')?.value||'all';
 const root=$('#allQuestionsList');if(!root)return;
 const all=[...root.querySelectorAll('.all-question-item')];
 let total=0,visible=0;
 for(const btn of all){
  const matches=(group==='all'||btn.dataset.group===group)&&(!q||q.split(/\s+/).every(w=>normalizeCatalogText(btn.textContent).includes(w)));
  if(matches){total++;const show=total<=catalogVisibleLimit;btn.parentElement.hidden=!show;if(show)visible++}
  else btn.parentElement.hidden=true;
 }
 for(const heading of root.querySelectorAll('.all-questions-heading')){
  const list=heading.nextElementSibling;
  heading.hidden=!Array.from(list?.children||[]).some(li=>!li.hidden);
 }
 const count=$('#catalogResultInfo');if(count)count.textContent=total?`Εμφανίζονται ${visible} από ${total} αποτελέσματα · κύλισε τη σελίδα για τα υπόλοιπα.`:'Δεν βρέθηκε αντίστοιχη ερώτηση.';
 const more=$('#catalogMore');if(more){more.hidden=total<=catalogVisibleLimit;more.textContent=`Εμφάνιση ${Math.min(24,total-catalogVisibleLimit)} ακόμη ερωτήσεων`;}
 updateCatalogReaderNavigation();
}
// Catalog navigation uses the same group/search filters as the visible question list.
// Pagination only limits rendering; it must not block moving to later matches.
function catalogNavigationSequence(){
 const group=$('#catalogGroupFilter')?.value||'all';
 const terms=normalizeCatalogText($('#catalogSearch')?.value||'').trim().split(/\s+/).filter(Boolean);
 const buttons=Array.from(document.querySelectorAll('#allQuestionsList .all-question-item'));
 const matching=buttons.filter(btn=>(group==='all'||btn.dataset.group===group)&&terms.every(term=>normalizeCatalogText(btn.textContent).includes(term)));
 const candidates=matching.map(btn=>btn.dataset.questionId);
 if(catalogSelectedId&&candidates.includes(catalogSelectedId))return candidates;
 // A direct link or changed filter must never trap the reader outside the catalog.
 return buttons.map(btn=>btn.dataset.questionId);
}
function updateCatalogReaderNavigation(){
 const prev=$('#catalogReaderPrevious'),next=$('#catalogReaderNext');
 if(!prev||!next)return;
 const sequence=catalogNavigationSequence();
 const current=sequence.indexOf(catalogSelectedId);
 prev.disabled=current<=0;
 next.disabled=current<0||current>=sequence.length-1;
}
function moveCatalogQuestion(direction){
 if(!catalogSelectedId)return;
 const sequence=catalogNavigationSequence(),position=sequence.indexOf(catalogSelectedId);
 const nextId=sequence[position+direction];
 if(!nextId)return;
 // Make a matching question visible in the catalog even beyond the first 24 results.
 const nextIndex=sequence.indexOf(nextId);
 if(nextIndex>=catalogVisibleLimit){
  catalogVisibleLimit=Math.ceil((nextIndex+1)/24)*24;
  filterCatalog();
 }
 openCatalogQuestion(nextId);
}
function renderCatalogReader(q){
 const reader=$('#catalogReader');if(!reader)return;
 reader.classList.remove('hidden');
 $('#catalogReaderPlaceholder').hidden=true;
 $('#catalogReaderContent').hidden=false;
 $('#catalogReaderNumber').textContent=`Ομάδα ${q.group} · Ερώτηση ${q.number} / ${q.group==='A'?105:209}`;
 $('#catalogReaderQuestion').textContent=q.question;
 $('#catalogReaderTopic').textContent=q.studyTopic||'ΕΟΠΠΕΠ · Θεωρία';
 $('#catalogReaderAnswer').textContent=q.answer||'Δεν υπάρχει καταχωρισμένη απάντηση.';
 loadReadySos(q.id);
 const caution=$('#catalogReaderCaution');
 caution.textContent=q.answerStatus==='reviewed_educational'?'Ενδεικτική εκπαιδευτική απάντηση, όχι επίσημο λυσάρι ΕΟΠΠΕΠ.':'ΠΡΟΣΟΧΗ: Η ενδεικτική απάντηση παραμένει σε εκπαιδευτικό/επιστημονικό έλεγχο.';
 caution.classList.toggle('review',q.answerStatus!=='reviewed_educational');
 const sources=$('#catalogReaderSources');sources.replaceChildren();
 const p=document.createElement('p');addLink(p,qSourceLink(q),'Πρωτότυπη ερώτηση στο PDF (σελ. '+(Number(q.page)||1)+')');sources.append(p);
 if(q.sourceUrl){const p2=document.createElement('p');addLink(p2,q.sourceUrl,'Βιβλιογραφική πηγή');sources.append(p2)}
 if(q.sourceLocation){const p3=document.createElement('p');p3.textContent='Παραπομπή: '+q.sourceLocation;sources.append(p3)}
 if(q.reviewNote){const p4=document.createElement('p');p4.textContent='Σημείωση ελέγχου: '+q.reviewNote;sources.append(p4)}
 $('#catalogReaderSosNotes').value=st(q).sosNotes||'';
 $('#catalogReaderPersonalNotes').value=st(q).readerNotes||'';
  const read=isRead(q),markRead=$('#catalogReaderMarkRead');
  markRead.textContent=read?'✓ Διαβάστηκε · Αναίρεση':'✓ Σημείωσε ως διαβασμένη';
  markRead.setAttribute('aria-pressed',String(read));
  markRead.classList.toggle('is-read',read);
 const previous=$('#catalogReaderReviewState');
 previous.textContent=needsReview(q)?'Είναι ήδη στη λίστα επανάληψης.':'Οι σημειώσεις SOS είναι προσωπικές· δεν αποτελούν επιβεβαιωμένη ιατρική οδηγία.';
 for(const btn of document.querySelectorAll('#allQuestionsList .all-question-item')){
  const active=btn.dataset.questionId===q.id;
  btn.classList.toggle('selected',active);
  btn.setAttribute('aria-pressed',String(active));
 }
 updateCatalogReaderNavigation();
}
function openCatalogQuestion(questionId){
 const q=bank.find(item=>item.id===questionId);
 if(!q)return;
 catalogSelectedId=questionId;
 const progress=st(q);progress.seen=(Number(progress.seen)||0)+1;
 save();renderCatalogReader(q);updateMetrics();
 const reader=$('#catalogReader');
 reader.scrollIntoView({behavior:'smooth',block:'start'});
}
$('#catalogReaderPrevious').addEventListener('click',()=>moveCatalogQuestion(-1));
$('#catalogReaderNext').addEventListener('click',()=>moveCatalogQuestion(1));
$('#catalogReaderMarkRead').addEventListener('click',()=>{
  const q=bank.find(item=>item.id===catalogSelectedId);if(!q)return;
  const progress=st(q);
  if(isRead(q))delete progress.readCompletedAt;
  else progress.readCompletedAt=new Date().toISOString();
  save();renderCatalogReader(q);updateMetrics();
});
$('#catalogReaderClose').addEventListener('click',()=>{
 $('#catalogReaderContent').hidden=true;
 $('#catalogReaderPlaceholder').hidden=false;
 if(!$('#homeView').classList.contains('catalog-open-desktop'))$('#catalogReader').classList.add('hidden');
 if(catalogSelectedId){const btn=Array.from(document.querySelectorAll('#allQuestionsList .all-question-item')).find(x=>x.dataset.questionId===catalogSelectedId);if(btn){btn.classList.remove('selected');btn.setAttribute('aria-pressed','false');btn.focus()}}
 catalogSelectedId=null;
 updateCatalogReaderNavigation();
});
$('#catalogReaderSourceInfo').addEventListener('click',()=>{const q=bank.find(item=>item.id===catalogSelectedId);if(q)sourceModal(q)});
$('#catalogReaderMarkReview').addEventListener('click',()=>{
 const q=bank.find(item=>item.id===catalogSelectedId);if(!q)return;
 scheduler.markReview(st(q));save();updateMetrics();renderCatalogReader(q);
});
for(const [field,key] of [['#catalogReaderSosNotes','sosNotes'],['#catalogReaderPersonalNotes','readerNotes']]){
 $(field).addEventListener('input',()=>{
  const q=bank.find(item=>item.id===catalogSelectedId);if(!q)return;
  st(q)[key]=$(field).value.slice(0,15000);save();
 });
}
$('#catalogSearch').addEventListener('input',()=>{catalogVisibleLimit=24;filterCatalog()});
$('#catalogGroupFilter').addEventListener('change',()=>{catalogVisibleLimit=24;filterCatalog()});
$('#catalogMore').addEventListener('click',()=>{catalogVisibleLimit+=24;filterCatalog()});
const allQuestionsPanel=$('#allQuestionsPanel'),allQuestionsToggle=$('#allQuestionsToggle');
if(allQuestionsPanel&&allQuestionsToggle){
 const home=$('#homeView'),reader=$('#catalogReader');
 const originalParent=allQuestionsPanel.parentNode,originalReaderParent=reader.parentNode;
 const listAnchor=document.createComment('catalog-original-position'),readerAnchor=document.createComment('reader-original-position');
 allQuestionsPanel.after(listAnchor);reader.after(readerAnchor);
 const desktop=window.matchMedia('(min-width:960px)');
 function syncCatalogLayout(){
  const aside=desktop.matches&&allQuestionsPanel.open;
  if(aside){
   if(reader.parentNode!==home)home.insertBefore(reader,home.firstChild);
   if(allQuestionsPanel.parentNode!==home)home.insertBefore(allQuestionsPanel,home.querySelector('#topicsFold'));
   reader.classList.remove('hidden');
   if(!catalogSelectedId){$('#catalogReaderContent').hidden=true;$('#catalogReaderPlaceholder').hidden=false}
  }else{
   if(reader.parentNode!==originalReaderParent)originalReaderParent.insertBefore(reader,readerAnchor);
   if(allQuestionsPanel.parentNode!==originalParent)originalParent.insertBefore(allQuestionsPanel,listAnchor);
   if(!catalogSelectedId)reader.classList.add('hidden');
  }
  allQuestionsPanel.classList.toggle('catalog-side-panel',aside);
  home.classList.toggle('catalog-open-desktop',aside);
  allQuestionsToggle.setAttribute('aria-expanded',String(allQuestionsPanel.open));
 }
 desktop.addEventListener('change',syncCatalogLayout);
 allQuestionsPanel.addEventListener('toggle',()=>{if(allQuestionsPanel.open)renderAllQuestions();syncCatalogLayout()});
 allQuestionsToggle.addEventListener('click',()=>{
  allQuestionsPanel.open=!allQuestionsPanel.open;
  if(allQuestionsPanel.open){renderAllQuestions();catalogVisibleLimit=24;filterCatalog()}
  syncCatalogLayout();
  if(allQuestionsPanel.open&&!desktop.matches)allQuestionsPanel.scrollIntoView({behavior:'smooth',block:'start'});
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
$('#eoppepGradeAI').onclick=async ()=>{
 const q=pool[index],service=window.EkabAIGrade,button=$('#eoppepGradeAI'),output=$('#eoppepAIResult');
 if(!q||!service||gradingPending||lockedThisRun.has(q.id))return;
 if(q.answerStatus!=='reviewed_educational'){output.hidden=false;output.textContent='Η εκπαιδευτική λύση δεν έχει επαληθευτεί. Δεν μπορεί να καταχωριστεί βαθμός.';return}
 const answer=$('#draft').value.trim();
 if(answer.length<3){output.hidden=false;output.textContent='Γράψε πρώτα τη δική σου απάντηση.';return}
 if(shownAnswer){output.hidden=false;output.textContent='Η ενδεικτική λύση έχει ήδη εμφανιστεί. Συνέχισε στην επόμενη ερώτηση.';return}
 const qid=q.id,started=index;
 gradingPending=true;button.disabled=true;button.textContent='Γίνεται αξιολόγηση…';
 $('#draft').readOnly=true;$('#showAnswer').disabled=true;
 output.hidden=false;output.textContent='Ελέγχεται η απάντησή σου…';
 try{
  const result=await service.evaluate({section:'eoppep',questionId:qid,answer});
  if(pool[index]?.id!==qid||index!==started)return;
  showAnswer();
  if(result.verdict==='correct')assess('correct');
  else if(result.verdict==='partial')assess('assisted');
  else if(result.verdict==='incorrect')assess('incorrect');
  // Even an uncertain response ends this attempt without a grade.
  lockedThisRun.add(qid);gradedFeedback.set(qid,result);
  service.render(output,result);
  lockExamAnswer();
 }catch(err){
  if(pool[index]?.id!==qid||index!==started)return;
  output.hidden=false;output.className='ai-grading-result ai-grading-unavailable';
  output.textContent=err.message||'Η αξιολόγηση δεν ολοκληρώθηκε. Η απάντησή σου διατηρείται.';
 }finally{
  gradingPending=false;
  if(pool[index]?.id===qid&&index===started){
   const locked=lockedThisRun.has(qid);
   button.disabled=locked;button.hidden=locked;button.textContent='Υποβολή αξιολόγησης';
   $('#draft').readOnly=locked;$('#showAnswer').disabled=locked;
  }
 }
};
$('#showAnswer').onclick=()=>{
 const q=pool[index];if(!q||gradingPending||lockedThisRun.has(q.id))return;
 showAnswer();lockedThisRun.add(q.id);lockExamAnswer();
};$('#markReview').onclick=()=>{const q=pool[index];if(!q)return;const s=st(q);scheduler.markReview(s);save();updateMetrics();$('#qstatus').textContent='Σημειώθηκε για επανάληψη · πηγή ⓘ'};
$('#selfCorrect').onclick=()=>{};$('#selfAssisted').onclick=()=>{};$('#selfIncorrect').onclick=()=>{};
$('#next').onclick=()=>advance(1);$('#prev').onclick=()=>advance(-1);
// Older pages may still have the legacy single-section export button.
if ($('#export')) $('#export').onclick=()=>{let blob=new Blob([JSON.stringify({schema:'ekab-official-progress-v19',date:new Date().toISOString(),progress:state},null,2)],{type:'application/json'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='ekab-eoppep-progress-v19.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)};
async function init(){state=saved();try{const response=await fetch(BANK_URL);if(!response.ok)throw Error('HTTP '+response.status);bank=await response.json();if(bank.length!==314||bank.filter(q=>q.group==='A').length!==105||bank.filter(q=>q.group==='B').length!==209)throw Error('Ασυμφωνία πλήθους επίσημων θεμάτων.')}catch(err){console.error(err);$('.intro-note').textContent='Δεν φορτώθηκε η επίσημη τράπεζα. Ανέβασε όλα τα αρχεία αποσυμπιεσμένα στον ίδιο φάκελο GitHub Pages.';return}for(const topic of [...new Set(bank.map(q=>q.studyTopic))].sort((a,b)=>a.localeCompare(b,'el'))){let option=document.createElement('option');option.value=topic;option.textContent=topic;$('#topic').append(option)}const documentedOption=$('#statusFilter option[value="documented_review"]');if(documentedOption)documentedOption.textContent=`Ιστορικό στοχευμένης ανασκόπησης (${bank.filter(hasDocumentedReview).length})`;const directOption=$('#statusFilter option[value="directly_checked"]');if(directOption)directOption.textContent=`Καταγεγραμμένος έλεγχος πηγής / sourceChecked (${bank.filter(q=>Boolean(q.sourceChecked)).length})`;const pendingOption=$('#statusFilter option[value="passage_check_pending"]');if(pendingOption)pendingOption.textContent=`Περιμένουν αντιπαραβολή χωρίου (${bank.filter(q=>q.sourceReview?.status==='citation_indexed_pending_passage_check').length})`;updateMetrics();updateMatches();if($('#allQuestionsPanel')?.open)renderAllQuestions();
 // Global search opens the selected question in the READER, never in exam mode.
 const requested=new URLSearchParams(location.search).get('question');
 if(requested&&/^EOP-[AB]-\d{3}$/.test(requested)&&bank.some(q=>q.id===requested)){
  const catalog=$('#allQuestionsPanel');
  if(catalog){catalog.open=true;renderAllQuestions();requestAnimationFrame(()=>openCatalogQuestion(requested));}
 }

 // Shortcuts from the new EOPPEP hub: select reading or active recall.
 if(!requested){
  const route=new URLSearchParams(location.search);
  const group=['A','B'].includes(route.get('group'))?route.get('group'):'all';
  if(route.get('mode')==='exam'){
   showExam();$('#group').value=group;updateMatches();
  }else if(route.get('view')==='catalog'){
   $('#catalogGroupFilter').value=group;
   const button=$('#allQuestionsToggle');
   if(button&&!$('#allQuestionsPanel').open)button.click();
   else {renderAllQuestions();filterCatalog()}
  }
 }
}
init(); // Service worker registration is managed by updates.js on every page.

// Cloud changes refresh the existing in-memory study state without restarting a question.
window.addEventListener('ekab:cloud-applied',()=>{state=saved();updateMetrics();if(catalogSelectedId){const q=bank.find(item=>item.id===catalogSelectedId);if(q)renderCatalogReader(q)}if(pool[index])$('#draft').value=state[pool[index].id]?.draft||'';});
