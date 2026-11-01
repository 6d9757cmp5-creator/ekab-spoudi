import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const read=path=>readFileSync(resolve(root,path),'utf8');

test('Paramedic is the parent of SAEK and EOPPEP, not a third copy of them',()=>{
 const home=read('index.html');
 const tiles=home.split('<section class="home-tiles"')[1]?.split('</section>\n<section class="home-anatomy')[0]||'';
 assert.match(tiles,/href="paramedic\.html"/);
 assert.doesNotMatch(tiles,/href="saek\.html"|href="eoppep\.html"/);
 const hub=read('paramedic.html');
 for(const href of ['saek.html','eoppep.html','mentor-ecg.html','ui-tools/anatomy-3d/index.html','practical_exam.html','seminar-prep.html','mentor-next.html','farmaka.html','protocols.html']){
   assert.match(hub,new RegExp('href="'+href.replace(/[.*+?^$\{\}()|[\]\\]/g,'\\$&')+'"'));
   assert.ok(existsSync(resolve(root,href)),'Missing existing destination: '+href);
 }
 assert.match(hub,/<section id="skills"/);
 assert.match(hub,/data-atla-open/);
 assert.match(hub,/atla\/assistant\.mjs/);
});

test('All Paramedic assets and links resolve locally',()=>{
 const hub=read('paramedic.html');
 for(const [,href] of hub.matchAll(/(?:href|src)="([^"#?]+)(?:#[^"]*)?"/g)){
  if(/^https?:/.test(href))continue;
  const dest=resolve(root,href);
  assert.ok(dest.startsWith(root+'/'),'Unsafe path: '+href);
  assert.ok(existsSync(dest),'Missing asset/link: '+href);
 }
});

test('Existing learning pages link back to Paramedic without changes to stored progress',()=>{
 for(const page of ['saek.html','eoppep.html','mentor-ecg.html'])assert.match(read(page),/href="paramedic\.html(?:#skills)?"/);
 const hub=read('paramedic.html');
 assert.doesNotMatch(hub,/localStorage|sessionStorage|indexedDB|cloud-sync|eval\(/);
});

test('Do not inject unrelated simulator missions into every SAEK chapter',()=>{
 const practice=read('atla/practice/saek-practice.mjs');
 assert.doesNotMatch(practice,/cockpit\.href\s*=|controls\.append\(compare,cockpit/);
 assert.match(practice,/No automatic simulator link/);
 assert.match(practice,/lesson-sos/);
});
