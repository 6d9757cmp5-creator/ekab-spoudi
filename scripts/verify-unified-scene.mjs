/** Negative deployment guard for retired WebGL patient scene; positive ECG ownership guard. */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(p,'utf8');
const hub=read('paramedic.html'),practical=read('practical_exam.html'),sw=read('sw.js');
for(const name of ['mentor-next.html','mentor-live.html','mentor-scenarios.html']){
 const s=read(name);
 assert.match(s,/meta http-equiv="refresh"/,'Retired route must redirect');
 assert.match(s,/mentor-ecg\.html/);
 assert.doesNotMatch(s,/next-canvas|next-stage|mentor\/app\/live\.js|tools\/patient-simulator\//);
}
assert.doesNotMatch(hub,/href="mentor-(?:next|live|scenarios)\.html"/);
assert.doesNotMatch(practical,/eoppep-practical-cockpit.mjs/);
assert.doesNotMatch(sw,/"\.\/tools\/patient-simulator\//);
assert.match(read('mentor-ecg.html'),/tools\/ecg-lab\/app\/ecg-practice.js/);
assert.match(read('tools/ecg-lab/app/ecg.js'),/ecg-synthetic.mjs/);
console.log('PASS: patient 3D WebGL scenes retired from active UI; canonical ECG preserved');
