/* ΕΚΑΒ Σπουδή — Accessible home-brand navigation and a short first-visit guide.
   Stores only whether the user has seen the guide, never learning progress or PDF data. */
(function(){
'use strict';
const KEY='ekab.onboarding.seen.v1';
const STEPS=[
 {symbol:'📚',title:'Μαθήματα ΣΑΕΚ',description:'Διάλεξε εξάμηνο και μάθημα. Θα βρεις θεωρία, σημαντικά σημεία και ερωτήσεις αυτοελέγχου.'},
 {symbol:'📝',title:'Θεωρία ΕΟΠΠΕΠ',description:'Μελέτησε τις 314 ερωτήσεις πιστοποίησης, δες εξηγήσεις και παρακολούθησε την πρόοδό σου.'},
 {symbol:'🚑',title:'Πρακτικό ΕΟΠΠΕΠ',description:'Προετοιμάσου για τις πρακτικές δεξιότητες και τα σενάρια εξέτασης.'},
 {symbol:'📂',title:'PDF, eClass και πρόοδος',description:'Άνοιξε τις πηγές του ΕΚΑΒ και τα PDF σου. Η πρόοδος αποθηκεύεται στη συσκευή· κράτα αντίγραφο από την αρχική.'}
];
function node(tag,cls,text){
 const n=document.createElement(tag);
 if(cls)n.className=cls;
 if(text!==undefined)n.textContent=text;
 return n;
}
function markSeen(){
 try{window.localStorage.setItem(KEY,'1')}catch(_){}
}
function wasSeen(){
 try{return window.localStorage.getItem(KEY)==='1'}catch(_){return false}
}
function makeBrandLink(){
 document.querySelectorAll('header .brand').forEach(brand=>{
  if(brand.querySelector('.brand-home')||brand.closest('a'))return;
  const a=node('a','brand-home');
  a.href='./index.html';
  a.setAttribute('aria-label','ΕΚΑΒ Σπουδή — μετάβαση στην αρχική σελίδα');
  while(brand.firstChild)a.appendChild(brand.firstChild);
  brand.appendChild(a);
 });
}
function installTour(){
 const home=document.querySelector('main.main #homeView');
 if(!home)return;
 // Keep a single, user-opened help control even if another legacy guide is loaded.
 if(home.querySelector('.ekab-guide-reopen'))return;
 let overlay=null;
 let lastFocus=null;
 let stepIndex=0;
 function close(){
  if(!overlay)return;
  overlay.remove();
  overlay=null;
  document.removeEventListener('keydown',onKeyDown);
  markSeen();
  if(lastFocus&&document.contains(lastFocus))lastFocus.focus();
 }
 function onKeyDown(e){
  if(!overlay)return;
  if(e.key==='Escape'){e.preventDefault();close();return}
  if(e.key!=='Tab')return;
  const controls=[...overlay.querySelectorAll('button:not([disabled])')];
  if(!controls.length)return;
  const first=controls[0],last=controls[controls.length-1];
  if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus()}
  else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus()}
 }
 function open(){
  if(overlay)return;
  lastFocus=document.activeElement;
  stepIndex=0;
  overlay=node('div','ekab-guide-shade');
  overlay.setAttribute('role','presentation');
  const card=node('section','ekab-guide-card');
  card.setAttribute('role','dialog');
  card.setAttribute('aria-modal','true');
  card.setAttribute('aria-labelledby','ekabGuideTitle');
  card.setAttribute('aria-describedby','ekabGuideDescription');
  const top=node('div','ekab-guide-top');
  const counter=node('span','ekab-guide-step');
  const skip=node('button','ekab-guide-close','Παράλειψη');
  skip.type='button';skip.addEventListener('click',close);
  top.append(counter,skip);
  const symbol=node('div','ekab-guide-symbol');symbol.setAttribute('aria-hidden','true');
  const heading=node('h2','ekab-guide-title');heading.id='ekabGuideTitle';
  const body=node('p','ekab-guide-description');body.id='ekabGuideDescription';
  const dots=node('div','ekab-guide-dots');dots.setAttribute('aria-hidden','true');
  const actions=node('div','ekab-guide-actions');
  const prev=node('button','ekab-guide-prev','Πίσω');
  const next=node('button','ekab-guide-next','Επόμενο');
  prev.type=next.type='button';
  prev.addEventListener('click',()=>{stepIndex=Math.max(0,stepIndex-1);render()});
  next.addEventListener('click',()=>{if(stepIndex===STEPS.length-1)close();else{stepIndex++;render()}});
  actions.append(prev,next);
  card.append(top,symbol,heading,body,dots,actions);
  overlay.append(card);
  document.body.append(overlay);
  document.addEventListener('keydown',onKeyDown);
  function render(){
   const item=STEPS[stepIndex];
   counter.textContent='Γνωριμία · '+(stepIndex+1)+'/'+STEPS.length;
   symbol.textContent=item.symbol;
   heading.textContent=item.title;
   body.textContent=item.description;
   dots.replaceChildren();
   for(let i=0;i<STEPS.length;i++){
    const dot=node('span','ekab-guide-dot'+(i===stepIndex?' selected':''));
    dots.append(dot);
   }
   prev.hidden=stepIndex===0;
   next.textContent=stepIndex===STEPS.length-1?'Ξεκινάμε!':'Επόμενο';
  }
  render();
  skip.focus();
 }
 const slot=node('div','ekab-guide-reopen');
 const reopen=node('button','ekab-guide-reopen-button','ⓘ Πώς λειτουργεί η εφαρμογή');
 reopen.type='button';
 reopen.addEventListener('click',open);
 slot.append(reopen);
 home.insertBefore(slot,home.firstChild);
 // Do not interrupt navigation: the guide opens only if the user presses Help.
}
function init(){makeBrandLink();installTour()}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
else init();
})();
