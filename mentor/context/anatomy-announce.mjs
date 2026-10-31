/**
 * Tells the floating MENTOR what the 3D anatomy page shows: the selected structure, or that a self-test is running.
 * It only reads visible elements of the page (selection name, quiz buttons); nothing is stored or sent.
 */
export function anatomyContext({quizOpen=false,quizStartHidden=false,name='',bannerHidden=true}={}){
 const label=String(name||'').replace(/\s+/g,' ').trim().slice(0,120);
 if(quizOpen&&quizStartHidden)return {kind:'exam',id:'anatomy-quiz',label:'Άσκηση αναγνώρισης ανατομίας',active:true};
 if(label&&!bannerHidden)return {kind:'anatomy-object',id:'anatomy-selection',label};
 return {kind:'study-mode',id:'anatomy-explore',label:'3D Ανατομία — εξερεύνηση'};
}
if(typeof document!=='undefined'){
 const $=id=>document.getElementById(id);
 const announce=()=>window.dispatchEvent(new CustomEvent('mentor:context',{detail:anatomyContext({
  quizOpen:!!$('quizPanel')&&!$('quizPanel').hidden,
  quizStartHidden:!!$('quizStart')?.hidden,
  name:$('selectedName')?.textContent,
  bannerHidden:!!$('selectedBanner')?.hidden
 })}));
 for(const id of ['selectedName','selectedBanner','quizPanel','quizStart']){
  const node=$(id);
  if(node)new MutationObserver(announce).observe(node,{attributes:true,attributeFilter:['hidden'],childList:true,characterData:true,subtree:true});
 }
 window.addEventListener('load',announce);
 announce();
}
