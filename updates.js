/* EKAB Σπουδή — safe, user-initiated PWA updates. */
(function(){'use strict';
const CURRENT='27.1.43', $=id=>document.getElementById(id);
let registration=null,remoteVersion=null,applying=false;
function show(message,actionable){const b=$('updateBanner'),d=$('updateDescription'),a=$('applyUpdate');if(!b||!d||!a)return;b.hidden=false;d.textContent=message;a.hidden=!actionable;a.disabled=false;}
function report(message){const e=$('updateCheckStatus');if(e)e.textContent=message;}
async function remote(){const response=await fetch('./version.json?nocache='+Date.now(),{cache:'no-store'});if(!response.ok)throw Error('HTTP '+response.status);const data=await response.json();if(!/^\d+\.\d+\.\d+$/.test(data.version||''))throw Error('invalid version');return data.version;}
function newer(a,b){const x=a.split('.').map(Number),y=b.split('.').map(Number);return x.some((v,i)=>v>y[i]&&x.slice(0,i).every((z,j)=>z===y[j]));}
async function check(){try{if(registration)await Promise.race([registration.update(),new Promise((_,reject)=>setTimeout(()=>reject(Error('timeout')),10000))]);remoteVersion=await remote();report('Τρέχουσα έκδοση: v'+CURRENT+' · Διαθέσιμη: v'+remoteVersion);if(newer(remoteVersion,CURRENT))show('Διαθέσιμη ενημέρωση v'+remoteVersion+'. Πάτησε «Ενημέρωση τώρα».',true);else{$('updateBanner')?.setAttribute('hidden','');report('Έχεις την τελευταία έκδοση: v'+CURRENT+'.')}}catch(e){report('Έκδοση v'+CURRENT+' · Ο έλεγχος απέτυχε. Δοκίμασε ξανά με internet.');}}
async function apply(){if(applying)return;applying=true;const b=$('applyUpdate'),d=$('updateDescription');b.disabled=true;d.textContent='Προετοιμασία ενημέρωσης…';try{
if(!registration&&'serviceWorker'in navigator)registration=await navigator.serviceWorker.getRegistration('./');
if(registration){await Promise.race([registration.update(),new Promise((_,reject)=>setTimeout(()=>reject(Error('timeout')),10000))]);}
if(registration?.waiting){d.textContent='Ενεργοποίηση νέας έκδοσης…';registration.waiting.postMessage({type:'SKIP_WAITING'});await Promise.race([new Promise(resolve=>navigator.serviceWorker.addEventListener('controllerchange',resolve,{once:true})),new Promise(resolve=>setTimeout(resolve,4500))]);}
d.textContent='Ανανέωση εφαρμογής…';location.replace('./index.html?refresh='+Date.now());
}catch(e){d.textContent='Η ενημέρωση δεν ολοκληρώθηκε. Η πρόοδός σου παραμένει στη συσκευή. Δοκίμασε ξανά.';b.disabled=false;applying=false;}}
async function start(){
const theme=$('themeToggle');if(theme){const sync=()=>{const dark=document.documentElement.dataset.theme==='dark';theme.setAttribute('aria-label',dark?'Ενεργοποίηση φωτεινού θέματος':'Ενεργοποίηση σκοτεινού θέματος');theme.setAttribute('title',dark?'Φωτεινό θέμα':'Σκούρο θέμα');theme.setAttribute('aria-pressed',String(dark));document.querySelector('meta[name="theme-color"]')?.setAttribute('content',dark?'#0c1a29':'#153c54')};theme.onclick=()=>{const next=document.documentElement.dataset.theme==='dark'?'light':'dark';document.documentElement.dataset.theme=next;try{localStorage.setItem('ekab.theme.v1',next)}catch{}sync()};sync();}
if($('currentAppVersion'))$('currentAppVersion').textContent='v'+CURRENT;if($('footerAppVersion'))$('footerAppVersion').textContent='v'+CURRENT;
$('checkAppUpdates')?.addEventListener('click',check);$('applyUpdate')?.addEventListener('click',apply);$('dismissUpdate')?.addEventListener('click',()=>{$('updateBanner').hidden=true});
if(!('serviceWorker'in navigator)||location.protocol==='file:'){report('Έκδοση v'+CURRENT+' · Ο offline μηχανισμός δεν υποστηρίζεται εδώ.');return}
try{registration=await navigator.serviceWorker.register('./sw.js',{updateViaCache:'none'});navigator.serviceWorker.addEventListener('controllerchange',()=>{if(applying)return;location.reload()});registration.addEventListener('updatefound',()=>{const worker=registration.installing;if(worker)worker.addEventListener('statechange',()=>{if(worker.state==='installed'&&navigator.serviceWorker.controller)check()})});await check();window.addEventListener('online',check);document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')check()})}catch(e){report('Έκδοση v'+CURRENT+' · Αδυναμία εγγραφής ενημερώσεων.');}}
window.EkabUpdates={check};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
})();
// Optional cloud setup never blocks the local app or update controls.
import(new URL('./appwrite-client.js?app=27.1.38', document.currentScript.src).href)
  .then(async ({ startAppwrite }) => {
    try { const { initAccountUI } = await import(new URL('./account-ui.js?app=27.1.38', new URL('./appwrite-client.js?app=27.1.38', document.baseURI)).href); initAccountUI(); }
    finally { startAppwrite(); }
  })
  .catch(() => {
    document.querySelectorAll('[data-appwrite-status]').forEach(el => {
      el.textContent = 'Appwrite: μη διαθέσιμο. Η μελέτη συνεχίζεται τοπικά.';
    });
  });

/* Shared lightweight navigation and first-visit guidance; independent of user data. */
(function(){
 if(document.querySelector('script[data-ekab-first-run]'))return;
 const s=document.createElement('script');
 s.src=new URL('./ekab-first-run.js',document.currentScript?.src||document.baseURI).href;
 s.dataset.ekabFirstRun='1';
 s.defer=true;
 document.head.appendChild(s);
})();
