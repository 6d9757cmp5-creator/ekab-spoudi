/* Cross-device private notes, EOPPEP SOS and notebook safety regression. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {readNotes,writeNotes,validNote,readNotes as load,NOTES_KEY} from '../notes-store.js';
import {readLocalValues,applyValues,QKEY} from '../sync-local.js';
import {canDeletePersonalEntry,deletePersonalEntry,SEM_NOTES_KEY} from '../notes-delete.js';
import {validValue,captureEdits,mergeEntries,visibleEntries,DRAFT_SEPARATOR} from '../sync-model.js';

class Storage{
 constructor(){this.map=new Map()}
 getItem(k){return this.map.has(k)?this.map.get(k):null}
 setItem(k,v){this.map.set(String(k),String(v))}
 removeItem(k){this.map.delete(k)}
 key(i){return [...this.map.keys()][i]??null}
 get length(){return this.map.size}
}
const store=new Storage();
globalThis.localStorage=store;
globalThis.document={documentElement:{dataset:{}}};
const events=[];
globalThis.window={dispatchEvent:event=>events.push(event.type)};
globalThis.Event=class{constructor(type){this.type=type}};
const a='a'.repeat(32),b='b'.repeat(32),id='c'.repeat(32);
const note={title:'Ανατομία',body:'Έμαθα τα οστά και τα SOS',section:'saek',context:'ΣΑΕΚ · Μάθημα 1 · Κεφάλαιο 1',href:'saek-course-01.html#lesson-1',updatedAt:1793200000000};
assert(validNote(note));
assert(!validNote({...note,href:'javascript:alert(1)'}));
assert(!validValue('n:'+id,{...note,body:'x'.repeat(8001)}));
assert(!validValue('n:../../secrets',note));
writeNotes({[id]:note});
assert.deepEqual(readNotes(),{[id]:note});
store.setItem(QKEY,JSON.stringify({'EOP-A-001':{seen:1,sosNotes:'Δική μου SOS υπενθύμιση',readerNotes:'Απορία αναπνοής',draft:'Απάντηση'}}));
const values=readLocalValues();
assert.equal(values['q:EOP-A-001:sosNotes'],'Δική μου SOS υπενθύμιση');
assert.equal(values['q:EOP-A-001:readerNotes'],'Απορία αναπνοής');
assert.equal(values['n:'+id].title,'Ανατομία');

const cloud=captureEdits({}, {},values,a,1);
const visible=visibleEntries(cloud);
assert.equal(visible['n:'+id].body,note.body);
assert.equal(visible['q:EOP-A-001:readerNotes'],'Απορία αναπνοής');
// Cloud notes replace a stale local copy, rather than the stale copy
// always winning (the former behavior when notes did not sync).
store.setItem(QKEY,JSON.stringify({'EOP-A-001':{sosNotes:'ΠΑΛΙΟ',readerNotes:'ΠΑΛΙΟ'}}));
applyValues(visible);
const restored=JSON.parse(store.getItem(QKEY));
assert.equal(restored['EOP-A-001'].sosNotes,'Δική μου SOS υπενθύμιση');
assert.equal(restored['EOP-A-001'].readerNotes,'Απορία αναπνοής');
assert.equal(readNotes()[id].body,note.body);
assert(events.includes('ekab:notes-changed'));
// Legacy notes without a cloud key remain intact during the first migration.
store.setItem(QKEY,JSON.stringify({'EOP-A-001':{sosNotes:'παλιά αλλά πολύτιμη σημείωση'}}));
applyValues({'q:EOP-A-001:seen':1,['n:'+id]:note});
assert.equal(JSON.parse(store.getItem(QKEY))['EOP-A-001'].sosNotes,'παλιά αλλά πολύτιμη σημείωση');
// An explicit empty note from cloud must override the outdated local text.
applyValues({'q:EOP-A-001:sosNotes':'',['n:'+id]:note});
assert.equal(JSON.parse(store.getItem(QKEY))['EOP-A-001'].sosNotes,'');

const sosKey='q:EOP-A-001:sosNotes';
const initial=captureEdits({}, {},{[sosKey]:'κύριο κείμενο'},a,10);
const left=captureEdits(initial,{[sosKey]:'κύριο κείμενο'},{[sosKey]:'σημείωση κινητού'},a,20);
const right=captureEdits(initial,{[sosKey]:'κύριο κείμενο'},{[sosKey]:'σημείωση υπολογιστή'},b,21);
const merged=mergeEntries(left,right);
assert(merged[sosKey].v.includes('σημείωση κινητού'));
assert(merged[sosKey].v.includes('σημείωση υπολογιστή'));
assert(merged[sosKey].v.includes(DRAFT_SEPARATOR));
assert.equal(merged[sosKey].v,mergeEntries(right,left)[sosKey].v);
const first=captureEdits({}, {},{['n:'+id]:note},a,10);
const noteLeft=captureEdits(first,{['n:'+id]:note},{['n:'+id]:{...note,body:'από κινητό'}},a,20);
const noteRight=captureEdits(first,{['n:'+id]:note},{['n:'+id]:{...note,body:'από υπολογιστή'}},b,21);
const both=mergeEntries(noteLeft,noteRight)['n:'+id].v;
assert(both.body.includes('από κινητό')&&both.body.includes('από υπολογιστή'));
assert.equal(both.body,mergeEntries(noteRight,noteLeft)['n:'+id].v.body);
assert(validValue('n:'+id,both));
const deleted=captureEdits(first,{['n:'+id]:note},{},a,22);
assert.equal(visibleEntries(mergeEntries(first,deleted))['n:'+id],undefined);
applyValues({});
assert.equal(store.getItem(NOTES_KEY),null);
assert.deepEqual(load(),{});
assert.throws(()=>readNotes({getItem:()=>'{ broken json'}),/invalid-personal-notes/);


/* Regression: users can delete from the note card without opening its editor.
   Other question results, seminar progress and unrelated notes survive. */
writeNotes({[id]:note,[b]:{...note,title:'Δεύτερη σημείωση'}});
assert(canDeletePersonalEntry({kind:'mine',editId:id,title:'Ανατομία'}));
assert.equal(deletePersonalEntry({kind:'mine',editId:id},store),true);
assert.equal(readNotes()[id],undefined);
assert.equal(readNotes()[b].title,'Δεύτερη σημείωση');
assert.equal(deletePersonalEntry({kind:'mine',editId:id},store),false);
assert.equal(deletePersonalEntry({kind:'sos',id:'saek-sos:01:1'},store),false);
const quizRecord={'EOP-A-001':{seen:7,selfCorrect:4,sosNotes:'Σημαντικό SOS',readerNotes:'Άλλη προσωπική σημείωση',draft:'Κείμενο απάντησης'}};
store.setItem(QKEY,JSON.stringify(quizRecord));
assert.equal(deletePersonalEntry({kind:'source',id:'q:EOP-A-001:sosNotes'},store),true);
const afterQuestion=JSON.parse(store.getItem(QKEY))['EOP-A-001'];
assert.equal(afterQuestion.sosNotes,'');
assert.equal(afterQuestion.readerNotes,'Άλλη προσωπική σημείωση');
assert.equal(afterQuestion.draft,'Κείμενο απάντησης');
assert.equal(afterQuestion.seen,7);
assert.equal(afterQuestion.selfCorrect,4);
assert.equal(readLocalValues()['q:EOP-A-001:sosNotes'],'','empty field must reach cloud as edit');
assert.equal(deletePersonalEntry({kind:'source',id:'q:EOP-A-001:draft'},store),true);
assert.equal(JSON.parse(store.getItem(QKEY))['EOP-A-001'].draft,'');
const oldEop=captureEdits({}, {},{'q:EOP-A-001:sosNotes':'Σημαντικό SOS'},a,10);
const deletedEop=captureEdits(oldEop,{'q:EOP-A-001:sosNotes':'Σημαντικό SOS'},{'q:EOP-A-001:sosNotes':''},a,30);
assert.equal(mergeEntries(oldEop,deletedEop)['q:EOP-A-001:sosNotes'].v,'');
store.setItem(SEM_NOTES_KEY,JSON.stringify({
 bls:{studied:[1],qNotes:{2:'Απάντηση που έσβησα',3:'Άλλη απάντηση'},
 oralNotes:{1:'Σημείωση προφορικού'},right:[2]}
}));
assert.equal(deletePersonalEntry({kind:'source',id:'s:bls:qNotes:2'},store),true);
const seminarAfter=JSON.parse(store.getItem(SEM_NOTES_KEY)).bls;
assert.equal(seminarAfter.qNotes[2],'');
assert.equal(seminarAfter.qNotes[3],'Άλλη απάντηση');
assert.equal(seminarAfter.oralNotes[1],'Σημείωση προφορικού');
assert.deepEqual(seminarAfter.studied,[1]);
assert.deepEqual(seminarAfter.right,[2]);
assert.equal(readLocalValues()['s:bls'].qNotes[2],'','seminar empty field is a syncable edit');
assert.equal(deletePersonalEntry({kind:'source',id:'s:bls:qNotes:2'},store),false);
assert.equal(deletePersonalEntry({kind:'source',id:'s:bls:qNotes:99'},store),false);
assert.equal(deletePersonalEntry({kind:'source',id:'s:bls:qNotes:../../x'},store),false);
// Unknown/malformed storage must fail closed rather than destroy valid notes.
const snapshot=store.getItem(SEM_NOTES_KEY);
store.setItem(SEM_NOTES_KEY,'not-json');
assert.throws(()=>deletePersonalEntry({kind:'source',id:'s:bls:oralNotes:1'},store),/invalid-notes-source/);
store.setItem(SEM_NOTES_KEY,snapshot);

const src=fs.readFileSync('notes-panel.js','utf8');
assert(src.includes("import { readNotes, writeNotes"));
assert(src.includes("data-ekab-notes-tab=\"mine\"")&&src.includes("data-ekab-notes-tab=\"sos\""));
assert(src.includes("data-ekab-notes-tab=\"all\""));
assert(src.includes("SOS ·")&&src.includes("eoppep-sos.json"));
assert(src.includes("saek-search-A.json")&&src.includes("saek-search-D.json"));
assert(src.includes("ekab-notes-chapter"));
assert(src.includes("button('Διαγραφή',()=>removeVisibleNote(item)"));
assert(src.includes("deletePersonalEntry(item)"));
assert(src.includes("canDeletePersonalEntry(item)"));
assert(src.includes("Η σημείωση διαγράφηκε."));
assert(src.includes("ekabNotesActionStatus"));
assert(src.includes("'draft','Γραπτή απάντηση εξάσκησης'"));
assert(!src.includes("id=\"ekabGlobalSearch\""));
const indices=['A','B','C','D'].map(x=>JSON.parse(fs.readFileSync('saek-search-'+x+'.json','utf8')));
assert.equal(indices.reduce((n,x)=>n+x.items.filter(i=>i.searchText.includes('SOS ·')).length,0),247);
const sos=JSON.parse(fs.readFileSync('eoppep-sos.json','utf8'));
assert.equal(sos.items.filter(x=>x.points?.length>0).length,314);
const progress=fs.readFileSync('progress.js','utf8');
assert(progress.includes("NOTES='ekab.personal-notes.v1'"));
assert(progress.includes("k!==NOTES")); // Old backup restore cannot silently erase newer notes.
const upd=fs.readFileSync('updates.js','utf8');
const release=JSON.parse(fs.readFileSync('version.json','utf8')).version;
assert(upd.includes('notes-panel.js?v='+release));
assert(upd.includes('notes-panel.css?v='+release));
const sw=fs.readFileSync('sw.js','utf8');
for(const name of ['notes-store.js','notes-panel.js','notes-panel.css'])assert(sw.includes('"./'+name+'"'));
console.log('PASS: 247 SAEK SOS + 314 EOPPEP SOS, independent notebook search, note validation, migration, cloud round-trip, dual-device conflicts, direct note/source deletion, safe sync tombstones, legacy backup preservation and offline assets.');
