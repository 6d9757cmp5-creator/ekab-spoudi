import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {resolve,join,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const file=path=>readFileSync(join(root,path));
const text=path=>file(path).toString('utf8');
const modules={
 'mentor-lab.js':'mentor/app/lab.js',
 'mentor-home.js':'mentor/app/home.js',
 'mentor-live.js':'mentor/app/live.js',
 'mentor-library.js':'mentor/app/library.js',
 'mentor-oral.js':'mentor/app/oral.js',
 'mentor-ecg.js':'mentor/app/ecg.js',
 'mentor-scenarios.js':'mentor/app/scenarios.js',
 'mentor-readonly.js':'mentor/app/readonly.js',
 'mentor-voice.mjs':'mentor/voice/speech.mjs',
 'mentor-avatar-live.mjs':'mentor/avatar/live.mjs',
 'mentor-cinematic.mjs':'mentor/avatar/cinematic.mjs',
 'mentor-3d.mjs':'mentor/avatar/hologram.mjs',
 'mentor-real3d.bundle.mjs':'mentor/avatar/real3d.bundle.mjs'
};
const css=['mentor-lab.css','mentor-cinematic.css','mentor-real3d.css',
 'mentor-avatar-live.css','mentor-3d.css'];
const assets=['mentor-cinematic.webp','mentor-photo.webp','mentor-real-3d.glb',
 'mentor-scenario-thumbs.webp'];

test('One mentor folder contains all canonical modules and small old public entrypoints',()=>{
 for(const [old,current] of Object.entries(modules)){
  assert.ok(existsSync(join(root,current)),current);
  const shim=text(old);
  assert.ok(shim.length<250,old+' should be a tiny compatibility shim');
  assert.ok(shim.includes(current),old+' must point to central source');
  assert.ok(shim.includes('import ')||shim.includes('export *'),old+' should not duplicate logic');
  assert.ok(file(current).length>500,current+' must include actual implementation');
 }
});
test('All canonical internal JavaScript imports resolve locally',()=>{
 const paths=[...Object.values(modules).filter(x=>!x.includes('real3d.bundle')),
  'mentor/app/adaptive.js','mentor/app/personal-v1.js'];
 for(const path of paths){
  const source=text(path);
  assert.doesNotMatch(source,/from\s*['"]\.\/mentor\/core\//,path);
  const imports=[...source.matchAll(/(?:from\s*|import\s*)["'](\.[^"']+)["']/g)].map(x=>x[1]);
  for(const specifier of imports){
   const real=resolve(root,dirname(path),specifier);
   assert.ok(existsSync(real),path+' imports missing '+specifier);
  }
 }
});
test('Public URLs still exist; actual visible pages load centralized styles and classic scripts',()=>{
 const html=['index.html','mentor-lab.html','mentor-live.html','mentor-oral.html',
  'mentor-ecg.html','mentor-library.html','mentor-readonly.html','mentor-scenarios.html',
  'mentor-presence.html'];
 for(const p of html)assert.ok(existsSync(join(root,p)),p);
 const lab=text('mentor-lab.html');
 assert.match(lab,/src="mentor-lab\.js"/);
 assert.match(lab,/src="mentor\/app\/adaptive\.js"/);
 assert.match(lab,/src="mentor\/app\/personal-v1\.js"/);
 assert.match(lab,/href="mentor\/styles\/mentor-lab\.css"/);
 assert.match(text('index.html'),/src="mentor-home\.js"/);
 assert.match(text('index.html'),/href="mentor\/styles\/mentor-avatar-live\.css"/);
});
test('Styles and all 3D assets are centrally available byte-for-byte',()=>{
 for(const style of css)assert.ok(file('mentor/styles/'+style).length>500);
 for(const asset of assets){
  const old=file('assets/'+asset),central=file('mentor/assets/'+asset);
  assert.equal(createHash('sha256').update(old).digest('hex'),
   createHash('sha256').update(central).digest('hex'),asset);
 }
 assert.match(text('mentor/avatar/real3d.bundle.mjs'),/\.\/mentor\/assets\/mentor-real-3d\.glb/);
 assert.match(text('mentor/styles/mentor-cinematic.css'),/url\(['"]\.\.\/assets\/mentor-scenario-thumbs\.webp/);
});
test('Mentor migration never touches existing progress and grading source files',()=>{
 for(const path of ['index.html','mentor-lab.js','mentor/app/lab.js',
  'mentor/voice/speech.mjs']){
  const s=text(path);
  assert.ok(!s.includes('OFFICIAL_SCORE_OWNED_BY_MENTOR'),'No Mentor grading ownership');
 }
 assert.ok(text('mentor/README.md').includes('GitHub Pages'));
});
