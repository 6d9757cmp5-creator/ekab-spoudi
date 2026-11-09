/**
 * Structural migration gate: ECG is the only active simulated-signal learning
 * tool; patient-simulator files remain in Git solely for reversible migration.
 * Does not bypass ECG scientific/media approval or claim diagnostic validity.
 */
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
const read=path=>readFileSync(path,'utf8');
for(const p of ['index.html','paramedic.html','mentor-lab.html','mentor-ecg.html','sw.js',
 'tools/ecg-lab/core/ecg-synthetic.mjs','tools/ecg-lab/core/ecg-practice.mjs',
 'tools/mentor-os/README.md','tools/anatomy-3d/README.md'])
 assert(existsSync(p),'missing active learning resource '+p);
const ecg=read('mentor-ecg.html'),hub=read('paramedic.html'),sw=read('sw.js'),registry=JSON.parse(read('services/registry.json'));
assert.match(ecg,/src="mentor-ecg.js"/);
assert.match(ecg,/src="tools\/ecg-lab\/app\/ecg-practice\.js"/);
assert.match(hub,/href="mentor-ecg\.html"/);
assert.doesNotMatch(hub,/mentor-next\.html|mentor-live\.html|mentor-scenarios\.html/);
for(const path of ['mentor-next.html','mentor-live.html','mentor-scenarios.html']){
 const html=read(path);
 assert.match(html,/http-equiv="refresh"/);
 assert.match(html,/mentor-ecg\.html/);
 assert.doesNotMatch(html,/src="tools\/patient-simulator\//);
}
const lab=read('mentor-lab.html');
assert.match(lab,/src="mentor\/app\/personal-v1\.js"/);
assert.match(lab,/src="atla\/assistant\.mjs"/);
assert.doesNotMatch(lab,/src="mentor-lab\.js"/);
assert(!registry.entries.some(e=>['patient-simulator','scenario-library'].includes(e.id)));
assert(registry.entries.some(e=>e.id==='ecg-lab'));
assert(sw.includes('"./mentor-ecg.html"')&&sw.includes('"./tools/ecg-lab/app/ecg-practice.js"'));
assert(!sw.includes('"./tools/patient-simulator/app/next-sim.mjs"'));
assert(!sw.includes('"./tools/patient-simulator/assets/cc0-human-body.glb"'));
assert(read('.github/workflows/app-load.yml').includes('node scripts/verify-tool-boundaries.mjs'));
console.log('PASS: ECG canonical and learner data preserved; retired patient simulators inaccessible via public hub and offline cache');
