/* ΕΚΑΒ Σπουδή — ελαφρύς οδηγός πρώτης επίσκεψης και σύνδεσμος αρχικής.
   Χωρίς αλλαγές σε πρόοδο, αποθήκευση PDF, ερωτήσεις ή επιστημονικές εικόνες. */
(function(){
'use strict';
const KEY='ekab.onboarding.seen.v1';
const slides=[
 {icon:'📘',title:'Θεωρία ΕΟΠΠΕΠ',body:'Μελέτησε τις 314 ερωτήσεις, διάλεξε ομάδα και επανάλαβε όσες σε δυσκολεύουν.',target:'index.html'},
 {icon:'🩺',title:'Πρακτικό ΕΟΠΠΕΠ',body:'Βρες τα πρακτικά θέματα και προετοιμάσου για τις δεξιότητες της εξέτασης.',target:'practical_exam.html'},
 {icon:'🚑',title:'Κατάρτιση ΣΑΕΚ',body:'Διάλεξε εξάμηνο και μάθημα. Σε κάθε κεφάλαιο υπάρχουν εξηγήσεις και σημεία SOS.',target:'saek.html'},
 {icon:'💾',title:'Πρόοδος και υλικό',body:'Η πρόοδος αποθηκεύεται στη συσκευή σου. Από τη ΣΑΕΚ ανοίγεις eClass και «Τα PDF μου».',target:'saek.html'}
];
function element(tag,cls,text){
 const el=document.createElement(tag);
 if(cls)el.className=cls;
 if(text!==undefined)el.textContent=text;
 return el;
}
function isSeen(){try{return localStorage.getItem(KEY)==='yes';}catch(e){return false;}}
function remember(){try{localStorage.setItem(KEY,'yes');}catch(e){}}
function addHomeLink(){
 document.querySelectorAll('header.top .brand').forEach(brand=>{
  if(brand.querySelector('.brand-home'))return;
  const a=element('a','brand-home');
  a.href='index.html';
  a.setAttribute('aria-label','ΕΚΑΒ Σπουδή — Μετάβαση στην αρχική σελίδα');
  a.title='Αρχική σελίδα';
  while(brand.firstChild)a.appendChild(brand.firstChild);
  brand.appendChild(a);
 });
}
function openGuide(){
 if(document.getElementById('ekab-first-run-guide'))return;
 const before=document.activeElement;
 let current=0;
 const shade=element('div','ekab-guide-shade');
 shade.id='ekab-first-run-guide';
 shade.setAttribute('role','presentation');
 const card=element('section','ekab-guide-card');
 card.setAttribute('role','dialog');
 card.setAttribute('aria-modal','true');
 card.setAttribute('aria-labelledby','ekab-guide-title');
 card.setAttribute('aria-describedby','ekab-guide-description');
 const top=element('div','ekab-guide-top');
 const step=element('span','ekab-guide-step');
 const close=element('button','ekab-guide-close','Παράλειψη ✕');
 close.type='button';close.setAttribute('aria-label','Κλείσιμο σύντομου οδηγού');
 top.append(step,close);
 const symbol=element('div','ekab-guide-symbol');
 symbol.setAttribute('aria-hidden','true');
 const title=element('h2','ekab-guide-title');title.id='ekab-guide-title';
 const description=element('p','ekab-guide-description');description.id='ekab-guide-description';
 const progress=element('div','ekab-guide-dots');
 progress.setAttribute('aria-hidden','true');
 const buttons=element('div','ekab-guide-actions');
 const previous=element('button','ekab-guide-prev','Πίσω');
 previous.type='button';
 const next=element('button','ekab-guide-next','Επόμενο');
 next.type='button';
 buttons.append(previous,next);
 card.append(top,symbol,title,description,progress,buttons);
 shade.append(card);
 function render(){
  const s=slides[current];
  step.textContent=(current+1)+' / '+slides.length;
  symbol.textContent=s.icon;title.textContent=s.title;description.textContent=s.body;
  progress.replaceChildren();
  slides.forEach((_,idx)=>{
   const dot=element('span',idx===current?'ekab-guide-dot selected':'ekab-guide-dot');
   progress.append(dot);
  });
  previous.hidden=current===0;
  next.textContent=current===slides.length-1?'Ξεκίνα':'Επόμενο';
 }
 function onKey(e){
  if(e.key==='Escape'){e.preventDefault();dismiss();}
  if(e.key==='Tab'){
   const focusable=[close,...(previous.hidden?[]:[previous]),next];
   const i=focusable.indexOf(document.activeElement);
   if(e.shiftKey&&i<=0){e.preventDefault();focusable[focusable.length-1].focus();}
   else if(!e.shiftKey&&i===focusable.length-1){e.preventDefault();focusable[0].focus();}
  }
 }
 function dismiss(){
  remember();document.removeEventListener('keydown',onKey);
  shade.remove();
  if(before&&typeof before.focus==='function'&&document.contains(before))before.focus();
 }
 close.addEventListener('click',dismiss);
 previous.addEventListener('click',()=>{if(current>0){current--;render();}});
 next.addEventListener('click',()=>{
  if(current<slides.length-1){current++;render();}
  else dismiss();
 });
 shade.addEventListener('click',e=>{if(e.target===shade)dismiss();});
 document.addEventListener('keydown',onKey);
 document.body.append(shade);
 render();close.focus();
}
function init(){
 addHomeLink();
 // Ο σύντομος οδηγός εμφανίζεται μόνο στην αρχική, ποτέ ανάμεσα σε μαθήματα.
 if(!document.getElementById('homeView'))return;
 const home=document.getElementById('homeView');
 if(!document.querySelector('.ekab-guide-reopen')){
  const row=element('div','ekab-guide-reopen');
  const button=element('button','ekab-guide-reopen-button','ⓘ Πώς λειτουργεί η εφαρμογή');
  button.type='button';button.addEventListener('click',openGuide);
  row.append(button);home.insertBefore(row,home.firstChild);
 }
 // Do not automatically open the guide when the user returns to Home.
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
else init();
})();
