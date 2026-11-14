/* Applies the theme chosen on the site (key ekab.theme.v1) on pages that do not load theme-init.js, before they paint. */
(function(){try{document.documentElement.dataset.theme=localStorage.getItem('ekab.theme.v1')==='dark'?'dark':'light';}catch(e){document.documentElement.dataset.theme='light';}})();

/* Apply V6's shared palette after page-specific styles so every section stays visually consistent. */
(function(){
 const base=document.currentScript?.src||location.href;
 const mount=()=>{
  if(document.querySelector('link[data-ekab-v6-subsections]'))return;
  const link=document.createElement('link');
  link.rel='stylesheet';
  link.href=new URL('v6-subsections.css?v=27.1.133',base).href;
  link.dataset.ekabV6Subsections='';
  document.head.appendChild(link);
 };
 if(document.readyState==='complete')mount();
 else window.addEventListener('load',mount,{once:true});
})();

/* V6 academic shell for the existing learning pages. */
(function(){const s=document.createElement('script');s.src=new URL('v6-shell-loader.js?v=27.1.133',document.currentScript?.src||location.href).href;s.defer=true;document.head.appendChild(s);})();
