/* EKAB Spoudi · shared responsive SAEK predictive search and medical mini-dictionary. */
(function(){
 'use strict';
 const normal=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('el').replace(/ς/g,'σ').trim();
 const esc=()=>{};
 let indexPromise=null,glossaryPromise=null;
 function loadIndex(){
  if(!indexPromise)indexPromise=Promise.all(['A','B','C','D'].map(k=>fetch('saek-search-'+k+'.json',{cache:'force-cache'}).then(r=>{if(!r.ok)throw Error('Δεν είναι διαθέσιμο το ευρετήριο ΣΑΕΚ');return r.json()}))).then(j=>j.flatMap(x=>x.items||[])).catch(e=>{indexPromise=null;throw e});
  return indexPromise;
 }
 function loadGlossary(){
  if(!glossaryPromise)glossaryPromise=fetch('medical-terms.json',{cache:'force-cache'}).then(r=>{if(!r.ok)throw Error('Δεν φορτώθηκε το λεξικό');return r.json()}).then(x=>x.items||[]).catch(e=>{glossaryPromise=null;throw e});
  return glossaryPromise;
 }
 function el(tag,cls,txt){const n=document.createElement(tag);if(cls)n.className=cls;if(txt!==undefined)n.textContent=txt;return n}
 function search(q,items){
  const norm=normal(q);if(!norm)return [];
  const words=norm.split(/\s+/).filter(Boolean);
  return items.map(x=>{
   const c=normal(x.course),t=normal(x.chapterTitle),body=normal(x.searchText),preview=normal(x.preview);
   if(!words.every(w=>c.includes(w)||t.includes(w)||body.includes(w)))return null;
   const starts=c.startsWith(norm)?95:t.startsWith(norm)?105:0;
   const exact=(c===norm?130:0)+(t===norm?140:0);
   const score=starts+exact+words.reduce((v,w)=>v+(t.includes(w)?30:0)+(c.includes(w)?24:0)+(preview.includes(w)?8:0)+(body.includes(w)?1:0),0);
   return {item:x,score};
  }).filter(Boolean).sort((a,b)=>b.score-a.score||a.item.courseId.localeCompare(b.item.courseId)||a.item.chapter-b.item.chapter).map(x=>x.item);
 }
 function installNavSearch(){
  const nav=document.querySelector('header.top .nav');
  const saek=nav?.querySelector('a[href="saek.html"]');
  if(!saek)return;
  if(document.getElementById('saekGlobalSearch'))return;
  const wrap=el('div','saek-global-search'),field=el('input','saek-search-field'),label=el('label','saek-search-label','Αναζήτηση σε μαθήματα ΣΑΕΚ');
  field.id='saekGlobalSearch';field.type='search';field.autocomplete='off';field.placeholder='Αναζήτηση ΣΑΕΚ · π.χ. αεραγωγός';
  field.setAttribute('aria-label','Γρήγορη αναζήτηση και προτάσεις στα 247 κεφάλαια ΣΑΕΚ');
  label.htmlFor=field.id;
  const results=el('div','saek-global-results');results.id='saekGlobalResults';results.setAttribute('role','listbox');results.hidden=true;
  wrap.append(label,field,results);saek.after(wrap);
  let currentToken=0,selected=-1,links=[];
  function close(){results.hidden=true;field.setAttribute('aria-expanded','false');links=[];selected=-1}
  function showSuggestions(items,query){
   results.replaceChildren();links=[];selected=-1;
   if(!query.trim()){close();return}
   if(!items.length){results.append(el('p','saek-result-empty','Δεν βρέθηκε αντίστοιχο κεφάλαιο. Δοκίμασε διαφορετική λέξη.'));results.hidden=false;field.setAttribute('aria-expanded','true');return}
   const count=el('p','saek-result-count',`Προτεινόμενα αποτελέσματα · ${items.length} από 247 κεφάλαια`);results.append(count);
   for(const result of items.slice(0,9)){
    const link=el('a','saek-result-item');link.href=result.href;link.setAttribute('role','option');
    link.append(el('strong',null,result.chapterTitle));
    link.append(el('small',null,`${result.semester}΄ εξάμηνο · ${result.course} · κεφάλαιο ${result.chapter}`));
    link.append(el('span','saek-result-preview',result.preview));
    results.append(link);links.push(link);
   }
   if(items.length>9)results.append(el('p','saek-result-count',`Δείχνονται 9 από ${items.length}. Γράψε πιο συγκεκριμένη λέξη.`));
   results.hidden=false;field.setAttribute('aria-expanded','true');
  }
  function render(){const token=++currentToken,q=field.value;
   if(!q.trim()){close();return}
   results.replaceChildren(el('p','saek-result-empty','Αναζήτηση σε όλα τα εξάμηνα…'));results.hidden=false;
   loadIndex().then(items=>{if(token!==currentToken)return;showSuggestions(search(q,items),q)}).catch(()=>{if(token!==currentToken)return;results.replaceChildren(el('p','saek-result-empty','Η αναζήτηση δεν φορτώθηκε. Έλεγξε τη σύνδεση ή ενημέρωσε την εφαρμογή.'));results.hidden=false});
  }
  field.addEventListener('input',render);
  field.addEventListener('focus',()=>{if(field.value.trim())render()});
  field.addEventListener('keydown',e=>{
   if(e.key==='Escape'){close();field.blur();return}
   if(!links.length)return;
   if(e.key==='ArrowDown'){e.preventDefault();selected=(selected+1)%links.length;links[selected].focus();return}
   if(e.key==='Enter'&&links[0]){e.preventDefault();links[0].click()}
  });
  results.addEventListener('keydown',e=>{if(e.key==='Escape'){close();field.focus()}});
  document.addEventListener('pointerdown',e=>{if(!wrap.contains(e.target))close()});
 }
 function installGlossary(){
  const util=document.querySelector('header.top .utility');if(!util||document.getElementById('medicalGlossaryOpen'))return;
  const btn=el('button','utility-button glossary-open','📖 Ιατρικοί όροι');
  btn.id='medicalGlossaryOpen';btn.type='button';btn.title='Μικρό ιατρικό λεξικό — αρχική έκδοση';
  util.prepend(btn);
  const dialog=el('dialog','medical-glossary-dialog');dialog.id='medicalGlossaryDialog';
  const inner=el('div','medical-glossary-inner'),head=el('div','medical-glossary-head');
  const heading=el('div');heading.append(el('p','medical-eyebrow','Μικρή ιατρική βιβλιοθήκη'),el('h2',null,'Ιατρικοί όροι'));
  const closeBtn=el('button','medical-glossary-close','Κλείσιμο');closeBtn.type='button';
  head.append(heading,closeBtn);
  const help=el('p','medical-glossary-help','Αρχικό λεξικό με λίγους βασικούς ορισμούς. Θα εμπλουτιστεί σε επόμενη έκδοση. Δεν αντικαθιστά επιστημονικό σύγγραμμα.');
  const searchInput=el('input','medical-glossary-search');searchInput.type='search';searchInput.placeholder='Αναζήτησε έναν ιατρικό όρο…';
  searchInput.setAttribute('aria-label','Αναζήτηση ιατρικών όρων');
  const holder=el('div','medical-glossary-results');
  inner.append(head,help,searchInput,holder);dialog.append(inner);document.body.append(dialog);
  let terms=[];
  function renderGlossary(){
   const v=normal(searchInput.value);holder.replaceChildren();
   const matches=terms.filter(t=>!v||normal(t.term).includes(v)||(t.aliases||[]).some(a=>normal(a).includes(v))||normal(t.definition).includes(v)).slice(0,50);
   if(!matches.length){holder.append(el('p','medical-no-results','Δεν βρέθηκε ο όρος σε αυτή την αρχική έκδοση. Θα προσθέσουμε περισσότερους όρους.'));return}
   for(const term of matches){
    const entry=el('article','medical-glossary-entry');
    entry.append(el('h3',null,term.term),el('p',null,term.definition));
    const a=el('a',null,'Βιβλιογραφική πηγή');a.href=term.source;a.target='_blank';a.rel='noopener noreferrer';entry.append(a);
    holder.append(entry);
   }
  }
  btn.addEventListener('click',()=>{
   if(typeof dialog.showModal==='function')dialog.showModal();else dialog.setAttribute('open','');
   holder.replaceChildren(el('p',null,'Φόρτωση λεξικού…'));
   loadGlossary().then(items=>{terms=items;renderGlossary()}).catch(()=>holder.replaceChildren(el('p',null,'Το λεξικό δεν φορτώθηκε. Δοκίμασε ξανά.')));
   searchInput.focus();
  });
  closeBtn.addEventListener('click',()=>{if(typeof dialog.close==='function')dialog.close();else dialog.removeAttribute('open');btn.focus()});
  dialog.addEventListener('click',e=>{if(e.target===dialog&&typeof dialog.close==='function')dialog.close()});
  searchInput.addEventListener('input',renderGlossary);
 }
 function openCurrentChapterHash(){
  if(!/^saek-course-\d{2}\.html$/.test(location.pathname.split('/').pop()||''))return;
  const hash=location.hash;
  if(!/^#lesson-\d+$/.test(hash))return;
  const a=document.querySelector('.chapter-toc a[href="'+hash+'"]');
  if(a){a.click();document.querySelector(hash)?.scrollIntoView({behavior:'smooth',block:'start'})}
 }
 function init(){installNavSearch();installGlossary();window.addEventListener('hashchange',openCurrentChapterHash)}
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();