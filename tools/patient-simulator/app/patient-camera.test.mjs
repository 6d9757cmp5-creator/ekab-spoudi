import test from 'node:test';
import assert from 'node:assert/strict';
import {patientCameraPreset,VIEW_PRESETS} from './patient-camera.mjs';

test('every supported view has real model-viewer camera controls',()=>{
 for(const view of ['scene','full','head','torso','legs']){
  const output=patientCameraPreset(view,'alex');
  assert.equal(output.view,view);
  assert.match(output.orbit,/deg \d+%$/);
  assert.ok(output.fieldOfView);
  assert.equal(output.target,'auto auto auto');
 }
});
test('bounds-driven target follows an upright model, not an invented clinical landmark',()=>{
 const b={dimensions:{x:.8,y:1.8,z:.5},center:{x:0,y:.9,z:0}};
 assert.equal(patientCameraPreset('head','alex',b).target,'0m 1.53m 0m');
 assert.equal(patientCameraPreset('legs','alex',b).target,'0m 0.324m 0m');
 assert.equal(patientCameraPreset('full','alex',b).target,'0m 0.9m 0m');
 assert.ok(patientCameraPreset('head','alex',b).approximate);
 assert.match(patientCameraPreset('head','alex',b).message,/δεν αποτελεί εξέταση/);
});
test('reclined models do not fake anatomical region location',()=>{
 const b={dimensions:{x:1.8,y:.8,z:.6},center:{x:0,y:0,z:0}};
 const head=patientCameraPreset('head','daniel',b);
 assert.equal(head.target,'auto auto auto');
 assert.equal(head.approximate,false);
 assert.match(head.message,/δεν υπάρχει επιβεβαιωμένη ανατομική στόχευση/);
});
test('untrusted camera bounds or view fail safely',()=>{
 assert.equal(patientCameraPreset('head','alex',{dimensions:{x:0,y:NaN,z:0},center:{x:0,y:0,z:0}}).target,'auto auto auto');
 assert.equal(patientCameraPreset('hack','alex').view,'scene');
 assert.equal(Object.keys(VIEW_PRESETS).length,5);
});
