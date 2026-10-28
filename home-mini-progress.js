/* Read-only mini tracker: same study criterion as EOPPEP hub. */
(function(){
'use strict';
const KEY='ekab-eoppep-official-v15',MAX=314;
function render(){
 const count=document.getElementById('homeMiniCount'),bar=document.getElementById('homeMiniProgress'),fill=document.getElementById('homeMiniFill'),msg=document.getElementById('homeMiniMessage');
 if(!count||!bar||!fill||!msg)return;
 let records={};try{records=JSON.parse(localStorage.getItem(KEY)||'{}')||{}}catch{}
 const scheduler=window.EkabStudyScheduler;let studied=0;
 if(scheduler&&records&&typeof records==='object'){
  for(const [id,record] of Object.entries(records)){
   const match=/^EOP-([AB])-(\d{3})$/.exec(id);if(!match)continue;
   const n=Number(match[2]);if(n<1||n>(match[1]==='A'?105:209))continue;
   try{if(scheduler.evaluate(record).studied)studied++}catch{}
  }
 }
 studied=Math.min(MAX,studied);
 count.textContent=studied+'/'+MAX;
 bar.setAttribute('aria-valuenow',String(studied));
 fill.style.width=(100*studied/MAX)+'%';
 msg.textContent=studied===MAX?'Ολοκλήρωσες την πρώτη μελέτη! Συνέχισε με επανάληψη.':studied===0?'Κάθε ερώτηση σε φέρνει πιο κοντά στον στόχο σου.':studied<MAX/2?'Συνέχισε — έχεις ήδη κάνει '+studied+' βήματα!':'Πάνω από τη μέση! Συνέχισε δυνατά.';
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',render,{once:true});else render();
window.addEventListener('pageshow',render);
window.addEventListener('focus',render);
window.addEventListener('storage',e=>{if(!e.key||e.key===KEY)render()});
window.addEventListener('ekab:progress-changed',render);
window.addEventListener('ekab:cloud-applied',render);
})();