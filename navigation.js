/* EKAB shared navigation: native media gestures and accessible controls. */
(()=>{'use strict';
const home=/^(index\.html)?$/.test(location.pathname.split('/').pop());
const root=()=>document.querySelector('main')||document.body;
function back(){try{if(document.referrer&&new URL(document.referrer).origin===location.origin&&history.length>1){history.back();return}}catch{}location.assign('index.html')}
function make(tag,cls,label){const n=document.createElement(tag);n.className=cls;n.textContent=label;return n}

/* One shared navigation for all tools; old root URLs remain unchanged. */
function mountGlobalNavigation(){
 if(document.getElementById('ekab-global-nav'))return;
 const path=location.pathname.split('/').pop()||'index.html';
 const group=path==='index.html'?'home':
 /^saek(?:-course-\d\d|-exams)?\.html$/.test(path)?'saek':
 /^(eoppep|theory|written_exam|practical_exam|exam_focus|apantiseis)\.html$/.test(path)?'eoppep':
 /^(mentor-next|mentor-live)\.html$/.test(path)?'missions':'tools';
 const items=[
  ['home','index.html','Αρχική','⌂'],
  ['saek','saek.html','ΣΑΕΚ','▤'],
  ['eoppep','eoppep.html','ΕΟΠΠΕΠ','▣'],
  ['missions','mentor-next.html','Αποστολές','🚑'],
  ['tools','tools.html','Εργαλεία','▦']
 ];
 const bar=document.createElement('nav');
 bar.id='ekab-global-nav';bar.setAttribute('aria-label','Κεντρική πλοήγηση ΕΚΑΒ Σπουδή');
 for(const [id,href,label,symbol] of items){
  const a=document.createElement('a');a.href=href;a.dataset.group=id;
  a.className='ekab-global-nav-link'+(group===id?' is-current':'');
  if(group===id)a.setAttribute('aria-current','page');
  const icon=document.createElement('span');icon.className='ekab-global-nav-icon';icon.setAttribute('aria-hidden','true');icon.textContent=symbol;
  const text=document.createElement('span');text.className='ekab-global-nav-label';text.textContent=label;
  a.append(icon,text);bar.append(a);
 }
 const css=document.createElement('style');css.id='ekab-global-nav-style';
 css.textContent=[
 '.ekab-global-nav{display:flex;align-items:stretch;justify-content:center;gap:4px;position:relative;z-index:29;background:#103248;color:#e8f7f5;border-bottom:1px solid #395c69;padding:6px max(10px,env(safe-area-inset-right));font-family:system-ui,-apple-system,sans-serif}',
 '.ekab-global-nav-link{display:flex;gap:7px;align-items:center;justify-content:center;min-width:0;padding:9px 13px;text-decoration:none;color:inherit;border-radius:10px;font-size:.82rem;font-weight:760;line-height:1.15}',
 '.ekab-global-nav-link:hover,.ekab-global-nav-link.is-current{background:#28665d;color:#fff}',
 '.ekab-global-nav-link:focus-visible{outline:3px solid #a7ffdc;outline-offset:-2px}',
 '.ekab-global-nav-icon{font-size:1.13rem;line-height:1}',
 '@media(max-width:760px){body:has(#ekab-global-nav){padding-bottom:calc(67px + env(safe-area-inset-bottom))!important}',
 '.ekab-global-nav{position:fixed;left:0;right:0;bottom:0;z-index:70;justify-content:space-around;gap:0;border-top:1px solid #486c73;border-bottom:0;padding:5px 3px calc(5px + env(safe-area-inset-bottom));box-shadow:0 -7px 26px #061c2b48}',
 '.ekab-global-nav-link{flex:1;flex-direction:column;gap:3px;padding:7px 1px;min-height:49px;font-size:.62rem;white-space:nowrap}',
 '.ekab-global-nav-icon{font-size:1.3rem}',
 'header.top .nav{display:none}',
 'body:has(:fullscreen) .ekab-global-nav{display:none}',
 '}'
 ].join('');
 document.head.append(css);
 const header=document.querySelector('header');
 if(header&&header.parentElement===document.body)header.insertAdjacentElement('afterend',bar);else document.body.prepend(bar);
 if(group==='home'){
  const resume=document.getElementById('studyResume'),tiles=document.querySelector('.home-tiles');
  if(resume&&tiles)tiles.insertAdjacentElement('beforebegin',resume);
 }
}

function init(){
 mountGlobalNavigation();
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
