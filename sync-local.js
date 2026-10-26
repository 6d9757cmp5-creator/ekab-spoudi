export const QKEY='ekab-eoppep-official-v15';
let syncDb, pdfDb;
function open(name, stores) {
  return new Promise((resolve,reject)=>{const r=indexedDB.open(name,1);r.onupgradeneeded=()=>{for(const [key,options]of stores)if(!r.result.objectStoreNames.contains(key))r.result.createObjectStore(key,options)};r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});
}
async function db() { return syncDb ||= await open('ekab-cloud-sync-v1',[['state'],['backups']]); }
async function pdf() { return pdfDb ||= await open('ekab-personal-pdf-v1',[['documents',{keyPath:'id'}]]); }
export async function readState(userId) {
  const d=await db();return new Promise((resolve,reject)=>{const r=d.transaction('state').objectStore('state').get(userId);r.onsuccess=()=>resolve(r.result||{entries:{},view:{},hashes:{},remote:{},enabled:false});r.onerror=()=>reject(r.error)});
}
export async function saveState(userId,value) {
  const d=await db();return new Promise((resolve,reject)=>{const t=d.transaction('state','readwrite');t.objectStore('state').put(value,userId);t.oncomplete=resolve;t.onerror=()=>reject(t.error);t.onabort=()=>reject(t.error)});
}
export async function allPdfs() {
  const d=await pdf();return new Promise((resolve,reject)=>{const r=d.transaction('documents').objectStore('documents').getAll();r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)});
}
export function readLocalValues() {
  const values={};
  const raw=localStorage.getItem(QKEY);const questions=raw?JSON.parse(raw):{};
  if(!questions||typeof questions!=='object'||Array.isArray(questions))throw new Error('invalid-local-data');
  for(const [id,q]of Object.entries(questions))for(const field of ['seen','weak','selfCorrect','selfAttempts','streak','draft','reviewHistory','nextReviewAt'])if(q&&q[field]!==undefined)values['q:'+id+':'+field]=q[field];
  for(let i=0;i<localStorage.length;i++){
    const k=localStorage.key(i);let m;
    if((m=/^ekab\.saek\.read\.v1\.(\d{2})\.(\d{1,2})$/.exec(k))&&localStorage.getItem(k)==='1')values[`r:${m[1]}:${m[2]}`]='1';
    if((m=/^ekab\.saek\.lastchapter\.(\d{2})$/.exec(k)))values['c:'+m[1]]=localStorage.getItem(k);
  }
  const theme=localStorage.getItem('ekab.theme.v1');if(theme)values.theme=theme;
  return values;
}
export async function checkpoint(userId) {
  const values=readLocalValues(),pdfs=await allPdfs(),d=await db();
  return new Promise((resolve,reject)=>{const t=d.transaction('backups','readwrite'),s=t.objectStore('backups');s.put({at:Date.now(),values,pdfs},userId+':'+Date.now());const r=s.getAllKeys();r.onsuccess=()=>{const keys=r.result.filter(k=>k.startsWith(userId+':')).sort();for(const k of keys.slice(0,-3))s.delete(k)};t.oncomplete=resolve;t.onerror=()=>reject(t.error);t.onabort=()=>reject(t.error)});
}
export async function latestRecovery(userId) {
  const d=await db();return new Promise((resolve,reject)=>{const r=d.transaction('backups').objectStore('backups').getAllKeys();r.onsuccess=()=>{const keys=r.result.filter(k=>k.startsWith(userId+':')).sort();if(!keys.length)return resolve(null);const q=d.transaction('backups').objectStore('backups').get(keys.at(-1));q.onsuccess=()=>resolve(q.result);q.onerror=()=>reject(q.error)};r.onerror=()=>reject(r.error)});
}
export function applyValues(values) {
  const q={};
  for(const [key,v]of Object.entries(values))if(key.startsWith('q:')){const [,id,f]=key.split(':');(q[id]||={seen:0,weak:0,selfCorrect:0,selfAttempts:0,streak:0,draft:''})[f]=v;}
  localStorage.setItem(QKEY,JSON.stringify(q));
  const remove=[];for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);if(/^ekab\.saek\.(?:read\.v1\.\d{2}\.\d{1,2}|lastchapter\.\d{2})$/.test(k))remove.push(k);}
  for(const k of remove)localStorage.removeItem(k);
  for(const [key,v]of Object.entries(values)){
    if(key.startsWith('r:')){const [,c,n]=key.split(':');localStorage.setItem(`ekab.saek.read.v1.${c}.${n}`,v);}
    if(key.startsWith('c:'))localStorage.setItem('ekab.saek.lastchapter.'+key.slice(2),v);
  }
  if(values.theme){localStorage.setItem('ekab.theme.v1',values.theme);document.documentElement.dataset.theme=values.theme;}else {localStorage.removeItem('ekab.theme.v1');document.documentElement.dataset.theme='light';}
  window.dispatchEvent(new Event('ekab:cloud-applied'));
}
export async function applyPdfs(values, blobs) {
  const existing=await allPdfs(),d=await pdf();
  return new Promise((resolve,reject)=>{const t=d.transaction('documents','readwrite'),s=t.objectStore('documents');
    for(const item of existing)if(!values['p:'+item.id])s.delete(item.id);
    for(const [key,v]of Object.entries(values))if(key.startsWith('p:')&&blobs.has(key)){const {name,semester,course,created}=v;s.put({id:key.slice(2),name,semester,course,created,blob:blobs.get(key)});}
    t.oncomplete=()=>{window.dispatchEvent(new Event('ekab:cloud-applied'));resolve()};t.onerror=()=>reject(t.error);t.onabort=()=>reject(t.error);
  });
}
