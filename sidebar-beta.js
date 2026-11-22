(()=>{
 'use strict';
 const root=document.documentElement;
 root.dataset.sidebarBeta='true';
 const base=new URL('./',document.currentScript?.src||location.href);
 const css=document.createElement('link');css.rel='stylesheet';css.href=new URL('sidebar-beta.css?v=20261122-7',base).href;document.head.append(css);
 const mobile=matchMedia('(max-width:720px)');
 const svg='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16"/></svg>';
 const closeSvg='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg>';
 let active=false, hoverCloseTimer=null, lastFocus=null, observer;
 const get=()=>({side:document.querySelector('#sidebar,.v6-global-sidebar'),main:document.querySelector('.maincol,.v6-global-main'),nav:document.querySelector('.nav,.v6-shell-nav'),top:document.querySelector('.topbar-inner,.v6-global-topbar')});
 const addBeta=()=>{
  const {side,main,nav,top}=get();if(!side||!main||!nav)return false;
  if(side.dataset.sidebarBetaHover!=='true'){
   side.dataset.sidebarBetaHover='true';
   side.addEventListener('pointerenter',event=>{
    if(mobile.matches||event.pointerType==='touch')return;
    clearTimeout(hoverCloseTimer);
    setOpen(true);
   });
   side.addEventListener('pointerleave',event=>{
    if(event.pointerType==='touch')return;
    if(mobile.matches)return;
    clearTimeout(hoverCloseTimer);
    hoverCloseTimer=setTimeout(()=>setOpen(false),260);
   });
   side.addEventListener('focusin',()=>{
    if(mobile.matches)return;
    clearTimeout(hoverCloseTimer);
    setOpen(true);
   });
   side.addEventListener('focusout',event=>{
    if(mobile.matches||side.contains(event.relatedTarget))return;
    clearTimeout(hoverCloseTimer);
    hoverCloseTimer=setTimeout(()=>{if(!side.matches(':hover'))setOpen(false)},260);
   });
  }
  if(top&&!top.querySelector('[data-sidebar-beta-mobile-toggle]')){
   const trigger=document.createElement('button');trigger.type='button';trigger.className='sidebar-beta-mobile-toggle';trigger.dataset.sidebarBetaMobileToggle='';trigger.setAttribute('aria-label','Άνοιγμα πλευρικής πλοήγησης');trigger.setAttribute('aria-expanded','false');trigger.innerHTML=svg;top.prepend(trigger);trigger.addEventListener('click',()=>setOpen(!active));
  }
  if(!document.querySelector('[data-sidebar-beta-backdrop]')){
   const backdrop=document.createElement('button');backdrop.type='button';backdrop.className='sidebar-beta-backdrop';backdrop.dataset.sidebarBetaBackdrop='';backdrop.setAttribute('aria-label','Κλείσιμο πλοήγησης');document.body.append(backdrop);backdrop.addEventListener('click',()=>setOpen(false));
  }
  for(const a of nav.querySelectorAll('a')){
   a.title=a.textContent.trim();a.setAttribute('aria-label',a.textContent.trim());
  }
  return true;
 };
 const setOpen=next=>{
  const {side,main}=get();if(!side||!main)return;
  if(!next)clearTimeout(hoverCloseTimer);
  active=next;root.classList.toggle('sidebar-beta-open',active);
  const trigger=document.querySelector('[data-sidebar-beta-mobile-toggle]');trigger?.setAttribute('aria-expanded',String(active));trigger?.setAttribute('aria-label',active?'Κλείσιμο πλευρικής πλοήγησης':'Άνοιγμα πλευρικής πλοήγησης');if(trigger)trigger.innerHTML=active?closeSvg:svg;
  if(mobile.matches){const content=document.querySelector('.content');if(content)content.inert=active;if(active){lastFocus=document.activeElement;requestAnimationFrame(()=>side.querySelector('.nav a,.v6-shell-nav a')?.focus())}else if(lastFocus?.isConnected)lastFocus.focus()}
 };
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&active){e.preventDefault();setOpen(false);return}if(e.key==='Tab'&&active&&mobile.matches){const {side}=get();const list=[...side.querySelectorAll('button:not([disabled]),a[href]')].filter(el=>el.getClientRects().length);if(!list.length)return;const first=list[0],last=list.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus()}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus()}}});
 document.addEventListener('click',e=>{
  if(active&&e.target.closest('.nav a,.v6-shell-nav a'))setOpen(false);
 });
 mobile.addEventListener('change',()=>{if(active)setOpen(false)});
 const start=()=>{
  let pending;
  const attach=()=>{if(!addBeta())return false;pending?.disconnect();observer=new MutationObserver(()=>addBeta());observer.observe(document.body,{childList:true,subtree:true});setTimeout(()=>observer?.disconnect(),12000);return true};
  if(!attach()){pending=new MutationObserver(()=>attach());pending.observe(document.documentElement,{childList:true,subtree:true});setTimeout(()=>pending?.disconnect(),15000)}
 };
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
