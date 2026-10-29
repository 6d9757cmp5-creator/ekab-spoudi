/**
 * Lazy-load one real extracted textbook at a time into the Mentor REVIEW interface.
 * Enforces provenance via the existing corpus manifest SHA-256 per source.
 * This code never calls an AI provider, grades, or stores user queries.
 */
import {assertPublicCatalog} from '../library/catalog-search.mjs';
import {assertReviewBook} from './review-search.mjs';

const MAX_BYTES=7_000_000;
const BASE='./mentor/review-corpus/';
const INDEX='./mentor/library/source-index.json';
let manifestTask=null;
let catalogTask=null;
const cache=new Map();

async function readJSON(url,request){
 const response=await request(url,{cache:'no-store'});
 if(!response.ok)throw Error('Η βιβλιοθήκη δεν φορτώθηκε (HTTP '+response.status+').');
 return response.json();
}
export function validateReviewManifest(data){
 if(data?.schema_version!==1||!Array.isArray(data.books)||data.books.length!==7||data.errors?.length)
  throw Error('Μη έγκυρο ή ελλιπές μητρώο βιβλίων.');
 const ids=new Set();
 for(const b of data.books){
  if(typeof b.source_id!=='string'||!(/^[a-z0-9][a-z0-9-]{2,80}$/).test(b.source_id)||
   ids.has(b.source_id)||!Number.isInteger(b.passage_count)||b.passage_count<10||
   !/^[a-f0-9]{64}$/.test(b.sha256||'')||b.scientific_review!=='pending')
   throw Error('Ασυμφωνία στο μητρώο βιβλίου.');
  ids.add(b.source_id);
 }
 return data;
}
export function createReviewBookLoader({request=globalThis.fetch.bind(globalThis),
 cryptoApi=globalThis.crypto,base=BASE,index=INDEX}={}){
 if(typeof request!=='function'||!cryptoApi?.subtle)throw Error('Απαιτείται ασφαλές περιβάλλον προεπισκόπησης.');
 let mTask=null,cTask=null;
 const records=new Map();
 async function manifest(){
  if(!mTask)mTask=readJSON(base+'manifest.json',request).then(validateReviewManifest).catch(e=>{mTask=null;throw e;});
  return mTask;
 }
 async function sources(){
  if(!cTask)cTask=readJSON(index,request).then(assertPublicCatalog).catch(e=>{cTask=null;throw e;});
  return cTask;
 }
 async function load(id){
  const [m,c]=await Promise.all([manifest(),sources()]);
  const entry=c.find(s=>s.id===id&&s.extracted_for_review&&
   s.clinical_retrieval_enabled===false&&s.independent_clinical_review==='not_verified');
  const b=m.books.find(x=>x.source_id===id);
  if(!entry||!b)throw Error('Το βιβλίο δεν επιτρέπεται να προβληθεί.');
  if(records.has(id))return records.get(id);
  const task=(async()=>{
   const response=await request(base+id+'.json',{cache:'no-store'});
   if(!response.ok)throw Error('Το αρχείο του βιβλίου δεν βρέθηκε.');
   const buf=await response.arrayBuffer();
   if(buf.byteLength<2000||buf.byteLength>MAX_BYTES)throw Error('Μη αναμενόμενο μέγεθος αρχείου βιβλίου.');
   const hash=Array.from(new Uint8Array(await cryptoApi.subtle.digest('SHA-256',buf)))
    .map(n=>n.toString(16).padStart(2,'0')).join('');
   if(hash!==b.sha256)throw Error('Απέτυχε ο έλεγχος SHA-256 του βιβλίου.');
   const book=JSON.parse(new TextDecoder().decode(buf));
   assertReviewBook(book,id,m);
   return Object.freeze({book,source:entry,manifest:b});
  })();
  records.set(id,task);
  try{return await task;}catch(e){records.delete(id);throw e;}
 }
 return Object.freeze({manifest,sources,load});
}
