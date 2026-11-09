import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {practiceHref} from './practice/saek-practice.mjs';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('SAEK chapter recall remains local and does not open retired patient simulators',()=>{
 const practice=read('atla/practice/saek-practice.mjs');
 const assistant=read('atla/assistant.mjs');
 for(const args of [
  ['saek-course-01.html','lesson-10','Καρδιά'],
  ['../evil.html','lesson-1','test'],
  ['saek-course-21.html','lesson-1','test']
 ])assert.equal(practiceHref(...args),'');
 assert.match(practice,/\.reader-chapters > details\.reader-fold/);
 assert.match(practice,/\.lesson-sos/);
 assert.match(practice,/dataset\.atlaOpen='true'/);
 assert.match(assistant,/import\('\.\/practice\/saek-practice\.mjs'\)/);
 assert.doesNotMatch(practice,/mentor-next\.html|localStorage|sessionStorage|indexedDB/);
 assert.doesNotMatch(assistant,/import\('\.\/practice\/cockpit-entry\.mjs'\)/);
});

test('learner data and clinical review remain independent from legacy simulation',()=>{
 const practice=read('atla/practice/saek-practice.mjs');
 const ai=read('atla/ai/config.mjs');
 const ecg=read('mentor-ecg.html');
 assert.match(practice,/ekab:atlas-context/);
 assert.doesNotMatch(practice,/grader|score\s*=/);
 assert.match(ai,/endpoint:"https:\/\/ekab-spoudi-mentor-chat\.6d9757cmp5\.workers\.dev\/"/);
 assert.match(ecg,/tools\/ecg-lab\/app\/ecg-practice\.js/);
 for(const p of ['mentor-next.html','mentor-live.html','mentor-scenarios.html']){
  assert.match(read(p),/http-equiv="refresh"/);
  assert.doesNotMatch(read(p),/patient-simulator\/app\//);
 }
});
