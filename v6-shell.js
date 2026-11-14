(()=>{
 'use strict';
 const page=location.pathname.split('/').pop()||'index.html';
 if(page==='index.html'||document.querySelector('body.v6-home'))return;
 if(document.querySelector('.v6-page-shell'))return;
 const items=[
  ['index.html','⌂','Σήμερα',['index.html']],
  ['saek.html','▤','Μελέτη',['saek.html',/^saek-course-/]],
  ['theory.html','◎','ΕΟΠΠΕΠ',['theory.html','eoppep.html','practical_exam.html']],
  ['supplementary_practice.html','✳','Εξάσκηση',['supplementary_practice.html','saek-exams.html']],
  ['tools.html','⌘','Εργαλεία',['tools.html','study-plan.html','farmaka.html','profession-law.html','contacts.html','search.html','seminar-prep.html']]
 ];
 const active=items.find(x=>x[3].some(v=>v instanceof RegExp?v.test(page):v===page))||items[0];
 const shell=document.createElement('div');shell.className='v6-page-shell';
 const side=document.createElement('aside');side.className='v6-global-sidebar';side.setAttribute('aria-label','Πλοήγηση εφαρμογής');
 side.innerHTML='<a class="v6-shell-brand" href="index.html"><span class="v6-shell-brand-mark">✚</span><span><b>ΕΚΑΒ Σπουδή</b><small>Προσωπικός χώρος μάθησης</small></span></a><div class="v6-shell-label">ΧΩΡΟΣ ΜΑΘΗΣΗΣ</div><nav class="v6-shell-nav" aria-label="Κύρια πλοήγηση">'+items.map(([href,icon,label,paths])=>'<a href="'+href+'" '+(active===items.find(x=>x[0]===href)?'aria-current="page"':'')+'><span class="v6-nav-icon" aria-hidden="true">'+icon+'</span><span>'+label+'</span></a>').join('')+'</nav><div class="v6-shell-tools"><div class="v6-shell-label">ΓΡΗΓΟΡΗ ΠΡΟΣΒΑΣΗ</div><a class="v6-shell-link" href="study-plan.html">◷　Ημερολόγιο εξετάσεων</a><a class="v6-shell-link" href="seminar-prep.html">✚　Σεμινάρια</a><a class="v6-shell-link" href="contacts.html">☎　Επικοινωνία & AED</a></div><a class="v6-shell-account" href="progress-v6.html"><span class="v6-shell-avatar" aria-hidden="true">Ε</span><span><b>Λογαριασμός & πρόοδος</b><small>Συσκευή και συγχρονισμός</small></span></a>';
 const main=document.createElement('div');main.className='v6-global-main';
 const top=document.createElement('header');top.className='v6-global-topbar';
 const title=(document.title.split(/[—·]/)[0]||document.querySelector('main h1, .main h1, .ph-hero h1, h1')?.textContent||'ΕΚΑΒ Σπουδή').trim();
 top.innerHTML='<div class="v6-page-title"></div><form class="v6-global-search" role="search" action="search.html"><span aria-hidden="true">⌕</span><input type="search" name="q" placeholder="Αναζήτηση σε όλη τη βιβλιοθήκη" aria-label="Αναζήτηση"><kbd>Enter</kbd></form><button class="v6-shell-theme" type="button" aria-label="Εναλλαγή φωτεινού και σκοτεινού θέματος"><span aria-hidden="true">◐</span></button>';
 top.querySelector('.v6-page-title').textContent=title;
 const content=document.createElement('div');content.className='v6-page-content';
 const nodes=[...document.body.children].filter(node=>node.tagName!=='SCRIPT');
 for(const node of nodes)content.append(node);
 main.append(top,content);shell.append(side,main);document.body.append(shell);document.body.classList.add('v6-page');
 const toggle=top.querySelector('.v6-shell-theme');
 toggle.addEventListener('click',()=>{const dark=document.documentElement.dataset.theme!=='dark';document.documentElement.dataset.theme=dark?'dark':'light';try{localStorage.setItem('ekab.theme.v1',dark?'dark':'light')}catch{};toggle.setAttribute('aria-label',dark?'Ενεργοποίηση φωτεινού θέματος':'Ενεργοποίηση σκοτεινού θέματος')});
})();
