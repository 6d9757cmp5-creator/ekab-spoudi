/**
 * ATLA — shared assistant shell, migration phase 1.
 * Reuses the legacy MENTOR retrieval/AI contract for zero backend duplication.
 * No grade or note writes; old lesson/exam stores remain untouched.
 */
// Preserve the existing local-only spaced-review popup as the legacy shell is retired.
import '../services/recall/popup.mjs';
import {retrieve,riskGuard,RISK_MESSAGE,nameCoverage,focusSnippet} from './knowledge/retrieve.mjs';
import {askAi,buildPayload,eligibleAiPassages} from './ai/client.mjs';
import {ATLA_AI,atlaAiHeaders} from './ai/config.mjs';
import {loadTurns,appendTurn,clearTurns,historyForAi,loadLearning,LEVEL_LABELS} from './student/memory.mjs';
import {canonicalLearnerProfile,teachingLevelFor,localStudyInsight} from './student/profile.mjs';
import {examMode} from './context/bridge.mjs';
import {SOURCES,transformSource,searchRecords} from './knowledge/read-only-index.mjs';
import {mockAtlasReply} from './ai/mock.mjs';
import {chooseTeachingTool,chooseTeachingModel} from './practice/tool-selector.mjs';
import {createVoice} from '../mentor/presence/voice.mjs';

const ROOT=new URL('../',import.meta.url);
const normalize=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/ς/g,'σ').toLocaleLowerCase('el');
const $=(tag,className='',text='')=>{const n=document.createElement(tag);if(className)n.className=className;if(text)n.textContent=text;return n;};
const safeStorage=()=>{try{return sessionStorage;}catch{return {getItem:()=>null,setItem:()=>{},removeItem:()=>{}};}};
const storage=safeStorage();
// Live read-only projection of existing progress; no second grade store or raw scores sent to AI.
const learnerProfile=()=>{try{return canonicalLearnerProfile(localStorage,{scheduler:window.EkabStudyScheduler});}catch{return canonicalLearnerProfile(null);}};
const routes=[
 ['ΣΑΕΚ','saek.html',['σαεκ','μαθημα','κεφαλαι']],
 ['ΕΟΠΠΕΠ','eoppep.html',['εοππεπ','εοπεπ','πιστοποιηση']],
 ['Πρακτικό ΕΟΠΠΕΠ','practical_exam.html',['πρακτικο εοππεπ']],
 ['ATLA Anatomy Lab','ui-tools/anatomy-3d/index.html',['ανατομι','3d ανατομια']],
 ['ATLA Κλινικός Προσομοιωτής','mentor-next.html',['προσομοιωτ','ασθεν','cockpit']],
 ['Φαρμακολογία','farmaka.html',['φαρμακολογ','φαρμακα']],
 ['Εργαστήριο ΗΚΓ','mentor-ecg.html',['ecg','ηκγ','ηλεκτροκαρδιογρ']],
 ['Σεμινάρια','seminar-prep.html',['σεμιναρ','bls','phtls']],
 ['Ελληνικά Πρωτόκολλα','protocols.html',['πρωτοκολλ']],
 ['Βιβλιοθήκη και αναζήτηση','search.html',['λεξικο','βιβλιοθηκ','αναζητ']]
];
const officialId=/\bEOP-([AB])-(\d{3})\b/i;
const exam=()=>{
 const mode=new URLSearchParams(location.search).get('mode');
 if(mode==='exam'||document.querySelector('[data-atla-active-exam="true"]'))return true;
 // Historical practical EOPPEP material is not automatically an active examination.
 if(location.pathname.endsWith('/practical_exam.html'))return false;
 return examMode(location.pathname);
};
let terms=null,questions=null,records=null,visible=false,requestId=0;
const BODY_KEY='ekab.atla.body3d.v1',AUTO_READ_KEY='ekab.atla.autoread.v1';
const fetchJSON=async name=>{try{const response=await fetch(new URL(name,ROOT),{credentials:'omit'});if(!response.ok)return null;return await response.json();}catch{return null;}};
async function library(){
 if(terms===null){const data=await fetchJSON('medical-terms.json');terms=Array.isArray(data?.items)?data.items:[];}
 if(questions===null){const data=await fetchJSON('official_questions.json');questions=Array.isArray(data)?data:[];}
 if(records===null){
  const chapters=SOURCES.filter(x=>x.kind==='saek'||x.kind==='book');
  const parts=await Promise.allSettled(chapters.map(async x=>transformSource(x,await fetchJSON(x.file))));
  records=parts.flatMap(p=>p.status==='fulfilled'?p.value:[]);
 }
}
function navigation(text){
 const n=normalize(text);
 if(!/(ανοιξε|πηγαινε|δειξε|μεταβαση|βρες|open)/.test(n))return null;
 return routes.find(([, ,keys])=>keys.some(key=>n.includes(normalize(key))))||null;
}
function answerFromLibrary(q){
 const match=q.toUpperCase().match(officialId);
 if(match){
  const id='EOP-'+match[1]+'-'+match[2];
  const item=questions.find(r=>r.id===id);
  if(item&&typeof item.answer==='string'&&item.answer.trim()&&(!item.answerStatus||item.answerStatus.startsWith('reviewed'))){
   return {text:'ΕΟΠΠΕΠ '+id+': '+item.question+'\n\nΕκπαιδευτική απάντηση: '+item.answer,passages:[{id:'T1',term:item.question.slice(0,120),definition:item.answer.slice(0,400)}],href:'theory.html?question='+encodeURIComponent(id)};
  }
 }
 const hits=retrieve(q,terms,{k:4,minScore:3});
 const direct=hits.length>0&&nameCoverage(q,terms.find(t=>t.term===hits[0].term))>=0.5;
 if(direct)return {text:hits.map(h=>h.term+': '+h.definition).join('\n\n'),passages:hits,href:null};
 const stop=new Set(['ποια','ποιο','ειναι','τι','πως','εξηγησε','μου','στο','στη','και','για','απο','τον','την','του','της','της']);
 const cleaned=normalize(q).split(/[^\p{L}\p{N}]+/u).filter(x=>x.length>2&&!stop.has(x)).join(' ');
 const chapters=records.length?searchRecords(records,cleaned,'saek',2).rows:[];
 const count=chapters.length?1:2;
 // Books inflect their terms, so a miss is retried on word stems: οστό also finds οστά.
 const stems=cleaned.split(' ').map(word=>word.slice(0,word.length>4?-2:-1)).join(' ');
 let books=records.length?searchRecords(records,cleaned,'book',count).rows:[];
 if(!books.length&&records.length)books=searchRecords(records,stems,'book',count).rows;
 const hits2=[...chapters,...books];
 if(hits2.length){
  const passages=hits2.map((c,i)=>({id:'T'+(i+1),term:c.title.slice(0,120),definition:focusSnippet(c.body,cleaned,400)}));
  return {text:hits2.map(c=>c.title+'\n'+focusSnippet(c.body,cleaned)).join('\n\n'),passages,href:hits2[0].href};
 }
 if(hits.length)return {text:hits.map(h=>h.term+': '+h.definition).join('\n\n'),passages:hits,href:null};
 return {text:'Δεν βρήκα επαρκή αντιστοιχία στη διαθέσιμη τοπική βιβλιοθήκη. Μπορείς να δοκιμάσεις συγκεκριμένο ιατρικό όρο ή κωδικό ΕΟΠΠΕΠ (π.χ. EOP-A-001).',passages:[],href:null};
}
function boot(){
 if(window.__ekabAtlaAssistant)return;
 window.__ekabAtlaAssistant=true;
 const css=$('link');css.rel='stylesheet';css.href=new URL('./assistant.css',import.meta.url);document.head.append(css);
 const launcher=$('button','atla-launcher','✚ ATLAS');launcher.type='button';launcher.setAttribute('aria-label','Άνοιγμα ATLAS');
 const panel=$('aside','atla-panel');panel.hidden=true;panel.setAttribute('aria-label','ATLAS — AI εκπαιδευτικός βοηθός');
 const head=$('header','atla-head');
 const brand=$('div','atla-brand');brand.append($('strong','', 'ATLAS'),$('span','','Ο εκπαιδευτής σου στο ΕΚΑΒ Σπουδή'));
 const badge=$('span','atla-badge','✚');badge.setAttribute('aria-hidden','true');
 const identity=$('div','atla-identity');identity.append(badge,brand);
 const close=$('button','atla-close','×');close.type='button';close.setAttribute('aria-label','Κλείσιμο ATLAS');
 head.append(identity,close);
 const state=$('p','atla-availability','');
 const demoRow=$('label','atla-demo-row');
 const demoToggle=$('input','atla-demo-toggle');demoToggle.type='checkbox';
 // Learners always get real local knowledge. Fake replies exist only for an explicit UI test.
 const demoAllowed=new URLSearchParams(location.search).get('atla-demo')==='1';
 demoToggle.checked=demoAllowed;demoRow.hidden=!demoAllowed;
 const demoCopy=$('span','','Δοκιμαστικό AI · εικονικές απαντήσεις');
 demoRow.append(demoToggle,demoCopy);
 const refreshState=()=>{state.textContent=demoToggle.checked?'DEMO · Εικονικές απαντήσεις, χωρίς κλήση AI':ATLA_AI.endpoint?'ATLAS AI · απαντά μόνο από επαληθευμένες πηγές':'Τοπική γνώση · η ζωντανή συνομιλία AI είναι απενεργοποιημένη';};
 refreshState();
 demoToggle.addEventListener('change',refreshState);
 const context=$('p','atla-context');
 const stream=$('div','atla-stream');stream.setAttribute('role','log');stream.setAttribute('aria-live','polite');
 const form=$('form','atla-form');
 const field=$('textarea','atla-input');field.rows=2;field.maxLength=300;field.placeholder='Ρώτησε τον ATLAS…';field.setAttribute('aria-label','Ερώτηση στον ATLAS');
 const send=$('button','atla-send','Αποστολή');send.type='submit';
 const mic=$('button','atla-mic','🎙');mic.type='button';mic.setAttribute('aria-label','Ερώτηση με φωνή');mic.setAttribute('aria-pressed','false');
 mic.hidden=typeof(window.SpeechRecognition||window.webkitSpeechRecognition)!=='function';
 form.append(field,mic,send);
 const footer=$('div','atla-footer');
 const selected=$('button','','Εξήγησε επιλογή');selected.type='button';
 const clear=$('button','','Καθαρισμός συνομιλίας');clear.type='button';
 const speak=$('button','','🔊 Ανάγνωση');speak.type='button';
 const body3d=$('button','atla-3d','🧑‍⚕️ 3D εκπαιδευτής');body3d.type='button';body3d.setAttribute('aria-pressed','false');
 const autoRow=$('label','atla-auto-read');const autoRead=$('input');autoRead.type='checkbox';
 autoRow.append(autoRead,$('span','','Αυτόματη ανάγνωση'));
 footer.append(selected,speak,body3d,autoRow,clear);
 const note=$('p','atla-note','Εκπαιδευτικό εργαλείο, όχι ιατρική οδηγία. Δεν διαβάζει αυτόματα βαθμούς ή προσωπικές σημειώσεις.');
 panel.append(head,state,demoRow,context,stream,form,footer,note);
 document.body.append(panel,launcher);
 const currentPage=location.pathname.split('/').pop()||'';
 const addAddonCss=path=>{const node=$('link');node.rel='stylesheet';node.href=new URL(path,import.meta.url).href;document.head.append(node);};
 if(/^saek-course-(?:0[1-9]|1[0-9]|20)\.html$/.test(currentPage)){
  addAddonCss('./practice/saek-practice.css');
  void import('./practice/saek-practice.mjs').catch(()=>{});
 }
 if(currentPage==='mentor-next.html'){
  addAddonCss('./practice/cockpit-entry.css');
  void import('./practice/cockpit-entry.mjs').catch(()=>{});
 }
 const history=()=>{try{return loadTurns(storage);}catch{return [];}};
 function showHistory(){
  stream.replaceChildren();
  const turns=history();
  if(!turns.length){
   stream.append($('p','atla-welcome','Γεια σου, είμαι ο ATLAS. Ρώτησέ με για την ύλη, ζήτα να σου δείξω μια δομή σε 3D ή να το πω πιο απλά.'));
   // Only the next step is shown here; grades and history appear only if the learner asks.
   const next=learnerProfile().recommendation;
   if(next?.href&&next?.label){const a=$('a','atla-route atla-next','Επόμενο βήμα: '+next.label);a.href=new URL(next.href,ROOT).href;stream.append(a);}
   const chips=$('div','atla-chips');
   for(const prompt of ['Τι να επαναλάβω;','Τι είναι η ΚΑΡΠΑ;','Δείξε μου την επιγονατίδα σε 3D']){
    const chip=$('button','atla-chip',prompt);chip.type='button';
    chip.addEventListener('click',()=>{field.value=prompt;form.requestSubmit();});
    chips.append(chip);
   }
   stream.append(chips);
   return;
  }
  for(const t of turns){const b=$('p','atla-message '+(t.role==='user'?'atla-user':'atla-reply')+(t.mode==='mock'&&t.role!=='user'?' atla-mock':''),t.text);stream.append(b);}
  stream.scrollTop=stream.scrollHeight;
 }
 const presence=()=>window.EkabMentorPresence||null;
 const voice=createVoice({win:window,onState:s=>{mic.setAttribute('aria-pressed',String(s.listening));mic.classList.toggle('is-on',s.listening);}});
 const speakAloud=text=>(presence()?.speak||voice.speak)(text);
 const add=(role,text,mode='local')=>{
  try{appendTurn(storage,{role:role==='user'?'user':'mentor',text,mode});}catch{}
  showHistory();
  if(role==='user')return;
  presence()?.cueTurn?.({role:'mentor',mode});
  if(autoRead.checked&&mode!=='refusal')speakAloud(text);
 };
 const prefGet=key=>{try{return localStorage.getItem(key);}catch{return null;}};
 const prefSet=(key,value)=>{try{localStorage.setItem(key,value);}catch{}};
 autoRead.checked=prefGet(AUTO_READ_KEY)==='on';
 autoRead.addEventListener('change',()=>prefSet(AUTO_READ_KEY,autoRead.checked?'on':'off'));
 // The 3D teacher is ATLA's body, not a second assistant, and downloads only when the learner asks for it.
 async function show3d(on,restored=false){
  body3d.setAttribute('aria-pressed',String(on));
  prefSet(BODY_KEY,on?'on':'off');
  if(on&&!presence()){
   window.__atlaPresenceEmbedded=true;
   try{await import('../mentor/presence/presence.mjs');}
   catch{body3d.setAttribute('aria-pressed','false');prefSet(BODY_KEY,'off');state.textContent='Ο 3D εκπαιδευτής δεν φορτώθηκε. Η συνομιλία συνεχίζεται κανονικά.';return;}
  }
  document.body.classList.toggle('atla-has-3d',on);
  if(!on){presence()?.minimize();return;}
  // On a phone the teacher takes the top of the screen, so it never covers the conversation.
  if(!restored&&window.matchMedia?.('(max-width:640px)').matches)presence()?.pin('tl');else presence()?.show();
 }
 body3d.addEventListener('click',()=>show3d(body3d.getAttribute('aria-pressed')!=='true'));
 mic.addEventListener('click',async()=>{
  const heard=await voice.listen();
  if(heard.ok){field.value=heard.text;form.requestSubmit();return;}
  if(heard.reason!=='cancelled')state.textContent='Δεν ακούστηκε ερώτηση. Δοκίμασε ξανά ή γράψε την.';
 });
 if(prefGet(BODY_KEY)==='on')show3d(true,true);
 function offerLink(href,label){
  if(!href||typeof href!=='string')return;
  try{
   const url=new URL(href,ROOT);
   if(url.origin!==ROOT.origin||!url.pathname.startsWith(ROOT.pathname))return;
   const a=$('a','atla-route',label);a.href=url.href;stream.append(a);
   stream.scrollTop=stream.scrollHeight;
  }catch{}
 }
 const setOpen=(v)=>{visible=!!v;panel.hidden=!visible;launcher.hidden=visible;document.body.classList.toggle('atla-is-open',visible);if(visible){context.textContent='Τρέχουσα ενότητα: '+(document.querySelector('main h1,main h2')?.textContent||document.title).trim().slice(0,100);showHistory();field.focus();}else{window.speechSynthesis?.cancel?.();launcher.focus();}};
 launcher.addEventListener('click',()=>setOpen(true));close.addEventListener('click',()=>setOpen(false));
 document.addEventListener('click',e=>{const trigger=e.target?.closest?.('[data-atla-open]');if(!trigger)return;e.preventDefault();if(!visible)setOpen(true);const topic=String(trigger.getAttribute('data-atla-context')||'').trim().slice(0,110);if(topic){context.textContent='Εκπαιδευτικό θέμα: '+topic;field.value='Βοήθησέ με να κατανοήσω το εκπαιδευτικό θέμα «'+topic+'» με τεκμηριωμένες πηγές.';field.focus();}});
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&visible)setOpen(false);});
 window.addEventListener('ekab:atlas-context',e=>{
  const detail=e.detail||{};
  const source=String(detail.source||'');
  const chapter=String(detail.chapter||'');
  if(!/^saek-course-(?:0[1-9]|1[0-9]|20)\.html$/.test(source)||!/^lesson-(?:[1-9]|[1-9][0-9]|100)$/.test(chapter))return;
  const heading=String(detail.focus||'').replace(/[<>]/g,'').trim().slice(0,90);
  setOpen(true);
  context.textContent='Από κεφάλαιο ΣΑΕΚ: '+(heading||chapter);
  field.value='Βοήθησέ με να κατανοήσω το κεφάλαιο «'+(heading||chapter)+'».';
  field.focus();
 });
 clear.addEventListener('click',()=>{try{clearTurns(storage);}catch{}showHistory();});
 speak.addEventListener('click',()=>{const last=[...stream.querySelectorAll('.atla-reply')].at(-1)?.textContent;if(last&&!speakAloud(last).ok)state.textContent='Δεν βρέθηκε ελληνική φωνή σε αυτή τη συσκευή.';});
 selected.addEventListener('click',()=>{const t=String(window.getSelection?.()||'').trim().slice(0,300);if(t){field.value='Εξήγησέ μου: '+t;field.focus();}else{state.textContent='Επίλεξε πρώτα ένα μικρό απόσπασμα της σελίδας.';}});
 form.addEventListener('submit',async e=>{
  e.preventDefault();const q=field.value.trim();if(!q)return;field.value='';const myId=++requestId;add('user',q,demoToggle.checked?'mock':'local');
  if(exam()){add('mentor','Σε ενεργή εξέταση δεν παρέχω έτοιμες απαντήσεις. Μόλις ολοκληρώσεις, μπορούμε να αναλύσουμε τα λάθη σου.','refusal');return;}
  const guard=riskGuard(q);if(guard.blocked){add('mentor',RISK_MESSAGE.replace('MENTOR','ATLAS'),'refusal');return;}
  const studyInsight=localStudyInsight(q,learnerProfile());
  if(studyInsight){add('mentor',studyInsight,'local');return;}
  const teachingModel=await chooseTeachingModel({question:q,from:location.pathname+location.search+location.hash,
   needsSupport:teachingLevelFor(learnerProfile(),q)==='beginner',
   mode:/(?:^|\/)mentor-next\.html$/.test(location.pathname)?'simulation':'lesson'});
  if(myId!==requestId)return;
  // A request to see a model is answered by that model, not by a text search on the words "3D" or "show".
  if(teachingModel?.requestedVisual&&!demoToggle.checked){
   add('mentor','Βρήκα το 3D μοντέλο «'+teachingModel.modelLabel+'» στη βιβλιοθήκη μας. Είναι εκπαιδευτικό μοντέλο, χωρίς κλινική επικύρωση.');
   offerLink(teachingModel.href,teachingModel.label);
   return;
  }
  // The exact model answers better than opening the whole tool it belongs to.
  const link=teachingModel?null:navigation(q);
  const teachingTool=teachingModel||chooseTeachingTool({question:q});
  if(demoToggle.checked){
   const level=teachingLevelFor(learnerProfile(),q);
   const pageName=(document.querySelector('main h1,main h2')?.textContent||document.title).trim();
   add('mentor',mockAtlasReply({question:q,page:pageName,level}),'mock');
   if(link)offerLink(link[1],'Δοκίμασε τη μετάβαση: '+link[0]);
   else if(teachingTool)offerLink(teachingTool.href,teachingTool.label);
   return;
  }
  if(link){add('mentor','Βρήκα την ενότητα «'+link[0]+'». Μπορείς να την ανοίξεις χωρίς να χαθεί η τρέχουσα σελίδα από το ιστορικό.');offerLink(link[1],'Άνοιξε: '+link[0]);return;}
  send.disabled=true;state.textContent='Αναζήτηση στην εκπαιδευτική βιβλιοθήκη…';
  try{
   await library();if(myId!==requestId)return;
   const found=answerFromLibrary(q);
   const verifiedForAi=eligibleAiPassages(found.passages,terms);
   if(!ATLA_AI.endpoint||!verifiedForAi.length){add('mentor',found.text);offerLink(found.href,'Άνοιξε τη σχετική ενότητα');if(teachingTool)offerLink(teachingTool.href,teachingTool.label);return;}
   const level=teachingLevelFor(learnerProfile(),q);
   const payload=buildPayload({question:q,passages:verifiedForAi,level,history:historyForAi(history(),4)});
   const response=await askAi({endpoint:ATLA_AI.endpoint,payload,headers:atlaAiHeaders(storage),timeoutMs:ATLA_AI.timeoutMs});
   add('mentor',response.ok?response.text:found.text, response.ok?'ai':'local');
   if(teachingTool)offerLink(teachingTool.href,teachingTool.label);
  }catch{add('mentor','Η τοπική βιβλιοθήκη δεν είναι διαθέσιμη αυτή τη στιγμή.');}
  finally{send.disabled=false;refreshState();}
 });
 showHistory();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
