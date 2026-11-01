import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const rootPages=[
 'index.html','saek.html','eoppep.html','theory.html','practical_exam.html',
 'saek-exams.html','farmaka.html','seminar-prep.html','protocols.html',
 'search.html','profession-law.html','mentor-ecg.html','mentor-next.html',
 ...Array.from({length:20},(_,i)=>'saek-course-'+String(i+1).padStart(2,'0')+'.html')
];
test('one ATLA companion on migrated desktop/mobile entrypoints',()=>{
 for(const page of rootPages){
  const html=read(page);
  assert.ok(html.includes('src="atla/assistant.mjs"'),page+' should load ATLA');
  assert.ok(!html.includes('src="mentor/presence/presence.mjs"'),page+' should not load legacy 3D companion');
  assert.ok(!html.includes('src="mentor-study-bridge.mjs"'),page+' should not open separate MENTOR Lab and DEBRIEF');
 }
 const anatomy=read('ui-tools/anatomy-3d/index.html');
 assert.ok(anatomy.includes('src="../../atla/assistant.mjs"'));
});
test('home removes heavyweight avatar and keeps core learning navigation',()=>{
 const home=read('index.html');
 assert.ok(!home.includes('id="mentor-home-presence-frame"'));
 assert.ok(!home.includes('src="mentor-home.js"'));
 assert.ok(home.includes('data-atla-open'));
 for(const target of ['saek.html','eoppep.html','farmaka.html','seminar-prep.html'])assert.ok(home.includes('href="'+target+'"'),target);
 const eop=read('eoppep.html');assert.ok(eop.includes('href="practical_exam.html"'));
});
test('ATLA reuses one existing AI path, retains no-write behavior and exam guard',()=>{
 const app=read('atla/assistant.mjs');
 assert.ok(app.includes("from './ai/client.mjs'"));
 assert.ok(read('mentor/ai/client.mjs').includes("export * from '../../atla/ai/client.mjs'"));
 assert.match(app,/examMode\(location\.pathname\)/);
 assert.match(app,/riskGuard\(q\)/);
 assert.match(app,/transformSource\(x,await fetchJSON\(x\.file\)\)/);
 assert.ok(!/\.setItem\('ekab\.saek|\.setItem\('ekab-eoppep/.test(app),'ATLA may not write existing grades');
 const config=read('mentor/ai/config.mjs');
 assert.ok(config.includes('endpoint:""'),'Migrated chat must not claim a deployed AI endpoint');
});
