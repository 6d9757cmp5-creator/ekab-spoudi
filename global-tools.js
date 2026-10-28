/* EKAB Spoudi: one bilingual predictive search for the whole public app, plus expandable general medical lexicon. */
(function(){
'use strict';
if(window.__ekabGlobalToolsLoaded)return;
window.__ekabGlobalToolsLoaded=true;
const normalize=value=>String(value||'').replace(/₂/g,'2').replace(/₃/g,'3').replace(/₄/g,'4').replace(/µ/g,'μ').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('el').replace(/ς/g,'σ').trim();
const el=(tag,cls,content)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(content!==undefined)n.textContent=content;return n};
const fetchJson=async url=>{const r=await fetch(url,{cache:'no-cache'});if(!r.ok)throw Error(url+' HTTP '+r.status);return r.json()};
let searchCache=null,glossaryCache=null;
const FILES=['saek-search-A.json','saek-search-B.json','saek-search-C.json','saek-search-D.json','official_questions.json','app-pages-search-1.json','app-pages-search-2.json','app-pages-search-3.json','extra-exercises-search.json'];
async function loadGlossary(){
 if(!glossaryCache)glossaryCache=fetchJson('medical-terms.json?v=27.1.62').then(o=>o.items||[]).catch(e=>{glossaryCache=null;throw e});
 return glossaryCache;
}
function entries(parts){
 const results=[];
 for(let i=0;i<4;i++){
  for(const ch of parts[i]?.items||[]){
   results.push({kind:'saek',title:ch.chapterTitle,subtitle:'ΣΑΕΚ · '+ch.semester+'΄ εξάμηνο · '+ch.course,preview:ch.preview||'',href:ch.href,searchText:ch.searchText||'',keywords:ch.course+' '+ch.chapter+' '+ch.semester});
  }
 }
 for(const q of Array.isArray(parts[4])?parts[4]:[]){
  results.push({kind:'eoppep',title:q.question,subtitle:'ΕΟΠΠΕΠ · Ομάδα '+q.group+' · '+q.number,preview:'Ενδεικτική απάντηση διαθέσιμη στο αναγνωστήριο',href:'theory.html?question='+encodeURIComponent(q.id),searchText:(q.answer||'').slice(0,3300),keywords:[q.id,q.number,q.group,q.studyTopic].join(' ')});
 }
 for(let i=5;i<=8;i++)for(const p of parts[i]?.items||[]){
  if(!/^(?:[a-z0-9][a-z0-9_-]*\.html)(?:[?#][\w%=&#.-]+)?$/i.test(p.href))continue;
  results.push({kind:p.kind==='practice'?'practice':p.kind==='practical'?'practical':'page',title:p.title,subtitle:p.subtitle||'Ενότητα εφαρμογής',preview:p.preview||'',href:p.href,searchText:p.searchText||'',keywords:p.kind||''});
 }
 return results;
}
async function loadSearch(){
 if(!searchCache){
  searchCache=Promise.allSettled(FILES.map(fetchJson)).then(rs=>{
   if(!rs[0]||!rs[4]||rs[4].status!=='fulfilled')throw Error('Η τράπεζα ΕΟΠΠΕΠ δεν φορτώθηκε');
   const parts=rs.map(r=>r.status==='fulfilled'?r.value:null);
   const data=entries(parts);
   if(data.length<560)throw Error('Ελλιπές ευρετήριο: '+data.length+' αποτελέσματα');
   return data;
  }).catch(e=>{searchCache=null;throw e});
 }
 return searchCache;
}
const weight={saek:4,eoppep:4,practical:3,practice:3,page:2};
function find(query,data){
 const needle=normalize(query);
 if(!needle)return [];
 const words=needle.split(/\s+/).filter(Boolean);
 if(!words.length)return [];
 const scored=[];
 for(const item of data){
  const t=normalize(item.title),sub=normalize(item.subtitle),keys=normalize(item.keywords),body=normalize(item.searchText),prev=normalize(item.preview);
  const full=t+' '+sub+' '+keys+' '+body+' '+prev;
  if(!words.every(w=>full.includes(w)))continue;
  let score=weight[item.kind]||0;
  if(t===needle)score+=250;
  if(t.startsWith(needle))score+=145;
  if(keys.split(/\s+/).includes(needle))score+=110;
  for(const word of words){
   if(t.includes(word))score+=52;
   if(keys.includes(word))score+=31;
   if(sub.includes(word))score+=20;
   if(prev.includes(word))score+=10;
   if(body.includes(word))score+=3;
  }
  scored.push({item,score});
 }
 scored.sort((a,b)=>b.score-a.score||a.item.title.localeCompare(b.item.title,'el'));
 return scored.map(x=>x.item);
}
function pickDiverse(found,limit){
 const list=[],used=new Set(),bucket={};
 for(const entry of found){
  if(list.length>=limit)break;
  if((bucket[entry.kind]||0)>=4)continue;
  list.push(entry);used.add(entry);bucket[entry.kind]=(bucket[entry.kind]||0)+1;
 }
 for(const entry of found){if(list.length>=limit)break;if(!used.has(entry))list.push(entry)}
 return list;
}
function resultLink(item){
 const link=el('a','saek-result-item');
 link.href=item.href;
 const icon=item.kind==='eoppep'?'❓':item.kind==='saek'?'📚':item.kind==='practical'?'🚑':'🔎';
 link.append(el('strong',null,icon+' '+item.title));
 link.append(el('small',null,item.subtitle));
 if(item.preview)link.append(el('span','saek-result-preview',item.preview));
 return link;
}
function installSectionNav(){
 const nav=document.querySelector('header.top .nav');if(!nav||nav.classList.contains('ekab-breadcrumb'))return;
 const file=location.pathname.split('/').pop()||'index.html';
 if(file==='index.html'){nav.remove();return}
 const names={'theory.html':'Θεωρία ΕΟΠΠΕΠ','practical_exam.html':'Πρακτικό ΕΟΠΠΕΠ','saek.html':'Κατάρτιση ΣΑΕΚ','farmaka.html':'Φαρμακολογία','search.html':'Αποτελέσματα αναζήτησης'};
 const existing=nav.querySelector('a.active')?.textContent?.trim();
 const current=names[file]||(file.startsWith('saek-course-')?'Μάθημα ΣΑΕΚ':existing||'Εκπαιδευτικό υλικό');
 const home=el('a','ekab-home-back','← Πίσω');home.href=file==='saek.html'?'index.html':'index.html';home.addEventListener('click',event=>{try{if(history.length>1&&document.referrer&&new URL(document.referrer).origin===location.origin){event.preventDefault();history.back()}}catch{}});
 nav.className='nav ekab-breadcrumb';nav.replaceChildren(home,el('span','ekab-section-name',current));
}
function installSearch(){
 const utility=document.querySelector('header.top .utility');
 if(!utility||document.getElementById('ekabGlobalSearch'))return;
 const wrap=el('div','ekab-search-box');
 const toggle=el('button','utility-button ekab-search-toggle');
 toggle.type='button';toggle.title='Αναζήτηση σε όλη την ΕΚΑΒ Σπουδή';
 toggle.setAttribute('aria-label','Άνοιγμα γενικής αναζήτησης');
 toggle.setAttribute('aria-expanded','false');toggle.setAttribute('aria-controls','ekabSearchPopover');
 toggle.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="10.8" cy="10.8" r="6.6"/><path d="m16 16 4.8 4.8"/></svg>';
 const popup=el('section','ekab-search-popover');
 popup.id='ekabSearchPopover';popup.hidden=true;popup.setAttribute('role','search');
 const bar=el('div','ekab-search-head');
 bar.append(el('strong',null,'Αναζήτηση ΕΚΑΒ Σπουδή'));
 const closeBtn=el('button','ekab-search-close','×');closeBtn.type='button';closeBtn.setAttribute('aria-label','Κλείσιμο αναζήτησης');bar.append(closeBtn);
 const hint=el('p','ekab-search-hint','Πλήρης αναζήτηση σε θεωρία ΕΟΠΠΕΠ, πρακτικό, μαθήματα ΣΑΕΚ και ασκήσεις.');
 const input=el('input','ekab-search-field');
 input.id='ekabGlobalSearch';input.type='search';input.autocomplete='off';input.placeholder='π.χ. ΚΑΡΠΑ, αεραγωγός, Glasgow…';
 input.setAttribute('aria-label','Αναζήτηση σε όλη την εφαρμογή');
 input.setAttribute('aria-controls','ekabGlobalResults');input.setAttribute('aria-expanded','false');
 const examples=el('div','ekab-search-examples');
 examples.append(el('span',null,'Δοκίμασε:'));
 for(const term of ['ΚΑΡΠΑ','αεραγωγός','Γλασκώβη']){
  const chip=el('button','ekab-search-chip',term);chip.type='button';
  chip.addEventListener('click',()=>{input.value=term;render();input.focus()});examples.append(chip);
 }
 const results=el('div','saek-global-results');
 results.id='ekabGlobalResults';results.hidden=true;results.setAttribute('aria-live','polite');
 const all=el('a','saek-show-all','Πλήρης αναζήτηση · Όλα τα αποτελέσματα');
 all.href='search.html';
 const glossaryAction=el('button','ekab-search-glossary','Ιατρικό λεξικό · Ελληνικά / English / Σύμβολα');
 glossaryAction.type='button';
 glossaryAction.setAttribute('aria-haspopup','dialog');
 glossaryAction.setAttribute('aria-controls','medicalGlossaryDialog');
 glossaryAction.addEventListener('click',()=>{close();window.EkabOpenMedicalGlossary?.()});
 popup.append(bar,hint,input,examples,results,all,glossaryAction);wrap.append(toggle,popup);utility.prepend(wrap);
 let pending=0,links=[],selected=-1;
 const pageLink=q=>{all.href='search.html'+(q?'?q='+encodeURIComponent(q):'')};
 const close=()=>{popup.hidden=true;toggle.setAttribute('aria-expanded','false');input.setAttribute('aria-expanded','false');results.hidden=true;links=[];selected=-1};
 const open=()=>{popup.hidden=false;toggle.setAttribute('aria-expanded','true');input.focus();if(input.value.trim())render()};
 toggle.addEventListener('click',()=>popup.hidden?open():close());
 closeBtn.addEventListener('click',()=>{close();toggle.focus()});
 function draw(found,q){
  results.replaceChildren();links=[];selected=-1;
  if(!q.trim()){results.hidden=true;input.setAttribute('aria-expanded','false');return}
  if(!found.length)results.append(el('p','saek-result-empty','Δεν βρέθηκαν αποτελέσματα. Δοκίμασε άλλη λέξη ή αγγλικό όρο.'));
  else{
   results.append(el('p','saek-result-count',found.length+' αποτελέσματα · Πρόβλεψη από τα μαθήματα'));
   for(const item of pickDiverse(found,6)){const link=resultLink(item);results.append(link);links.push(link)}
  }
  results.hidden=false;input.setAttribute('aria-expanded','true');
 }
 function render(){
  const q=input.value,token=++pending;pageLink(q.trim());
  if(!q.trim()){results.replaceChildren();results.hidden=true;input.setAttribute('aria-expanded','false');return}
  results.replaceChildren(el('p','saek-result-empty','Αναζήτηση…'));results.hidden=false;
  loadSearch().then(data=>{if(token===pending)draw(find(q,data),q)}).catch(()=>{if(token===pending){results.replaceChildren(el('p','saek-result-empty','Δεν φορτώθηκε η αναζήτηση. Έλεγξε τη σύνδεση ή ενημέρωσε την εφαρμογή.'));results.hidden=false}});
 }
 input.addEventListener('input',render);
 input.addEventListener('keydown',e=>{
  if(e.key==='Escape'){e.preventDefault();close();toggle.focus()}
  if(e.key==='Enter'&&input.value.trim()){e.preventDefault();location.href='search.html?q='+encodeURIComponent(input.value.trim())}
  if(e.key==='ArrowDown'&&links.length){e.preventDefault();links[0].focus()}
 });
 results.addEventListener('keydown',e=>{
  const idx=links.indexOf(document.activeElement);
  if(e.key==='Escape'){e.preventDefault();close();toggle.focus()}
  if(e.key==='ArrowDown'&&links.length){e.preventDefault();links[(idx+1)%links.length].focus()}
  if(e.key==='ArrowUp'&&links.length){e.preventDefault();links[(idx-1+links.length)%links.length].focus()}
 });
 document.addEventListener('pointerdown',e=>{if(!wrap.contains(e.target))close()});
 if(location.pathname.endsWith('/search.html')){const q=new URLSearchParams(location.search).get('q');if(q){input.value=q;pageLink(q)}}
}
function medNormal(value){return normalize(String(value??'').replace(/[₂]/g,'2').replace(/[₃]/g,'3').replace(/[₄]/g,'4').replace(/µ/g,'μ'))}
function findGlossary(q,terms,category){
 const query=medNormal(q),words=query.split(/\s+/).filter(Boolean);
 const shortSymbol=query.length<=2&&terms.some(t=>(t.symbols||[]).some(sym=>medNormal(sym)===query));
 return terms.map((t,id)=>{
  if(category&&t.category!==category)return null;
  const primary=[t.term,t.en].map(medNormal),secondary=[...(t.aliases||[]),...(t.symbols||[])].map(medNormal);
  const hay=[...primary,...secondary];
  if(shortSymbol&&!secondary.some(sym=>sym===query))return null;
  if(words.length&&!words.every(w=>hay.some(h=>h.includes(w))||(w.length>=4&&medNormal(t.definition).includes(w))))return null;
  let score=primary.some(x=>x===query)?180:secondary.some(x=>x===query)?160:primary.some(x=>x.startsWith(query))?125:secondary.some(x=>x.startsWith(query))?110:primary.some(x=>x.includes(query))?75:secondary.some(x=>x.includes(query))?55:0;
  if(!query)score=0;
  return {term:t,id,score};
 }).filter(Boolean).sort((a,b)=>b.score-a.score||a.term.term.localeCompare(b.term.term,'el'));
}
function installGlossary(){
 const util=document.querySelector('header.top .utility');if(!util||document.getElementById('medicalGlossaryOpen'))return;
 const btn=el('button','utility-button glossary-open');btn.type='button';btn.id='medicalGlossaryOpen';
 btn.setAttribute('aria-label','Άνοιγμα ιατρικού λεξικού — αναζήτηση όρων');
 btn.setAttribute('aria-haspopup','dialog');
 btn.setAttribute('aria-controls','medicalGlossaryDialog');
 btn.title='Ιατρικό λεξικό — αναζήτηση όρων';
 // Decorative book-with-search icon. The full explanation lives inside the dialog.
 const svgNS='http://www.w3.org/2000/svg',svg=document.createElementNS(svgNS,'svg');
 svg.setAttribute('viewBox','0 0 28 28');svg.setAttribute('fill','none');
 svg.setAttribute('stroke','currentColor');svg.setAttribute('stroke-width','1.75');
 svg.setAttribute('stroke-linejoin','round');svg.setAttribute('stroke-linecap','round');
 svg.setAttribute('aria-hidden','true');svg.setAttribute('focusable','false');
 const draw=(tag,attrs)=>{const node=document.createElementNS(svgNS,tag);for(const [key,val] of Object.entries(attrs))node.setAttribute(key,String(val));svg.append(node)};
 draw('path',{d:'M13.3 7.4C10.6 5.9 7.5 5.6 4 6v14c3.5-.4 6.6-.1 9.3 1.4V7.4Zm0 0C16 5.9 19.2 5.6 22.5 6v7.2'});
 draw('path',{d:'M13.3 7.4v14M5.7 9.1c2.2-.1 4 .1 5.6.9M5.7 12c2.2-.1 4 .1 5.6.9'});
 draw('circle',{cx:'20.7',cy:'18.6',r:'3.3'});
 draw('path',{d:'m23.1 21 2.8 2.8'});
 btn.append(svg);btn.hidden=true;btn.style.display='none';util.append(btn);
 const dialog=el('dialog','medical-glossary-dialog');dialog.id='medicalGlossaryDialog';
 const inner=el('div','medical-glossary-inner'),head=el('div','medical-glossary-head');
 const heading=el('div');heading.append(el('p','medical-eyebrow','Ελληνικά · English · Σύμβολα'),el('h2',null,'Ιατρικό λεξικό'));
 const closeBtn=el('button','medical-glossary-close','Κλείσιμο');closeBtn.type='button';head.append(heading,closeBtn);
 const help=el('p','medical-glossary-help','Αναζήτησε στα ελληνικά, στα αγγλικά ή με συντομογραφία / σύμβολο (SpO₂, ECG, mmHg). Πάτησε έναν όρο για την επεξήγηση και εικόνα, όπου υπάρχει.');
 const search=el('input','medical-glossary-search');search.type='search';search.placeholder='π.χ. καρδιά, heart, SpO₂, ECG…';search.setAttribute('aria-label','Αναζήτηση στα ελληνικά, αγγλικά ή με σύμβολα');
 const choice=el('select','medical-glossary-select');choice.setAttribute('aria-label','Επιλογή ιατρικής κατηγορίας');
 const count=el('p','medical-glossary-count');count.setAttribute('role','status');count.setAttribute('aria-live','polite');
 const results=el('div','medical-glossary-results');
 const more=el('button','medical-glossary-more','Περισσότεροι όροι');more.type='button';more.hidden=true;
 inner.append(head,help,search,choice,count,results,more);dialog.append(inner);document.body.append(dialog);
 let terms=[],openId=null,limit=40,returnFocus=null;
 function render(){
  const matched=findGlossary(search.value,terms,choice.value);results.replaceChildren();
  count.textContent=matched.length+' αποτελέσματα · '+terms.length+' λήμματα';
  if(!matched.length){results.append(el('p','medical-no-results','Δεν βρέθηκε όρος. Δοκίμασε συνώνυμο, αγγλική ονομασία ή σύμβολο.'));more.hidden=true;return}
  for(const {term:t,id} of matched.slice(0,limit)){
   const card=el('article','medical-glossary-entry');
   const toggle=el('button','medical-glossary-term');toggle.type='button';const expanded=id===openId;
   toggle.setAttribute('aria-expanded',String(expanded));
   toggle.setAttribute('aria-label',t.term+' — '+(expanded?'Απόκρυψη':'Προβολή')+' επεξήγησης');
   const titles=el('span','medical-glossary-titles');
   titles.append(el('strong',null,t.term),el('small',null,t.en||''));
   if(t.symbols?.length)titles.append(el('span','medical-glossary-symbols',t.symbols.join(' · ')));
   const arrow=el('span','medical-glossary-arrow',expanded?'⌄':'›');arrow.setAttribute('aria-hidden','true');
   toggle.append(titles,arrow);card.append(toggle);
   if(expanded){
    const detail=el('div','medical-glossary-detail');detail.append(el('p','medical-glossary-definition',t.definition));
    if(t.category)detail.append(el('p','medical-glossary-category',t.category));
    if(t.aliases?.length)detail.append(el('p','medical-glossary-aliases','Συνώνυμα / σχετικοί όροι: '+t.aliases.join(' · ')));
    if(t.image&&/^https:\/\/commons\.wikimedia\.org\/wiki\/Special:FilePath\//.test(t.image.url||'')){
     const figure=el('figure','medical-glossary-figure'),img=el('img');img.src=t.image.url;img.alt=t.image.caption||('Ιατρική απεικόνιση: '+t.term);img.loading='lazy';img.decoding='async';
     img.addEventListener('error',()=>figure.replaceChildren(el('p','medical-glossary-help','Η εικόνα δεν είναι διαθέσιμη αυτή τη στιγμή.')));
     const caption=el('figcaption',null,(t.image.caption||'Εικόνα')+' · ');
     const attribution=el('a',null,(t.image.credit||'Wikimedia Commons')+' · '+(t.image.license||'Άδεια εικόνας'));
     attribution.href=t.image.page;attribution.target='_blank';attribution.rel='noopener noreferrer';caption.append(attribution);figure.append(img,caption);detail.append(figure);
    }
    if(t.source&&/^https:\/\//.test(t.source)){
     const link=el('a','medical-glossary-source',t.sourceType==='category'?'Σχετική θεματική βιβλιογραφία':'Επιστημονική πηγή');
     link.href=t.source;link.target='_blank';link.rel='noopener noreferrer';detail.append(link);
    }
    card.append(detail);
   }
   toggle.addEventListener('click',()=>{openId=expanded?null:id;render()});
   results.append(card);
  }
  more.hidden=matched.length<=limit;
  more.textContent='Περισσότεροι όροι ('+Math.min(40,matched.length-limit)+')';
 }
 function open(value){
  returnFocus=document.activeElement;
  if(typeof dialog.showModal==='function'){if(!dialog.open)dialog.showModal()}else dialog.setAttribute('open','');
  if(value)search.value=value;
  results.replaceChildren(el('p',null,'Φόρτωση ιατρικών όρων…'));
  loadGlossary().then(items=>{
   terms=items;
   choice.replaceChildren();const all=el('option',null,'Όλες οι ειδικότητες');all.value='';choice.append(all);
   for(const cat of [...new Set(items.map(x=>x.category||'Γενική ιατρική'))].sort((a,b)=>a.localeCompare(b,'el'))){const opt=el('option',null,cat);opt.value=cat;choice.append(opt)}
   limit=40;openId=null;render();
  }).catch(()=>results.replaceChildren(el('p',null,'Το λεξικό δεν φορτώθηκε. Δοκίμασε ενημέρωση της εφαρμογής.')));
  search.focus();
 }
 window.EkabOpenMedicalGlossary=open;
 document.getElementById('homeGlossaryOpen')?.addEventListener('click',()=>open());
 btn.addEventListener('click',()=>open());
 closeBtn.addEventListener('click',()=>{if(typeof dialog.close==='function')dialog.close();else dialog.removeAttribute('open');if(returnFocus&&document.contains(returnFocus))returnFocus.focus()});
 dialog.addEventListener('click',e=>{if(e.target===dialog&&dialog.close)dialog.close()});
 search.addEventListener('input',()=>{openId=null;limit=40;render()});
 choice.addEventListener('change',()=>{openId=null;limit=40;render()});
 more.addEventListener('click',()=>{limit+=40;render()});
 const incoming=new URLSearchParams(location.search).get('medicalTerm');if(incoming)open(incoming);
}
function showSearchPage(){
 const results=document.getElementById('globalSearchResultsPage');
 if(!results)return;
 const query=new URLSearchParams(location.search).get('q')||'';
 const heading=document.getElementById('globalSearchQuery');
 if(heading)heading.textContent=query?'Αποτελέσματα για: '+query:'Αναζήτηση στην ΕΚΑΒ Σπουδή';
 if(!query){results.replaceChildren(el('p',null,'Πληκτρολόγησε κάτι στην αναζήτηση από το εικονίδιο αναζήτησης στην κορυφή.'));return}
 results.replaceChildren(el('p',null,'Φόρτωση αποτελεσμάτων…'));
 loadSearch().then(data=>{
  const found=find(query,data);results.replaceChildren();
  const summary=el('p','global-search-summary',found.length+' αποτελέσματα στο δημόσιο εκπαιδευτικό περιεχόμενο της εφαρμογής.');
  results.append(summary);
  if(!found.length){results.append(el('p','saek-result-empty','Δεν βρέθηκε αποτέλεσμα. Δοκίμασε διαφορετική λέξη ή όρο από τα μαθήματα.'));return}
  const kinds=[['eoppep','Ερωτήσεις ΕΟΠΠΕΠ'],['saek','Κατάρτιση ΣΑΕΚ'],['practical','Πρακτικό ΕΟΠΠΕΠ'],['practice','Συμπληρωματικές ασκήσεις'],['page','Ενότητες και σελίδες']];
  for(const [kind,title] of kinds){
   const matches=found.filter(x=>x.kind===kind);if(!matches.length)continue;
   const section=el('section','global-search-category'),h=el('h2',null,title+' ('+matches.length+')');
   section.append(h);
   for(const item of matches.slice(0,30))section.append(resultLink(item));
   if(matches.length>30){const more=el('button','btn compact secondary','Εμφάνιση υπολοίπων ('+(matches.length-30)+')');more.type='button';
    more.addEventListener('click',()=>{for(const x of matches.slice(30))section.insertBefore(resultLink(x),more);more.remove()});section.append(more)}
   results.append(section);
  }
 }).catch(()=>results.replaceChildren(el('p','saek-result-empty','Δεν φορτώθηκε το ευρετήριο. Έλεγξε τη σύνδεση ή ενημέρωσε την εφαρμογή.')));
}
function showExtraExercise(){
 if(!location.pathname.endsWith('supplementary_practice.html'))return;
 const id=new URLSearchParams(location.search).get('exercise');
 if(!id||!/^[a-z0-9-]{2,65}$/i.test(id))return;
 fetchJson('supplementary_exercises.json').then(items=>{
  const item=items.find(x=>x.id===id);if(!item)return;
  const main=document.querySelector('main');if(!main)return;
  const box=el('section','panel global-exercise-preview'),title=el('h2',null,'Αποτέλεσμα αναζήτησης · Συμπληρωματική άσκηση');
  box.append(title,el('p','eyebrow',item.category||''),el('h3',null,item.question));
  const opts=el('ol');for(const option of item.options||[]){opts.append(el('li',null,option))}
  box.append(opts,el('p','small muted','Εκπαιδευτική άσκηση · όχι αυτούσιο θέμα ΕΟΠΠΕΠ.'));
  const button=el('button','btn secondary compact','Εμφάνιση ενδεικτικής λύσης');button.type='button';
  const solution=el('p','global-exercise-answer');solution.hidden=true;
  solution.textContent=(item.options?.[item.answer]||'')+(item.explanation?' · '+item.explanation:'');
  button.addEventListener('click',()=>{solution.hidden=!solution.hidden});
  box.append(button,solution);main.insertBefore(box,main.firstChild);box.scrollIntoView({block:'start'});
 }).catch(()=>{});
}
function openCurrentChapterHash(){
 if(!/^saek-course-\d{2}\.html$/.test(location.pathname.split('/').pop()||''))return;
 const hash=location.hash;
 if(!/^#lesson-\d+$/.test(hash))return;
 const a=document.querySelector('.chapter-toc a[href="'+hash+'"]');
 if(a){a.click();document.querySelector(hash)?.scrollIntoView({block:'start'})}
}
function init(){installSectionNav();installSearch();installGlossary();showSearchPage();showExtraExercise();window.addEventListener('hashchange',openCurrentChapterHash)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();