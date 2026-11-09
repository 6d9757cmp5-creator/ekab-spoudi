import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const exists=path=>existsSync(new URL('../'+path,import.meta.url));

test('SAEK chapters no longer inject simulator practice links',()=>{
 const app=read('atla/assistant.mjs');
 assert.doesNotMatch(app,/practice\/saek-practice|practice\/cockpit-entry/);
 assert.equal(exists('atla/practice/saek-practice.mjs'),false);
 assert.equal(exists('atla/practice/cockpit-entry.mjs'),false);
 assert.match(app,/ekab:atlas-context/);
});

test('ATLA routes simulation requests to the EOPPEP practical exam only',()=>{
 const app=read('atla/assistant.mjs');
 assert.doesNotMatch(app,/'mentor-next\.html'/,'ATLA has no general clinical simulator route');
 assert.match(app,/\['Πρακτικό ΕΟΠΠΕΠ','practical_exam\.html'/);
});

test('ATLAS is optional, synthetic cases are still simulator-owned',()=>{
 const app=read('tools/patient-simulator/app/next-sim.mjs');
 assert.match(app,/from '\.\.\/core\/next-sim\.mjs'/);
 const ai=read('atla/ai/config.mjs');
 assert.match(ai,/endpoint:"https:\/\/ekab-spoudi-mentor-chat\.6d9757cmp5\.workers\.dev\/"/);
});
