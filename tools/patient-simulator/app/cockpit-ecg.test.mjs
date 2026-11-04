import test from 'node:test';
import assert from 'node:assert/strict';
import {buildCockpitEcgPoints} from './cockpit-ecg.mjs';
import {CASES,newSession,patientVitals} from '../core/next-sim.mjs';

test('every existing case and patient supports a deterministic read-only educational ECG preview',()=>{
  for(const scenario of CASES){
    for(const patient of scenario.patients){
      for(const minute of [0,15,30]){
        const session={...newSession(scenario.id),minute,person:patient.id};
        const bpm=patientVitals(session,patient.id).hr;
        const points=buildCockpitEcgPoints(bpm);
        assert.match(points,/^\d+\.\d+,\d+\.\d+/);
        assert.equal(points,buildCockpitEcgPoints(bpm));
        assert.equal(session.events.length,0,'ECG preview must not record or change actions');
      }
    }
  }
});

test('invalid, unmodeled or out-of-range rates fail closed',()=>{
  for(const value of [undefined,null,0,44,136,1000,75.5,NaN,Infinity,'75']){
    assert.equal(buildCockpitEcgPoints(value),'');
  }
});
