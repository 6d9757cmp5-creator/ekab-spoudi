/**
 * Ownership / backwards-compatibility gate for Anatomy, Pharmacology, Seminars, ECG Lab.
 * Does not certify clinical accuracy or diagnose any condition.
 */
import assert from 'node:assert/strict';
import {readFileSync,existsSync,statSync} from 'node:fs';
const read=p=>readFileSync(p,'utf8');
const yes=p=>{assert(existsSync(p),'Missing '+p);return read(p)};
const anatomy='tools/anatomy-3d/';
const pharma='tools/pharmacology/';
const seminar='tools/seminars/';
const ecg='tools/ecg-lab/';
for(const d of [anatomy,pharma,seminar,ecg])yes(d+'README.md');
for(const p of ['index.html','hires-anatomy.js','greek-names.js','anatomy.css','anatomy-responsive.css','test-greek-names.mjs'])yes(anatomy+p);
const oldAtlas=yes('ui-tools/anatomy-3d/index.html');
for(const item of ['../../tools/anatomy-3d/hires-anatomy.js','../../tools/anatomy-3d/anatomy.css','../../tools/anatomy-3d/anatomy-responsive.css'])
 assert(oldAtlas.includes(item),'Legacy 3D anatomy page not delegated to canonical source: '+item);
const atlas=yes(anatomy+'index.html');
assert(atlas.includes('src="hires-anatomy.js?'),'Canonical 3D anatomy entry not functional');
assert(atlas.includes('../../mentor/presence/presence.mjs'),'Mentor optional companion missing');
for(const f of ['farmaka-catalog.js','farmaka-clinical-2026.js','farmaka-ui.js','farmaka-adaptive-bank.js','farmaka-cases.js'])
 yes(pharma+f);
const page=yes('farmaka.html'),ordering=['farmaka-catalog.js','farmaka-clinical-2026.js','farmaka-ui.js','farmaka-adaptive-bank.js','farmaka-cases.js'];
let prev=-1;
for(const f of ordering){
 const token='src="tools/pharmacology/'+f+'?';
 const i=page.indexOf(token);
 assert(i>prev,'Pharmacology canonical scripts missing or out of order: '+f);
 prev=i;
 assert(!page.includes('src="'+f+'?'),'Legacy pharmaceutical scripts still active: '+f);
}
for(const f of ['seminar-tracks.js','seminar-prep.js','seminar-prep.css'])yes(seminar+f);
const seminarPage=yes('seminar-prep.html');
assert(seminarPage.indexOf('src="tools/seminars/seminar-tracks.js?')>0);
assert(seminarPage.indexOf('src="tools/seminars/seminar-prep.js?')>seminarPage.indexOf('src="tools/seminars/seminar-tracks.js?'),'Seminar dependency order broken');
assert(seminarPage.includes('href="tools/seminars/seminar-prep.css?'));
assert(seminarPage.includes('src="ai-grading-client.js?'),'Shared AI service must not be copied');
assert(yes('seminar-sync.js').includes('ekab.seminar-prep.local.v1'),'Progress key modified');
for(const f of ['app/ecg.js','app/ecg-practice.js','core/ecg-practice.mjs','core/ecg-practice.test.mjs','core/ecg-synthetic.mjs','core/ecg-synthetic.test.mjs'])yes(ecg+f);
assert(yes('mentor-ecg.js').includes('./tools/ecg-lab/app/ecg.js'),'ECG public root entry broken');
assert(yes('mentor-ecg.html').includes('src="tools/ecg-lab/app/ecg-practice.js"'),'ECG exercise not delegated');
for(const f of ['app/ecg.js','app/ecg-practice.js','core/ecg-practice.mjs','core/ecg-synthetic.mjs']){
 const old=yes('mentor/'+f);
 assert(old.length<250&&old.includes('tools/ecg-lab/'),'ECG legacy path not a lightweight shim: '+f);
}
assert(yes(ecg+'core/ecg-practice.mjs').includes("ekab.mentor.ecg-practice.v1"),'ECG progress must remain readable');
const sw=yes('sw.js');
for(const f of [
 './tools/pharmacology/farmaka-catalog.js','./tools/pharmacology/farmaka-cases.js',
 './tools/seminars/seminar-tracks.js','./tools/seminars/seminar-prep.js',
 './tools/ecg-lab/core/ecg-practice.mjs','./tools/ecg-lab/app/ecg-practice.js',
 './tools/anatomy-3d/hires-anatomy.js'
])assert(sw.includes('"'+f+'"'),'Offline cache missing '+f);
assert(yes('index.html').includes('ui-tools/anatomy-3d/index.html'),'Public anatomy link changed unexpectedly');
const wf=yes('.github/workflows/app-load.yml');
assert(wf.includes('node scripts/verify-specialized-tools.mjs'));
console.log('PASS: four independent tool owners; active entrypoints, loading order, offline cache, shared services, ECG progress and legacy URLs preserved');
