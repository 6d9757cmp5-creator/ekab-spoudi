/* EKAB Spoudi: one bilingual predictive search for the whole public app, plus expandable general medical lexicon. */
(function(){
'use strict';
const normalize=value=>String(value||'').replace(/₂/g,'2').replace(/₃/g,'3').replace(/₄/g,'4').replace(/µ/g,'μ').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('el').replace(/ς/g,'σ').trim();
const el=(tag,cls,content)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(content!==undefined)n.textContent=content;return n};
const fetchJson=async url=>{const r=await fetch(url,{cache:'force-cache'});if(!r.ok)throw Error(url+' HTTP '+r.status);return r.json()};
let searchCache=null,glossaryCache=null;
const FILES=['saek-search-A.json','saek-search-B.json','saek-search-C.json','saek-search-D.json','official_questions.json','app-pages-search-1.json','app-pages-search-2.json','app-pages-search-3.json','extra-exercises-search.json','medical-terms.json'];
async function loadGlossary(){
 if(!glossaryCache)glossaryCache=fetchJson('medical-terms.json').then(o=>o.items||[]).catch(e=>{glossaryCache=null;throw e});
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
  results.push({kind:'eoppep',title:q.question,subtitle:'ΕΟΠΠΕΠ · Ομάδα '+q.group+' · '+q.number,preview:'Ενδεικτική απάντηση διαθέσιμη στο αναγνωστήριο',href:'index.html?question='+encodeURIComponent(q.id),searchText:(q.answer||'').slice(0,3300),keywords:[q.id,q.number,q.group,q.studyTopic].join(' ')});
 }
 for(let i=5;i<=8;i++)for(const p of parts[i]?.items||[]){
  if(!/^(?:[a-z0-9][a-z0-9_-]*\.html)(?:[?#][\w%=&#.-]+)?$/i.test(p.href))continue;
  results.push({kind:p.kind==='practice'?'practice':p.kind==='practical'?'practical':'page',title:p.title,subtitle:p.subtitle||'Ενότητα εφαρμογής',preview:p.preview||'',href:p.href,searchText:p.searchText||'',keywords:p.kind||''});
 }
 for(const t of parts[9]?.items||[]){
  results.push({kind:'medical',title:t.term+' · '+(t.en||''),subtitle:'Ιατρικοί όροι · '+(t.category||'Γενική ιατρική'),preview:t.definition||'',href:'search.html?medicalTerm='+encodeURIComponent(t.term),searchText:t.definition||'',keywords:[t.term,t.en,t.category,...(t.aliases||[]),...(t.symbols||[])].join(' ')});
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
const weight={medical:5,saek:4,eoppep:4,practical:3,practice:3,page:2};
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
 const icon=item.kind==='medical'?'📖':item.kind==='eoppep'?'❓':item.kind==='saek'?'📚':item.kind==='practical'?'🚑':'🔎';
 link.append(el('strong',null,icon+' '+item.title));
 link.append(el('small',null,item.subtitle));
 if(item.preview)link.append(el('span','saek-result-preview',item.preview));
 return link;
}
function installSearch(){
 const nav=document.querySelector('header.top .nav'),saek=nav?.querySelector('a[href="saek.html"]');
 if(!saek||document.getElementById('ekabGlobalSearch'))return;
 const wrap=el('div','saek-global-search');
 const label=el('label','saek-search-label','Αναζήτηση ΕΚΑΒ Σπουδή');
 const input=el('input','saek-search-field');
 input.id='ekabGlobalSearch';input.type='search';input.autocomplete='off';
 input.placeholder='Αναζήτηση σε όλη την εφαρμογή…';
 input.setAttribute('aria-label','Αναζήτηση σε όλη την ΕΚΑΒ Σπουδή: ΕΟΠΠΕΠ, ΣΑΕΚ, πρακτικό μέρος και ιατρικοί όροι');
 input.setAttribute('aria-controls','ekabGlobalResults');input.setAttribute('aria-expanded','false');
 label.htmlFor=input.id;
 const dropdown=el('div','saek-global-results');
 dropdown.id='ekabGlobalResults';dropdown.hidden=true;dropdown.setAttribute('role','region');dropdown.setAttribute('aria-label','Προτάσεις αναζήτησης');
 wrap.append(label,input,dropdown);saek.after(wrap);
 let pending=0,links=[],selected=-1;
 const close=()=>{dropdown.hidden=true;input.setAttribute('aria-expanded','false');links=[];selected=-1};
 const pageLink=q=>{const a=el('a','saek-show-all','Προβολή όλων των αποτελεσμάτων');a.href='search.html?q='+encodeURIComponent(q);return a};
 function draw(found,q){
  dropdown.replaceChildren();links=[];selected=-1;
  if(!q.trim()){close();return}
  if(!found.length){dropdown.append(el('p','saek-result-empty','Δεν βρέθηκε κάτι. Δοκίμασε άλλη λέξη ή αγγλικό όρο.'));dropdown.hidden=false;input.setAttribute('aria-expanded','true');return}
  dropdown.append(el('p','saek-result-count',found.length+' σχετικά αποτελέσματα σε όλη την εφαρμογή'));
  for(const item of pickDiverse(found,12)){const link=resultLink(item);dropdown.append(link);links.push(link)}
  dropdown.append(pageLink(q));
  dropdown.hidden=false;input.setAttribute('aria-expanded','true');
 }
 function render(){
  const token=++pending,q=input.value;
  if(!q.trim()){close();return}
  dropdown.replaceChildren(el('p','saek-result-empty','Αναζήτηση σε ΕΟΠΠΕΠ, ΣΑΕΚ, πρακτικό και ιατρικό λεξικό…'));dropdown.hidden=false;
  loadSearch().then(data=>{if(token!==pending)return;draw(find(q,data),q)})
   .catch(()=>{if(token!==pending)return;dropdown.replaceChildren(el('p','saek-result-empty','Η αναζήτηση δεν φορτώθηκε πλήρως. Έλεγξε τη σύνδεση και πάτησε «Ενημέρωση».'));dropdown.hidden=false});
 }
 input.addEventListener('input',render);
 input.addEventListener('focus',()=>{if(input.value.trim())render()});
 input.addEventListener('keydown',e=>{
  if(e.key==='Escape'){close();input.blur();return}
  if(e.key==='ArrowDown'&&links.length){e.preventDefault();selected=(selected+1)%links.length;links[selected].focus();return}
  if(e.key==='Enter'&&input.value.trim()){e.preventDefault();location.href='search.html?q='+encodeURIComponent(input.value.trim())}
 });
 dropdown.addEventListener('keydown',e=>{
  if(e.key==='Escape'){close();input.focus()}
  if(e.key==='ArrowDown'&&links.length){e.preventDefault();selected=(selected+1)%links.length;links[selected].focus()}
  if(e.key==='ArrowUp'&&links.length){e.preventDefault();selected=(selected-1+links.length)%links.length;links[selected].focus()}
 });
 document.addEventListener('pointerdown',e=>{if(!wrap.contains(e.target))close()});
 if(location.pathname.endsWith('/search.html')){
  const q=new URLSearchParams(location.search).get('q')||'';
  if(q)input.value=q;
 }
}
function medNormal(value){return normalize(String(value??'').replace(/[₂]/g,'2').replace(/[₃]/g,'3').replace(/[₄]/g,'4').replace(/µ/g,'μ'))}
function findGlossary(q,terms,category){
 const query=medNormal(q),words=query.split(/\s+/).filter(Boolean);
 return terms.map((t,id)=>{
  if(category&&t.category!==category)return null;
  const primary=[t.term,t.en].map(medNormal),secondary=[...(t.aliases||[]),...(t.symbols||[])].map(medNormal);
  const hay=[...primary,...secondary];
  if(words.length&&!words.every(w=>hay.some(h=>h.includes(w))||(w.length>=4&&medNormal(t.definition).includes(w))))return null;
  let score=primary.some(x=>x===query)?180:secondary.some(x=>x===query)?160:primary.some(x=>x.startsWith(query))?125:secondary.some(x=>x.startsWith(query))?110:primary.some(x=>x.includes(query))?75:secondary.some(x=>x.includes(query))?55:0;
  if(!query)score=0;
  return {term:t,id,score};
 }).filter(Boolean).sort((a,b)=>b.score-a.score||a.term.term.localeCompare(b.term.term,'el'));
}
function installGlossary(){
 const util=document.querySelector('header.top .utility');if(!util||document.getElementById('medicalGlossaryOpen'))return;
 const btn=el('button','utility-button glossary-open','📖 Ιατρικό λεξικό');btn.type='button';btn.id='medicalGlossaryOpen';btn.title='Γενικό ελληνοαγγλικό ιατρικό λεξικό';util.prepend(btn);
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
 let terms=[],openId=null,limit=40;
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
 btn.addEventListener('click',()=>open());
 closeBtn.addEventListener('click',()=>{if(typeof dialog.close==='function')dialog.close();else dialog.removeAttribute('open');btn.focus()});
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
 if(!query){results.replaceChildren(el('p',null,'Πληκτρολόγησε κάτι στην αναζήτηση δίπλα από την Κατάρτιση ΣΑΕΚ.'));return}
 results.replaceChildren(el('p',null,'Φόρτωση αποτελεσμάτων…'));
 loadSearch().then(data=>{
  const found=find(query,data);results.replaceChildren();
  const summary=el('p','global-search-summary',found.length+' αποτελέσματα στο δημόσιο εκπαιδευτικό περιεχόμενο της εφαρμογής.');
  results.append(summary);
  if(!found.length){results.append(el('p','saek-result-empty','Δεν βρέθηκε αποτέλεσμα. Δοκίμασε συνώνυμο, ελληνική ή αγγλική ορολογία.'));return}
  const kinds=[['eoppep','Ερωτήσεις ΕΟΠΠΕΠ'],['saek','Κατάρτιση ΣΑΕΚ'],['practical','Πρακτικό ΕΟΠΠΕΠ'],['practice','Συμπληρωματικές ασκήσεις'],['medical','Ιατρικό λεξικό'],['page','Ενότητες και σελίδες']];
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
function init(){installSearch();installGlossary();showSearchPage();showExtraExercise();window.addEventListener('hashchange',openCurrentChapterHash)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();