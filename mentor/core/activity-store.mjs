/**
 * Isolated storage for Mentor MCI/equipment exercises, separate even from the
 * original Mentor mission database. Never reads/writes SAEK/EOPPEP or grading.
 */
import {assertScope} from './store.mjs';
import {replayActivity} from './activity-engine.mjs';
import {getActivity} from './activities.mjs';
export const ACTIVITY_DB='ekab-mentor-activities-v1';
const NAMES=['activities','active'];
const key=(scope,id)=>{assertScope(scope);return scope+':'+id;};
const belongs=(item,scope)=>typeof item.key==='string'&&item.key.startsWith(scope+':');
const prefix=(old,next)=>old.events.length<=next.events.length&&
 old.events.every((evt,i)=>JSON.stringify(evt)===JSON.stringify(next.events[i]));
function txGet(db,store,id){
 return new Promise((resolve,reject)=>{
  const t=db.transaction(store,'readonly');
  const r=t.objectStore(store).get(id);
  r.onsuccess=()=>resolve(r.result?.value||null);
  r.onerror=()=>reject(r.error||new Error('activity-read-failed'));
  t.onabort=()=>reject(t.error||new Error('activity-read-aborted'));
 });
}
function txAll(db,store){
 return new Promise((resolve,reject)=>{
  const t=db.transaction(store,'readonly'),r=t.objectStore(store).getAll();
  r.onsuccess=()=>resolve(r.result||[]);
  r.onerror=()=>reject(r.error||new Error('activity-list-failed'));
  t.onabort=()=>reject(t.error||new Error('activity-list-aborted'));
 });
}
export function openActivityDb(factory=globalThis.indexedDB){
 return new Promise((resolve,reject)=>{
  if(!factory){reject(new Error('indexeddb-unavailable'));return;}
  const request=factory.open(ACTIVITY_DB,1);
  request.onupgradeneeded=()=>{for(const name of NAMES)if(!request.result.objectStoreNames.contains(name))request.result.createObjectStore(name,{keyPath:'key'});};
  request.onsuccess=()=>resolve(request.result);
  request.onerror=()=>reject(request.error||new Error('activity-db-failed'));
  request.onblocked=()=>reject(new Error('activity-db-blocked'));
 });
}
export function createActivityStore(db){
 if(!db)throw new Error('missing-db');
 return Object.freeze({
  persistent:true,
  async list(scope,kind=null){
   assertScope(scope);
   const records=await txAll(db,'activities');
   return records.filter(r=>belongs(r,scope)).map(r=>replayActivity(r.value))
    .filter(s=>kind===null||getActivity(s.activity_id).kind===kind)
    .sort((a,b)=>b.updated_at.localeCompare(a.updated_at)||b.id.localeCompare(a.id));
  },
  async active(scope,kind){
   assertScope(scope);if(!['mci','equipment'].includes(kind))throw new Error('invalid-kind');
   const id=await txGet(db,'active',key(scope,'active:'+kind));
   if(!id)return null;
   const s=await txGet(db,'activities',key(scope,'activity:'+id));
   const result=s?replayActivity(s):null;
   return result&&getActivity(result.activity_id).kind===kind?result:null;
  },
  async save(scope,session){
   const clean=replayActivity(session);
   const kind=getActivity(clean.activity_id).kind;
   const itemKey=key(scope,'activity:'+clean.id);
   return new Promise((resolve,reject)=>{
    const t=db.transaction(NAMES,'readwrite');
    const activities=t.objectStore('activities'),r=activities.get(itemKey);
    let failure;
    r.onsuccess=()=>{
     try{
      if(r.result?.value){
       const old=replayActivity(r.result.value);
       if(old.activity_id!==clean.activity_id||old.created_at!==clean.created_at||!prefix(old,clean))
        throw new Error('activity-history-conflict');
      }
      activities.put({key:itemKey,value:clean});
      t.objectStore('active').put({key:key(scope,'active:'+kind),value:clean.id});
     }catch(e){failure=e;t.abort();}
    };
    r.onerror=()=>{failure=r.error||new Error('activity-read-failed');t.abort();};
    t.oncomplete=()=>resolve(clean);
    t.onerror=()=>reject(failure||t.error||new Error('activity-save-failed'));
    t.onabort=()=>reject(failure||t.error||new Error('activity-save-aborted'));
   });
  },
  async erase(scope){
   assertScope(scope);
   const [activities,active]=await Promise.all(NAMES.map(name=>txAll(db,name)));
   return new Promise((resolve,reject)=>{
    const t=db.transaction(NAMES,'readwrite');
    for(const record of activities)if(belongs(record,scope))t.objectStore('activities').delete(record.key);
    for(const record of active)if(belongs(record,scope))t.objectStore('active').delete(record.key);
    t.oncomplete=resolve;
    t.onerror=()=>reject(t.error||new Error('activity-erase-failed'));
    t.onabort=()=>reject(t.error||new Error('activity-erase-aborted'));
   });
  }
 });
}
export function createVolatileActivityStore(){
 const map=new Map(),active=new Map();
 return Object.freeze({
  persistent:false,
  async list(scope,kind=null){assertScope(scope);return [...map.values()].filter(r=>r.scope===scope)
   .map(r=>replayActivity(r.session)).filter(s=>kind===null||getActivity(s.activity_id).kind===kind)
   .sort((a,b)=>b.updated_at.localeCompare(a.updated_at)||b.id.localeCompare(a.id));},
  async active(scope,kind){assertScope(scope);const id=active.get(key(scope,'active:'+kind));
   return id?replayActivity(map.get(key(scope,'activity:'+id))?.session):null;},
  async save(scope,session){assertScope(scope);const clean=replayActivity(session),itemKey=key(scope,'activity:'+clean.id);
   const prior=map.get(itemKey)?.session;
   if(prior&&(prior.activity_id!==clean.activity_id||prior.created_at!==clean.created_at||!prefix(prior,clean)))
    throw new Error('activity-history-conflict');
   map.set(itemKey,{scope,session:clean});
   active.set(key(scope,'active:'+getActivity(clean.activity_id).kind),clean.id);
   return clean;},
  async erase(scope){assertScope(scope);for(const [k,v] of map)if(v.scope===scope)map.delete(k);
   for(const k of [...active.keys()])if(k.startsWith(scope+':'))active.delete(k);}
 });
}
