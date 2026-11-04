import test from 'node:test';
import assert from 'node:assert/strict';
import {buildCockpitEcgPoints} from './cockpit-ecg.mjs';
import {CASES,newSession,patientVitals} from '../core/next-sim.mjs';
import {createSyntheticEcg,toSvgPoints} from '../../ecg-lab/core/ecg-synthetic.mjs';

test('every existing case and patient supports a deterministic read-only educational ECG preview',()=>{
  for(const scenario of CASES){
    for(const patient of scenario.patients){
      for(let minute=0;minute<=30;minute++){  // Exercise every reachable minute, not just three snapshots.
        const session={...newSession(scenario.id),minute,person:patient.id};
        const bpm=patientVitals(session,patient.id).hr;
        const points=buildCockpitEcgPoints(bpm);
        assert.match(points,/^\d+\.\d+,\d+\.\d+/);
        assert.equal(points,buildCockpitEcgPoints(bpm));
        assert.equal(points,toSvgPoints(createSyntheticEcg({bpm,seconds:4,samples:240}),{width:120,height:28}),
          'The cockpit may only present the canonical ECG Lab waveform for '+scenario.id+' / '+patient.id+' / minute '+minute);
        assert.equal(session.events.length,0,'ECG preview must not record or change actions');
        assert.equal(session.minute,minute,'ECG must never advance the simulation clock');
        assert.equal(session.person,patient.id,'ECG must not change patient focus');
      }
    }
  }
});

test('invalid, unmodeled or out-of-range rates fail closed',()=>{
  for(const value of [undefined,null,0,44,136,1000,75.5,NaN,Infinity,'75']){
    assert.equal(buildCockpitEcgPoints(value),'');
  }
});
