import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const sw=readFileSync(resolve(root,'sw.js'),'utf8');
const list=JSON.parse(sw.match(/const PARAMEDIC_OFFLINE=(\[[^;]+\]);/)?.[1]||'[]');
test('PWA caches all added Paramedic paths and their lightweight ATLA imports',()=>{
 const needed=[
  'paramedic.html','paramedic.css','atla/assistant.mjs','atla/assistant.css',
  'atla/learning/contextual-tools.mjs','atla/practice/saek-practice.mjs',
  'atla/practice/eoppep-context.mjs','atla/practice/ecg-return.mjs',
  'atla/practice/contextual-tools.css','atla/practice/saek-practice.css',
  'tools/ecg-lab/app/ecg-practice.js','tools/ecg-lab/core/ecg-practice.mjs',
  'ui-tools/anatomy-3d/index.html','tools/anatomy-3d/hires-anatomy.js',
  'tools/anatomy-3d/focus-groups.mjs'
 ];
 for(const file of needed)assert.ok(list.includes('./'+file),'not offline cached: '+file);
 for(const file of list)assert.ok(existsSync(resolve(root,file)),'missing offline asset: '+file);
 assert.equal(new Set(list).size,list.length,'duplicate precache paths');
});
test('PWA never prefetches enormous external anatomical datasets',()=>{
 assert.ok(!list.some(x=>/^https?:/.test(x)),'no cross-origin cached resource');
 assert.doesNotMatch(list.join(' '),/atlas\.json|\/chunks\//);
 assert.match(sw,/Large external 3D atlases require network/);
});
test('Offline requests are served from cache, never a fabricated model',()=>{
 assert.match(sw,/cache\.match\(req,\{ignoreSearch:true\}\)/);
 assert.match(sw,/if\(old\)return old/);
 assert.match(sw,/return Response\.error\(\)/);
 assert.match(sw,/const CACHE='ekab-spoudi-v27\.1\.128-paramedic-offline-20261102'/);
});
