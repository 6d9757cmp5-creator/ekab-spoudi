import { client } from './appwrite-client.js?app=27.1.68';
import { Account } from './vendor/appwrite-29.1.0/account.js';
import { Storage } from './vendor/appwrite-29.1.0/storage.js';
import { Query } from './vendor/appwrite-29.1.0/client.js';
import { SCHEMA, stable, validValue, captureEdits, mergeEntries, visibleEntries, validateManifest } from './sync-model.js';
import { readState, saveState, allPdfs, readLocalValues, checkpoint, applyValues, applyPdfs, latestRecovery } from './sync-local.js';
import { encodeState, decodeState } from './sync-codec.js?app=27.1.68';

export const BUCKET='6ade94d200192fabecef';
const MAX_FILE=50000000,MAX_STATE=20000000;
const storage=new Storage(client),account=new Account(client);
const randomId=()=>crypto.randomUUID().replaceAll('-','');
const hash=async blob=>[...new Uint8Array(await crypto.subtle.digest('SHA-256',await blob.arrayBuffer()))].map(x=>x.toString(16).padStart(2,'0')).join('');
const nameFor=device=>'ekab-state-'+device+'.json';
function privatePermissions(userId){return ['read','update','delete'].map(x=>`${x}("user:${userId}")`);}
function privateTo(file,userId){return stable([...(file.$permissions||[])].sort())===stable(privatePermissions(userId).sort());}
async function binary(fileId){return client.call('GET',new URL(storage.getFileDownload({bucketId:BUCKET,fileId})),{'X-Appwrite-Project':client.config.project},{},'arrayBuffer');}
async function listStates(userId){
  const files=[];let after;
  for(let page=0;page<20;page++){
    const queries=[Query.startsWith('name','ekab-state-'),Query.limit(100),Query.orderDesc('$createdAt')];if(after)queries.push(Query.cursorAfter(after));
    const result=await storage.listFiles({bucketId:BUCKET,queries});files.push(...result.files.filter(f=>privateTo(f,userId)&&/^ekab-state-[a-f0-9]{32}\.json$/.test(f.name)));
    if(result.files.length<100)return files;after=result.files.at(-1).$id;
  }
  throw new Error('too-many-snapshots');
}
export async function initCloudSync({user,status,enableButton,nowButton,pauseButton,recoverButton}) {
  const userId=user.$id;
  let state=await readState(userId),stopped=false,busy=false,timer,poll,applying=false,failures=0;
  let device=localStorage.getItem('ekab.sync.device.v1');if(!/^[a-f0-9]{32}$/.test(device||'')){device=randomId();localStorage.setItem('ekab.sync.device.v1',device);}
  const owner=()=>localStorage.getItem('ekab.sync.owner.v1');
  const say=(message,kind='pending')=>{status.textContent=message;status.dataset.syncState=kind;document.querySelectorAll('[data-sync-summary]').forEach(e=>{e.textContent=message;e.dataset.syncState=kind;});document.querySelectorAll('[data-account-open]').forEach(e=>{e.dataset.syncState=kind;e.title=message;});};
  const active=()=>!stopped&&state.enabled&&owner()===userId;
  function controls(){enableButton.hidden=active();nowButton.hidden=!active();pauseButton.hidden=!active();recoverButton.hidden=false;}
  function schedule(delay=4000){if(!active()||applying)return;clearTimeout(timer);timer=setTimeout(()=>run(),delay);}
  async function identity(){if(!active())throw new Error('sync-stopped');const current=await account.get();if(!active()||current.$id!==userId)throw new Error('account-changed');}
  async function capture(){
    const view=readLocalValues(),pdfs=await allPdfs();
    for(const item of pdfs){
      if(!(item.blob instanceof Blob)||item.blob.size>MAX_FILE)throw new Error('pdf-too-large:'+item.name);
      if(new TextDecoder().decode(await item.blob.slice(0,5).arrayBuffer())!=='%PDF-')throw new Error('invalid-local-data');
      const key='p:'+item.id,stamp=item.blob.size+':'+item.created;
      let cached=state.hashes[item.id];if(!cached||cached.stamp!==stamp)cached={stamp,hash:await hash(item.blob)};
      const previous=state.entries[key]?.v;
      if(!cached.fileId&&previous?.hash===cached.hash)cached.fileId=previous.fileId;
      if(!cached.fileId){
        await identity();const id=randomId();
        await storage.createFile({bucketId:BUCKET,fileId:id,file:new File([item.blob],'ekab-pdf-'+item.id+'.pdf',{type:'application/pdf'}),permissions:privatePermissions(userId)});
        cached.fileId=id;state.hashes[item.id]=cached;await saveState(userId,state);
      }
      state.hashes[item.id]=cached;
      view[key]={name:item.name,semester:item.semester,course:item.course,created:item.created,size:item.blob.size,hash:cached.hash,fileId:cached.fileId};
    }
    for(const [k,v]of Object.entries(view))if(!validValue(k,v))throw new Error('invalid-local-data');
    return {view,pdfs};
  }
  async function light(){const pdfs=await allPdfs();return stable({values:readLocalValues(),pdfs:pdfs.map(x=>({id:x.id,name:x.name,semester:x.semester,course:x.course,created:x.created,size:x.blob.size})).sort((a,b)=>a.id.localeCompare(b.id))});}
  async function doRun(){
    if(!active())return;
    if(navigator.onLine===false){say('Εκτός σύνδεσης — οι αλλαγές μένουν στη συσκευή και θα σταλούν όταν επιστρέψει το internet.');return;}
    if(/^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName||'')||document.activeElement?.isContentEditable){say('Οι αλλαγές αποθηκεύονται τοπικά. Ο συγχρονισμός περιμένει να ολοκληρώσεις την επεξεργασία.');schedule(10000);return;}
    say('Συγχρονισμός σε εξέλιξη…','working');
    await identity();state=await readState(userId);if(!state.enabled||owner()!==userId)return;
    const local=await capture(),start=await light();
    state.entries=captureEdits(state.entries,state.view,local.view,device);state.view=local.view;
    await saveState(userId,state); // Durable offline outbox before any download/apply.
    const files=await listStates(userId),latest=new Map();
    for(const f of files)if(!latest.has(f.name))latest.set(f.name,f);
    let merged=state.entries;
    for(const file of latest.values()){
      let data=state.remote[file.$id];
      if(!data){if(file.sizeOriginal>MAX_STATE)throw new Error('invalid-cloud-data');const raw=await binary(file.$id);data=validateManifest(await decodeState(raw),userId);if(file.name!==nameFor(data.device))throw new Error('invalid-cloud-data');state.remote[file.$id]=data;}
      merged=mergeEntries(merged,data.entries);
    }
    validateManifest({schema:SCHEMA,userId,device,entries:merged},userId);
    if(new Blob([JSON.stringify(merged)]).size>MAX_STATE-1000)throw new Error('state-too-large');
    const visible=visibleEntries(merged),blobs=new Map();
    for(const [key,v]of Object.entries(visible))if(key.startsWith('p:')){
      const existing=local.pdfs.find(x=>'p:'+x.id===key);
      if(existing&&state.hashes[existing.id]?.hash===v.hash){blobs.set(key,existing.blob);continue;}
      const meta=await storage.getFile({bucketId:BUCKET,fileId:v.fileId});
      if(!privateTo(meta,userId)||meta.sizeOriginal>MAX_FILE||meta.sizeOriginal!==v.size)throw new Error('invalid-cloud-data');
      const raw=await binary(v.fileId);if(!(raw instanceof ArrayBuffer))throw new Error('invalid-cloud-data');const blob=new Blob([raw],{type:'application/pdf'});
      if(await hash(blob)!==v.hash||new TextDecoder().decode(await blob.slice(0,5).arrayBuffer())!=='%PDF-')throw new Error('invalid-cloud-data');blobs.set(key,blob);
    }
    await identity();if(stopped||await light()!==start){say('Υπάρχουν νέες τοπικές αλλαγές — επανάληψη συγχρονισμού.');schedule(4000);return;}
    if(stable(local.view)!==stable(visible)){
      await checkpoint(userId); // Stop if a recovery copy cannot be stored.
      if(await light()!==start){schedule();return;}
      applying=true;
      try{applyValues(visible);await applyPdfs(visible,blobs);}finally{applying=false;}
    }
    await identity();state.entries=merged;state.view=visible;
    for(const [key,v]of Object.entries(visible))if(key.startsWith('p:'))state.hashes[key.slice(2)]={stamp:v.size+':'+v.created,hash:v.hash,fileId:v.fileId};
    state.remote=Object.fromEntries(Object.entries(state.remote).filter(([id])=>[...latest.values()].some(f=>f.$id===id)));
    await saveState(userId,state);
    const own=latest.get(nameFor(device)),previous=own&&state.remote[own.$id];
    if(!previous||stable(previous.entries)!==stable(merged)){
      const data={schema:SCHEMA,userId,device,entries:merged};validateManifest(data,userId);
      const file=new File([await encodeState(data)],nameFor(device),{type:'application/json'});if(file.size>MAX_STATE)throw new Error('state-too-large');
      await identity();
      const created=await storage.createFile({bucketId:BUCKET,fileId:randomId(),file,permissions:privatePermissions(userId)});
      if(!privateTo(created,userId))throw new Error('invalid-cloud-data');
      state.remote[created.$id]=data;state.lastSuccess=Date.now();await saveState(userId,state);
      // Only retire older revisions written by this device, after a complete new upload.
      const older=files.filter(f=>f.name===nameFor(device));for(const f of older.slice(1))await storage.deleteFile({bucketId:BUCKET,fileId:f.$id});
      // A replicated tombstone removes the cloud binary only when no live record uses it.
      const live=new Set(Object.entries(visible).filter(([k])=>k.startsWith('p:')).map(([,v])=>v.fileId));
      for(const id of new Set(Object.values(merged).flatMap(e=>e.retired||[])))if(!live.has(id)){try{await storage.deleteFile({bucketId:BUCKET,fileId:id})}catch(e){if(e.code!==404)throw e;}}
    }
    failures=0;
    // Changes during upload remain a durable pending outbox; never label them uploaded.
    const current=readLocalValues();const expected=Object.fromEntries(Object.entries(visible).filter(([k])=>!k.startsWith('p:')));
    if(stable(current)!==stable(expected)){say('Οι νέες αλλαγές περιμένουν αποστολή.');schedule();return;}
    say('Συγχρονίστηκε: ΣΑΕΚ, ΕΟΠΠΕΠ, σεμινάρια, σημειώσεις, PDF και ρυθμίσεις · '+new Date().toLocaleTimeString('el-GR',{hour:'2-digit',minute:'2-digit'}),'synced');
  }
  async function run(){
    if(busy||!active())return;busy=true;nowButton.disabled=true;
    try{
      if(!navigator.locks)throw new Error('locks-unavailable');
      await navigator.locks.request('ekab-cloud-sync-'+userId,async()=>{if(active())await doRun()});
    }catch(e){
      if(!active())return;
      failures++;
      if(e.message?.startsWith('pdf-too-large:'))say('Δεν ολοκληρώθηκε: το PDF «'+e.message.slice(14)+'» υπερβαίνει το δωρεάν όριο 50 MB. Τα δεδομένα σου παραμένουν τοπικά.','error');
      else if(e.code===401||e.message==='account-changed')say('Χρειάζεται νέα σύνδεση Google. Οι τοπικές αλλαγές διατηρούνται.','error');
      else if(e.message==='locks-unavailable'||e.message==='compression-unavailable')say('Χρειάζεται ενημερωμένος browser για ασφαλή συγχρονισμό και ανάγνωση συμπιεσμένων αντιγράφων. Τα δεδομένα παραμένουν τοπικά.','error');
      else say('Ο συγχρονισμός δεν ολοκληρώθηκε. Οι αλλαγές παραμένουν τοπικά. Έλεγξε το internet ή τα δωρεάν όρια και δοκίμασε ξανά.','error');
      schedule(Math.min(900000,30000*2**Math.min(failures,5)));
    }finally{busy=false;nowButton.disabled=false;}
  }
  async function enable(){
    if(owner()&&owner()!==userId&&!confirm('Τα τοπικά δεδομένα συνδέθηκαν προηγουμένως με άλλον λογαριασμό. Θέλεις ρητά να συγχωνευθούν σε ΑΥΤΟΝ τον λογαριασμό;'))return;
    await checkpoint(userId);localStorage.setItem('ekab.sync.owner.v1',userId);state.enabled=true;await saveState(userId,state);controls();schedule(0);
  }
  enableButton.addEventListener('click',()=>enable().catch(()=>say('Δεν δημιουργήθηκε τοπικό αντίγραφο ασφαλείας. Ο συγχρονισμός δεν ξεκίνησε.','error')));
  nowButton.addEventListener('click',()=>run());
  pauseButton.addEventListener('click',async()=>{state.enabled=false;await saveState(userId,state);clearTimeout(timer);controls();say('Ο συγχρονισμός έχει παύσει σε αυτή τη συσκευή. Τα δεδομένα διατηρούνται.');});
  recoverButton.addEventListener('click',async()=>{
    const recovery=await latestRecovery(userId);if(!recovery)return say('Δεν υπάρχει ακόμη τοπικό αντίγραφο πριν από συγχρονισμό.');
    if(!confirm('Να επανέλθει το τελευταίο τοπικό αντίγραφο ΠΡΙΝ από συγχρονισμό; Ο συγχρονισμός θα παύσει σε αυτή τη συσκευή.'))return;
    state.enabled=false;await saveState(userId,state);clearTimeout(timer);await checkpoint(userId);applyValues(recovery.values);await applyPdfs(Object.fromEntries(recovery.pdfs.map(x=>['p:'+x.id,x])),new Map(recovery.pdfs.map(x=>['p:'+x.id,x.blob])));controls();say('Επαναφέρθηκε το τοπικό αντίγραφο. Ο συγχρονισμός είναι σε παύση.');
  });
  const changed=()=>schedule();window.addEventListener('ekab:progress-changed',changed);window.addEventListener('ekab:pdf-changed',changed);window.addEventListener('storage',changed);window.addEventListener('online',changed);document.addEventListener('focusout',changed);document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')schedule(0)});
  poll=setInterval(()=>{if(document.visibilityState==='visible')schedule(0)},60000);
  controls();if(active())schedule(0);else say(owner()&&owner()!==userId?'Αυτός είναι άλλος λογαριασμός. Δεν ανεβαίνουν αυτόματα τα τοπικά δεδομένα.':'Ενεργοποίησε σε αυτή τη συσκευή για συγχώνευση προόδου ΕΟΠΠΕΠ/ΣΑΕΚ/σεμιναρίων, σημειώσεων, PDF και ρυθμίσεων στον δικό σου λογαριασμό.');
  return {enable,run,stop(){stopped=true;clearTimeout(timer);clearInterval(poll);window.removeEventListener('ekab:progress-changed',changed);window.removeEventListener('ekab:pdf-changed',changed);window.removeEventListener('storage',changed);window.removeEventListener('online',changed);document.removeEventListener('focusout',changed);say('Χωρίς ενεργή σύνδεση. Τα δεδομένα παραμένουν στη συσκευή.');}};
}
