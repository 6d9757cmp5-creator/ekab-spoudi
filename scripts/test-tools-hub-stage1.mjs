import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {collectToolsHubEvidence} from './tools-hub-source-evidence.mjs';
const read=path=>readFileSync(path,'utf8');
const home=read('index.html'),hub=read('tools.html');

test('existing home navigation and user progress are preserved',()=>{
 for(const fragment of ['href="saek.html"','href="eoppep.html"','href="protocols.html"','href="farmaka.html"','href="seminar-prep.html"','id="studyResume"']){
  assert.ok(home.includes(fragment),'Missing main home entry: '+fragment);
 }
 assert.equal((home.match(/href="tools\.html"/g)||[]).length,1);
 assert.ok(!home.includes('MENTOR PROTOCOL LAB'),'standalone protocol tool should not be misrepresented as MENTOR-owned');
});
test('tools directory links real tools instead of duplicating engines',()=>{
 for(const fragment of ['Clinical Cockpit','Εργαστήριο ΗΚΓ','3D Ανατομία','Φαρμακολογία','Προετοιμασία σεμιναρίων','ΣΑΕΚ · Συνέχεια μελέτης','ΕΟΠΠΕΠ · Προετοιμασία']){
  assert.ok(hub.includes(fragment),'Missing tool: '+fragment);
 }
 assert.ok(!hub.includes('href="mentor-lab.html"'),'No independent second MENTOR educator entry');
 assert.ok(hub.includes('θα συνδέει σταδιακά'),'Do not claim live ATLAS routing');
 assert.ok(hub.includes('όχι επίσημες επιχειρησιακές οδηγίες ΕΚΑΒ'));
 for(const link of hub.matchAll(/href="([^"]+)"/g)){
   const href=link[1];
   if(/^(?:https?:|#|tel:|mailto:)/.test(href))continue;
   const target=href.split(/[?#]/)[0];
   assert.ok(existsSync(target),'Broken directory link: '+href);
 }
 assert.equal((hub.match(/<h1(?:\s|>)/g)||[]).length,1);
 assert.doesNotMatch(hub,/localStorage\.(?:setItem|removeItem|clear)\s*\(/);
});
test('local evidence stays inspectable, no clinical truth claim',()=>{
 const e=collectToolsHubEvidence();
 assert.equal(e.source_checks.every(x=>x.verified),true);
 assert.ok(e.linked_targets.length>=13);
 assert.ok(e.unverified_domains.length>=4);
 assert.ok(e.linked_targets.every(x=>x.sha256.length===64));
});
test('changes do not require duplicate grade or learning state modules',()=>{
 for(const path of ['progress.js','notes-store.js','sync-local.js','saek-exam-engine.js'])assert.ok(existsSync(path),path);
});
