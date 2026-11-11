import test from 'node:test';
import assert from 'node:assert/strict';
import {ECG_EXAMPLE_CASES, createEducationalTwelveLead} from './ecg-examples.mjs';

const leads=['I','II','III','aVR','aVL','aVF','V1','V2','V3','V4','V5','V6'];

test('eight labelled synthetic examples exist and are not claimed as patient recordings', () => {
  assert.equal(ECG_EXAMPLE_CASES.length,8);
  assert.equal(new Set(ECG_EXAMPLE_CASES.map(c=>c.id)).size,8);
  for(const c of ECG_EXAMPLE_CASES){
    assert.ok(c.label && c.description);
    const recording=createEducationalTwelveLead(c.id);
    assert.equal(recording.synthetic,true);
    assert.match(recording.metadata.origin,/no clinical source or patient data/i);
  }
});

test('every example has ten seconds, 12 leads, finite amplitudes, and consistent limb leads', () => {
  for(const entry of ECG_EXAMPLE_CASES){
    const {sampleRate,samples}=createEducationalTwelveLead(entry.id);
    assert.equal(sampleRate,200);
    assert.equal(samples.length,2000);
    for(const sample of samples){
      assert.deepEqual(Object.keys(sample),leads);
      for(const lead of leads) assert.ok(Number.isFinite(sample[lead]),entry.id+' '+lead);
      assert.ok(Math.abs(sample.III-(sample.II-sample.I))<1e-10);
      assert.ok(Math.abs(sample.aVR+(sample.I+sample.II)/2)<1e-10);
      assert.ok(Math.abs(sample.aVL-(sample.I-sample.II/2))<1e-10);
      assert.ok(Math.abs(sample.aVF-(sample.II-sample.I/2))<1e-10);
    }
  }
});

test('examples are deterministic, distinct, and reject unknown ids or invalid rates',()=>{
  const first=createEducationalTwelveLead('sinus72');
  const repeated=createEducationalTwelveLead('sinus72');
  assert.deepEqual(first.samples,repeated.samples);
  assert.notDeepEqual(first.samples,createEducationalTwelveLead('af-irregular').samples);
  assert.notDeepEqual(first.samples,createEducationalTwelveLead('paced64').samples);
  assert.throws(()=>createEducationalTwelveLead('unknown'));
  assert.throws(()=>createEducationalTwelveLead('sinus72',20));
  assert.throws(()=>createEducationalTwelveLead('sinus72',1000));
});

// ST level 150 ms after each R wave, relative to the PR segment, minus the same value of the normal example.
function stShift(id){
  const measure=rid=>{
    const {samples,sampleRate}=createEducationalTwelveLead(rid);
    const II=samples.map(x=>x.II),beats=[];
    for(let i=5;i<II.length-60;i++)if(II[i]>.6&&II[i]>=II[i-1]&&II[i]>=II[i+1]&&(!beats.length||i-beats.at(-1)>40))beats.push(i);
    return Object.fromEntries(leads.map(lead=>[lead,beats.reduce((v,b)=>v+samples[b+Math.round(.15*sampleRate)][lead]-samples[b-Math.round(.08*sampleRate)][lead],0)/beats.length]));
  };
  const base=measure('sinus72'),st=measure(id);
  return Object.fromEntries(leads.map(lead=>[lead,st[lead]-base[lead]]));
}
test('schematic STEMI examples raise ST in their territory with reciprocal depression', () => {
  const up=(st,ls)=>ls.forEach(l=>assert.ok(st[l]>.15,l+' should be elevated: '+st[l].toFixed(2)));
  const down=(st,ls)=>ls.forEach(l=>assert.ok(st[l]<-.05,l+' should be depressed: '+st[l].toFixed(2)));
  const anterior=stShift('stemi-anterior');up(anterior,['V1','V2','V3','V4']);down(anterior,['III','aVF']);
  const inferior=stShift('stemi-inferior');up(inferior,['II','III','aVF']);down(inferior,['aVL']);
  const lateral=stShift('stemi-lateral');up(lateral,['I','aVL','V5','V6']);down(lateral,['III']);
  for(const id of ['stemi-anterior','stemi-inferior','stemi-lateral'])
    assert.match(ECG_EXAMPLE_CASES.find(c=>c.id===id).description,/Σχηματικό παράδειγμα.*Δεν είναι κλινική καταγραφή/);
});
