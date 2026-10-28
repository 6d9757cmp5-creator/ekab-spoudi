/* EKAB Σπουδή — floating, searchable personal notebook, separate from global search.
   Personal writing is never used as searchable public study material. */
import { readNotes, writeNotes, NOTE_LIMIT } from './notes-store.js';

const EOP_KEY='ekab-eoppep-official-v15';
const SEM_KEY='ekab.seminar-prep.local.v1';
const SEM_NAMES={bls:'BLS/AED',pbls:'PBLS',ils:'ILS',phtls:'PHTLS',als:'ALS'};
const GROUPS={general:'Γενικά',saek:'ΣΑΕΚ',eoppep:'ΕΟΠΠΕΠ',seminar:'Σεμινάρια'};
const $=id=>document.getElementById(id);
const make=(tag,cls,txt)=>{
 const el=document.createElement(tag);
 if(cls)el.className=cls;
 if(txt!==undefined)el.textContent=String(txt);
 return el;
};
const normalize=text=>String(text??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('el-GR').replace(/\s+/g,' ').trim();
const readJson=key=>{
 try{const v=JSON.parse(localStorage.getItem(key)||'{}');return v&&typeof v==='object'&&!Array.isArray(v)?v:{}}catch{return {}}
};
const idNew=()=>{
 const bytes=new Uint8Array(16);crypto.getRandomValues(bytes);
 return Array.from(bytes,x=>x.toString(16).padStart(2,'0')).join('');
};
const fetchData=async filename=>{
 const response=await fetch(new URL(filename,import.meta.url));
 if(!response.ok)throw Error('Δεν φορτώθηκε το εκπαιδευτικό ευρετήριο.');
 return response.json();
};

function privateRows(){
 const rows=[],mine=readNotes();
 for(const [id,note] of Object.entries(mine))rows.push({
  id:'n:'+id,kind:'mine',title:note.title,body:note.body,
  source:GROUPS[note.section]+' · Προσωπική σημείωση'+(note.context?' · '+note.context:''),
  href:note.href,updatedAt:note.updatedAt,editId:id
 });
 const questions=readJson(EOP_KEY);
 for(const [qid,entry] of Object.entries(questions)){
  if(!/^EOP-[AB]-\d{3}$/.test(qid)||!entry||typeof entry!=='object')continue;
  const label='ΕΟΠΠΕΠ · '+(qid[4]==='A'?'Ομάδα Α':'Ομάδα Β')+' · Ερώτηση '+Number(qid.slice(6));
  for(const [field,title] of [['sosNotes','Τα SOS μου'],['readerNotes','Σημειώσεις και απορίες']]){
   const body=entry[field];
   if(typeof body!=='string'||!body.trim())continue;
   rows.push({id:'q:'+qid+':'+field,kind:'source',title:title+' — '+label,
    body,source:'Προσωπικό · ΕΟΠΠΕΠ',href:'theory.html?question='+encodeURIComponent(qid),updatedAt:0});
  }
 }
 const seminars=readJson(SEM_KEY);
 for(const [id,name]of Object.entries(SEM_NAMES)){
  const course=seminars[id];if(!course||typeof course!=='object')continue;
  for(const [field,label,max] of [['qNotes','Γραπτή απάντηση',48],['oralNotes','Κλινικό σενάριο',12]]){
   const notes=course[field];if(!notes||typeof notes!=='object'||Array.isArray(notes))continue;
   for(const [index,body] of Object.entries(notes)){
    const number=Number(index);
    if(!Number.isInteger(number)||number<0||number>=max||typeof body!=='string'||!body.trim())continue;
    const title=field==='qNotes'?label+' · Θέμα '+(Math.floor(number/4)+1):label+' '+(number+1);
    rows.push({id:'s:'+id+':'+field+':'+index,kind:'source',title:title+' — '+name,
      body,source:'Αποθηκευμένη απάντηση · '+name,href:'seminar-prep.html#'+id,updatedAt:0});
   }
  }
 }
 return rows.sort((a,b)=>b.updatedAt-a.updatedAt||a.title.localeCompare(b.title,'el'));
}
let sosPromise=null;
function loadSos(){
 if(sosPromise)return sosPromise;
 sosPromise=Promise.all([fetchData('saek-search-A.json'),fetchData('saek-search-B.json'),
   fetchData('saek-search-C.json'),fetchData('saek-search-D.json'),fetchData('eoppep-sos.json')])
  .then(([a,b,c,d,e])=>{
   const result=[];
   for(const item of [...a.items,...b.items,...c.items,...d.items]){
    if(!item||typeof item.searchText!=='string')continue;
    const idx=item.searchText.indexOf('SOS ·');
    if(idx<0)continue;
    let body=item.searchText.slice(idx+5);
    const stop=body.search(/\s+(?:Περισσότερη εξήγηση|Ερώτηση αυτοελέγχου|Αναλυτική κατανόηση|Συμπληρωματική σημείωση)/);
    body=(stop>=0?body.slice(0,stop):body.slice(0,450)).trim().slice(0,550);
    if(!body)continue;
    result.push({id:'saek-sos:'+item.courseId+':'+item.chapter,kind:'sos',
      title:item.chapterTitle||'SOS κεφαλαίου',body,source:'SOS ΣΑΕΚ · '+item.semester+'΄ · '+item.course+' · Κεφ. '+item.chapter,
      href:item.href,updatedAt:0});
   }
   for(const item of e.items||[]){
    if(!/^EOP-[AB]-\d{3}$/.test(item.id)||!Array.isArray(item.points))continue;
    const body=item.points.filter(p=>typeof p==='string').join(' ');
    if(!body)continue;
    result.push({id:'eop-sos:'+item.id,kind:'sos',
      title:'Έτοιμα SOS · '+(item.id[4]==='A'?'Ομάδα Α':'Ομάδα Β')+' · Ερώτηση '+Number(item.id.slice(6)),
      body,source:'Εκπαιδευτικά SOS ΕΟΠΠΕΠ',
      href:'theory.html?question='+encodeURIComponent(item.id),updatedAt:0});
   }
   return result;
  }).catch(error=>{sosPromise=null;throw error});
 return sosPromise;
}

let dialog,trigger,search,results,status,more,editor,form,titleInput,bodyInput,sectionInput,contextInput;
let mode='mine',limit=30,activeEditor=null,renderSequence=0,returnFocus=null;
const tabButtons={};
function button(label,fn,cls=''){
 const btn=make('button',cls,label);btn.type='button';btn.addEventListener('click',fn);return btn;
}
function emit(){
 window.dispatchEvent(new Event('ekab:notes-changed'));
 window.dispatchEvent(new Event('ekab:progress-changed'));
}
function close(){
 if(dialog?.open)dialog.close();
}
function setEditor(value){
 editor.hidden=!value;
 $('ekabNotesBrowse').hidden=!!value;
 if(!value){activeEditor=null;return;}
 activeEditor=value;
 titleInput.value=value.title||'';
 bodyInput.value=value.body||'';
 sectionInput.value=value.section||'general';
 contextInput.value=value.context||'';
 $('ekabNotesEditorHeading').textContent=value.id?'Επεξεργασία σημείωσης':'Νέα προσωπική σημείωση';
 $('ekabNotesRemove').hidden=!value.id;
 titleInput.focus();
}
function newNote(prefill={}){
 setEditor({id:null,title:prefill.title||'',body:'',section:prefill.section||'general',
  context:prefill.context||'',href:prefill.href||''});
}
function editNote(id){
 const data=readNotes(),note=data[id];
 if(!note){status.textContent='Η σημείωση δεν υπάρχει πλέον.';return;}
 setEditor({...note,id});
}
function removeNote(){
 if(!activeEditor?.id)return;
 if(!confirm('Να διαγραφεί οριστικά αυτή η προσωπική σημείωση;'))return;
 try{
  const data=readNotes();delete data[activeEditor.id];
  writeNotes(data);emit();setEditor(null);render();
 }catch{status.textContent='Δεν ήταν δυνατή η διαγραφή. Δεν τροποποιήθηκε η σημείωση.'}
}
function saveNote(e){
 e.preventDefault();
 const draft=activeEditor;if(!draft)return;
 const title=titleInput.value.trim(),body=bodyInput.value.trim();
 if(!title||!body){$('ekabNotesEditStatus').textContent='Συμπλήρωσε τίτλο και σημείωση.';return;}
 try{
  const all=readNotes(),id=draft.id||idNew();
  if(!draft.id&&Object.keys(all).length>=NOTE_LIMIT){$('ekabNotesEditStatus').textContent='Έφτασες το όριο σημειώσεων. Κράτησε αντίγραφο πριν διαγράψεις παλιές.';return;}
  all[id]={title:title.slice(0,140),body:body.slice(0,8000),section:sectionInput.value,
   context:contextInput.value.slice(0,180),href:draft.href||'',updatedAt:Date.now()};
  writeNotes(all);
  emit();mode='mine';setEditor(null);render();
 }catch{$('ekabNotesEditStatus').textContent='Δεν αποθηκεύτηκε. Έλεγξε τον διαθέσιμο χώρο και την αποθήκευση.'}
}
function safeLink(href){
 return /^(?:saek-course-(?:0[1-9]|1\d|20)\.html#lesson-(?:[1-9]|[12]\d|3[0-2])|theory\.html\?question=EOP-[AB]-\d{3}|seminar-prep\.html#(?:bls|pbls|ils|phtls|als))$/.test(href||'');
}
function renderCard(item){
 const card=make('article','ekab-note-card');
 const meta=make('span','ekab-note-meta',item.source);
 card.append(meta,make('strong','ekab-note-title',item.title));
 const text=make('p','ekab-note-preview',item.body);card.append(text);
 const actions=make('div','ekab-note-actions');
 if(item.editId)actions.append(button('Επεξεργασία',()=>editNote(item.editId)));
 if(safeLink(item.href)){
  const a=make('a','ekab-note-source',item.kind==='source'?'Άνοιγμα για επεξεργασία':'Άνοιγμα ενότητας');
  a.href=item.href;actions.append(a);
 }
 if(actions.childNodes.length)card.append(actions);
 return card;
}
async function render(){
 if(!dialog?.open||!editor.hidden)return;
 const seq=++renderSequence,term=normalize(search.value);
 for(const [key,button] of Object.entries(tabButtons))button.setAttribute('aria-pressed',String(key===mode));
 results.replaceChildren();
 status.textContent=mode==='mine'?'Αναζήτηση στις προσωπικές σημειώσεις…':'Φόρτωση εκπαιδευτικών SOS…';
 more.hidden=true;
 let list;
 try{
  list=mode==='sos'?await loadSos():mode==='all'?[...privateRows(),...await loadSos()]:privateRows();
 }catch(error){if(seq!==renderSequence)return;status.textContent=error.message==='invalid-personal-notes'?'Οι αποθηκευμένες σημειώσεις χρειάζονται ανάκτηση. Δεν έγινε καμία αλλαγή.':'Δεν φορτώθηκαν οι σημειώσεις ή τα SOS. Δοκίμασε ξανά με σύνδεση.';return;}
 if(seq!==renderSequence)return;
 const terms=term.split(' ').filter(Boolean);
 if(terms.length)list=list.filter(item=>{
  const hay=normalize(item.title+' '+item.body+' '+item.source);
  return terms.every(word=>hay.includes(word));
 });
 status.textContent=list.length+' αποτελέσματα · '+(mode==='sos'?'SOS ύλης':mode==='mine'?'Δικές μου σημειώσεις και απαντήσεις':'Όλα');
 for(const item of list.slice(0,limit))results.append(renderCard(item));
 if(!list.length)results.append(make('p','ekab-note-empty',term?'Δεν βρέθηκε σημείωση με αυτές τις λέξεις.':'Δεν υπάρχουν ακόμη σημειώσεις σε αυτή την κατηγορία.'));
 more.hidden=list.length<=limit;more.textContent='Εμφάνιση περισσότερων ('+Math.min(30,list.length-limit)+')';
}
function setMode(next){
 mode=next;limit=30;render();
}
function open(options={}){
 if(!dialog)return;
 if(!dialog.open){
  returnFocus=document.activeElement;
  try{dialog.showModal()}catch{dialog.setAttribute('open','')}
 }
 if(options?.prefill)newNote(options.prefill);
 else{setEditor(null);render();search.focus()}
}
function addChapterButtons(){
 const course=/saek-course-(\d{2})\.html$/.exec(location.pathname)?.[1];
 if(!course)return;
 for(const chapter of document.querySelectorAll('details.reader-fold[id^="lesson-"]')){
  const n=Number(chapter.id.slice(7)),sos=chapter.querySelector('.lesson-sos');
  if(!sos||!Number.isInteger(n)||n<1||n>32||chapter.querySelector('.ekab-notes-chapter'))continue;
  const chapterName=chapter.querySelector('summary')?.textContent?.replace(/\s+/g,' ').trim().slice(0,75)||'Κεφάλαιο '+n;
  const btn=button('📝 Προσωπική σημείωση',()=>open({prefill:{
   title:'Σημείωση · '+chapterName,section:'saek',
   context:'ΣΑΕΚ · Μάθημα '+Number(course)+' · Κεφάλαιο '+n,
   href:'saek-course-'+course+'.html#lesson-'+n
  }}),'ekab-notes-chapter');
  sos.after(btn);
 }
}
function install(){
 if($('ekabNotesFab'))return;
 trigger=button('📝 Σημειώσεις',()=>open(),'ekab-notes-fab');
 trigger.id='ekabNotesFab';trigger.setAttribute('aria-label','Άνοιγμα προσωπικών σημειώσεων και SOS');
 dialog=document.createElement('dialog');dialog.id='ekabNotesDialog';dialog.className='ekab-notes-dialog';
 dialog.setAttribute('aria-labelledby','ekabNotesTitle');
 dialog.innerHTML=`<div class="ekab-notes-shell">
  <div class="ekab-notes-head"><div><h2 id="ekabNotesTitle">📝 Οι σημειώσεις μου</h2><p>Ανεξάρτητη αναζήτηση μόνο για σημειώσεις και SOS</p></div><button id="ekabNotesClose" type="button" aria-label="Κλείσιμο σημειώσεων">✕</button></div>
  <div id="ekabNotesBrowse">
   <div class="ekab-notes-controls"><label for="ekabNotesSearch">Αναζήτησε μέσα στις σημειώσεις σου</label>
   <input id="ekabNotesSearch" type="search" placeholder="Λέξη, θέμα, SOS, όρος…" autocomplete="off">
   <div class="ekab-notes-tabs" role="group" aria-label="Κατηγορία σημειώσεων">
    <button type="button" data-ekab-notes-tab="mine">Οι σημειώσεις μου</button>
    <button type="button" data-ekab-notes-tab="sos">SOS ύλης</button>
    <button type="button" data-ekab-notes-tab="all">Όλα</button>
   </div><button type="button" class="ekab-notes-new" id="ekabNotesNew">＋ Νέα σημείωση</button></div>
   <p class="ekab-notes-status" id="ekabNotesStatus" role="status"></p>
   <div id="ekabNotesResults" class="ekab-notes-results"></div>
   <button type="button" class="ekab-notes-more" id="ekabNotesMore" hidden>Περισσότερα</button>
   <p class="ekab-notes-fine">Οι δικές σου σημειώσεις είναι διαφορετικές από τα έτοιμα εκπαιδευτικά SOS. Η γενική αναζήτηση του εργαλείου παραμένει ανεξάρτητη.</p>
  </div>
  <form id="ekabNotesEditor" class="ekab-notes-editor" hidden>
   <h3 id="ekabNotesEditorHeading">Νέα σημείωση</h3>
   <label for="ekabNotesTitleInput">Τίτλος</label><input required id="ekabNotesTitleInput" maxlength="140" autocomplete="off">
   <label for="ekabNotesSection">Ενότητα</label><select id="ekabNotesSection"><option value="general">Γενικά</option><option value="saek">ΣΑΕΚ</option><option value="eoppep">ΕΟΠΠΕΠ</option><option value="seminar">Σεμινάρια</option></select>
   <label for="ekabNotesContext">Σχετικό μάθημα (προαιρετικό)</label><input id="ekabNotesContext" maxlength="180">
   <label for="ekabNotesBody">Η σημείωσή μου</label><textarea id="ekabNotesBody" maxlength="8000" rows="7" required placeholder="Γράψε τι θέλεις να θυμάσαι…"></textarea>
   <p id="ekabNotesEditStatus" role="status"></p>
   <div class="ekab-notes-editor-actions"><button type="submit" class="ekab-notes-save">Αποθήκευση</button><button type="button" id="ekabNotesCancel">Ακύρωση</button><button type="button" id="ekabNotesRemove" hidden>Διαγραφή</button></div>
  </form>
 </div>`;
 document.body.append(trigger,dialog);
 search=$('ekabNotesSearch');results=$('ekabNotesResults');status=$('ekabNotesStatus');
 more=$('ekabNotesMore');editor=$('ekabNotesEditor');form=editor;
 titleInput=$('ekabNotesTitleInput');bodyInput=$('ekabNotesBody');sectionInput=$('ekabNotesSection');contextInput=$('ekabNotesContext');
 for(const btn of dialog.querySelectorAll('[data-ekab-notes-tab]')){
  const value=btn.dataset.ekabNotesTab;tabButtons[value]=btn;btn.addEventListener('click',()=>setMode(value));
 }
 let debounce=null;
 search.addEventListener('input',()=>{clearTimeout(debounce);debounce=setTimeout(()=>{limit=30;render()},120)});
 $('ekabNotesNew').addEventListener('click',()=>newNote());
 $('ekabNotesClose').addEventListener('click',close);
 $('ekabNotesCancel').addEventListener('click',()=>{setEditor(null);render()});
 $('ekabNotesRemove').addEventListener('click',removeNote);
 form.addEventListener('submit',saveNote);
 more.addEventListener('click',()=>{limit+=30;render()});
 dialog.addEventListener('click',e=>{if(e.target===dialog)close()});
 dialog.addEventListener('close',()=>{setEditor(null);returnFocus?.focus?.();returnFocus=null});
 window.addEventListener('ekab:notes-changed',()=>{if(dialog.open)render()});
 window.addEventListener('ekab:cloud-applied',()=>{if(dialog.open)render()});
 window.addEventListener('storage',e=>{if(dialog.open&&[EOP_KEY,SEM_KEY,'ekab.personal-notes.v1'].includes(e.key))render()});
 window.EkabNotes=Object.freeze({open});
 addChapterButtons();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});
else install();
