/* "Σε βάρδια" next to the search bar on every page: an anonymous heartbeat (random per-tab id, area worked out
   by the server, no name, no IP stored) and a small live count; tapping it lists the areas.
   Nothing is shown when the service cannot be reached, so no number is ever invented. */
(()=>{
 'use strict';
 if(window.__ekabShift||/oauth|auth-callback/.test(location.pathname))return;window.__ekabShift=true;
 const api=(window.EKAB_RADIO_CONFIG?.apiBase||'https://ekab-spoudi-radio.6d9757cmp5.workers.dev')+'/api/site/presence';
 let id=null;
 try{id=sessionStorage.getItem('ekab.shift.id');if(!id){id=[...crypto.getRandomValues(new Uint8Array(12))].map(b=>b.toString(36).padStart(2,'0')).join('').slice(0,24);sessionStorage.setItem('ekab.shift.id',id)}}catch(_){id=null}
 if(!id)return;

 const chip=document.createElement('button');
 chip.type='button';chip.className='ekab-shift-chip';chip.hidden=true;chip.setAttribute('aria-expanded','false');chip.setAttribute('aria-controls','ekabShiftPlaces');
 chip.innerHTML='<span class="ekab-shift-dot" aria-hidden="true"></span><span class="ekab-shift-label">Βάρδια</span><span class="ekab-shift-station" aria-hidden="true"></span>';
 const list=document.createElement('div');
 list.className='ekab-shift-places';list.id='ekabShiftPlaces';list.hidden=true;list.setAttribute('role','status');
 const wrap=document.createElement('div');wrap.className='ekab-shift-wrap';wrap.append(chip,list);
 const setOpen=open=>{list.hidden=!open;chip.setAttribute('aria-expanded',String(open))};
 chip.addEventListener('click',e=>{e.stopPropagation();setOpen(list.hidden)});
 document.addEventListener('click',e=>{if(!wrap.contains(e.target))setOpen(false)});
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!list.hidden){setOpen(false);chip.focus()}});

 // The station shown in the chip changes every few seconds (Ηράκλειο 2 → Αθήνα 1 → …).
 const station=chip.querySelector('.ekab-shift-station');let stations=[],turn=0,rotateTimer=null;
 const rotate=(advance=true)=>{
  clearTimeout(rotateTimer);if(!stations.length)return;
  if(advance)turn=(turn+1)%stations.length;else turn%=stations.length;
  station.classList.remove('ekab-shift-in');void station.offsetWidth;station.textContent=stations[turn];station.classList.add('ekab-shift-in');
  if(stations.length>1&&!document.hidden)rotateTimer=setTimeout(rotate,3500);
 };
 const render=data=>{
  if(!data||!Number.isFinite(data.total)||data.total<1){chip.hidden=true;setOpen(false);return}
  stations=(data.places||[]).map(([place,n])=>`${place} ${n}`);if(!stations.length)stations=[String(data.total)];
  rotate(false);
  const rows=(data.places||[]).map(([place,n])=>`<li><span>${place.replace(/[<>&]/g,'')}</span><b>${n}</b></li>`).join('');
  list.innerHTML=`<p>${data.total===1?'1 άτομο':data.total+' άτομα'} στην εφαρμογή τώρα</p><ul>${rows}</ul><small>Περιοχή από τη σύνδεση, χωρίς ονόματα.</small>`;
  const where=(data.places||[]).map(([place,n])=>`${place} ${n}`).join(', ');
  chip.setAttribute('aria-label',`${data.total} σε βάρδια τώρα${where?': '+where:''}`);chip.title=where;
  chip.hidden=false;
 };
 // The top bar is built by the page shell, sometimes after this script runs.
 const mount=()=>{const search=document.querySelector('.header-tools .global-search, .v6-global-topbar .v6-global-search');if(!search)return false;if(!wrap.isConnected)search.before(wrap);return true};
 if(!mount()){const mo=new MutationObserver(()=>{if(mount())mo.disconnect()});mo.observe(document.documentElement,{childList:true,subtree:true});setTimeout(()=>mo.disconnect(),15000)}
 // The home page rebuilds its top bar on navigation.
 window.addEventListener('ekab:home-ready',mount);window.addEventListener('hashchange',()=>setTimeout(mount,50));

 let timer=null;
 const send=body=>fetch(api,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body),keepalive:!!body.leave});
 const beat=async()=>{let data=null;try{const r=await send({id});if(r.ok)data=await r.json()}catch(_){}mount();render(data)};
 const schedule=()=>{clearTimeout(timer);if(!document.hidden)timer=setTimeout(()=>{beat();schedule()},45000)};
 beat();schedule();
 document.addEventListener('visibilitychange',()=>{if(document.hidden)clearTimeout(timer);else{beat();schedule()}});
 window.addEventListener('pagehide',()=>{clearTimeout(timer);send({id,leave:true}).catch(()=>{})});
})();
