import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const sw=readFileSync(resolve(root,'sw.js'),'utf8');
const cached=JSON.parse(sw.match(/const ASSETS=(\[[^;]+\]);/)?.[1]||'[]');
const core=JSON.parse(sw.match(/const CORE=(\[[^;]+\]);/)?.[1]||'[]');
test('Offline means full questions, answers, SAEK topics and the code needed to read them',()=>{
 for(const name of ['theory.html','official_questions.json','eoppep-sos.json','eoppep-source.pdf',
 'saek-exams-bank.json','saek-exams.html','saek-images.html','saek-skeleton.svg',
 'app.js','study-scheduler.js','styles.css','saek-reader-safe.js']){
  assert.ok([...cached,...core].includes('./'+name),'Missing essential offline study asset: '+name);
 }
 for(let i=1;i<=20;i++){
  const name='./saek-course-'+String(i).padStart(2,'0')+'.html';
  assert.ok(cached.includes(name),'Missing SAEK lesson: '+name);
 }
 for(const file of [...cached,...core]){
  if(file==='./')continue;
  assert.ok(existsSync(resolve(root,file.split('?')[0])),'Missing offline asset: '+file);
 }
 assert.equal(new Set([...cached,...core]).size,new Set([...cached,...core]).size);
});

test('Clinical simulator, 3D and ECG files are not preloaded offline',()=>{
 const all=[...cached,...core].join(' ');
 assert.doesNotMatch(all,/mentor-ecg|patient-simulator|mentor-next|anatomy-3d|3d\/|\.glb|\.mp4|paramedic\.html|atla\/practice/);
 assert.ok(cached.length<110,'Do not silently precache thousands of files');
 assert.match(sw,/if\(!isStudyUrl\(url\)\)return;/,'Online-only tools must bypass the service-worker cache');
 assert.doesNotMatch(sw,/PARAMEDIC_OFFLINE/);
});

test('Educational images cache on first use, not all at once, with a bounded budget',()=>{
 assert.match(sw,/const MAX_VIEWED_IMAGES=90;/);
 assert.match(sw,/isStudyImage\(url\)/);
 assert.match(sw,/images\.slice\(0,Math\.max\(0,images\.length-MAX_VIEWED_IMAGES\)\)/);
 assert.ok(!cached.some(p=>p.startsWith('./assets/education/')),'Do not bulk preload >1000 education images');
 assert.match(sw,/return Response\.error\(\)/,'No fake offline content or substitution');
 assert.match(sw,/study-materials-only-20261102/,'New cache name evicts older overly broad caches');
});
