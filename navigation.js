/* Shared accessible navigation; no mutation of educational data. */
(()=>{'use strict';
const root=()=>document.querySelector('main')||document.body;
const home=/^(index\.html)?$/.test(location.pathname.split('/').pop());
const back=()=>{if(history.length>1&&document.referrer&&new URL(document.referrer).origin===location.origin){history.back();return;}location.assign('index.html');};
function init(){
 if(!home&&!document.querySelector('[data-ekab-back]')){
  const b=document.createElement('button');b.type='button';b.textContent='← Πίσω';b.dataset.ekabBack='';b.className='ekab-nav-back';b.addEventListener('click',back);root().prepend(b);
 }
 const help=document.createElement('a');help.href='manual.html';help.textContent='ⓘ Οδηγός εφαρμογής';help.className='ekab-manual-link';(document.querySelector('footer')||root()).append(' ',help);
 let start=null;
 document.addEventListener('touchstart',e=>{if(e.touches.length!==1)return;const t=e.touches[0];start=t.clientX<28?{x:t.clientX,y:t.clientY,target:e.target}:null;},{passive:true});
 document.addEventListener('touchend',e=>{if(!start||e.changedTouches.length!==1)return;const s=start;start=null;const t=e.changedTouches[0];if(t.clientX-s.x<95||Math.abs(t.clientY-s.y)>65)return;if(s.target.closest('input,textarea,select,[contenteditable],video,canvas,[role="slider"],[data-no-swipe],.carousel,.swiper'))return;if(!home)back();},{passive:true});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
