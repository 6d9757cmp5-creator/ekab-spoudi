import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {practiceHref} from './practice/saek-practice.mjs';
import {readCockpitEntry} from './practice/cockpit-entry.mjs';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('SAEK active recall links preserve exact chapter context without grade or notes',()=>{
 const url=practiceHref('saek-course-01.html','lesson-10','Καρδιά, μεγάλα αγγεία και βαλβίδες');
 assert.ok(url.startsWith('mentor-next.html?'));
 const query=url.split('?')[1];
 const parsed=readCockpitEntry(query);
 assert.deepEqual(parsed,{from:'saek-course-01.html',chapter:'lesson-10',focus:'Καρδιά, μεγάλα αγγεία και βαλβίδες',returnHref:'saek-course-01.html#lesson-10'});
 assert.equal(practiceHref('../evil.html','lesson-1','test'),'');
 assert.equal(practiceHref('saek-course-01.html','lesson-101','test'),'');
 assert.equal(practiceHref('saek-course-21.html','lesson-1','test'),'');
 assert.equal(readCockpitEntry('from=saek-course-01.html&chapter=lesson-999'),null);
 assert.equal(readCockpitEntry('from=javascript%3Aevil&chapter=lesson-1'),null);
});

test('practice is one shared opt-in module, not 247 copied simulators',()=>{
 const app=read('atla/assistant.mjs');
 assert.match(app,/import\('\.\/practice\/saek-practice\.mjs'\)/);
 assert.match(app,/import\('\.\/practice\/cockpit-entry\.mjs'\)/);
 assert.match(app,/ekab:atlas-context/);
 const practice=read('atla/practice/saek-practice.mjs');
 assert.match(practice,/\.reader-chapters > details\.reader-fold/);
 assert.match(practice,/\.lesson-sos/);
 assert.match(practice,/data\.atlaOpen='true'/);
 assert.doesNotMatch(practice,/localStorage|sessionStorage|indexedDB|grader|score.*=/);
 const cockpit=read('atla/practice/cockpit-entry.mjs');
 assert.match(cockpit,/data\.atlaOpen='true'/);
 assert.match(cockpit,/returnHref/);
 assert.match(cockpit,/δεν ισχυρίζεται ότι αυτά αντιστοιχούν ιατρικά/);
});

test('ATLAS is optional, synthetic cases are still simulator-owned',()=>{
 const app=read('tools/patient-simulator/app/next-sim.mjs');
 assert.match(app,/from '\.\.\/core\/next-sim\.mjs'/);
 const bridge=read('atla/practice/cockpit-entry.mjs');
 assert.doesNotMatch(bridge,/execute\(|setFocus\(|saveSession\(|patientVitals\(/);
 const ai=read('atla/ai/config.mjs');
 assert.match(ai,/endpoint:""/);
});
