/**
 * ATLA — shared assistant shell, migration phase 1.
 * Reuses the legacy MENTOR retrieval/AI contract for zero backend duplication.
 * No grade or note writes; old lesson/exam stores remain untouched.
 */
import {retrieve,riskGuard,RISK_MESSAGE} from './knowledge/retrieve.mjs';
import {askAi,buildPayload} from './ai/client.mjs';
import {ATLA_AI,atlaAiHeaders} from './ai/config.mjs';
import {loadTurns,appendTurn,clearTurns,historyForAi,loadLearning,LEVEL_LABELS} from './student/memory.mjs';
import {examMode} from './context/bridge.mjs';
import {SOURCES,transformSource,searchRecords} from './knowledge/read-only-index.mjs';

const ROOT=new URL('../',import.meta.url);
const normalize=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/ς/g,'σ').toLocaleLowerCase('el');
const $=(tag,className='',text='')=>{const n=document.createElement(tag);if(className)n.className=className;if(text)n.textContent=text;return n;};
const safeStorage=()=>{try{return sessionStorage;}catch{return {getItem:()=>null,setItem:()=>{},removeItem:()=>{}};}};
const storage=safeStorage();
const routes=[
 ['ΣΑΕΚ','saek.html',['σαεκ','μαθημα','κεφαλαι']],
 ['ΕΟΠΠΕΠ','eoppep.html',['εοππεπ','εοπεπ','πιστοποιηση']],
 ['Πρακτικό ΕΟΠΠΕΠ','practical_exam.html',['πρακτικο εοππεπ']],
 ['ATLA Anatomy Lab','ui-tools/anatomy-3d/index.html',['ανατομι','3d ανατομια']],
 ['ATLA Clinical Cockpit','mentor-next.html',['προσομοιωτ','ασθεν','cockpit']],
 ['Φαρμακολογία','farmaka.html',['φαρμακολογ','φαρμακα']],
 ['ECG Lab','mentor-ecg.html',['ecg','ηκγ','ηλεκτροκαρδιογρ']],
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
const fetchJSON=async name=>{try{const response=await fetch(new URL(name,ROOT),{credentials:'omit'});if(!response.ok)return null;return await response.json();}catch{return null;}};
async function library(){
 if(terms===null){const data=await fetchJSON('medical-terms.json');terms=Array.isArray(data?.items)?data.items:[];}
 if(questions===null){const data=await fetchJSON('functions/answer-grader/eoppep-rubrics.json');questions=Array.isArray(data)?data:[];}
 if(records===null){
  const chapters=SOURCES.filter(x=>x.kind==='saek');
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
  if(item&&item.answerStatus?.startsWith('reviewed')){
   return {text:'ΕΟΠΠΕΠ '+id+': '+item.question+'\n\nΕκπαιδευτική απάντηση: '+item.answer,passages:[{id:'T1',term:item.question.slice(0,120),definition:item.answer.slice(0,400)}],href:'theory.html?question='+encodeURIComponent(id)};
  }
 }
 const hits=retrieve(q,terms,{k:4,minScore:3});
 if(hits.length)return {text:hits.map(h=>h.term+': '+h.definition).join('\n\n'),passages:hits,href:null};
 const stop=new Set(['ποια','ποιο','ειναι','τι','πως','εξηγησε','μου','στο','στη','και','για','απο','τον','την','του','της','της']);
 const cleaned=normalize(q).split(/[^\p{L}\p{N}]+/u).filter(x=>x.length>2&&!stop.has(x)).join(' ');
 const chapters=records.length?searchRecords(records,cleaned,'saek',2).rows:[];
 if(chapters.length){
  const passages=chapters.map((c,i)=>({id:'T'+(i+1),term:c.title.slice(0,120),definition:c.body.slice(0,400)}));
  return {text:chapters.map(c=>c.title+'\n'+c.body.slice(0,950)).join('\n\n')+'\n\nΜπορείς να συνεχίσεις στο αντίστοιχο κεφάλαιο ΣΑΕΚ.',passages,href:chapters[0].href};
 }
 return {text:'Δεν βρήκα επαρκή αντιστοιχία στη διαθέσιμη τοπική βιβλιοθήκη. Μπορείς να δοκιμάσεις συγκεκριμένο ιατρικό όρο ή κωδικό ΕΟΠΠΕΠ (π.χ. EOP-A-001).',passages:[],href:null};
}
function boot(){
 if(window.__ekabAtlaAssistant)return;
 window.__ekabAtlaAssistant=true;
 const css=$('link');css.rel='stylesheet';css.href=new URL('./assistant.css',import.meta.url);document.head.append(css);
 const launcher=$('button','atla-launcher','ATLA');launcher.type='button';launcher.setAttribute('aria-label','Άνοιγμα ATLA');
 const panel=$('aside','atla-panel');panel.hidden=true;panel.setAttribute('aria-label','ATLA — AI εκπαιδευτικός βοηθός');
 const head=$('header','atla-head');
 const brand=$('div','atla-brand');brand.append($('strong','', 'ATLA'),$('span','','Εκπαιδευτικός βοηθός ΕΚΑΒ Σπουδή'));
 const close=$('button','atla-close','×');close.type='button';close.setAttribute('aria-label','Κλείσιμο ATLA');
 head.append(brand,close);
 const state=$('p','atla-availability',ATLA_AI.endpoint?'Συνδεδεμένη υποδομή AI · αναμονή αιτήματος':'Τοπική γνώση · η εξωτερική συνομιλία AI δεν έχει ενεργοποιηθεί');
 const context=$('p','atla-context');
 const stream=$('div','atla-stream');stream.setAttribute('role','log');stream.setAttribute('aria-live','polite');
 const form=$('form','atla-form');
 const field=$('textarea','atla-input');field.rows=2;field.maxLength=300;field.placeholder='Ρώτησε την ATLA για την ύλη ή τα εργαλεία…';field.setAttribute('aria-label','Ερώτηση στην ATLA');
 const send=$('button','atla-send','Αποστολή');send.type='submit';
 form.append(field,send);
 const footer=$('div','atla-footer');
 const selected=$('button','','Εξήγησε επιλογή');selected.type='button';
 const clear=$('button','','Καθαρισμός συνομιλίας');clear.type='button';
 const speak=$('button','','🔊 Ανάγνωση');speak.type='button';
 footer.append(selected,speak,clear);
 const note=$('p','atla-note','Εκπαιδευτικό εργαλείο, όχι ιατρική οδηγία. Δεν διαβάζει αυτόματα βαθμούς ή προσωπικές σημειώσεις.');
 panel.append(head,state,context,stream,form,footer,note);
 document.body.append(panel,launcher);
 const history=()=>{try{return loadTurns(storage);}catch{return [];}};
 function showHistory(){
  stream.replaceChildren();
  const turns=history();
  if(!turns.length){stream.append($('p','atla-welcome','Είμαι η ATLA. Μπορώ να σε βοηθήσω με εκπαιδευτική ορολογία, ΕΟΠΠΕΠ και τη μετακίνηση στις ενότητες.'));return;}
  for(const t of turns){const b=$('p','atla-message '+(t.role==='user'?'atla-user':'atla-reply'),t.text);stream.append(b);}
  stream.scrollTop=stream.scrollHeight;
 }
 const add=(role,text,mode='local')=>{try{appendTurn(storage,{role:role==='user'?'user':'mentor',text,mode});}catch{}showHistory();};
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
 document.addEventListener('click',e=>{if(e.target?.closest?.('[data-atla-open]')){e.preventDefault();setOpen(true);}});
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&visible)setOpen(false);});
 clear.addEventListener('click',()=>{try{clearTurns(storage);}catch{}showHistory();});
 speak.addEventListener('click',()=>{if(!('speechSynthesis'in window))return;window.speechSynthesis.cancel();const last=[...stream.querySelectorAll('.atla-reply')].at(-1)?.textContent;if(last){const u=new SpeechSynthesisUtterance(last.slice(0,700));u.lang='el-GR';window.speechSynthesis.speak(u);}});
 selected.addEventListener('click',()=>{const t=String(window.getSelection?.()||'').trim().slice(0,300);if(t){field.value='Εξήγησέ μου: '+t;field.focus();}else{state.textContent='Επίλεξε πρώτα ένα μικρό απόσπασμα της σελίδας.';}});
 form.addEventListener('submit',async e=>{
  e.preventDefault();const q=field.value.trim();if(!q)return;field.value='';const myId=++requestId;add('user',q);
  if(exam()){add('mentor','Σε ενεργή εξέταση δεν παρέχω έτοιμες απαντήσεις. Μόλις ολοκληρώσεις, μπορούμε να αναλύσουμε τα λάθη σου.','refusal');return;}
  const guard=riskGuard(q);if(guard.blocked){add('mentor',RISK_MESSAGE.replace('MENTOR','ATLA'),'refusal');return;}
  const link=navigation(q);
  if(link){add('mentor','Βρήκα την ενότητα «'+link[0]+'». Μπορείς να την ανοίξεις χωρίς να χαθεί η τρέχουσα σελίδα από το ιστορικό.');offerLink(link[1],'Άνοιξε: '+link[0]);return;}
  send.disabled=true;state.textContent='Αναζήτηση στην εκπαιδευτική βιβλιοθήκη…';
  try{
   await library();if(myId!==requestId)return;
   const found=answerFromLibrary(q);
   if(!ATLA_AI.endpoint||!found.passages.length){add('mentor',found.text);offerLink(found.href,'Άνοιξε τη σχετική ενότητα');return;}
   const prefs=loadLearning(localStorage);
   const payload=buildPayload({question:q,passages:found.passages,level:prefs.level,history:historyForAi(history(),4)});
   const response=await askAi({endpoint:ATLA_AI.endpoint,payload,headers:atlaAiHeaders(storage),timeoutMs:ATLA_AI.timeoutMs});
   add('mentor',response.ok?response.text:found.text, response.ok?'ai':'local');
  }catch{add('mentor','Η τοπική βιβλιοθήκη δεν είναι διαθέσιμη αυτή τη στιγμή.');}
  finally{send.disabled=false;state.textContent=ATLA_AI.endpoint?'Σύνδεση AI διαθέσιμη όταν ανταποκρίνεται ο server':'Τοπική γνώση · το AI chat δεν είναι ακόμη ενεργοποιημένο';}
 });
 showHistory();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
