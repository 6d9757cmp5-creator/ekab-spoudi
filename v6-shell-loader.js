(()=>{
 // All pages that load this live in the site root, so the shell files are fixed relative paths.
 const settled=el=>new Promise(r=>{el.addEventListener('load',r,{once:true});el.addEventListener('error',r,{once:true});});
 const mount=()=>{
  if(document.querySelector('[data-v6-global-shell="css"]'))return;
  const css=document.createElement('link');css.rel='stylesheet';css.href='v6-shell.css?v=27.1.171';css.dataset.v6GlobalShell='css';
  const js=document.createElement('script');js.src='v6-shell.js?v=27.1.172';js.dataset.v6GlobalShell='js';
  // Reveal the page once the shell is built and its styles and the shared palette have loaded.
  const waits=[settled(css),new Promise(r=>document.addEventListener('ekab:v6-shell-ready',r,{once:true}))];
  // The palette link is added by theme-init.js at DOMContentLoaded, which can come after this runs.
  waits.push(new Promise(r=>{const t0=Date.now();const look=()=>{const l=document.querySelector('link[data-ekab-v6-subsections]');if(l){if(l.sheet)r();else settled(l).then(r,r);return;}if(Date.now()-t0>2500){r();return;}setTimeout(look,25);};look();}));
  Promise.all(waits).then(()=>requestAnimationFrame(()=>window.__ekabV6Reveal?.()),()=>window.__ekabV6Reveal?.());
  document.head.append(css,js);
 };
 if(document.readyState!=='loading')mount();else document.addEventListener('DOMContentLoaded',mount,{once:true});
})();
