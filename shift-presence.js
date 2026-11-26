/* Anonymous "on shift" heartbeat from every page of the app (random per-tab id, area worked out by the
   server, no name, no IP stored). The home page strip listens for 'ekab:shift' to show the totals. */
(()=>{
 'use strict';
 if(window.__ekabShift||/oauth|auth-callback/.test(location.pathname))return;window.__ekabShift=true;
 const api=(window.EKAB_RADIO_CONFIG?.apiBase||'https://ekab-spoudi-radio.6d9757cmp5.workers.dev')+'/api/site/presence';
 let id=null;
 try{id=sessionStorage.getItem('ekab.shift.id');if(!id){id=[...crypto.getRandomValues(new Uint8Array(12))].map(b=>b.toString(36).padStart(2,'0')).join('').slice(0,24);sessionStorage.setItem('ekab.shift.id',id)}}catch(_){id=null}
 if(!id)return;
 let timer=null;
 const send=body=>fetch(api,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body),keepalive:!!body.leave});
 const beat=async()=>{
  let data=null;
  try{const r=await send({id});if(r.ok)data=await r.json()}catch(_){}
  window.__ekabShiftData=data;
  window.dispatchEvent(new CustomEvent('ekab:shift',{detail:data}));
 };
 const schedule=()=>{clearTimeout(timer);if(!document.hidden)timer=setTimeout(()=>{beat();schedule()},45000)};
 beat();schedule();
 document.addEventListener('visibilitychange',()=>{if(document.hidden)clearTimeout(timer);else{beat();schedule()}});
 window.addEventListener('pagehide',()=>{clearTimeout(timer);send({id,leave:true}).catch(()=>{})});
})();
