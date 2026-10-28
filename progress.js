/* EKAB Σπουδή: local-first checkpoints; no network transmission of study data. */
(function(){'use strict';
 const QKEY='ekab-eoppep-official-v15',NOTES='ekab.personal-notes.v1',PREFIX='ekab.saek.read.v1.',DB='ekab-spoudi-private-backups',STORE='snapshots';
 let dbPromise=null,timer=null,busy=Promise.resolve(),lastSerialized='';
 function storageOK(){const key='__ekab_progress_storage_probe__';try{const previous=localStorage.getItem(key);localStorage.setItem(key,'1');if(localStorage.getItem(key)!=='1')return false;if(previous===null)localStorage.removeItem(key);else localStorage.setItem(key,previous);return true}catch{return false}}
 function entries(){let v={};try{for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);if(k===QKEY||k===NOTES||k.startsWith(PREFIX))v[k]=localStorage.getItem(k)}}catch(e){console.warn('Τοπική αποθήκευση μη διαθέσιμη',e)}return v}
 function openDb(){if(!('indexedDB'in window))return Promise.reject(new Error('IndexedDB μη διαθέσιμη'));if(!dbPromise){dbPromise=new Promise((resolve,reject)=>{const req=indexedDB.open(DB,1);req.onupgradeneeded=()=>req.result.createObjectStore(STORE);req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error||new Error('Δεν άνοιξε η βάση'))}).catch(e=>{dbPromise=null;throw e})}return dbPromise}
 async function getDb(key){const db=await openDb();return new Promise((resolve,reject)=>{const t=db.transaction(STORE,'readonly'),r=t.objectStore(STORE).get(key);r.onsuccess=()=>resolve(r.result||null);r.onerror=()=>reject(r.error||new Error('Σφάλμα ανάγνωσης'))})}
 async function putDb(data){const db=await openDb();return new Promise((resolve,reject)=>{const t=db.transaction(STORE,'readwrite'),os=t.objectStore(STORE);os.put(data,'latest');t.oncomplete=resolve;t.onerror=()=>reject(t.error||new Error('Σφάλμα αντιγράφου'));t.onabort=()=>reject(t.error||new Error('Ακύρωση αντιγράφου'))})}
 function validProgress(v){if(!v||typeof v!=='object'||Array.isArray(v))return false;if(JSON.stringify(v).length>6500000)return false;const keys=Object.keys(v);if(keys.length>500)return false;for(const [k,val] of Object.entries(v)){if(k===QKEY){if(typeof val!=='string'||val.length>5800000)return false;let parsed;try{parsed=JSON.parse(val)}catch{return false}if(!parsed||typeof parsed!=='object'||Array.isArray(parsed))return false;}else if(k===NOTES){if(typeof val!=='string'||val.length>4600000)return false;let notes;try{notes=JSON.parse(val)}catch{return false}if(!notes||typeof notes!=='object'||Array.isArray(notes)||Object.keys(notes).length>500)return false;
  for(const [id,n]of Object.entries(notes))if(!/^[a-f0-9]{32}$/.test(id)||!n||typeof n!=='object'||Array.isArray(n)||typeof n.title!=='string'||n.title.length>140||typeof n.body!=='string'||n.body.length>8000)return false;
 }else if(/^ekab\.saek\.read\.v1\.\d{2}\.\d{1,2}$/.test(k)){if(val!=='1'&&val!=='0')return false}else return false;}return true}
 async function persist(){if(!storageOK())throw new Error('Δεν υπάρχει πρόσβαση στην τοπική αποθήκευση.');const obj=entries(),data=JSON.stringify(obj);if(data===lastSerialized)return true;await putDb({at:new Date().toISOString(),schema:'ekab-progress-checkpoint-v1',items:obj});lastSerialized=data;return true}
 function notify(msg,problem){document.querySelectorAll('[data-save-status]').forEach(el=>{el.textContent=msg;el.dataset.problem=String(Boolean(problem))})}
 function checkpoint(){busy=busy.then(persist,persist).then(()=>{notify('Η πρόοδός σου αποθηκεύτηκε.');return true}).catch(e=>{console.warn('Αντίγραφο IndexedDB:',e);notify('Η πρόσθετη αποθήκευση απέτυχε — εξήγαγε αντίγραφο.',true);return false});return busy}
 function schedule(){clearTimeout(timer);timer=setTimeout(checkpoint,400)}
 async function flush(){clearTimeout(timer);timer=null;return checkpoint()}
 function bundle(){return{schema:'ekab-all-progress-v22',exportedAt:new Date().toISOString(),items:entries()}}
 function download(){if(!storageOK()){notify('Η τοπική αποθήκευση δεν είναι διαθέσιμη. Δεν δημιουργήθηκε κενό αντίγραφο.',true);return false}const data=bundle();const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='ekab-spoudi-progress-'+new Date().toISOString().slice(0,10)+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)}
 function apply(obj){if(!validProgress(obj))throw new Error('Το αρχείο προόδου δεν έχει έγκυρη μορφή.'); // Preserve unrelated localStorage entries and old keys.
  const existing=entries();for(const k of Object.keys(existing))if(!(k in obj)&&k!==NOTES)localStorage.removeItem(k);
  for(const [k,val]of Object.entries(obj))localStorage.setItem(k,val);
  lastSerialized='';return flush();}
 async function restoreFile(file){if(!file||file.size>7000000)throw new Error('Πολύ μεγάλο αρχείο');let data=JSON.parse(await file.text());if(data.schema!=='ekab-all-progress-v22'||!validProgress(data.items))throw new Error('Απαιτείται αντίγραφο EKAB Σπουδή v22.');if(!confirm('Θέλεις να επαναφέρεις την πρόοδο ΕΟΠΠΕΠ/ΣΑΕΚ και τις σημειώσεις που περιέχει αυτό το αντίγραφο;'))return false;await apply(data.items);location.reload();return true}
 async function recovery(){try{const old=await getDb('latest');if(!old||!validProgress(old.items))return;const now=entries(),hasNow=Object.values(now).some(v=>v&&v!=='{}'&&v!=='0'),hasOld=Object.values(old.items).some(v=>v&&v!=='{}'&&v!=='0');if(hasNow||!hasOld)return;const el=document.querySelector('#recoveryBanner');if(!el)return;el.hidden=false;el.querySelector('button').addEventListener('click',async()=>{if(confirm('Να επαναφέρεις το τοπικό αντίγραφο προόδου που βρέθηκε;')){await apply(old.items);location.reload()}})}catch(e){console.warn('Έλεγχος ανάκτησης',e)}}
 window.EkabProgress={flush,checkpoint,schedule,download,restoreFile,entries,recovery};
 window.addEventListener('ekab:progress-changed',schedule);
 window.addEventListener('pagehide',()=>{clearTimeout(timer);checkpoint()});
 document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden')flush()});
 document.addEventListener('click',event=>{
  if(event.target.closest('[data-export-all]'))download();
 });
 document.addEventListener('change',async event=>{
  const input=event.target.closest('[data-restore-all]');
  if(!input)return;
  try{const file=input.files?.[0];if(file)await restoreFile(file)}
  catch(err){alert('Αποτυχία επαναφοράς: '+err.message)}
  finally{input.value=''}
 });
 const init=()=>{recovery().finally(()=>{if(!storageOK()){notify('Η τοπική αποθήκευση προόδου δεν είναι διαθέσιμη.',true);return}notify('Αυτόματη αποθήκευση ενεργή.');const p=entries();if(Object.values(p).some(v=>v&&v!=='{}'&&v!=='0'))schedule()})};
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
 else init();
})();

/* SAEK hub and the shared SAEK reader already refresh their own counters safely. */
window.addEventListener('ekab:cloud-applied',()=>{window.EkabProgress?.schedule()});
