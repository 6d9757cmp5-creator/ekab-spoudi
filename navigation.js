/* EKAB shared navigation: native media gestures and accessible controls. */
(()=>{'use strict';
// Resolve the app root from this script, so pages in subfolders find the real home page.
const self=document.currentScript;
const site=new URL('./',self?.src||location.href);
const home=new URL('./index.html',site).pathname===location.pathname||site.pathname===location.pathname;
const backOnly=self?.hasAttribute('data-ekab-back-only');
const root=()=>document.querySelector('main')||document.body;
// Where "← Πίσω" leads when the page was opened directly (no page of the app to go back to).
const PARENT_PAGE=file=>/^saek-course-\d+\.html$/.test(file)||/^(saek-exams|saek-images|eclass|pdf-library|apantiseis|piges)\.html$/.test(file)?'saek.html'
 :/^(theory|practical_exam|written_exam|supplementary_practice|exam_focus|study_map)\.html$/.test(file)?'eoppep.html'
 :/^(anatomia|fysiologia|diasostis|dimosia_ygeia|ektimisi|agglika)\.html$/.test(file)?({anatomia:'01',fysiologia:'02',diasostis:'03',dimosia_ygeia:'04',ektimisi:'05',agglika:'06'})[file.replace('.html','')].replace(/^/,'saek-course-')+'.html'
 :/^mentor-[a-z-]+\.html$/.test(file)?'paramedic.html'
 :'index.html';
function back(fallback){try{if(document.referrer&&new URL(document.referrer).origin===location.origin&&history.length>1){history.back();return}}catch{}location.assign(new URL(fallback||PARENT_PAGE(location.pathname.split('/').pop()),site).href)}
function make(tag,cls,label){const n=document.createElement(tag);n.className=cls;n.textContent=label;return n}
// Pages without an app header of their own get the shared bar: logo and name, leading to Αρχική.
function appBar(){
 if(home||document.querySelector('header.top,body>header,.pm-header,header.header,.saek-gallery-header,.legacy-utilities,header.topbar,[data-ekab-appbar]'))return;
 const bar=make('header','ekab-appbar','');bar.dataset.ekabAppbar='';
 const a=make('a','ekab-appbar-brand','');a.href=new URL('./index.html',site).href;a.setAttribute('aria-label','ΕΚΑΒ Σπουδή — Αρχική');
 const logo=make('span','ekab-appbar-logo','✚');logo.setAttribute('aria-hidden','true');
 a.append(logo,make('span','','ΕΚΑΒ Σπουδή'));bar.append(a);document.body.prepend(bar);
}
function init(){
 appBar();
 // A back button already written in the page (no layout jump) only needs its behaviour.
 for(const b of document.querySelectorAll('button[data-ekab-back]'))if(!b.dataset.ekabBound){b.dataset.ekabBound='1';b.addEventListener('click',()=>back())}
 const spot=document.querySelector('[data-ekab-back-spot]');
 if(!home&&!document.querySelector('[data-ekab-back]')&&(spot||!document.querySelector('header.top .nav'))){const b=make('button','ekab-nav-back','← Πίσω');b.type='button';b.dataset.ekabBack='';const fallback=spot?.getAttribute('href');b.addEventListener('click',()=>back(fallback));if(spot){b.classList.add('inline');spot.before(b);spot.style.display='none'}else root().prepend(b)}
 // A page that already has its own back button keeps only that one.
 if(spot&&spot.style.display!=='none'&&document.querySelector('[data-ekab-back]'))spot.style.display='none';
 if(!backOnly&&!document.querySelector('.ekab-manual-link')){const a=make('a','ekab-manual-link','ⓘ Οδηγός εφαρμογής');a.href='manual.html';(document.querySelector('footer')||root()).append(' ',a)}
 let start=null;
 document.addEventListener('touchstart',e=>{if(e.touches.length!==1)return;const t=e.touches[0];start=t.clientX<25?{x:t.clientX,y:t.clientY,target:e.target}:null},{passive:true});
 document.addEventListener('touchcancel',()=>{start=null},{passive:true});
 document.addEventListener('touchend',e=>{if(!start||e.changedTouches.length!==1)return;const s=start;start=null;const t=e.changedTouches[0];if(t.clientX-s.x<110||Math.abs(t.clientY-s.y)>55)return;if(s.target.closest('input,textarea,select,button,a,[contenteditable],video,iframe,canvas,[role="slider"],[data-no-swipe],.carousel,.swiper,.saek-series,[role="dialog"]'))return;if(!home)back()},{passive:true});
 const installed=new WeakSet();
 function addVideo(video){
  if(installed.has(video)||video.closest('[data-no-gestures]'))return;installed.add(video);
  const parent=video.parentElement;if(!parent)return;
  const controls=make('div','ekab-video-controls','');controls.setAttribute('role','group');controls.setAttribute('aria-label','Χειρισμός βίντεο');
  const actions=[['−10″',()=>seek(-10)],['▶ / ❚❚',()=>video.paused?video.play().catch(()=>{}):video.pause()],['+10″',()=>seek(10)],['Ταχύτητα',()=>{const speeds=[1,1.25,1.5,2,.75];video.playbackRate=speeds[(speeds.indexOf(video.playbackRate)+1)%speeds.length];speed.textContent='Ταχύτητα '+video.playbackRate+'×'}]];
  function seek(n){if(!Number.isFinite(video.duration)||!video.seekable.length)return;video.currentTime=Math.max(0,Math.min(video.duration,video.currentTime+n))}
  let speed;
  for(const [label,fn] of actions){const b=make('button','ekab-video-action',label);b.type='button';b.addEventListener('click',fn);controls.append(b);if(label==='Ταχύτητα')speed=b}
  video.insertAdjacentElement('afterend',controls);
  let last=0,lastX=0,lastY=0;
  video.addEventListener('pointerup',e=>{if(e.pointerType!=='touch'||!Number.isFinite(video.duration)||!video.seekable.length)return;const now=Date.now();const rect=video.getBoundingClientRect();if(now-last<330&&Math.abs(e.clientX-lastX)<55&&Math.abs(e.clientY-lastY)<55){seek(e.clientX<rect.left+rect.width/2?-10:10);last=0}else{last=now;lastX=e.clientX;lastY=e.clientY}});
  video.addEventListener('keydown',e=>{if(e.target!==video)return;if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();seek(e.key==='ArrowLeft'?-5:5)}else if(e.key===' '){e.preventDefault();video.paused?video.play().catch(()=>{}):video.pause()}});
 }
 document.querySelectorAll('video').forEach(addVideo);
 new MutationObserver(records=>{for(const r of records)for(const node of r.addedNodes){if(node.nodeType!==1)continue;if(node.matches?.('video'))addVideo(node);node.querySelectorAll?.('video').forEach(addVideo)}}).observe(document.body,{childList:true,subtree:true});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
