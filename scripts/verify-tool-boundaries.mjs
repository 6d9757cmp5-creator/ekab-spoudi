/**
 * Structural regression gate: independent tools and root URLs preserved.
 */
import assert from 'node:assert/strict';
import {readFileSync,existsSync,statSync} from 'node:fs';
import {resolve} from 'node:path';
const root=process.cwd();
const read=path=>readFileSync(resolve(root,path),'utf8');
const file=path=>{assert(existsSync(resolve(root,path)),'missing: '+path);return resolve(root,path)};
const dir='tools/patient-simulator';
const expected=[
 'app/next-sim.mjs','app/next-scene.mjs','app/next-patient-mesh.mjs','app/next-patient-mesh.test.mjs',
 'core/next-cases.mjs','core/next-cases.test.mjs','core/next-sim.mjs','core/next-sim.test.mjs',
 'core/next-review.mjs','core/next-review.test.mjs','styles/next-sim.css',
 'assets/cc0-human-body.glb','assets/CC0-ASSET-NOTICE.md','assets/patients/alex-standing.glb',
 'assets/patients/daniel-lying.glb','assets/patients/amara-sitting.glb',
 'assets/patients/README.md','vendor/model-viewer.min.js','vendor/MODEL-VIEWER-LICENSE.txt'
];
for(const path of expected)file(dir+'/'+path);
for(const name of ['README.md','mentor-os/README.md','protocol-lab/README.md','saek-study/README.md','eoppep-exams/README.md','shared/README.md'])
 file('tools/'+name);
for(const name of ['index.html','mentor-lab.html','mentor-live.html','mentor-next.html','saek.html','eoppep.html','protocols.html','sw.js'])
 file(name);
const html=read('mentor-next.html');
assert(html.includes('href="tools/patient-simulator/styles/next-sim.css"'));
assert(html.includes('src="tools/patient-simulator/app/next-sim.mjs"'));
assert(html.includes('src="mentor/presence/presence.mjs"'),'MENTOR optional companion should remain separate');
const app=read(dir+'/app/next-sim.mjs');
assert(!/from ['"][^'"]*mentor\//.test(app));
assert(app.includes("from '../core/next-sim.mjs'"));
assert(app.includes("new URL(READY_ASSETS[key],import.meta.url)"));
const sw=read('sw.js');
assert(sw.includes('./tools/patient-simulator/app/next-sim.mjs'));
assert(sw.includes('./tools/patient-simulator/assets/cc0-human-body.glb'));
assert(!sw.includes('./mentor/app/next-sim.mjs'));
const wf=read('.github/workflows/app-load.yml');
assert(wf.includes('node scripts/verify-tool-boundaries.mjs'));
assert(wf.includes('tools/patient-simulator/core/next-sim.test.mjs'));
const download=read('.github/workflows/import-mentor-patients.yml');
assert(download.includes('tools/patient-simulator/assets/patients'));
assert(!download.includes('mkdir -p mentor/assets/patients'));
for(const name of ['alex-standing','daniel-lying','amara-sitting']){
 const path=name+'.glb',p=file(dir+'/assets/patients/'+path);
 assert(statSync(p).size>3000000,'incomplete '+path);
 const h=readFileSync(p).subarray(0,12);
 assert.equal(h.toString('ascii',0,4),'glTF','invalid '+path);
 assert.equal(h.readUInt32LE(4),2,'unsupported '+path);
}
for(const name of ['app/next-sim.mjs','app/next-scene.mjs','app/next-patient-mesh.mjs','core/next-sim.mjs','core/next-review.mjs','core/next-cases.mjs']){
 const old=read('mentor/'+name);
 assert(old.length<350,'old '+name+' is not a small compatibility shim');
 assert(old.includes('tools/patient-simulator/'),'old '+name+' missing redirect');
}
assert(read('tools/mentor-os/README.md').includes('mentor/'));
console.log('PASS: independent simulator modules, CC0 assets, root URLs, MENTOR boundary, legacy shims and CI references');
