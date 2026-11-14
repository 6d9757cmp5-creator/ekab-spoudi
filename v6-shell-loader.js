(()=>{
 const base=document.currentScript?.src||location.href;
 const css=document.createElement('link');css.rel='stylesheet';css.href=new URL('v6-shell.css?v=27.1.133',base).href;css.dataset.v6GlobalShell='css';
 const js=document.createElement('script');js.src=new URL('v6-shell.js?v=27.1.133',base).href;js.dataset.v6GlobalShell='js';js.defer=true;
 const mount=()=>{if(document.querySelector('[data-v6-global-shell="css"]'))return;css.dataset.v6GlobalShell='css';css.onload=()=>document.head.append(js);document.head.append(css)};
 if(document.readyState==='complete')mount();else window.addEventListener('load',mount,{once:true});
})();
