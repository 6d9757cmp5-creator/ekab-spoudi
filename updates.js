/* PWA update lifecycle: detect automatically, apply only after user approval and checkpoint. */
(function(){'use strict';
 const CURRENT='27.1.10';let reg=null,changed=false,prompted=false;
 const $=id=>document.getElementById(id);
 function display(msg,showButton){const box=$('updateBanner');if(!box)return;box.hidden=false;$('updateDescription').textContent=msg;$('applyUpdate').hidden=!showButton;}
 async function detect(){try{if(reg)await reg.update();if(reg.waiting&&navigator.serviceWorker.controller){prompted=true;display('Νέα έκδοση διαθέσιμη. Η πρόοδός σου θα αποθηκευτεί πριν εφαρμοστεί.',true);return}const r=await fetch('./version.json?v='+Date.now(),{cache:'no-store'});if(!r.ok)return;const j=await r.json();if(j.version!==CURRENT&&navigator.serviceWorker.controller)display('Εντοπίστηκε νέα έκδοση '+j.version+'. Ολοκληρώνεται η λήψη...',false)}catch(e){/* Offline: keep running installed app */}}
 async function apply(){const btn=$('applyUpdate');if(!btn)return;btn.disabled=true;const desc=$('updateDescription');desc.textContent='Αποθήκευση προόδου πριν από την ενημέρωση...';try{const good=await window.EkabProgress.flush();if(!good){desc.textContent='Δεν ολοκληρώθηκε το πρόσθετο αντίγραφο. Χρησιμοποίησε «Εξαγωγή προόδου» και δοκίμασε ξανά.';btn.disabled=false;return} // localStorage keys stay untouched by service worker updates.
  if(reg?.waiting){const worker=reg.waiting;worker.postMessage({type:'SKIP_WAITING'});return}
  await detect();desc.textContent='Δεν έχει ολοκληρωθεί η λήψη της έκδοσης. Δοκίμασε ξανά όταν έχεις σύνδεση.';btn.disabled=false;
 }catch(e){desc.textContent='Η ενημέρωση δεν εφαρμόστηκε. Η πρόοδος παραμένει αποθηκευμένη.';btn.disabled=false}}
 async function start(){const theme=$('themeToggle');if(theme){const updateTheme=()=>{let dark=document.documentElement.dataset.theme==='dark';theme.setAttribute('aria-label',dark?'Ενεργοποίηση φωτεινού θέματος':'Ενεργοποίηση σκοτεινού θέματος');theme.setAttribute('title',dark?'Φωτεινό θέμα':'Σκούρο θέμα');theme.setAttribute('aria-pressed',String(dark));document.querySelector('meta[name="theme-color"]')?.setAttribute('content',dark?'#0c1a29':'#153c54')};theme.onclick=()=>{let next=document.documentElement.dataset.theme==='dark'?'light':'dark';document.documentElement.dataset.theme=next;try{localStorage.setItem('ekab.theme.v1',next)}catch{}updateTheme()};updateTheme()}
  if($('currentAppVersion'))$('currentAppVersion').textContent='v'+CURRENT;
  if($('footerAppVersion'))$('footerAppVersion').textContent='v'+CURRENT;
  $('checkAppUpdates')?.addEventListener('click',checkVisible);
  $('applyUpdate')?.addEventListener('click',apply);$('dismissUpdate')?.addEventListener('click',()=>{$('updateBanner').hidden=true});
  if(!('serviceWorker'in navigator)||location.protocol==='file:')return;
  try{reg=await navigator.serviceWorker.register('./sw.js',{updateViaCache:'none'});navigator.serviceWorker.addEventListener('controllerchange',()=>{if(changed)return;changed=true;window.location.reload()});
    if(reg.waiting&&navigator.serviceWorker.controller)display('Νέα έκδοση διαθέσιμη.',true);
    reg.addEventListener('updatefound',()=>{let w=reg.installing;if(!w)return;w.addEventListener('statechange',()=>{if(w.state==='installed'&&navigator.serviceWorker.controller){prompted=true;display('Μια νέα έκδοση είναι έτοιμη. Ενημέρωσε όταν θέλεις.',true)}})});
    detect();window.addEventListener('online',detect);window.addEventListener('focus',detect);document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')detect()});setInterval(detect,30*60*1000);
  }catch(e){console.warn('Η ενημέρωση PWA δεν είναι διαθέσιμη',e)}
 }
 async function checkVisible(){const out=$('updateCheckStatus');if(out)out.textContent='Έλεγχος έκδοσης v'+CURRENT+'…';try{if(reg)await reg.update();const r=await fetch('./version.json?check='+Date.now(),{cache:'no-store'});if(!r.ok)throw Error('Αδυναμία λήψης έκδοσης');const j=await r.json();if(!j.version)throw Error('Μη έγκυρη απάντηση');if(out)out.textContent=j.version===CURRENT?'Έχεις την τελευταία έκδοση: v'+CURRENT+'.':'Εγκατεστημένη: v'+CURRENT+' · Διαθέσιμη: v'+j.version+'.';if(j.version!==CURRENT)await detect()}catch(e){if(out)out.textContent='Τρέχουσα έκδοση: v'+CURRENT+'. Δεν ήταν δυνατός ο διαδικτυακός έλεγχος.'}}
 window.EkabUpdates={check:checkVisible};
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
})();
