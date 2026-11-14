/* EKAB Σπουδή — local-first personal notes shared by the notes drawer and cloud sync. */
export const NOTES_KEY='ekab.personal-notes.v1';
export const NOTE_LIMIT=500;
const ID=/^[a-f0-9]{32}$/;
const SECTIONS=new Set(['general','saek','eoppep','seminar']);
const isPlain=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);
export function validNoteId(id){return ID.test(id)}
export function validNote(value){
 if(!isPlain(value)||Object.keys(value).some(key=>!['title','body','section','context','href','updatedAt'].includes(key)))return false;
 if(typeof value.title!=='string'||!value.title.trim()||value.title.length>140)return false;
 if(typeof value.body!=='string'||value.body.length>8000)return false;
 if(!SECTIONS.has(value.section)||typeof value.context!=='string'||value.context.length>180)return false;
 if(typeof value.href!=='string'||value.href.length>160)return false;
 if(value.href&&!/^(?:saek-course-(?:0[1-9]|1\d|20)\.html#lesson-(?:[1-9]|[12]\d|3[0-2])|theory\.html\?question=EOP-[AB]-\d{3}|seminar-prep\.html#(?:bls|pbls|ils|phtls|als))$/.test(value.href))return false;
 return Number.isSafeInteger(value.updatedAt)&&value.updatedAt>=0&&value.updatedAt<=4102444800000;
}
export function validateNotes(value){
 if(!isPlain(value)||Object.keys(value).length>NOTE_LIMIT)return false;
 return Object.entries(value).every(([id,note])=>validNoteId(id)&&validNote(note));
}
export function readNotes(storage=localStorage){
 const raw=storage.getItem(NOTES_KEY);if(raw===null)return {};
 let value;try{value=JSON.parse(raw)}catch{throw Error('invalid-personal-notes')}
 if(!validateNotes(value))throw Error('invalid-personal-notes');
 return value;
}
export function writeNotes(value,storage=localStorage){
 if(!validateNotes(value))throw Error('invalid-personal-notes');
 storage.setItem(NOTES_KEY,JSON.stringify(value));
}
export function noteValues(storage=localStorage){
 const notes=readNotes(storage),out={};
 for(const [id,note] of Object.entries(notes))out['n:'+id]=note;
 return out;
}
export function applyNoteValues(values,storage=localStorage){
 const result={};
 for(const [key,value]of Object.entries(values))if(/^n:[a-f0-9]{32}$/.test(key)&&value!==null)result[key.slice(2)]=value;
 if(!validateNotes(result))throw Error('invalid-cloud-notes');
 // Do not delete valid local notes on unrelated refreshes; this is the
 // fully merged cloud view and must retain intentional deletions.
 if(Object.keys(result).length)writeNotes(result,storage);
 else storage.removeItem(NOTES_KEY);
}
