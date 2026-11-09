/**
 * Regression gate for an actually built, offline-importable, unified patient 3D stage.
 * Does not certify photorealism, realistic physiology, medical skills or comparable Body Interact quality.
 */
import assert from 'node:assert/strict';
import {readFileSync,statSync} from 'node:fs';
const read=p=>readFileSync(p,'utf8');
const root='tools/patient-simulator/';
const source=read(root+'app/unified-stage.mjs');
const bundle=read(root+'vendor/unified-stage.bundle.mjs');
const controller=read(root+'app/next-sim.mjs');
const html=read('mentor-next.html'),css=read(root+'styles/cockpit-theme.css'),sw=read('sw.js');
assert(bundle.length>100000&&bundle.length<5_000_000,'pin/sizing: stage bundle absent or invalid');
assert(source.includes("import * as THREE from 'three'"),'authored renderer missing');
assert(source.includes("from 'three/addons/loaders/GLTFLoader.js'"),'real glTF 2 loader missing');
assert(source.includes("from 'three/addons/controls/OrbitControls.js'"),'orbit camera missing');
assert(source.includes("export function mountUnifiedStage("),'public 3D stage API missing');
for(const part of ['WebGLRenderer','GLTFLoader','SCENE_PATIENTS','buildEnvironment','buildEquipment','onSelect','setState','dispose'])
 assert(source.includes(part),'3D stage missing: '+part);
for(const scene of ['road','home','square'])assert(source.includes(scene+':Object.freeze'), 'missing environment '+scene);
for(const label of ['alex','amara','daniel'])assert(source.includes(label),'missing real GLB model '+label);
assert(!/https?:\/\/cdn/i.test(source),'stage must not need a CDN at runtime');
assert(source.includes('photographicRoad')&&source.includes('ROAD_MATERIAL_FILES'),'licensed PBR road loader missing');
assert(bundle.includes('asphalt_03_diff_1k.jpg')&&bundle.includes('asphalt_03_normal_1k.jpg')&&bundle.includes('asphalt_03_rough_1k.jpg'),'built renderer missing local PBR URLs');
assert(source.includes("onStatus('fallback')"),'PBR must not require network success to render');
assert(controller.includes("import('../vendor/unified-stage.bundle.mjs')"),'controller not using local stage bundle');
assert(controller.includes("await mounted.setState(stageState())"),'controller not linking UI state to stage');
assert(controller.includes("void unifiedStage.setState(next)"),'case/patient updates not sent to stage');
assert(controller.includes("await enableRealisticMode()"),'failure did not preserve GLB fallback');
assert(html.includes('id="next-unified-overlay"')&&html.includes('id="next-unified-host"'),'stage DOM missing');
assert(css.includes('.next-unified-overlay')&&css.includes('.next-unified-host'),'3D CSS missing');
assert(sw.includes('./tools/patient-simulator/vendor/unified-stage.bundle.mjs'),'bundle not cached for offline browser');
assert(statSync(root+'vendor/THREE-LICENSE.txt').size>1000,'upstream MIT license missing');
const materialRegistry=read(root+'assets/materials/ASSET_PROVENANCE.md');
assert(materialRegistry.includes('polyhaven.com/a/asphalt_03')&&materialRegistry.includes('CC0'),'asset license provenance missing');
for(const name of ['asphalt_03_diff_1k.jpg','asphalt_03_normal_1k.jpg','asphalt_03_rough_1k.jpg']){
 const bytes=readFileSync(root+'assets/materials/'+name);
 assert(bytes.length>100_000&&bytes.length<4_000_000,'invalid PBR 1K size: '+name);
 assert(bytes[0]===0xff&&bytes[1]===0xd8&&bytes[2]===0xff,'not JPEG PBR map: '+name);
 assert(sw.includes('./tools/patient-simulator/assets/materials/'+name),'PBR asset omitted from offline cache: '+name);
}

for(const file of ['alex-standing.glb','daniel-lying.glb','amara-sitting.glb']){
 const buf=readFileSync(root+'assets/patients/'+file);
 assert.equal(buf.toString('utf8',0,4),'glTF',file+': malformed GLB');
 assert.equal(buf.readUInt32LE(4),2,file+': GLB v2 required');
 assert(buf.length>3_000_000,file+': asset too small');
}
console.log('PASS: local bundled Three.js r187, one original stage, two CC0 patients, environments, props, case and camera linkage, fallback and license');
