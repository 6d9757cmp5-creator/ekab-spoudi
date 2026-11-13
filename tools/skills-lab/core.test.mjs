import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync,statSync} from 'node:fs';
import {loadLab,grade,mediaOf,CHEST_POINTS,TYPES} from './core.mjs';
import {parseWav,spectrogram,clippedFraction} from './sound.mjs';

const read=p=>readFileSync(new URL(p,import.meta.url),'utf8');
const MEDIA=JSON.parse(read('./media/media.json'));
const IDS=['airway','equipment','auscultation'];
const RAW=Object.fromEntries(IDS.map(id=>[id,JSON.parse(read(`./labs/${id}.json`))]));
const LABS=Object.fromEntries(IDS.map(id=>[id,loadLab(RAW[id])]));
const LICENCES=/^(CC0|Public domain|CC BY(-SA)? [0-9.]+( [a-z]+)?|ODC-By 1\.0)$/;

test('the three labs load and match the hub: 5, 5 and 4 subsections',()=>{
 assert.deepEqual(IDS.map(id=>LABS[id].topics.length),[5,5,4]);
 const hub=read('../../paramedic.html');
 for(const id of IDS)for(const t of LABS[id].topics)assert.ok(hub.includes(`mentor-${id}.html?topic=${t.id}`),`${id}/${t.id} linked from paramedic.html`);
 for(const id of IDS)for(const t of LABS[id].topics)assert.ok(t.exercises.length>=2,`${id}/${t.id} has at least two exercises`);
});

test('every image and sound a lab uses exists',()=>{
 for(const id of IDS)for(const f of mediaOf(LABS[id]))assert.ok(existsSync(new URL('./media/'+f,import.meta.url)),f);
});

test('every licence record is complete and points to an existing file (for the licences page)',()=>{
 for(const m of MEDIA){
  assert.ok(existsSync(new URL('./media/'+m.file,import.meta.url)),m.file);
  assert.ok(m.author&&m.changes,m.file);
  assert.match(m.licence,LICENCES,m.file);
  assert.match(m.source,/^https:\/\//,m.file);
  assert.ok(m.licence==='CC0'||m.licence==='Public domain'||/^https:\/\//.test(m.licenceUrl),m.file+' licence link');
  assert.ok(statSync(new URL('./media/'+m.file,import.meta.url)).size<400_000,m.file+' stays small');
 }
});

test('every local source link points to an existing chapter',()=>{
 for(const id of IDS)for(const t of LABS[id].topics)for(const s of t.sources){
  if(/^https:/.test(s.href))continue;
  const [file,anchor]=s.href.split('#');
  assert.ok(read('../../'+file).includes(`id="${anchor}"`),s.href);
 }
});

test('the checker refuses broken exercises but always shows media, even without a licence record',()=>{
 const lab=structuredClone(RAW.airway);
 const ex=lab.topics[3].exercises[0];
 assert.doesNotThrow(()=>loadLab({...lab,topics:[{...lab.topics[3],exercises:[{...ex,items:[{...ex.items[0],media:'airway/new-photo.webp'}]}]}]}));
 assert.throws(()=>loadLab({...lab,topics:[{...lab.topics[3],exercises:[{...ex,items:[{...ex.items[0],answer:'Κάτι άλλο'}]}]}]}),/not in options/);
 const tf=lab.topics[3].exercises[2];
 assert.throws(()=>loadLab({...lab,topics:[{...lab.topics[3],exercises:[{...tf,items:[{text:'Δώσε 15 L/min',answer:true,why:'x'}]}]}]}),/dose/);
 assert.throws(()=>loadLab({...lab,topics:[{...lab.topics[0],sources:[]}]}),/no sources/);
 const ord=lab.topics[0].exercises[1];
 assert.throws(()=>loadLab({...lab,topics:[{...lab.topics[0],exercises:[{...ord,start:ord.steps.map((_,i)=>i)}]}]}),/already solved/);
 assert.ok(Object.isFrozen(LABS.airway.topics[0].exercises[0]));
});

/** The correct answer of each exercise, in the shape the UI sends. */
function correct(e){
 switch(e.type){
  case 'label':return {...e.answers};
  case 'identify':case 'truefalse':case 'classify':case 'locate':return e.items.map(it=>it.answer);
  case 'order':return e.steps.map(s=>s.id);
  case 'numbers':return Object.fromEntries(e.fields.map(f=>[f.id,String(f.answer)]));
 }
}
test('every exercise of every lab scores full marks for the right answers and less for a wrong one',()=>{
 const seen=new Set();
 for(const id of IDS)for(const t of LABS[id].topics)for(const e of t.exercises){
  seen.add(e.type);
  const r=grade(e,correct(e));assert.equal(r.correct,r.total,`${id}/${e.id}`);assert.ok(r.total>0);
  const empty=e.type==='order'?null:grade(e,e.type==='label'||e.type==='numbers'?{}:[]);
  if(empty)assert.equal(empty.correct,0,`${id}/${e.id} empty`);
 }
 assert.deepEqual([...seen].sort(),[...TYPES].sort(),'all exercise types are used');
});

test('order grading rejects duplicates; numbers accept the tolerance and a decimal comma',()=>{
 const ord=LABS.airway.topics[0].exercises[1];
 assert.throws(()=>grade(ord,['nose','nose','larynx','trachea','bronchi','bronchioles','alveoli']));
 const n=LABS.auscultation.topics[1].exercises[0];
 assert.equal(grade(n,{cycles:'12',rate:'72'}).correct,2,'±1 cycle, ±8 per minute');
 assert.equal(grade(n,{cycles:'10',rate:'60'}).correct,0);
 assert.equal(grade(n,{cycles:'13,0',rate:''}).correct,1,'empty is wrong');
});

test('chest points: heart sites on the intercostal spaces of the drawing, patient sides mirrored front/back',()=>{
 const f=Object.fromEntries(CHEST_POINTS.front.map(p=>[p.id,p]));
 // Rib k at the sternum is drawn at y=62+22k: the 2nd space lies between ribs 2 and 3, and so on.
 const space=k=>62+22*k+11;
 assert.equal(f.aortic.y,space(2));assert.equal(f.pulmonic.y,space(2));assert.equal(f.erb.y,space(3));
 assert.equal(f.tricuspid.y,space(4));assert.equal(f.mitral.y,space(5));
 assert.ok(f.aortic.x<140&&f.pulmonic.x>160,'aortic right of sternum = left on screen in the front view');
 const b=Object.fromEntries(CHEST_POINTS.back.map(p=>[p.id,p]));
 assert.ok(b['b-rl'].x>150&&b['b-ll'].x<150,'patient right = right on screen in the back view');
});

const wav=f=>{const b=readFileSync(new URL('./media/'+f,import.meta.url));return parseWav(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength));};
test('recordings: 8 kHz mono, at least 5 s, clean clips not clipped, the raw noisy clip saturated',()=>{
 for(const m of MEDIA.filter(x=>x.file.endsWith('.wav'))){
  const s=wav(m.file);assert.equal(s.rate,8000,m.file);assert.ok(s.samples.length/s.rate>=5,m.file);
  if(!m.file.includes('noisy'))assert.ok(clippedFraction(s.samples)<0.0005,m.file+' not clipped');
 }
 assert.ok(clippedFraction(wav('auscultation/noisy-1.wav').samples)>0.005,'noisy-1 keeps the saturation of the original');
});

test('spectrogram finds the frequency of a pure tone',()=>{
 const rate=8000,samples=Float32Array.from({length:8000},(_,i)=>Math.sin(2*Math.PI*440*i/rate));
 const sp=spectrogram(samples,rate,{maxHz:1500});
 let best=0;for(let r=0;r<sp.rows;r++)if(sp.db[r]>sp.db[best])best=r;
 assert.ok(Math.abs(best*sp.hzPerRow-440)<=sp.hzPerRow,'peak at 440 Hz');
 assert.throws(()=>parseWav(new ArrayBuffer(16)));
});
