/* EKAB Spoudi — privacy-first active learning time.
 * Counts only visible, focused, recently interacted educational pages.
 * Monotone per-device counters can be safely merged by the cloud sync.
 */
(()=>{'use strict';
if(window.EkabActivityTimer)return;
const PREFIX='ekab.activity.v1.',DEVICE='ekab.sync.device.v1';
const allowed=/^(saek|eoppep|bls|pbls|ils|phtls|als|pharma)$/;
const MAX=315360000,IDLE_MS=120000,PERIOD=5000;
let device,activity=Date.now(),last=performance.now(),lastPersist=Date.now();
const pending=new Map();
try{
 device=localStorage.getItem(DEVICE);
 if(!/^[a-f0-9]{32}$/.test(device||'')){
  device=crypto.randomUUID().replaceAll('-','');
  localStorage.setItem(DEVICE,device);
 }
}catch{return}
const page=location.pathname.split('/').pop()||'index.html';
function locationScope(){
 if(/^saek-course-(0[1-9]|1\d|20)\.html$/.test(page))return ['saek','study'];
 if(page==='saek-exams.html')return ['saek','exam'];
 if(page==='theory.html'){
  const exam=document.getElementById('examView');
  return ['eoppep',exam&&!exam.classList.contains('hidden')?'exam':'study'];
 }
 if(page==='eoppep.html')return null;
 if(page==='farmaka.html')return ['pharma','study'];
 if(page==='seminar-prep.html'){
  const panel=document.getElementById('seminarCourse');
  if(!panel||panel.hidden)return null;
  const name=(document.getElementById('seminarCourseTitle')?.textContent||'').toUpperCase();
  const id=/\bPBLS\b/.test(name)?'pbls':/\bPHTLS\b/.test(name)?'phtls':/\bILS\b/.test(name)?'ils':/\bALS\b/.test(name)?'als':/\bBLS\b/.test(name)?'bls':null;
  if(!id)return null;
  const tab=document.querySelector('[data-seminar-tab][aria-selected="true"]')?.dataset.seminarTab;
  return [id,tab==='quiz'||tab==='oral'?'exam':'study'];
 }
 return null;
}
function mark(){activity=Date.now()}
for(const event of ['pointerdown','keydown','touchstart','scroll'])document.addEventListener(event,mark,{passive:true});
window.addEventListener('focus',()=>{mark();last=performance.now()});
document.addEventListener('visibilitychange',()=>{last=performance.now();if(document.visibilityState==='hidden')flush();else mark()});
window.addEventListener('pagehide',flush);
function flush(){
 if(!pending.size)return;
 let changed=false;
 for(const [key,seconds] of pending){
  try{
   const old=Number(localStorage.getItem(key)||0);
   if(!Number.isSafeInteger(old)||old<0||old>MAX-seconds)continue;
   localStorage.setItem(key,String(old+seconds));changed=true;
  }catch{}
 }
 pending.clear();lastPersist=Date.now();
 if(changed)window.dispatchEvent(new Event('ekab:progress-changed'));
}
function tick(){
 const now=performance.now(),elapsed=Math.min(PERIOD+1000,Math.max(0,now-last));last=now;
 if(document.visibilityState!=='visible'||!document.hasFocus()||Date.now()-activity>IDLE_MS)return;
 const scope=locationScope();if(!scope||!allowed.test(scope[0]))return;
 const seconds=Math.round(elapsed/1000);if(seconds<=0||seconds>6)return;
 const key=PREFIX+device+'.'+scope[0]+'.'+scope[1];
 pending.set(key,(pending.get(key)||0)+seconds);
 if(Date.now()-lastPersist>=30000)flush();
}
window.EkabActivityTimer={scope:locationScope};
setInterval(tick,PERIOD);
})();