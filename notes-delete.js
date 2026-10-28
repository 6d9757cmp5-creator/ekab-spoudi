/* EKAB Σπουδή — remove only user-authored notes, never published SOS.
   Keep explicit empty strings for edits stored inside shared EOPPEP/seminar
   records so cloud sync captures the deletion instead of resurrecting text. */
import { readNotes, writeNotes, validNoteId } from './notes-store.js';
import { validSeminarCourse } from './seminar-sync.js';

export const EOP_NOTES_KEY='ekab-eoppep-official-v15';
export const SEM_NOTES_KEY='ekab.seminar-prep.local.v1';

function readObject(storage,key){
 const raw=storage.getItem(key);
 if(raw===null)return {};
 let value;
 try{value=JSON.parse(raw)}catch{throw Error('invalid-notes-source')}
 if(!value||typeof value!=='object'||Array.isArray(value))throw Error('invalid-notes-source');
 return value;
}
export function canDeletePersonalEntry(item){
 if(!item||typeof item!=='object')return false;
 if(item.kind==='mine')return validNoteId(item.editId);
 if(item.kind!=='source'||typeof item.id!=='string')return false;
 const q=/^q:EOP-([AB])-(\d{3}):(sosNotes|readerNotes|draft)$/.exec(item.id);
 if(q)return Number(q[2])>=1&&Number(q[2])<=(q[1]==='A'?105:209);
 const s=/^s:(bls|pbls|ils|phtls|als):(qNotes|oralNotes):(0|[1-9]\d*)$/.exec(item.id);
 return !!s&&Number(s[3])<(s[2]==='qNotes'?48:12);
}
export function deletePersonalEntry(item,storage=localStorage){
 if(!canDeletePersonalEntry(item))return false;
 if(item.kind==='mine'){
  const values=readNotes(storage);
  if(!Object.hasOwn(values,item.editId))return false;
  const next={...values};delete next[item.editId];
  writeNotes(next,storage);
  return true;
 }
 const q=/^q:(EOP-[AB]-\d{3}):(sosNotes|readerNotes|draft)$/.exec(item.id);
 if(q){
  const values=readObject(storage,EOP_NOTES_KEY),record=values[q[1]];
  if(!record||typeof record!=='object'||Array.isArray(record)||
     typeof record[q[2]]!=='string'||!record[q[2]].trim())return false;
  // An explicit empty field is a syncable edit; do not remove the question,
  // its study progress, review history or its other student notes.
  storage.setItem(EOP_NOTES_KEY,JSON.stringify({
   ...values,[q[1]]:{...record,[q[2]]:''}
  }));
  return true;
 }
 const s=/^s:(bls|pbls|ils|phtls|als):(qNotes|oralNotes):(0|[1-9]\d*)$/.exec(item.id);
 if(!s)return false;
 const values=readObject(storage,SEM_NOTES_KEY),course=values[s[1]];
 if(!course||!validSeminarCourse(course))throw Error('invalid-notes-source');
 if(typeof course[s[2]]?.[s[3]]!=='string'||!course[s[2]][s[3]].trim())return false;
 // An empty key survives an eventual concurrent whole-course map merge.
 const changed={...course,[s[2]]:{...course[s[2]],[s[3]]:''}};
 if(!validSeminarCourse(changed))throw Error('invalid-notes-source');
 storage.setItem(SEM_NOTES_KEY,JSON.stringify({...values,[s[1]]:changed}));
 return true;
}
