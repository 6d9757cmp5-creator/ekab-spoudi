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


