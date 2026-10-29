import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {HOLOGRAM_CAPABILITIES,mountMentorHologram} from '../mentor-3d.mjs';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
test('3D renderer is real, local, separate from learning state and honest about capabilities',()=>{
 assert.equal(HOLOGRAM_CAPABILITIES.geometry,'procedural-webgl-3d');
 assert.equal(HOLOGRAM_CAPABILITIES.ai,false);
 assert.equal(HOLOGRAM_CAPABILITIES.externalAssets,false);
 assert.match(HOLOGRAM_CAPABILITIES.mouth,/approximate/);
 const src=read('mentor/avatar/hologram.mjs');
 assert.match(src,/getContext\("webgl"/);
 assert.match(src,/gl\.drawElements/);
 assert.match(src,/uMvp/);
 assert.match(src,/gl\.DEPTH_TEST/);
 assert.match(src,/MutationObserver/);
 assert.doesNotMatch(src,/localStorage|indexedDB|sessionStorage|fetch\(|XMLHttpRequest|SpeechRecognition\(/);
});
test('Current classroom mounts the real 3D avatar using public-compatible bundle URL',()=>{
 const html=read('mentor-lab.html'),presence=read('mentor-presence.html');
 for(const id of ['mentor-cinematic-stage','mentor-real3d-canvas','mentor-real3d-status','mentor-avatar'])
  assert.ok(html.includes('id="'+id+'"'),id);
 assert.match(html,/src="mentor-real3d\.bundle\.mjs"/);
 assert.match(presence,/src="mentor-real3d\.bundle\.mjs"/);
 assert.match(presence,/mentor-real3d-canvas/);
});
test('Unsupported WebGL is a safe portrait fallback',()=>{
 const nodes={
  'mentor-3d-canvas':{getContext:()=>null},
  'mentor-avatar':{},
  'mentor-3d-panel':{},
  'mentor-view-3d':{disabled:false,title:''},
  'mentor-view-photo':{},
  'mentor-3d-rotation':{},
  'mentor-3d-status':{textContent:''},
  'mentor-3d-motion':{}
 };
 const visual={dataset:{}};
 const document={
  getElementById:id=>nodes[id]||null,
  querySelector:selector=>selector==='.mentor-intro-visual'?visual:null
 };
 assert.deepEqual(mountMentorHologram(document),{supported:false});
 assert.equal(nodes['mentor-view-3d'].disabled,true);
 assert.equal(visual.dataset.mentorView,'photo');
 assert.match(nodes['mentor-3d-status'].textContent,/φωτογραφίας/);
});
test('Legacy hologram renderer remains isolated while final avatar is used in the UI',()=>{
 const html=read('mentor-lab.html');
 const legacy=read('mentor/avatar/hologram.mjs');
 assert.match(html,/mentor-real3d\.bundle\.mjs/);
 assert.doesNotMatch(html,/id="mentor-3d-canvas"/);
 assert.match(legacy,/setView\("photo"\)/);
 assert.match(read('mentor-3d.css'),/data-mentor-view="3d"/);
});
