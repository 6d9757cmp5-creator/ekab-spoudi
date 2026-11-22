/* Applies the theme chosen on the site (key ekab.theme.v1) on pages that do not load theme-init.js, before they paint. */
(function(){var value=null;try{value=localStorage.getItem('ekab.theme.v1')}catch(e){}if(value!=='dark'&&value!=='light'){try{var item=document.cookie.split(';').map(function(part){return part.trim()}).find(function(part){return part.indexOf('ekab.theme.v1=')===0});value=item?item.slice(14):null}catch(e){value=null}}document.documentElement.dataset.theme=value==='light'?'light':'dark'})();;

(function(){const base=document.currentScript?.src||location.href;if(document.querySelector('[data-ekab-theme-system]'))return;const link=document.createElement('link');link.rel='stylesheet';link.href=new URL('theme-system.css?v=20261122-10',base).href;link.dataset.ekabThemeSystem='';document.head.appendChild(link)})();

/* Apply V6's shared palette after page-specific styles so every section stays visually consistent. */
(function(){
 const base=document.currentScript?.src||location.href;
 const mount=()=>{
  if(document.querySelector('link[data-ekab-v6-subsections]'))return;
  const link=document.createElement('link');
  link.rel='stylesheet';
  link.href=new URL('v6-subsections.css?v=27.1.174',base).href;
  link.dataset.ekabV6Subsections='';
  document.head.appendChild(link);
 };
 // As soon as the page is parsed (not after every image has loaded), so the colours do not jump.
 if(document.readyState!=='loading')mount();
 else document.addEventListener('DOMContentLoaded',mount,{once:true});
})();

/* V6 academic shell for the existing learning pages. */
(function(){
 // Keep the page hidden (on the V6 background) until the shell and palette are in place, so the
 // old layout never flashes; v6-shell-loader.js reveals it, and a 6 s fallback always does (large chapters on a slow phone network need about 4 s).
 // Paths are relative to this script (the site root), so pages in subfolders work too.
 const base=document.currentScript?.src,url=p=>base?new URL(p,base).href:p;
 const rootPath=base?new URL('./',base).pathname:'/';
 const isHome=['','index.html'].includes(location.pathname.startsWith(rootPath)?location.pathname.slice(rootPath.length):'x');
 if(!isHome){
  const root=document.documentElement;root.classList.add('v6-booting');
  const style=document.createElement('style');
  style.textContent='html.v6-booting body{visibility:hidden}html.v6-booting{background:#f7f6ef}html.v6-booting[data-theme="dark"]{background:#191e19}';
  document.head.appendChild(style);
  window.__ekabV6Reveal=()=>root.classList.remove('v6-booting');
  setTimeout(window.__ekabV6Reveal,6000);
  // Start fetching the shell files now instead of one after another.
  for(const [href,as] of [['v6-shell.css?v=27.1.177','style'],['v6-subsections.css?v=27.1.174','style'],['v6-shell.js?v=27.1.178','script']]){
   const l=document.createElement('link');l.rel='preload';l.as=as;l.href=url(href);document.head.appendChild(l);
  }
 }
 const s=document.createElement('script');s.src=url('v6-shell-loader.js?v=27.1.174');document.head.appendChild(s);
})();
