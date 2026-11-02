/**
 * EKAB Spoudi: 2026 shared-service architecture regression checks.
 * Verifies module ownership and backwards-compatible exports without touching user data.
 */
import assert from 'node:assert/strict';
import {existsSync,readFileSync} from 'node:fs';
import {resolve} from 'node:path';
const root=process.cwd();
const file=p=>resolve(root,p);
const content=p=>readFileSync(file(p),'utf8');
const pairs=[
 ['notes-store.js','services/notes/notes-store.js'],
 ['notes-delete.js','services/notes/notes-delete.js'],
 ['notes-position.js','services/notes/notes-position.js'],
 ['sync-codec.js','services/sync/sync-codec.js'],
 ['sync-model.js','services/sync/sync-model.js'],
 ['sync-local.js','services/sync/sync-local.js']
];
for(const [oldPath,newPath] of pairs){
 assert(existsSync(file(oldPath))&&existsSync(file(newPath)),oldPath+' service module missing');
 const oldText=content(oldPath);
 assert(oldText.length<180&&oldText.includes("export * from './"+newPath+"'"),oldPath+' must be a thin stable import');
 const old=await import('../'+oldPath),modern=await import('../'+newPath);
 assert.deepEqual(Object.keys(old).sort(),Object.keys(modern).sort(),'exports changed for '+oldPath);
 for(const key of Object.keys(old))assert.strictEqual(old[key],modern[key],oldPath+': export identity mismatch: '+key);
}
const oldNotes=content('notes-panel.js');
assert(oldNotes.includes("from './notes-store.js'"));
assert(oldNotes.includes("from './notes-delete.js'"));
assert(oldNotes.includes("from './notes-position.js'"));
const cloud=content('cloud-sync.js');
for(const name of ['sync-codec.js','sync-model.js','sync-local.js'])
 assert(cloud.includes('./'+name),'old cloud-sync importer must remain stable: '+name);
const canonicalModel=content('services/sync/sync-model.js'),canonicalLocal=content('services/sync/sync-local.js');
assert(canonicalModel.includes("from '../notes/notes-store.js'"),'sync-model should use canonical shared notes');
assert(canonicalLocal.includes("from '../notes/notes-store.js'"),'sync-local should use canonical shared notes');
assert(canonicalModel.includes("from '../../seminar-sync.js'"),'seminar sync must be shared');
assert(!/fetch\(|https?:\/\//.test(content('services/notes/notes-store.js')),'note store must remain local only');
assert.equal((await import('../services/notes/notes-store.js')).NOTES_KEY,'ekab.personal-notes.v1');
assert.equal((await import('../services/sync/sync-model.js')).SCHEMA,'ekab-sync-v1');
const cache=content('sw.js');
assert(cache.includes('ekab-spoudi-v'+JSON.parse(content('version.json')).version));
for(const [,path] of pairs)assert(cache.includes('"./'+path+'"'),'offline dependency not precached: '+path);
const registry=JSON.parse(content('services/registry.json'));
assert.equal(registry.schema,1);
const ids=new Set();
for(const entry of registry.entries){
 assert(/^[a-z][a-z0-9-]*$/.test(entry.id)&&!ids.has(entry.id),'duplicate/invalid id '+entry.id);ids.add(entry.id);
 assert(['tool','service','content'].includes(entry.kind));
 assert(['canonical','owner-mapped','legacy-entry'].includes(entry.status));
 assert(typeof entry.owner==='string'&&entry.owner.startsWith('tools/')||entry.owner.startsWith('services/')||entry.owner.startsWith('content/'));
 assert(existsSync(file(entry.owner+'/README.md')),'owner folder is not documented: '+entry.owner);
 assert(Array.isArray(entry.implementation)&&entry.implementation.length>0);
 for(const p of entry.implementation)assert(existsSync(file(p)),'missing registered code: '+p);
}
assert(registry.entries.length>=18,'inventory misses existing tools/services');
for(const source of [
 'services/README.md','services/notes/README.md','services/sync/README.md',
 'services/ai-grading/README.md','services/progress/README.md','services/notifications/README.md',
 'services/search/README.md','services/educational-media/README.md',
 'tools/pdf-library/README.md','tools/emergency-directory/README.md','tools/profession-law/README.md',
 'tools/study-planner/README.md','tools/oral-practice/README.md','tools/scenario-library/README.md',
 'docs/ARCHITECTURE_2026.md'
])assert(existsSync(file(source)),'missing ownership reference: '+source);
console.log('PASS: 6 canonical shared modules, identical public exports, unchanged storage keys, offline cache and '+registry.entries.length+' inventoried features');
