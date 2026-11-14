import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {TOPICS,SOURCES,ATMIST,CLOSED_LOOP,TRANSFER_STEPS,TRANSFER_FLAW,gradeCapture,gradeReadback,gradeOrder,gradePrealert,gradeStructure,gradeRecord,gradeTransferFlaw,modelHandover,norm,loadCases} from './core.mjs';
const CASES=loadCases(JSON.parse(readFileSync(new URL('./cases.json',import.meta.url),'utf8')));

test('the case file is checked before use',()=>{
 assert.throws(()=>loadCases([]));
 assert.throws(()=>loadCases([{id:'x'}]));
 assert.ok(Object.isFrozen(CASES[0].narrative[0]),'cases cannot be changed by the page');
});

test('six subsections, each with at least one source that exists in the published material',()=>{
 assert.deepEqual(TOPICS.map(t=>t.id),['capture','dispatch','prealert','structure','record','transfer']);
 for(const t of TOPICS)assert.ok(SOURCES.some(s=>s.topic===t.id),t.id);
 for(const s of SOURCES){
  const [file,anchor]=s.href.split('#');
  const html=readFileSync(new URL('../../'+file,import.meta.url),'utf8');
  assert.ok(html.includes(`id="${anchor}"`),s.href);
 }
});

test('every synthetic case is internally consistent: narrative, answers, statements and vitals agree',()=>{
 for(const c of CASES){
  const story=c.narrative.map(n=>n.t+' '+n.text).join(' ');
  for(const f of c.capture)if(f.kind!=='choice')assert.ok(story.includes(f.answer),c.id+' '+f.id);
  for(const v of c.vitals){
   assert.ok(story.includes(v.time),c.id+' '+v.time);
   for(const k of ['hr','rr','spo2'])assert.ok(story.includes(String(v[k])),c.id+' '+k+' '+v[k]);
   assert.ok(story.includes(v.bp),c.id+' bp');
  }
  // Every ATMIST slot is used and every left-out statement says why.
  for(const a of ATMIST)assert.ok(c.statements.some(s=>s.slot===a.id),c.id+' '+a.id);
  for(const s of c.statements.filter(x=>x.slot==='out'))assert.ok(s.why&&!s.prealert,s.id);
  assert.equal(new Set(c.statements.map(s=>s.id)).size,c.statements.length);
  // No dose in any synthetic text.
  assert.doesNotMatch(story+c.statements.map(s=>s.text).join(' '),/\d\s*(mg|mcg|ml|l\/min|λίτρα)/i);
 }
});

test('capture: times accept 9.40 or 09:40; unknown must be recorded as unknown',()=>{
 const ok=gradeCapture('fall',{onset:'9.40',call:'09:46',arrival:'10:01',age:'67',head:'Άγνωστο'});
 assert.equal(ok.correct,ok.total);
 const r=gradeCapture('fall',{onset:'09:46',call:'09:46',arrival:'10:01',age:'67',head:'Όχι'});
 assert.deepEqual(r.rows.filter(x=>!x.ok).map(x=>x.id),['onset','head']);
 assert.match(r.rows.find(x=>x.id==='head').why,/άγνωστο/);
});

test('closed-loop read-back finds each missing critical item, with or without accents',()=>{
 const full=gradeReadback('fall','Ασθενοφόρο 12, Αγίου Νικολάου 18 Νέα Σμύρνη, στην πίσω αυλή, ένας τραυματίας.');
 assert.equal(full.complete,true);
 const plain=gradeReadback('fall','12 αγιου νικολαου 18 νεα σμυρνη πισω αυλη 1 τραυματιας');
 assert.equal(plain.complete,true);
 const part=gradeReadback('fall','Ασθενοφόρο 12, Αγίου Νικολάου 81, Νέα Σμύρνη.');
 assert.deepEqual(part.missing,['Αριθμός 18','Πίσω αυλή','Ένας τραυματίας']);
 assert.equal(gradeReadback('breath','Το 7, τρίτος όροφος, Συγγρού 205, δεν έχει ασανσέρ').complete,true);
});

test('order exercises: closed loop and handover steps',()=>{
 const ids=CLOSED_LOOP.map(x=>x.id);
 assert.equal(gradeOrder(ids,ids).complete,true);
 assert.equal(gradeOrder(ids,['readback','send','confirm']).correct,1);
 assert.throws(()=>gradeOrder(ids,['send','send','confirm']));
 const steps=TRANSFER_STEPS.map(x=>x.id);
 assert.equal(gradeOrder(steps,steps).complete,true);
 assert.equal(gradeTransferFlaw(TRANSFER_FLAW.answer).ok,true);
 assert.equal(gradeTransferFlaw(3).ok,false);
});

test('pre-alert and ATMIST grading reward leaving out guesses and diagnoses',()=>{
 const c=CASES[0];
 const right=c.statements.filter(s=>s.prealert).map(s=>s.id);
 assert.equal(gradePrealert('fall',right).correct,c.statements.length);
 assert.equal(gradePrealert('fall',c.statements.map(s=>s.id)).correct,c.statements.length-2,'choosing the guesses costs two');
 const slots=Object.fromEntries(c.statements.map(s=>[s.id,s.slot]));
 assert.equal(gradeStructure('fall',slots).correct,c.statements.length);
 assert.equal(gradeStructure('fall',{...slots,s7:'I'}).correct,c.statements.length-1);
});

test('record: two rows of vitals and an objective description of the change',()=>{
 const c=CASES[1];
 const rows=c.vitals.map(v=>({time:v.time,hr:String(v.hr),rr:String(v.rr),bp:v.bp,spo2:String(v.spo2),avpu:'a'}));
 const r=gradeRecord('breath',rows,c.trend.answer);
 assert.equal(r.correct,r.total);
 assert.equal(r.trendOk,true);
 const wrong=gradeRecord('breath',[{...rows[0],spo2:'93'},rows[1]],1);
 assert.equal(wrong.correct,r.total-1);
 assert.equal(wrong.trendOk,false);
});

test('model handover lists every ATMIST part and never the left-out statements',()=>{
 const text=modelHandover('fall');
 assert.match(text,/67 ετών/);
 assert.doesNotMatch(text,/Σίγουρα έσπασε/i);
 assert.equal(norm('Άγνωστο  ΣΟΣ'),'αγνωστο σοσ');
});
