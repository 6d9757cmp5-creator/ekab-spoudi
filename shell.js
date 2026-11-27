/* Shared shell for the beta pages: top bar with search, side navigation (drawer on phones), theme.
   Reading progress uses the same keys as the course pages, so both views show the same chapters as read. */
export const COURSES=[
 ['01','Ανατομία','Α',14],['02','Φυσιολογία','Α',13],['03','Ο Διασώστης – Επαγγελματίας Υγείας','Α',10],
 ['04','Βασικές Αρχές Δημόσιας Υγείας','Α',10],['05','Εισαγωγή στην Προνοσοκομειακή Εκτίμηση και Υποστήριξη του Ασθενούς','Α',14],
 ['06','Βασική Αγγλική Ορολογία Προνοσοκομειακής Φροντίδας','Α',10],['07','Τεχνικές Επικοινωνίας Επείγουσας Κλήσης','Β',11],
 ['08','Τεχνολογίες Πληροφορικής και Επικοινωνιών Προνοσοκομειακά','Β',11],['09','Ασφαλής Χειρισμός – Οδήγηση Ασθενοφόρου','Β',11],
 ['10','Επείγουσες Παθολογικές Καταστάσεις Προνοσοκομειακά','Β',17],['11','Αγγλική Ορολογία Προνοσοκομειακών Πρακτικών','Β',11],
 ['12','Προνοσοκομειακή Χρήση Φαρμάκων','Β',12],['13','Τεχνικές Λήψης Επείγουσας Κλήσης','Γ',11],
 ['14','Προνοσοκομειακή Αντιμετώπιση Τραύματος','Γ',14],['15','Διαχείριση Μαζικού Συμβάντος','Γ',13],
 ['16','Πρωτόκολλα Διαχείρισης στα Συνήθη Επείγοντα Προνοσοκομειακά Περιστατικά','Γ',13],
 ['17','Πρακτική Εφαρμογή σε Τεχνικές και Δεξιότητες Επειγόντων Παθολογικών','Δ',13],
 ['18','Πρακτική Εφαρμογή σε Τεχνικές και Δεξιότητες Αντιμετώπισης Τραύματος','Δ',13],
 ['19','Διακομιδές Ασθενών','Δ',13],['20','Ο Διασώστης/ρια στα ΤΕΠ','Δ',13]
].map(([id,title,semester,chapters])=>({id,title,semester,chapters}));

const store={get(k){try{return localStorage.getItem(k)}catch(_){return null}},set(k,v){try{v==null?localStorage.removeItem(k):localStorage.setItem(k,v);return true}catch(_){return false}}};
export {store};
export const isRead=(c,n)=>store.get(`ekab.saek.read.v1.${c}.${n}`)==='1';
export const setRead=(c,n,on)=>{const ok=store.set(`ekab.saek.read.v1.${c}.${n}`,on?'1':null);window.dispatchEvent(new Event('ekab:progress-changed'));return ok};
export const readCount=c=>{let n=0;for(let i=1;i<=c.chapters;i++)if(isRead(c.id,i))n++;return n};
// Study days for the streak widget; the course pages outside the beta record them in theme-init.js.
export const logStudyDay=()=>{try{const d=new Date(),day=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');let days=JSON.parse(store.get('ekab.study.days.v1')||'[]');if(!Array.isArray(days))days=[];if(days[days.length-1]!==day){days=days.filter(x=>x!==day);days.push(day);store.set('ekab.study.days.v1',JSON.stringify(days.slice(-120)))}}catch(_){}};
export const esc=s=>String(s).replace(/[&<>"]/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[ch]));

const icon={
 home:'<path d="m3 10 9-7 9 7M5 9v12h14V9M9 21v-7h6v7"/>',
 book:'<path d="M3 5.5A2.5 2.5 0 0 1 5.5 3H20v17H5.5A2.5 2.5 0 0 0 3 22zM3 5.5v14A2.5 2.5 0 0 1 5.5 17H20"/>',
 cert:'<circle cx="12" cy="9" r="6"/><path d="m8.5 14-1.5 7 5-3 5 3-1.5-7"/>',
 hands:'<path d="M7 11V6a2 2 0 0 1 4 0v5M11 10V4a2 2 0 0 1 4 0v7M15 9a2 2 0 0 1 4 0v5a7 7 0 0 1-7 7h-1a7 7 0 0 1-6-3.4L3 14a2 2 0 0 1 3.4-2L7 13"/>',
 target:'<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.4"/>',
 exam:'<path d="M9 4h6v3H9zM7 5H5v16h14V5h-2M9 12l2 2 4-4M9 17h6"/>',
 mic:'<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/>',
 pill:'<path d="m10.5 20.5-7-7a5 5 0 0 1 7-7l7 7a5 5 0 0 1-7 7zM7 10l7 7"/>',
 siren:'<path d="M7 18v-6a5 5 0 0 1 10 0v6M5 21h14v-3H5zM12 3v2M4.2 6.2l1.4 1.4M19.8 6.2l-1.4 1.4"/>',
 ecg:'<path d="M3 12h4l2-5 4 10 2-5h6"/>',
 phone:'<path d="M22 16.9v3a2 2 0 0 1-2.2 2A19.8 19.8 0 0 1 3.1 5.2 2 2 0 0 1 5.1 3h3a2 2 0 0 1 2 1.7l.5 3.1a2 2 0 0 1-.6 1.8L8.5 11a16 16 0 0 0 4.4 4.4l1.6-1.5a2 2 0 0 1 1.7-.6l3.1.5a2 2 0 0 1 1.7 2z"/>',
 play:'<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m10 9 5 3-5 3z"/>',
 image:'<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="m21 17-5-5-9 8"/>',
 chart:'<path d="M4 19V5M4 19h17M7 15l4-4 3 2 6-7"/>',
 search:'<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>',
 tools:'<path d="M4 7h16M4 12h10M4 17h7"/><circle cx="18" cy="12" r="2"/><circle cx="15" cy="17" r="2"/>',
 user:'<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
 grid:'<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
 cal:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
 lexicon:'<path d="M4 5a2 2 0 0 1 2-2h14v16H6a2 2 0 0 0-2 2zM4 5v16M9 8h7M9 12h5"/>',
 menu:'<path d="M4 7h16M4 12h16M4 17h16"/>',
 close:'<path d="M6 6l12 12M18 6 6 18"/>',
 moon:'<path d="M20.5 14.5A8.7 8.7 0 0 1 9.5 3.5 8.8 8.8 0 1 0 20.5 14.5Z"/>',
 sun:'<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M2 12h2m16 0h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>'
};
export const svg=n=>`<svg viewBox="0 0 24 24" aria-hidden="true">${icon[n]}</svg>`;

const NAV=[['index.html','home','Αρχική'],['study.html','book','Μελέτη'],['practice.html','target','Εξάσκηση'],['tools.html','tools','Εργαλεία'],['progress-v6.html','chart','Εσύ']];
// Pages that sit inside a section light up that section in the menu and the tab bar.
const SECTION={'theory.html':'study.html','written_exam.html':'study.html','exam_focus.html':'study.html','study_map.html':'study.html','eoppep.html':'study.html','seminar-prep.html':'study.html','profession-law.html':'study.html','mentor-library.html':'study.html','pdf-library.html':'study.html','eclass.html':'study.html','manual.html':'study.html','ui-tools/anatomy-3d/index.html':'study.html','courses.html':'study.html','chapter.html':'study.html','saek.html':'study.html','saek-videos.html':'study.html','saek-images.html':'study.html',
 'saek-exams.html':'practice.html','theory.html':'practice.html','practical_exam.html':'practice.html','mentor-oral.html':'practice.html',
 'farmaka.html':'tools.html','protocols.html':'tools.html','contacts.html':'tools.html','pdf-library.html':'tools.html',
 'study-plan.html':'progress-v6.html'};

const norm=s=>String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/ς/g,'σ');

function applyTheme(t){
 const root=document.documentElement;
 if(t==='dark'||t==='light')root.dataset.theme=t;else delete root.dataset.theme;
}
const currentTheme=()=>document.documentElement.dataset.theme||(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light');

/* An existing page inside the new shell: its own scripts and features stay; theme-init.js already loads the shared ones. */
export function legacy(current){
 document.documentElement.classList.add('b-legacy');
 shell(current,{legacy:true});
 lessonReader();
 // Image gallery (Φωτογραφίες ΣΑΕΚ): the same full-screen viewer, across the cards shown on the page.
 if(relPath()==='saek-images.html')document.addEventListener('click',e=>{
  const btn=e.target.closest('.saek-gallery-image-button');if(!btn)return;e.preventDefault();e.stopPropagation();
  const cards=[...document.querySelectorAll('.saek-gallery-card')].filter(c=>c.offsetParent);
  photoViewer(cards.map(c=>({src:c.querySelector('img').currentSrc||c.querySelector('img').src,title:c.querySelector('h2')?.textContent.trim()||'',caption:[c.querySelector('p')?.textContent.trim(),(c.querySelector('img').alt||'').split('. ').slice(1).join('. ')].filter(Boolean).join(' · '),alt:c.querySelector('img').alt||''})),cards.indexOf(btn.closest('.saek-gallery-card')));
 },true);

}

// Site root (where this file lives): links work from pages in sub-folders too.
const ROOT=new URL('./',import.meta.url);
const at=h=>/^(https?:|#|mailto:|tel:|data:)/.test(h)?h:new URL(String(h).replace(/^\.\//,''),ROOT).href;
const relPath=()=>location.pathname.startsWith(ROOT.pathname)?location.pathname.slice(ROOT.pathname.length)||'index.html':location.pathname.split('/').pop()||'index.html';

export function shell(current,opts={}){
 applyTheme(store.get('ekab.theme.v1'));
 const here=relPath();
 const top=document.createElement('header');top.className='b-top';
 top.innerHTML=`<button class="b-icon b-menu" type="button" aria-label="Άνοιγμα μενού" aria-expanded="false" aria-controls="b-side">${svg('menu')}</button>
 <a class="b-brand" href="${at('index.html')}" aria-label="ΕΚΑΒ Σπουδή, αρχική"><img src="${at('icon.svg')}" alt=""><span>ΕΚΑΒ Σπουδή</span></a>
 <div class="b-search" role="search">${svg('search')}<label class="sr-only" for="b-q">Αναζήτηση σε όλη την εφαρμογή</label>
  <input id="b-q" type="search" role="combobox" aria-autocomplete="list" placeholder="Αναζήτηση σε όλη την εφαρμογή" autocomplete="off" aria-controls="b-res" aria-expanded="false">
  <kbd class="b-kbd" aria-hidden="true">Ctrl K</kbd><button class="b-search-cancel" type="button">Άκυρο</button><ul class="b-results" id="b-res" role="listbox" hidden></ul></div>
 <div class="b-tools"><button class="b-icon b-search-btn" type="button" aria-label="Αναζήτηση">${svg('search')}</button><button class="b-icon" type="button" data-theme-toggle></button><button class="b-icon b-account" type="button" data-account-open aria-label="Λογαριασμός και συγχρονισμός" title="Λογαριασμός">${svg('user')}</button></div>`;
 const side=document.createElement('nav');side.className='b-side';side.id='b-side';side.setAttribute('aria-label','Κύριο μενού');
 const sec=current||(here==='theory.html'&&/mode=exam/.test(location.search)?'practice.html':SECTION[here])||(/^saek-course-\d\d\.html$/.test(here)?'study.html':here);
 // The five section pages need no back button (the menu and tab bar are there).
 const hub=NAV.some(([h])=>h===here);
 document.documentElement.classList.toggle('b-hubpage',hub);
 // Inner pages: "‹ Parent" at the top left, as in iOS navigation bars.
 const PARENT={'saek-videos.html':['saek.html','ΣΑΕΚ'],'saek-images.html':['saek.html','ΣΑΕΚ']};
 const parent=PARENT[here]||(/^saek-course-\d\d\.html$/.test(here)?['saek.html','ΣΑΕΚ']:null)||(()=>{const s=SECTION[here]||current;const n=NAV.find(([h])=>h===s);return n?[n[0],n[2]]:null})();
 const item=([href,ic,label])=>`<a href="${at(href)}"${href===sec?' aria-current="page"':''}>${svg(ic)}${label}</a>`;
 side.innerHTML=NAV.map(item).join('')+
  `<div class="b-side-sub"><a href="${at('study-plan.html')}"${here==='study-plan.html'?' aria-current="page"':''}>${svg('cal')}Ημερολόγιο εξετάσεων</a><button type="button" class="b-side-btn" data-account-open>${svg('user')}Λογαριασμός</button></div>`+
  `<section class="ekab-quick-access" data-ekab-quick-access></section>`+
  `<a class="old" href="${at('index-v6.html#/home')}">Παλιά όψη αρχικής</a>`;
 // Phone: the five sections as a tab bar at the bottom, within reach of the thumb.
 const tabs=document.createElement('nav');tabs.className='b-tabbar';tabs.setAttribute('aria-label','Ενότητες');
 tabs.innerHTML=NAV.map(([href,ic,label])=>`<a href="${at(href)}"${href===sec?' aria-current="page"':''}>${svg(ic)}<span>${label}</span></a>`).join('');
 const backdrop=document.createElement('button');backdrop.type='button';backdrop.className='b-backdrop';backdrop.tabIndex=-1;backdrop.setAttribute('aria-label','Κλείσιμο μενού');
 if(!hub&&parent){
  const back=document.createElement('a');back.className='b-back';back.href=at(parent[0]);
  back.innerHTML=`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 5-7 7 7 7"/></svg><span>${parent[1]}</span>`;
  back.setAttribute('aria-label','Πίσω: '+parent[1]);
  // Return to the exact place when the previous page was in the app; otherwise open the parent page.
  back.addEventListener('click',e=>{try{if(history.length>1&&document.referrer&&new URL(document.referrer).origin===location.origin){e.preventDefault();history.back()}}catch(_){}});
  top.querySelector('.b-brand').after(back);document.documentElement.classList.add('b-has-back');
 }
 document.body.prepend(top,side,backdrop);document.body.append(tabs);
 if(!opts.legacy)features();else{const n=document.createElement('script');n.src=new URL('quick-access.js?v=20261122-1',import.meta.url).href;n.defer=true;document.body.append(n)}

 // Phone drawer
 const menu=top.querySelector('.b-menu'),phone=matchMedia('(max-width:720px)');
 const setOpen=open=>{document.documentElement.classList.toggle('b-open',open);menu.setAttribute('aria-expanded',String(open));menu.innerHTML=svg(open?'close':'menu');menu.setAttribute('aria-label',open?'Κλείσιμο μενού':'Άνοιγμα μενού');side.inert=phone.matches&&!open;if(open)side.querySelector('a')?.focus()};
 menu.addEventListener('click',()=>setOpen(!document.documentElement.classList.contains('b-open')));
 backdrop.addEventListener('click',()=>{setOpen(false);menu.focus()});
 side.addEventListener('click',e=>{if(e.target.closest('a'))setOpen(false)});
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&document.documentElement.classList.contains('b-open')){setOpen(false);menu.focus()}});
 const sync=()=>{if(!phone.matches)setOpen(false);side.inert=phone.matches&&!document.documentElement.classList.contains('b-open')};
 phone.addEventListener('change',sync);sync();

 // Theme
 const tbtn=top.querySelector('[data-theme-toggle]');
 const paintTheme=()=>{const dark=currentTheme()==='dark';tbtn.innerHTML=svg(dark?'sun':'moon');tbtn.setAttribute('aria-label',dark?'Φωτεινό θέμα':'Σκούρο θέμα');tbtn.title=tbtn.getAttribute('aria-label')};
 tbtn.addEventListener('click',()=>{
  const next=currentTheme()==='dark'?'light':'dark';store.set('ekab.theme.v1',next);
  // Older pages also follow the class their own stylesheets use for the dark theme.
  const swap=()=>{applyTheme(next);document.body.classList.toggle('dark-mode',next==='dark');paintTheme()};
  // The new theme spreads out from the button as a circle where the browser supports it.
  if(!document.startViewTransition||matchMedia('(prefers-reduced-motion: reduce)').matches){swap();return}
  const r=tbtn.getBoundingClientRect(),root=document.documentElement.style;
  root.setProperty('--vx',r.left+r.width/2+'px');root.setProperty('--vy',r.top+r.height/2+'px');
  document.startViewTransition(swap);
 });
 paintTheme();

 // Search
 const q=top.querySelector('#b-q'),res=top.querySelector('#b-res');let sel=-1,timer;
 const close=()=>{res.hidden=true;q.setAttribute('aria-expanded','false');sel=-1};
 const ready=()=>new Promise(ok=>{const t0=Date.now();const w=()=>window.EkabGlobalSearch||Date.now()-t0>8000?ok(window.EkabGlobalSearch):setTimeout(w,100);w()});
 const target=href=>at(href||'index.html');
 const kinds={saek:'ΣΑΕΚ',eoppep:'ΕΟΠΠΕΠ',seminar:'Σεμινάριο',practical:'Πρακτικό',practice:'Εξάσκηση',page:'Σελίδα'};
 const run=async()=>{
  const v=q.value.trim();if(v.length<2){close();return}
  res.innerHTML='<li class="empty">Αναζήτηση…</li>';res.hidden=false;q.setAttribute('aria-expanded','true');
  const api=await ready();let hits=[];
  try{hits=api?await api.query(v,'Όλα'):[]}catch(_){hits=[]}
  if(q.value.trim()!==v)return;
  const all=at(`search.html?q=${encodeURIComponent(v)}`);
  res.innerHTML=(hits.length?hits.slice(0,10).map((it,i)=>`<li><a role="option" id="b-opt-${i}" href="${esc(target(it.href))}"><b>${esc(it.title)}</b><span>${esc(kinds[it.kind]||'')}${it.subtitle?' · '+esc(it.subtitle):''}</span></a></li>`).join(''):`<li class="empty">${api?'Δεν βρέθηκε κάτι. Δοκίμασε άλλη λέξη.':'Η αναζήτηση δεν φορτώθηκε. Έλεγξε τη σύνδεση.'}</li>`)+
   `<li class="b-res-foot"><a role="option" id="b-opt-all" href="${all}">Όλα τα αποτελέσματα για «${esc(v)}»</a><button type="button" data-lexicon>${svg('lexicon')}Ιατρικό λεξικό</button></li>`;
  sel=-1;
 };
 res.addEventListener('click',e=>{if(e.target.closest('[data-lexicon]')){close();window.EkabOpenMedicalGlossary?.()}});
 document.addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){e.preventDefault();openSearch()}});
 // Phones: a search icon opens the field across the whole bar; "Άκυρο" closes it.
 const openSearch=()=>{top.classList.add('b-searching');q.focus();q.select()};
 const closeSearch=()=>{top.classList.remove('b-searching');close();q.blur()};
 top.querySelector('.b-search-btn').addEventListener('click',openSearch);
 top.querySelector('.b-search-cancel').addEventListener('click',closeSearch);
 q.addEventListener('keydown',e=>{if(e.key==='Escape')closeSearch()});
 q.addEventListener('input',()=>{clearTimeout(timer);timer=setTimeout(run,120)});
 q.addEventListener('focus',()=>{if(q.value.trim().length>1)run()});
 q.addEventListener('keydown',e=>{
  const opts=[...res.querySelectorAll('a')];
  if(e.key==='Escape'){close();return}
  if(!opts.length||res.hidden)return;
  if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();sel=(sel+(e.key==='ArrowDown'?1:-1)+opts.length)%opts.length;opts.forEach((o,i)=>o.setAttribute('aria-selected',String(i===sel)));q.setAttribute('aria-activedescendant',opts[sel].id)}
  if(e.key==='Enter'){e.preventDefault();(opts[sel]||opts[0]).click()}
 });
 document.addEventListener('pointerdown',e=>{if(!top.querySelector('.b-search').contains(e.target))close()});
}

// The same app features the older pages load through theme-init.js; each file loads once.
function features(){
 const add=(src,module)=>{if(document.querySelector(`script[src^="${src.split('?')[0]}"],script[data-src="${src}"]`))return;const n=document.createElement('script');n.src=src;n.dataset.src=src;if(module)n.type='module';else n.defer=true;document.body.append(n)};
 const css=href=>{if(document.querySelector(`link[href^="${href.split('?')[0]}"]`))return;const l=document.createElement('link');l.rel='stylesheet';l.href=href;document.head.append(l)};
 css('global-tools.css?v=27.1.129');css('quick-access.css?v=20261122-1');
 add('global-tools.js?v=27.1.130');      // app-wide search index, medical lexicon, notifications
 add('quick-access.js?v=20261122-1');    // pinned and rotating shortcuts in the side menu
 add('study-scheduler.js');              // dated retrieval practice used by reminders and the plan
 add('study-resume.js?v=27.1.109');      // "continue where you left off" history
 add('services/recall/popup.mjs',true);  // review reminders from chapters already read
 add('updates.js?v=27.1.180');           // offline updates; loads the account and device sync
}

/* SAEK lesson pages: one chapter at a time with its own video (EKAB_LESSON_VIDEOS) above the text.
   The separate video carousel is hidden; Previous/Next at the end of each chapter and the chapter menu move between chapters. */
function lessonReader(){
 const m=/^saek-course-(\d\d)\.html$/.exec(relPath());if(!m)return;
 const cid=m[1],folds=[...document.querySelectorAll('details.reader-fold[id^="lesson-"]')];if(!folds.length)return;
 const total=folds.length,label=document.querySelector('.saek-compact-toc>summary');
 const pics=document.querySelector('#saek-course-images-shortcut .saek-source-action');if(pics)pics.textContent=pics.textContent.replace(/^.*?\((\d+)\).*$/,'Εικόνες ($1)');
 const addVideo=f=>{
  if(f.querySelector('.b-lesson-video'))return;
  const n=f.id.slice(7),url=window.EKAB_LESSON_VIDEOS?.[`${cid}-${n}`];if(!url)return;
  const fig=document.createElement('figure');fig.className='b-lesson-video';
  const v=document.createElement('video');v.controls=true;v.playsInline=true;v.preload='metadata';v.src=url;
  v.setAttribute('aria-label','Βίντεο κεφαλαίου '+n);fig.append(v);
  (f.querySelector('.body')||f).prepend(fig);
 };
 const course=document.querySelector('.saek-lesson-heading .reader-title');const courseName=course?.textContent.trim()||'';
 // Extras of a chapter go into one grouped list, in a fixed order (practice may be added later by another script).
 const group=f=>{
  const body=f.querySelector('.body');if(!body)return;
  let g=body.querySelector(':scope>.b-group');if(!g){g=document.createElement('div');g.className='b-group';body.append(g)}
  for(const sel of ['.saek-anatomy-jump','.lesson-more','.knowledge-check','.atlas-chapter-practice','.compact-sources'])
   for(const d of body.querySelectorAll(sel))if(d.parentElement!==g)g.append(d);
  g.hidden=!g.children.length;
 };
 const show=f=>{
  for(const o of folds)if(o!==f&&o.open){o.open=false;o.querySelector('.b-lesson-video video')?.pause()}
  addVideo(f);group(f);setTimeout(()=>group(f),1500);
  if(course)course.textContent=`${courseName} · Κεφάλαιο ${f.id.slice(7)} από ${total}`;
  if(label)label.textContent='Κεφάλαια';
  for(const a of document.querySelectorAll('.chapter-toc-links a'))a.setAttribute('aria-current',String(a.getAttribute('href')==='#'+f.id));
 };
 folds.forEach(f=>f.addEventListener('toggle',()=>{if(f.open)show(f)}));
 // A chapter link (menu, Previous/Next, search result) opens that chapter at the top of the page.
 const open=id=>{const f=document.getElementById(id);if(!f)return;f.open=true;show(f);document.querySelector('.saek-compact-toc')?.removeAttribute('open');scrollTo({top:0})};
 addEventListener('hashchange',()=>{if(/^#lesson-\d+$/.test(location.hash))open(location.hash.slice(1))});
 const start=(/^#lesson-\d+$/.test(location.hash)&&document.getElementById(location.hash.slice(1)))||folds.find(f=>f.open)||folds[0];
 start.open=true;show(start);
 // A #lesson-N link must not open the page half-way down: the chapter is already the only thing shown.
 const top=()=>scrollTo(0,0);requestAnimationFrame(top);addEventListener('load',()=>setTimeout(top,0),{once:true});
 // Tapping a chapter image opens it enlarged (same as its "Μεγέθυνση εικόνας" button).
 document.querySelector('.reader-chapters')?.addEventListener('click',e=>{const img=e.target.closest('.saek-source-image');if(!img)return;e.preventDefault();e.stopPropagation();const figs=[...img.closest('details.reader-fold').querySelectorAll('.saek-source-figure')];photoViewer(figs.map(f=>({src:f.querySelector('img').currentSrc||f.querySelector('img').src,title:f.querySelector('.saek-source-title')?.textContent.trim()||'',caption:f.querySelector('.saek-source-caption')?.textContent.trim()||'',alt:f.querySelector('img').alt||''})),figs.indexOf(img.closest('figure')))},true);
 // saek-videos.js may load after this runs: add the video once the list is there.
 if(!window.EKAB_LESSON_VIDEOS){let tries=0;const t=setInterval(()=>{if(window.EKAB_LESSON_VIDEOS||++tries>40){clearInterval(t);const f=folds.find(x=>x.open);if(f)addVideo(f)}},250)}
}

/* Full-screen photo viewer (Photos-style): dark backdrop, the image as large as fits, title and "N από M"
   at the top, the caption below; arrows or swipe for the next image, double-tap to zoom and drag to look around. */
export function photoViewer(items,start=0){
 if(!items.length)return;
 let i=Math.max(0,start),zoom=1,tx=0,ty=0;
 const d=document.createElement('dialog');d.className='b-viewer';d.setAttribute('aria-label','Προβολή εικόνας');
 d.innerHTML=`<div class="bv-top"><div class="bv-title"><b></b><span></span></div><button type="button" class="bv-btn bv-close" aria-label="Κλείσιμο">${svg('close')}</button></div>
  <div class="bv-stage"><img alt=""></div>
  <button type="button" class="bv-btn bv-prev" aria-label="Προηγούμενη εικόνα"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 5-7 7 7 7"/></svg></button>
  <button type="button" class="bv-btn bv-next" aria-label="Επόμενη εικόνα"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 5 7 7-7 7"/></svg></button>
  <p class="bv-caption"></p>`;
 document.body.append(d);
 const img=d.querySelector('img'),stage=d.querySelector('.bv-stage');
 const apply=()=>{img.style.transform=`translate(${tx}px,${ty}px) scale(${zoom})`;stage.classList.toggle('zoomed',zoom>1)};
 const go=n=>{
  i=(n+items.length)%items.length;zoom=1;tx=ty=0;apply();
  const it=items[i];img.src=it.src;img.alt=it.alt||it.title;
  d.querySelector('.bv-title b').textContent=it.title;
  d.querySelector('.bv-title span').textContent=items.length>1?`${i+1} από ${items.length}`:'';
  d.querySelector('.bv-caption').textContent=it.caption;
  d.querySelector('.bv-prev').hidden=d.querySelector('.bv-next').hidden=items.length<2;
 };
 const close=()=>{d.close();d.remove()};
 d.querySelector('.bv-close').onclick=close;
 d.querySelector('.bv-prev').onclick=()=>go(i-1);
 d.querySelector('.bv-next').onclick=()=>go(i+1);
 d.addEventListener('cancel',e=>{e.preventDefault();close()});
 d.addEventListener('keydown',e=>{if(e.key==='ArrowLeft')go(i-1);if(e.key==='ArrowRight')go(i+1)});
 // double-click / double-tap toggles 2.5× around the tapped point; drag pans; swipe changes image when not zoomed
 stage.addEventListener('dblclick',e=>{
  if(zoom>1){zoom=1;tx=ty=0}else{const r=img.getBoundingClientRect();zoom=2.5;tx=(r.left+r.width/2-e.clientX)*1.5;ty=(r.top+r.height/2-e.clientY)*1.5}
  apply();
 });
 let p=null,lastTap=0;
 stage.addEventListener('pointerdown',e=>{p={x:e.clientX,y:e.clientY,tx,ty};stage.setPointerCapture(e.pointerId)});
 stage.addEventListener('pointermove',e=>{if(!p||zoom===1)return;tx=p.tx+e.clientX-p.x;ty=p.ty+e.clientY-p.y;apply()});
 stage.addEventListener('pointerup',e=>{
  if(!p)return;const dx=e.clientX-p.x,dy=e.clientY-p.y;p=null;
  if(zoom===1&&Math.abs(dx)>50&&Math.abs(dx)>Math.abs(dy))go(i+(dx<0?1:-1));
  else if(zoom===1&&e.pointerType!=='mouse'&&Math.abs(dx)<10&&Math.abs(dy)<10){const now=Date.now();if(now-lastTap<300)stage.dispatchEvent(new MouseEvent('dblclick',{clientX:e.clientX,clientY:e.clientY}));lastTap=now}
 });
 d.addEventListener('click',e=>{if(e.target===d||e.target===stage)close()});
 go(i);d.showModal();d.querySelector('.bv-close').focus({focusVisible:false});
}
