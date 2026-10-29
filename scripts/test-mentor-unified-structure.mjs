import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync,readFileSync,statSync} from 'node:fs';
import {dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const read=path=>readFileSync(resolve(root,path),'utf8');
const MOVES=Object.freeze({
 'mentor-voice.mjs':'mentor/voice/speech.mjs',
 'mentor-avatar-live.mjs':'mentor/avatar/live.mjs',
 'mentor-cinematic.mjs':'mentor/avatar/cinematic.mjs',
 'mentor-3d.mjs':'mentor/avatar/hologram.mjs',
 'mentor-lab.js':'mentor/app/lab.mjs',
 'mentor-home.js':'mentor/app/home.mjs',
 'mentor-ecg.js':'mentor/modules/ecg.js',
 'mentor-oral.js':'mentor/modules/oral.js',
 'mentor-live.js':'mentor/modules/live.js',
 'mentor-library.js':'mentor/modules/library.js',
 'mentor-readonly.js':'mentor/modules/readonly.js',
 'mentor-scenarios.js':'mentor/modules/scenarios.js'
});
const URL_NAMES=['mentor-lab.html','mentor-live.html','mentor-ecg.html','mentor-oral.html',
 'mentor-library.html','mentor-scenarios.html','mentor-presence.html','index.html'];
test('All twelve MENTOR functional modules are canonical under one mentor/ folder',()=>{
 assert.equal(Object.keys(MOVES).length,12);
 for(const [oldPath,newPath] of Object.entries(MOVES)){
  assert.ok(newPath.startsWith('mentor/'),newPath);
  assert.ok(existsSync(resolve(root,oldPath)),oldPath);
  assert.ok(existsSync(resolve(root,newPath)),newPath);
  assert.ok(statSync(resolve(root,newPath)).size>500,newPath);
  const shim=read(oldPath);
  assert.ok(shim.includes(newPath.replace(/^mentor\//,'mentor/')),oldPath);
  assert.ok(shim.includes('@deprecated'),oldPath+' should clearly be marked compatibility-only');
  assert.ok(shim.length<230,oldPath+' must not contain duplicate business logic');
 }
});
test('Canonical module imports are actual relative project files, not broken old paths',()=>{
 for(const entry of Object.values(MOVES)){
  const source=read(entry);
  const re=/(?:from\s*|import\s*)["'](\.[^"']+)["']/g;
  for(const match of source.matchAll(re)){
   const importPath=match[1];
   const target=resolve(root,dirname(entry),importPath);
   assert.ok(target.startsWith(root),entry+' must never traverse outside repository');
   assert.ok(existsSync(target),entry+' imports missing '+importPath);
  }
  assert.ok(!source.includes("from './mentor/core/"),entry+' still has its original-root import');
  assert.ok(!source.includes('from "./mentor/core/'),entry+' still has its original-root import');
 }
});
test('Public URLs stay unchanged; no broken links in the existing initial navigation',()=>{
 for(const file of URL_NAMES)assert.ok(existsSync(resolve(root,file)),file);
 const home=read('index.html');
 assert.match(home,/mentor-lab\.html/);
 const mentor=read('mentor-lab.html');
 assert.match(mentor,/src="mentor-lab\.js"/);
 assert.match(mentor,/src="mentor-cinematic\.mjs"/);
 assert.match(mentor,/src="mentor-real3d\.bundle\.mjs"/);
 const iframe=read('mentor-presence.html');
 assert.match(iframe,/src="mentor-real3d\.bundle\.mjs"/);
});
test('Source restructuring never gains direct writes to legacy grades, sync, notes or backend',()=>{
 for(const p of Object.values(MOVES)){
  const body=read(p);
  assert.doesNotMatch(body,/ekab-eoppep-official-v15|ekab\.saek\.exams\.v1|ai-grading-client|cloud-sync\.js|functions\/answer-grader\//);
 }
 for(const p of ['app.js','progress.js','sync-model.js','sync-local.js','cloud-sync.js',
  'study-scheduler.js','notes-store.js','saek-exam-engine.js']){
  assert.ok(existsSync(resolve(root,p)),p);
 }
});
