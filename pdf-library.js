/* Backwards-compatible public URL. Single implementation lives in tools/pdf-library/app/. */
(()=>{
  'use strict';
  if(typeof document==='undefined')return;
  const current=document.currentScript;
  const src=new URL('tools/pdf-library/app/pdf-library.js',current?.src||document.baseURI);
  if(document.querySelector('script[src="'+src.href+'"]'))return;
  const el=document.createElement('script');
  el.src=src.href;el.async=false;document.head.append(el);
})();
