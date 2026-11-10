import test from 'node:test';
import assert from 'node:assert/strict';
import {ECG_EXAMPLE_CASES, createEducationalTwelveLead} from './ecg-examples.mjs';

const leads=['I','II','III','aVR','aVL','aVF','V1','V2','V3','V4','V5','V6'];

test('five labelled synthetic examples exist and are not claimed as patient recordings', () => {
  assert.equal(ECG_EXAMPLE_CASES.length,5);
  assert.equal(new Set(ECG_EXAMPLE_CASES.map(c=>c.id)).size,5);
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
