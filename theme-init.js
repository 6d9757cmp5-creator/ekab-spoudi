/* Resolves a site file relative to this script, so pages in subfolders load the same shared files. */
function ekabAt(p){const s=document.currentScript;return s&&s.src?new URL(p,s.src).href:p;}
(function(){document.documentElement.dataset.sidebarBeta='true';const script=document.createElement('script');script.src=ekabAt('sidebar-beta.js?v=20261122-8');document.head.appendChild(script)})();
(function(){var value=null;try{value=localStorage.getItem('ekab.theme.v1')}catch(e){}if(value!=='dark'&&value!=='light'){try{var item=document.cookie.split(';').map(function(part){return part.trim()}).find(function(part){return part.indexOf('ekab.theme.v1=')===0});value=item?item.slice(14):null}catch(e){value=null}}document.documentElement.dataset.theme=value==='light'?'light':'dark'})();;

/* Apply V6's shared palette after page-specific styles so every section stays visually consistent. */
(function(){
 const base=document.currentScript?.src||location.href;
 const mount=()=>{
  if(document.querySelector('link[data-ekab-v6-subsections]'))return;
  const link=document.createElement('link');
  link.rel='stylesheet';
  link.href=new URL('v6-subsections.css?v=27.1.171',base).href;
  link.dataset.ekabV6Subsections='';
  document.head.appendChild(link);
 };
 // As soon as the page is parsed (not after every image has loaded), so the colours do not jump.
 if(document.readyState!=='loading')mount();
 else document.addEventListener('DOMContentLoaded',mount,{once:true});
})();

/* Every page shares the home-brand link; the quick guide only runs on the home page. */
(function(){
 const script=document.createElement('script');
 script.src=ekabAt('ui-guide.js');
 script.async=true;
 document.head.appendChild(script);
})();

/* Shared on desktop, phone and tablet: chapter suggestions and starter medical book. */
(function(){
 const sheet=document.createElement('link');sheet.rel='stylesheet';sheet.href=ekabAt('global-tools.css?v=27.1.129');document.head.appendChild(sheet);
 const script=document.createElement('script');script.src=ekabAt('global-tools.js?v=27.1.129');script.async=true;document.head.appendChild(script);
})();

/* One tiny read-only resume tracker shared by Home, SAEK and EOPPEP. */
(function(){
 const script=document.createElement('script');
 script.src=ekabAt('study-resume.js?v=27.1.109');
 script.async=true;
 document.head.appendChild(script);
})();

/* Shared Experience V4: modern interface and chapter navigation on existing pages.
   Presentation only; no grade or learning-state mutations. */
(function(){
 const sheet=document.createElement('link');
 sheet.rel='stylesheet';sheet.href=ekabAt('experience-v4.css?v=20261101');
 document.head.appendChild(sheet);
 const module=document.createElement('script');
 module.type='module';module.src=ekabAt('experience-v4.mjs?v=20261101');
 document.head.appendChild(module);
})();

/* Optional ATLAS study recall is lazy-loaded; no cards or lessons are bundled on each page. */
(function(){
 const module=document.createElement('script');module.type='module';
 module.src=new URL('services/recall/popup.mjs',document.currentScript?.src||location.href).href;
 document.head.appendChild(module);
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
  for(const [href,as] of [['v6-shell.css?v=27.1.178','style'],['v6-subsections.css?v=27.1.171','style'],['v6-shell.js?v=27.1.175','script']]){
   const l=document.createElement('link');l.rel='preload';l.as=as;l.href=url(href);document.head.appendChild(l);
  }
 }
 const s=document.createElement('script');s.src=url('v6-shell-loader.js?v=27.1.173');document.head.appendChild(s);
})();

/* Shared reading/practice navigation, without another scoring or progress store. */
(function(){const file=location.pathname.split('/').pop();if(/^(saek-course-\d{2}|saek|saek-exams|theory|eoppep|practical_exam|supplementary_practice|seminar-prep)\.html$/.test(file)){const script=document.createElement('script');script.src=ekabAt('learning-context.js?v=20261118-1');document.head.append(script);}})();
