/**
 * One in-place Anatomy Lab: standard whole-body view + shared specialist library.
 * No iframe, new source inventory, external-model viewer, storage writes or student state changes.
 * The existing anatomy engine and integrity-verifying model renderer remain canonical.
 */
const base=document.getElementById('base-anatomy');
const models=document.getElementById('models');
const basicButton=document.getElementById('unified-basic');
const modelsButton=document.getElementById('unified-catalog');
const message=document.getElementById('unified-library-message');
let initiated=false;
function show(pane){
 const specialist=pane==='models';
 base.hidden=specialist;
 models.hidden=!specialist;
 basicButton.setAttribute('aria-selected',String(!specialist));
 modelsButton.setAttribute('aria-selected',String(specialist));
 basicButton.tabIndex=specialist?-1:0;
 modelsButton.tabIndex=specialist?0:-1;
 if(specialist&&!initiated){
  initiated=true;
  // Never load the heavy specialist 3D engine until the user requests it.
  import('../atla-ai/model-preview.mjs').then(()=>{
   if(message)message.hidden=true;
  }).catch(error=>{
   initiated=false;
   if(message){message.hidden=false;message.textContent='Η κοινή βιβλιοθήκη δεν φορτώθηκε. Άνοιξε ξανά την καρτέλα ή ανανέωσε τη σελίδα.';}
   console.error('ATLA unified anatomy model library:',error);
  });
 }
}
function switchTo(pane){
 if(pane==='models'){
  if(location.hash!=='#models')location.hash='models';
  show('models');
 }else{
  if(location.hash==='#models')history.replaceState(null,'',location.pathname+location.search);
  show('base');
 }
}
basicButton.addEventListener('click',()=>switchTo('base'));
modelsButton.addEventListener('click',()=>switchTo('models'));
for(const button of [basicButton,modelsButton]){
 button.addEventListener('keydown',event=>{
  if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;
  event.preventDefault();
  const target=event.key==='ArrowLeft'||event.key==='Home'?'base':'models';
  switchTo(target);
  (target==='base'?basicButton:modelsButton).focus();
 });
}
// «Λεπτομερής εξερεύνηση» of the selected structure: same page, detail pane, that structure only.
document.getElementById('detailExplore')?.addEventListener('click',event=>{
 const {greek='',english=''}=event.currentTarget.dataset;
 window.ATLA_EXPLORE_REQUEST={greek,english};
 window.dispatchEvent(new CustomEvent('atla:explore-structure',{detail:{greek,english}}));
 switchTo('models');
});
// Close-up of the selected structure in the full atlas (the structure stays selected while the pane changes).
window.addEventListener('atla:atlas-closeup',()=>{
 switchTo('base');
 requestAnimationFrame(()=>{const focus=document.getElementById('isolateBtn');if(focus&&!focus.disabled)focus.click();document.getElementById('base-anatomy')?.scrollIntoView({behavior:'smooth',block:'start'});});
});
window.addEventListener('hashchange',()=>show(location.hash==='#models'?'models':'base'));
show(location.hash==='#models'?'models':'base');


/**
 * Load the vendored WebGL2 atlas primitives on demand. These are implementation
 * modules on our own origin, not another HTML viewer, iframe, or hosted service.
 */
let atlasPending=null;
function bootInlineAtlas(){
 if(atlasPending)return atlasPending;
 const base=new URL('./vendor/open-anatomy-atlas/src/renderer/',import.meta.url);
 const scripts=[new URL('mat4.js',base),new URL('gl.js',base),new URL('atlas.js',base),
  new URL('./inline-atlas.js',import.meta.url)];
 atlasPending=(async()=>{
  for(const url of scripts){
   await new Promise((resolve,reject)=>{
    const script=document.createElement('script');
    script.src=url.href;script.async=false;
    script.addEventListener('load',resolve,{once:true});
    script.addEventListener('error',()=>reject(Error('Αδυναμία φόρτωσης τοπικού WebGL2 αρχείου')),{once:true});
    document.head.append(script);
   });
  }
  if(!window.ATLAInlineAtlas)throw Error('Ο εσωτερικός ανατομικός προβολέας δεν είναι διαθέσιμος');
 })().catch(error=>{atlasPending=null;throw error});
 return atlasPending;
}
document.getElementById('atlas-load').addEventListener('click',event=>{
 if(window.ATLAInlineAtlas)return;
 event.stopImmediatePropagation();
 const button=event.currentTarget;
 button.disabled=true;
 document.getElementById('atlas-status').textContent='Εκκίνηση ενσωματωμένου άτλαντα…';
 bootInlineAtlas()
  .then(()=>window.ATLAInlineAtlas.load(document.getElementById('atlas-version').value))
  .catch(error=>{
   const line=document.getElementById('atlas-status');
   line.textContent='Αδυναμία εκκίνησης: '+String(error.message||error);
   line.dataset.error='true';
  })
  .finally(()=>{button.disabled=false});
},true);
