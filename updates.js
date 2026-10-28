/* EKAB Σπουδή — safe, user-initiated PWA updates. */
(function(){'use strict';
const CURRENT='27.1.117', $=id=>document.getElementById(id);
let registration=null,remoteVersion=null,applying=false;
const CHECK_INTERVAL_MS=60000;let lastNotice='';

/* Shared tools load across public pages without duplicating headers or altering saved progress. */
if(!document.querySelector('link[data-ekab-global-tools]')){
 const style=document.createElement('link');style.rel='stylesheet';style.href='global-tools.css?v=27.1.86';style.dataset.ekabGlobalTools='';document.head.append(style);
}
if(!document.querySelector('script[data-ekab-global-tools]')){
 const script=document.createElement('script');script.src='global-tools.js?v=27.1.97';script.dataset.ekabGlobalTools='';document.head.append(script);
}

/* Independent floating notebook: private notes and SOS only, never global search. */
if(!document.querySelector('script[data-ekab-notes-panel]')){
 const css=document.createElement('link');css.rel='stylesheet';css.href='notes-panel.css?v=27.1.117';css.dataset.ekabNotesPanel='css';document.head.append(css);
 const script=document.createElement('script');script.type='module';script.src='notes-panel.js?v=27.1.117';
 script.dataset.ekabNotesPanel='js';document.head.append(script);
}

/* Focus-aware time recording runs only on educational pages. */
if(!document.querySelector('script[data-ekab-activity-time]')){
 const s=document.createElement('script');s.src='activity-time.js?v=27.1.105';
 s.defer=true;s.dataset.ekabActivityTime='1';document.head.append(s);
}

/* Ensure progress export/restore is available from Account on every page. */
if(!window.EkabProgress && !Array.from(document.scripts).some(node=>node.src.includes('/progress.js'))){
 const progressScript=document.createElement('script');
 progressScript.src='progress.js?v=27.1.83';
 progressScript.dataset.ekabSharedProgress='1';
 document.head.append(progressScript);
}

function show(message,actionable){const b=$('updateBanner'),d=$('updateDescription'),a=$('applyUpdate');if(!b||!d||!a)return;b.hidden=false;d.textContent=message;a.hidden=!actionable;a.disabled=false;if(actionable&&lastNotice!==message){lastNotice=message;b.scrollIntoView?.({block:'nearest',behavior:'smooth'});}}
function report(message){const e=$('updateCheckStatus');if(e)e.textContent=message;}
async function remote(){const response=await fetch('./version.json?nocache='+Date.now(),{cache:'no-store'});if(!response.ok)throw Error('HTTP '+response.status);const data=await response.json();if(!/^\d+\.\d+\.\d+$/.test(data.version||''))throw Error('invalid version');return data.version;}
function newer(a,b){const x=a.split('.').map(Number),y=b.split('.').map(Number);return x.some((v,i)=>v>y[i]&&x.slice(0,i).every((z,j)=>z===y[j]));}
async function check(){try{if(registration)await Promise.race([registration.update(),new Promise((_,reject)=>setTimeout(()=>reject(Error('timeout')),10000))]);remoteVersion=await remote();report('Τρέχουσα έκδοση: v'+CURRENT+' · Διαθέσιμη: v'+remoteVersion);if(newer(remoteVersion,CURRENT))show('Νέα έκδοση v'+remoteVersion+' διαθέσιμη για λήψη. Πάτησε «Ενημέρωση τώρα».',true);else{$('updateBanner')?.setAttribute('hidden','');report('Έχεις την τελευταία έκδοση: v'+CURRENT+'.')}}catch(e){report('Έκδοση v'+CURRENT+' · Ο έλεγχος απέτυχε. Δοκίμασε ξανά με internet.');}}
async function apply(){if(applying)return;applying=true;const b=$('applyUpdate'),d=$('updateDescription');b.disabled=true;d.textContent='Προετοιμασία ενημέρωσης…';try{
if(!registration&&'serviceWorker'in navigator)registration=await navigator.serviceWorker.getRegistration('./');
if(registration){await Promise.race([registration.update(),new Promise((_,reject)=>setTimeout(()=>reject(Error('timeout')),10000))]);}
if(registration?.waiting){d.textContent='Ενεργοποίηση νέας έκδοσης…';registration.waiting.postMessage({type:'SKIP_WAITING'});await Promise.race([new Promise(resolve=>navigator.serviceWorker.addEventListener('controllerchange',resolve,{once:true})),new Promise(resolve=>setTimeout(resolve,4500))]);}
d.textContent='Ανανέωση εφαρμογής…';location.replace('./index.html?refresh='+Date.now());
}catch(e){d.textContent='Η ενημέρωση δεν ολοκληρώθηκε. Η πρόοδός σου παραμένει στη συσκευή. Δοκίμασε ξανά.';b.disabled=false;applying=false;}}
/* Render the live app version beside the EKAB Spoudi brand on every page. */
function showBrandVersion(){
 const heading=document.querySelector('header.top .brand h1');
 if(!heading)return;
 let version=heading.querySelector('.brand-version');
 if(!version){
  version=document.createElement('span');
  version.className='brand-version';
  heading.append(' ',version);
 }
 version.textContent='v'+CURRENT;
 version.title='Έκδοση εφαρμογής v'+CURRENT;
 version.setAttribute('aria-label','Έκδοση εφαρμογής v'+CURRENT);
}
async function start(){
showBrandVersion();
const theme=$('themeToggle');if(theme){const sync=()=>{const dark=document.documentElement.dataset.theme==='dark';theme.setAttribute('aria-label',dark?'Ενεργοποίηση φωτεινού θέματος':'Ενεργοποίηση σκοτεινού θέματος');theme.setAttribute('title',dark?'Φωτεινό θέμα':'Σκούρο θέμα');theme.setAttribute('aria-pressed',String(dark));document.querySelector('meta[name="theme-color"]')?.setAttribute('content',dark?'#0c1a29':'#153c54')};theme.onclick=()=>{const next=document.documentElement.dataset.theme==='dark'?'light':'dark';document.documentElement.dataset.theme=next;try{localStorage.setItem('ekab.theme.v1',next);window.dispatchEvent(new Event('ekab:progress-changed'))}catch{}sync()};sync();window.addEventListener('ekab:cloud-applied',sync);}
if($('currentAppVersion'))$('currentAppVersion').textContent='v'+CURRENT;if($('footerAppVersion'))$('footerAppVersion').textContent='v'+CURRENT;
document.addEventListener('click',event=>{
  if(event.target.closest('#checkAppUpdates'))check();
});$('applyUpdate')?.addEventListener('click',apply);$('dismissUpdate')?.addEventListener('click',()=>{$('updateBanner').hidden=true});
if(!('serviceWorker'in navigator)||location.protocol==='file:'){report('Έκδοση v'+CURRENT+' · Ο offline μηχανισμός δεν υποστηρίζεται εδώ.');return}
try{registration=await navigator.serviceWorker.register('./sw.js',{updateViaCache:'none'});navigator.serviceWorker.addEventListener('controllerchange',()=>{if(applying)return;location.reload()});registration.addEventListener('updatefound',()=>{const worker=registration.installing;if(worker)worker.addEventListener('statechange',()=>{if(worker.state==='installed'&&navigator.serviceWorker.controller)check()})});await check();window.addEventListener('online',check);setInterval(()=>{if(document.visibilityState==='visible')check()},CHECK_INTERVAL_MS);document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')check()})}catch(e){report('Έκδοση v'+CURRENT+' · Αδυναμία εγγραφής ενημερώσεων.');}}
window.EkabUpdates={check,version:CURRENT};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
})();
// Optional cloud setup never blocks the local app or update controls.
import(new URL('./appwrite-client.js?app=27.1.73', document.baseURI).href)
  .then(async ({ startAppwrite }) => {
    try { const { initAccountUI } = await import(new URL('./account-ui.js?app=richer-sync-27.1.105', new URL('./appwrite-client.js?app=27.1.73', document.baseURI)).href); initAccountUI(); }
    finally { startAppwrite(); }
  })
  .catch(() => {
    const trigger=document.querySelector('[data-account-open]');if(trigger){trigger.disabled=false;trigger.addEventListener('click',()=>{alert('Η σύνδεση δεν φορτώθηκε. Ανανέωσε τη σελίδα με ενεργό internet. Η τοπική πρόοδος δεν επηρεάζεται.')},{once:false})}
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


/* EKAB-SAEK-VIDEO-AUTOLOADER
 * Enable the shared video → written-chapter navigation in every SAEK course.
 * New lessons need only a valid course/part entry in saek-videos.js, never page edits.
 * Courses with explicit player script tags are left alone to avoid duplicate players.
 */
(function(){
 'use strict';
 function install(){
  if(!/\/saek-course-\d{2}\.html$/.test(location.pathname))return;
  if(document.querySelector('script[src*="saek-course-series.js"]'))return;
  const stylesheet=document.createElement('link');
  stylesheet.rel='stylesheet';
  stylesheet.href=new URL('./saek-course-series.css?v=27.1.90',document.baseURI).href;
  stylesheet.dataset.saekSeriesAuto='css';
  document.head.append(stylesheet);

  const config=document.createElement('script');
  config.src=new URL('./saek-videos.js?v=27.1.90',document.baseURI).href;
  config.dataset.saekSeriesAuto='config';
  config.onload=()=>{
   if(document.querySelector('script[src*="saek-course-series.js"]'))return;
   const player=document.createElement('script');
   player.src=new URL('./saek-course-series.js?v=27.1.90',document.baseURI).href;
   player.dataset.saekSeriesAuto='player';
   document.body.append(player);
  };
  document.body.append(config);
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});
 else install();
})();

/* Shared back button, mobile edge swipe and replacement user guide. */
if(!document.querySelector('script[data-ekab-navigation]')){
 const css=document.createElement('link');css.rel='stylesheet';css.href='navigation.css?v=3';document.head.append(css);
 const script=document.createElement('script');script.src='navigation.js?v=3';script.defer=true;script.dataset.ekabNavigation='';document.head.append(script);
}

/* Classroom image presentation mode. */
if(!document.querySelector('script[data-ekab-classroom-images]')){const s=document.createElement('script');s.src='classroom-images.js?v=2';s.defer=true;s.dataset.ekabClassroomImages='';document.head.append(s)}
