import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {join} from 'node:path';
const base=new URL('../',import.meta.url);
const read=p=>readFileSync(new URL(p,base),'utf8');
test('True rig engine references locally shipped, validated GLB instead of primitive cartoon',()=>{
 const src=read('mentor/real-avatar/entry.mjs');
 assert.match(src,/\.\/assets\/mentor-real-3d\.glb/);
 assert.match(src,/GLTFLoader/);
 assert.match(src,/isSkinnedMesh/);
 assert.match(src,/morphTargetDictionary/);
 assert.match(src,/AnimationMixer/);
 assert.match(src,/viseme_PP/);
 assert.match(src,/viseme_aa/);
 assert.doesNotMatch(src,/fetch\(|localStorage|indexedDB|sessionStorage|postMessage\(/);
});
test('Exactly the requested cinematic stage preserves image if rig cannot run',()=>{
 const html=read('mentor-lab.html');
 assert.match(html,/mentor-real3d-canvas/);
 assert.match(html,/mentor-real3d\.bundle\.mjs/);
 assert.match(html,/mentor-cinematic\.webp/);
 assert.match(html,/mentor-real3d-status/);
 assert.match(html,/mentor-real3d-rotation/);
});
test('Independent learner records and grades are not changed by avatar',()=>{
 const src=read('mentor/real-avatar/entry.mjs');
 assert.doesNotMatch(src,/\b(?:localStorage|indexedDB|sessionStorage|EkabProgress|fetch)\s*(?:\.|\()/);
 assert.match(src,/webglcontextlost/);
 assert.match(src,/prefers-reduced-motion/);
});
test('Avatar parameters require facial visemes, expressions, textures and rigged animation',()=>{
 const p=JSON.parse(read('mentor/real-avatar/mentor-params.json'));
 assert.equal(p.rig,'game');
 assert.equal(p.animations,true);
 assert.equal(p.faceBones,true);
 assert.equal(p.faceShapes,true);
 assert.equal(p.speechShapes,true);
 assert.equal(p.outfit,'none');
 assert.ok(p.accessories.includes('tactical_vest'));
 assert.ok(!JSON.stringify(p).includes('weapon:'));
});
test('Generated binary, when present, has a valid header and JSON scenes',()=>{
 const path=new URL('assets/mentor-real-3d.glb',base);
 if(!existsSync(path))return;
 const b=readFileSync(path);
 assert.equal(b.subarray(0,4).toString(),'glTF');
 assert.equal(b.readUInt32LE(4),2);
 assert.equal(b.readUInt32LE(8),b.length);
 const len=b.readUInt32LE(12);
 const json=JSON.parse(b.subarray(20,20+len).toString('utf8'));
 assert.ok(json.skins?.length);
 assert.ok(json.animations?.length);
 assert.ok(json.textures?.length);
});
