(()=>{
 'use strict';
 /* V6 shell for the inner pages: the same navigation as the home page (index.html), so every section
    keeps one look. The page's own content moves inside; its old header bars are hidden by v6-shell.css. */
 // The site root is where this script lives, so pages in subfolders (ui-tools/anatomy-3d/) get the same menu.
 const ROOT=new URL('./',document.currentScript?.src||location.href);
 const page=location.pathname.startsWith(ROOT.pathname)?(location.pathname.slice(ROOT.pathname.length)||'index.html'):(location.pathname.split('/').pop()||'index.html');
 const ready=()=>document.dispatchEvent(new Event('ekab:v6-shell-ready'));
 if(page==='index.html'||document.querySelector('body.v6-home'))return ready();
 if(document.querySelector('.v6-page-shell'))return ready();
 const ICONS={
  home:'<path d="m3 10 9-7 9 7"/><path d="M5 9v12h14V9M9 21v-7h6v7"/>',
  book:'<path d="M3 5.5A2.5 2.5 0 0 1 5.5 3H20v17H5.5A2.5 2.5 0 0 0 3 22z"/><path d="M3 5.5v14A2.5 2.5 0 0 1 5.5 17H20M8 7h8M8 10h7"/>',
  target:'<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.4"/>',
  tools:'<path d="M4 7h16M4 12h10M4 17h7"/><circle cx="18" cy="12" r="2"/><circle cx="15" cy="17" r="2"/>',
  progress:'<path d="M4 19V5M4 19h17"/><path d="m7 15 4-4 3 2 6-7"/><path d="M16 6h4v4"/>',
  search:'<circle cx="10.8" cy="10.8" r="7"/><path d="m16 16 5 5"/>',
  moon:'<path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/>',
  sun:'<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  calendar:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
  cross:'<path d="M12 5v14M5 12h14"/>',
  phone:'<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2"/>'
 };
 const icon=name=>`<svg class="v6-icon" viewBox="0 0 24 24" aria-hidden="true">${ICONS[name]}</svg>`;
 // Same five items, order and wording as the home page; each inner page lights up the section it belongs to.
 const items=[
  ['index.html','home','Σήμερα',[]],
  ['study.html','book','Μελέτη',['study.html','saek.html',/^saek-course-/,'saek-images.html','theory.html','eoppep.html','practical_exam.html','written_exam.html','exam_focus.html','apantiseis.html','anatomia.html','fysiologia.html','ektimisi.html','diasostis.html','dimosia_ygeia.html','agglika.html','pdf-library.html','eclass.html','piges.html']],
  ['saek-exams.html','target','Εξάσκηση',['practice.html','supplementary_practice.html','saek-exams.html']],
  ['tools.html','tools','Εργαλεία',['tools.html','paramedic.html','protocols.html',/^mentor-/,'study-plan.html','farmaka.html','profession-law.html','contacts.html','search.html','seminar-prep.html','manual.html','repair.html',/^ui-tools\//,/^tools\//]],
  ['progress-v6.html','progress','Πρόοδος',['progress-v6.html']]
 ];
 const section=new URLSearchParams(location.search);const practicePage=section.get('section')==='practice'||section.get('mode')==='exam'||['practice.html','saek-exams.html','practical_exam.html','supplementary_practice.html'].includes(page);const active=practicePage?items[2]:['study.html','seminar-prep.html'].includes(page)?items[1]:items.find(x=>x[3].some(v=>v instanceof RegExp?v.test(page):v===page));
 const shell=document.createElement('div');shell.className='v6-page-shell';
 const side=document.createElement('aside');side.className='v6-global-sidebar';side.setAttribute('aria-label','Πλοήγηση εφαρμογής');
 side.innerHTML='<a class="v6-shell-brand" href="index.html"><span class="v6-shell-brand-mark" aria-hidden="true">✚</span><span><b>ΕΚΑΒ Σπουδή</b><small>Προσωπικός χώρος μάθησης</small></span></a>'
  +'<div class="v6-shell-label">ΠΛΟΗΓΗΣΗ</div><nav class="v6-shell-nav" aria-label="Κύρια πλοήγηση">'
  +items.map(it=>`<a href="${it[0]}"${it===active?' aria-current="page"':''}>${icon(it[1])}<span>${it[2]}</span></a>`).join('')
  +'</nav><div class="v6-shell-tools"><div class="v6-shell-label">ΓΡΗΓΟΡΗ ΠΡΟΣΒΑΣΗ</div>'
  +`<a href="study-plan.html">${icon('calendar')}<span>Ημερολόγιο εξετάσεων</span></a><a href="study.html?type=seminars">${icon('cross')}<span>Σεμινάρια</span></a><a href="contacts.html">${icon('phone')}<span>Επικοινωνία & AED</span></a></div>`
  +'<a class="v6-shell-account" href="progress-v6.html"><span class="v6-shell-avatar" aria-hidden="true">Ε</span><span><b>Λογαριασμός & πρόοδος</b><small>Συσκευή και συγχρονισμός</small></span></a>';
 const main=document.createElement('div');main.className='v6-global-main';
 const top=document.createElement('header');top.className='v6-global-topbar';
 // Page name for the breadcrumb: the first part of the title that is not the site name.
 const parts=document.title.split(/\s[—·|–-]\s|\|/).map(s=>s.trim()).filter(s=>s&&!/^ΕΚΑΒ Σπουδή$|^ATLA$/i.test(s));
 const title=parts[0]||document.querySelector('main h1, h1')?.textContent?.trim()||'ΕΚΑΒ Σπουδή';
 top.innerHTML=`<div class="v6-page-title">Ακαδημαϊκός χώρος / <b></b></div><form class="v6-global-search" role="search" action="search.html">${icon('search')}<input type="search" name="q" placeholder="Αναζήτησε σε μαθήματα, ερωτήσεις, εργαλεία" aria-label="Αναζήτηση"></form><button class="v6-shell-theme" type="button"></button>`;
 top.querySelector('.v6-page-title b').textContent=title;
 const content=document.createElement('div');content.className='v6-page-content';
 for(const node of [...document.body.children].filter(n=>n.tagName!=='SCRIPT'))content.append(node);
 // Menu links and search point at the site root, also from pages in subfolders.
 for(const a of [side,top].flatMap(n=>[...n.querySelectorAll('a[href]')]))a.href=new URL(a.getAttribute('href'),ROOT).href;
 top.querySelector('form').action=new URL('search.html',ROOT).href;
 main.append(top,content);shell.append(side,main);document.body.append(shell);document.body.classList.add('v6-page');
 const toggle=top.querySelector('.v6-shell-theme');
 const label=()=>{const dark=document.documentElement.dataset.theme==='dark';toggle.innerHTML=icon(dark?'sun':'moon')+`<span>${dark?'Ανοιχτή εμφάνιση':'Σκούρα εμφάνιση'}</span>`;toggle.setAttribute('aria-label',dark?'Ενεργοποίηση ανοιχτής εμφάνισης':'Ενεργοποίηση σκούρας εμφάνισης');};
 label();
 ready();
 toggle.addEventListener('click',()=>{const dark=document.documentElement.dataset.theme!=='dark';document.documentElement.dataset.theme=dark?'dark':'light';try{localStorage.setItem('ekab.theme.v1',dark?'dark':'light')}catch{};label();});
})();
