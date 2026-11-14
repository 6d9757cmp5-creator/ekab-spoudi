/**
 * Isolated Mentor-only IndexedDB storage. Does not access legacy progress keys.
 * All session mutations are validated against a deterministic replay.
 */
import {replay,summarize} from './engine.mjs';
export const MENTOR_DB='ekab-mentor-v1';
export const MENTOR_STORES=Object.freeze(['sessions','events','mastery','preferences']);
const MAX_SESSIONS=100;
const SCOPE=/^(?:user:[a-f0-9]{64}|guest:[a-f0-9-]{36})$/;
export function assertScope(scope){if(typeof scope!=='string'||!SCOPE.test(scope))throw new Error('invalid-mentor-scope');}
const keyFor=(scope,kind,id='')=>{assertScope(scope);return scope+':'+kind+(id?':'+id:'');};
const isPrefix=(key,scope)=>typeof key==='string'&&key.startsWith(scope+':');
const prefixMatches=(old,now)=>{
  if(old.events.length>now.events.length)return false;
  return old.events.every((event,i)=>JSON.stringify(event)===JSON.stringify(now.events[i]));
};
export function openMentorDb(factory=globalThis.indexedDB){
  return new Promise((resolve,reject)=>{
    if(!factory){reject(new Error('indexeddb-unavailable'));return;}
    const request=factory.open(MENTOR_DB,1);
    request.onupgradeneeded=()=>{
      for(const name of MENTOR_STORES){
        if(!request.result.objectStoreNames.contains(name))request.result.createObjectStore(name,{keyPath:'key'});
      }
    };
    request.onsuccess=()=>resolve(request.result);
    request.onerror=()=>reject(request.error||new Error('indexeddb-open-failed'));
    request.onblocked=()=>reject(new Error('indexeddb-blocked'));
  });
}
function readKey(db,store,key){
  return new Promise((resolve,reject)=>{
    const t=db.transaction([store],'readonly'),q=t.objectStore(store).get(key);
    q.onsuccess=()=>resolve(q.result?.value??null);
    q.onerror=()=>reject(q.error||new Error('mentor-storage-read'));
    t.onabort=()=>reject(t.error||new Error('mentor-storage-abort'));
  });
}
function readAll(db,store){
  return new Promise((resolve,reject)=>{
    const t=db.transaction([store],'readonly'),q=t.objectStore(store).getAll();
    q.onsuccess=()=>resolve(q.result||[]);
    q.onerror=()=>reject(q.error||new Error('mentor-storage-list'));
    t.onabort=()=>reject(t.error||new Error('mentor-storage-abort'));
  });
}
export function createMentorStore(db){
  if(!db)throw new Error('missing-db');
  return Object.freeze({
    persistent:true,
    async list(scope){
      assertScope(scope);
      const all=await readAll(db,'sessions');
      return all.filter(e=>isPrefix(e.key,scope)).map(e=>replay(e.value))
        .sort((a,b)=>b.updated_at.localeCompare(a.updated_at)||b.id.localeCompare(a.id));
    },
    async active(scope){
      const id=await readKey(db,'preferences',keyFor(scope,'active'));
      if(!id)return null;
      const session=await readKey(db,'sessions',keyFor(scope,'session',id));
      return session?replay(session):null;
    },
    async save(scope,session){
      assertScope(scope);
      const clean=replay(session);
      const scoped=keyFor(scope,'session',clean.id);
      // One readwrite transaction checks append-only event history before writing.
      return new Promise((resolve,reject)=>{
        const tx=db.transaction(['sessions','events','preferences'],'readwrite');
        const sessions=tx.objectStore('sessions'),events=tx.objectStore('events');
        const request=sessions.get(scoped);
        let failure=null;
        request.onsuccess=()=>{
          try{
            const previous=request.result?.value;
            if(previous){
              const original=replay(previous);
              if(original.case_id!==clean.case_id||!prefixMatches(original,clean))throw new Error('mentor-history-conflict');
            }
            sessions.put({key:scoped,value:clean});
            for(const event of clean.events)events.put({key:keyFor(scope,'event',clean.id+':'+event.seq),value:event});
            tx.objectStore('preferences').put({key:keyFor(scope,'active'),value:clean.id});
          }catch(e){failure=e;tx.abort();}
        };
        request.onerror=()=>{failure=request.error||new Error('mentor-storage-read');tx.abort();};
        tx.oncomplete=()=>resolve(clean);
        tx.onerror=()=>reject(failure||tx.error||new Error('mentor-storage-save'));
        tx.onabort=()=>reject(failure||tx.error||new Error('mentor-storage-abort'));
      });
    },
    async overview(scope){
      const entries=await this.list(scope);
      return {...summarize(entries),sessions:entries};
    },
    async erase(scope){
      assertScope(scope);
      const all=await Promise.all(MENTOR_STORES.map(s=>readAll(db,s)));
      return new Promise((resolve,reject)=>{
        const tx=db.transaction(MENTOR_STORES,'readwrite');
        for(let i=0;i<MENTOR_STORES.length;i++){
          for(const record of all[i])if(isPrefix(record.key,scope))tx.objectStore(MENTOR_STORES[i]).delete(record.key);
        }
        tx.oncomplete=resolve;
        tx.onerror=()=>reject(tx.error||new Error('mentor-delete-failed'));
        tx.onabort=()=>reject(tx.error||new Error('mentor-delete-aborted'));
      });
    },
  });
}
/** Browsing demo still works without IndexedDB; nothing is saved permanently. */
export function createVolatileMentorStore(){
  const map=new Map();
  const active=new Map();
  return Object.freeze({
    persistent:false,
    async list(scope){assertScope(scope);return [...map.values()].filter(x=>x.scope===scope).map(x=>replay(x.value)).sort((a,b)=>b.updated_at.localeCompare(a.updated_at));},
    async active(scope){assertScope(scope);const id=active.get(scope);return id?replay(map.get(keyFor(scope,'session',id))?.value):null;},
    async save(scope,session){assertScope(scope);const clean=replay(session),key=keyFor(scope,'session',clean.id);
      const prev=map.get(key)?.value;if(prev&&!prefixMatches(prev,clean))throw new Error('mentor-history-conflict');
      if(!prev && [...map.values()].filter(x=>x.scope===scope).length>=MAX_SESSIONS)throw new Error('mentor-session-limit');
      map.set(key,{scope,value:clean});active.set(scope,clean.id);return clean;},
    async overview(scope){const sessions=await this.list(scope);return {...summarize(sessions),sessions};},
    async erase(scope){assertScope(scope);for(const [key,value]of map)if(value.scope===scope)map.delete(key);active.delete(scope);}
  });
}
