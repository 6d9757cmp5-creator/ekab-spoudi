/* EKAB shared navigation: native media gestures and accessible controls. */
(()=>{'use strict';
const home=/^(index\.html)?$/.test(location.pathname.split('/').pop());
const root=()=>document.querySelector('main')||document.body;
function back(){try{if(document.referrer&&new URL(document.referrer).origin===location.origin&&history.length>1){history.back();return}}catch{}location.assign('index.html')}
function make(tag,cls,label){const n=document.createElement(tag);n.className=cls;n.textContent=label;return n}
function init(){
 if(!home&&!document.querySelector('header.top .nav')&&!document.querySelector('[data-ekab-back]')){const b=make('button','ekab-nav-back','← Πίσω');b.type='button';b.dataset.ekabBack='';b.addEventListener('click',back);root().prepend(b)}
 if(!document.querySelector('.ekab-manual-link')){const a=make('a','ekab-manual-link','ⓘ Οδηγός εφαρμογής');a.href='manual.html';(document.querySelector('footer')||root()).append(' ',a)}
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
