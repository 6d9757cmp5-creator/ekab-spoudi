(function(){try{var x=localStorage.getItem('ekab.theme.v1');document.documentElement.dataset.theme=x==='dark'?'dark':'light';}catch(e){document.documentElement.dataset.theme='light';}})();

/* Apply V6's shared palette after page-specific styles so every section stays visually consistent. */
(function(){
 const base=document.currentScript?.src||location.href;
 const mount=()=>{
  if(document.querySelector('link[data-ekab-v6-subsections]'))return;
  const link=document.createElement('link');
  link.rel='stylesheet';
  link.href=new URL('v6-subsections.css?v=27.1.134',base).href;
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
 script.src='ui-guide.js';
 script.async=true;
 document.head.appendChild(script);
})();

/* Shared on desktop, phone and tablet: chapter suggestions and starter medical book. */
(function(){
 const sheet=document.createElement('link');sheet.rel='stylesheet';sheet.href='global-tools.css?v=27.1.129';document.head.appendChild(sheet);
 const script=document.createElement('script');script.src='global-tools.js?v=27.1.129';script.async=true;document.head.appendChild(script);
})();

/* One tiny read-only resume tracker shared by Home, SAEK and EOPPEP. */
(function(){
 const script=document.createElement('script');
 script.src='study-resume.js?v=27.1.109';
 script.async=true;
 document.head.appendChild(script);
})();

/* Shared Experience V4: modern interface and chapter navigation on existing pages.
   Presentation only; no grade or learning-state mutations. */
(function(){
 const sheet=document.createElement('link');
 sheet.rel='stylesheet';sheet.href='experience-v4.css?v=20261101';
 document.head.appendChild(sheet);
 const module=document.createElement('script');
 module.type='module';module.src='experience-v4.mjs?v=20261101';
 document.head.appendChild(module);
})();

/* Optional ATLAS study recall is lazy-loaded; no cards or lessons are bundled on each page. */
(function(){
 const module=document.createElement('script');module.type='module';
 module.src=new URL('services/recall/popup.mjs',document.currentScript?.src||location.href).href;
 document.head.appendChild(module);
})();

/* V6 academic shell for the existing learning pages. */
(function(){const s=document.createElement('script');s.src=new URL('v6-shell-loader.js?v=27.1.134',document.currentScript?.src||location.href).href;s.defer=true;document.head.appendChild(s);})();
