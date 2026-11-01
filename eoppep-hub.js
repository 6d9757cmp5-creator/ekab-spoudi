/* EOPPEP hub: safe, read-only progress from existing recall history. */
(function(){
'use strict';
const STORAGE='ekab-eoppep-official-v15',KEY='ekab.eoppep.hub.group.v1',limits={all:314,A:105,B:209};
const titles={all:'Όλες οι θεωρητικές ερωτήσεις',A:'Ομάδα Α · Γενικές',B:'Ομάδα Β · Ειδικές'};
let chosen='all';
const el=id=>document.getElementById(id),tabs=[...document.querySelectorAll('[data-eop-group]')];
function getSaved(){try{return ['A','B'].includes(localStorage.getItem(KEY))?localStorage.getItem(KEY):'all'}catch{return'all'}}
function metrics(){
 let state={};try{state=JSON.parse(localStorage.getItem(STORAGE)||'{}')||{}}catch{}
 const result={all:0,A:0,B:0},read={all:0,A:0,B:0},scheduler=window.EkabStudyScheduler;
 if(!scheduler)return {studied:result,read};
 for(const [id,s] of Object.entries(state)){
  const m=/^EOP-([AB])-(\d{3})$/.exec(id);if(!m)continue;
  const group=m[1],num=Number(m[2]);if(num<1||num>limits[group])continue;
  if(scheduler.evaluate(s).studied){result[group]++;result.all++}
  if(typeof s?.readCompletedAt==='string'&&Number.isFinite(Date.parse(s.readCompletedAt))){read[group]++;read.all++}
 }
 return {studied:result,read};
}
function paint(){const progress=metrics(),counts=progress.studied;el('eopHubCount').textContent=counts.all+'/314';el('eopHubReadCount').textContent=progress.read.all+'/314';el('eopHubBar').style.width=(counts.all/314*100)+'%';el('eopGroupCount').textContent=counts[chosen]+'/'+limits[chosen]+' μελετημένες'}
function choose(group,save=true){
 if(!(group in limits))return;chosen=group;
 tabs.forEach(t=>t.setAttribute('aria-pressed',String(t.dataset.eopGroup===group)));
 el('eopGroupTitle').textContent=titles[group];
 const suffix=group==='all'?'':'&group='+group;
 el('eopRead').href='theory.html?view=catalog'+suffix;
 el('eopPractice').href='theory.html?mode=exam'+suffix;
 if(save)try{localStorage.setItem(KEY,group)}catch{}
 paint();
}
function init(){
 if(tabs.length!==3)return;
 tabs.forEach(t=>t.addEventListener('click',()=>choose(t.dataset.eopGroup)));
 choose(getSaved(),false);
 window.addEventListener('focus',paint);window.addEventListener('pageshow',paint);
 window.addEventListener('storage',e=>{if(e.key===KEY)choose(getSaved(),false);else if(!e.key||e.key===STORAGE)paint()});
 window.addEventListener('ekab:progress-changed',paint);window.addEventListener('ekab:cloud-applied',paint);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
