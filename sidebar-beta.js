(()=>{
 'use strict';
 // Side navigation as an overlay drawer at every screen size: hidden by default, opened from the
 // top-bar button, closed by tapping outside, Esc or choosing a page. The page underneath never moves.
 const root=document.documentElement;
 root.dataset.sidebarBeta='true';
 const base=new URL('./',document.currentScript?.src||location.href);
 const css=document.createElement('link');css.rel='stylesheet';css.href=new URL('sidebar-beta.css?v=20261127-5',base).href;document.head.append(css);
 const svg='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"/></svg>';
 const closeSvg='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>';
 let active=false, lastFocus=null, observer, hoverTimer=null, openedBy=null;
 const finePointer=matchMedia('(hover:hover) and (pointer:fine)');
 const phone=matchMedia('(max-width:720px)');
 const get=()=>({side:document.querySelector('#sidebar,.v6-global-sidebar'),main:document.querySelector('.maincol,.v6-global-main'),nav:document.querySelector('.nav,.v6-shell-nav'),top:document.querySelector('.topbar-inner,.v6-global-topbar')});
 const addBeta=()=>{
  const {side,main,nav,top}=get();if(!side||!main||!nav)return false;
  if(!side.id)side.id='ekab-side-nav';
  if(top&&!document.querySelector('[data-sidebar-beta-mobile-toggle]')){
   const trigger=document.createElement('button');trigger.type='button';trigger.className='sidebar-beta-mobile-toggle';trigger.dataset.sidebarBetaMobileToggle='';trigger.setAttribute('aria-label','Άνοιγμα πλευρικής πλοήγησης');trigger.setAttribute('aria-expanded','false');trigger.setAttribute('aria-controls',side.id);trigger.innerHTML=svg;top.prepend(trigger);trigger.addEventListener('click',()=>setOpen(!active));
  }
  if(!document.querySelector('[data-sidebar-beta-backdrop]')){
   const backdrop=document.createElement('button');backdrop.type='button';backdrop.className='sidebar-beta-backdrop';backdrop.dataset.sidebarBetaBackdrop='';backdrop.tabIndex=-1;backdrop.setAttribute('aria-label','Κλείσιμο πλοήγησης');document.body.append(backdrop);backdrop.addEventListener('click',()=>setOpen(false));
  }
  if(side.dataset.sidebarBetaHover!=='true'){
   side.dataset.sidebarBetaHover='true';
   // Opens only when the mouse actually moves over the rail (Safari reports a pointer that merely rests there after load).
   side.addEventListener('pointermove',e=>{if(active||phone.matches||e.pointerType!=='mouse'||!finePointer.matches)return;clearTimeout(hoverTimer);hoverTimer=setTimeout(()=>{if(side.matches(':hover'))setOpen(true,'hover')},150)});
   // Keyboard users: tabbing into the rail expands it; tabbing out collapses it.
   side.addEventListener('focusin',()=>{if(!active&&!phone.matches)setOpen(true,'hover')});
   side.addEventListener('focusout',e=>{if(active&&openedBy==='hover'&&!side.contains(e.relatedTarget))setOpen(false)});
   side.addEventListener('pointerleave',e=>{if(e.pointerType==='mouse'&&openedBy==='hover'){clearTimeout(hoverTimer);hoverTimer=setTimeout(()=>setOpen(false),300)}});
  }
  side.inert=!active&&phone.matches;
  return true;
 };
 const setOpen=(next,how='click')=>{
  const {side,main}=get();if(!side||!main)return;
  clearTimeout(hoverTimer);const wasHover=openedBy==='hover';openedBy=next?how:null;
  active=next;root.classList.toggle('sidebar-beta-open',active);root.classList.toggle('sidebar-beta-peek',active&&how==='hover');
  side.inert=!active&&phone.matches;
  const trigger=document.querySelector('[data-sidebar-beta-mobile-toggle]');trigger?.setAttribute('aria-expanded',String(active));trigger?.setAttribute('aria-label',active?'Κλείσιμο πλευρικής πλοήγησης':'Άνοιγμα πλευρικής πλοήγησης');if(trigger)trigger.innerHTML=active?closeSvg:svg;
  const content=document.querySelector('.content');if(content)content.inert=active&&how!=='hover';
  if(active){lastFocus=document.activeElement;if(how!=='hover')requestAnimationFrame(()=>side.querySelector('.nav a,.v6-shell-nav a')?.focus())}
  else if(!wasHover&&lastFocus?.isConnected)lastFocus.focus();
 };
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&active){e.preventDefault();setOpen(false);return}if(e.key==='Tab'&&active){const {side}=get();const list=[...side.querySelectorAll('button:not([disabled]),a[href]')].filter(el=>el.getClientRects().length);if(!list.length)return;const first=list[0],last=list.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus()}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus()}}});
 phone.addEventListener('change',()=>{const {side}=get();if(side)side.inert=!active&&phone.matches});
 // A hover-opened menu also closes when the pointer moves or presses anywhere outside it.
 const outside=e=>{if(!active){if(e.type==='pointermove'){const {side}=get();if(side&&!side.contains(e.target))clearTimeout(hoverTimer)}return}if(openedBy!=='hover')return;const {side}=get();if(side&&!side.contains(e.target)){clearTimeout(hoverTimer);hoverTimer=setTimeout(()=>{if(openedBy==='hover')setOpen(false)},e.type==='pointerdown'?0:300)}};
 document.addEventListener('pointermove',outside,{passive:true});document.addEventListener('pointerdown',outside,true);
 document.addEventListener('click',e=>{
  if(active&&e.target.closest('.nav a,.v6-shell-nav a'))setOpen(false);
 });
 const start=()=>{
  let pending;
  const attach=()=>{if(!addBeta())return false;pending?.disconnect();observer=new MutationObserver(()=>addBeta());observer.observe(document.body,{childList:true,subtree:true});setTimeout(()=>observer?.disconnect(),12000);return true};
  if(!attach()){pending=new MutationObserver(()=>attach());pending.observe(document.documentElement,{childList:true,subtree:true});setTimeout(()=>pending?.disconnect(),15000)}
 };
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
