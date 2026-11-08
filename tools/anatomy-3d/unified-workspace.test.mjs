import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
for(const file of ['ui-tools/anatomy-3d/index.html','tools/anatomy-3d/index.html']){
 const html=readFileSync(file,'utf8');
 assert.match(html,/id="base-anatomy"/);
 assert.match(html,/id="models"/);
 assert.match(html,/id="unified-basic"/);
 assert.match(html,/id="unified-catalog"/);
 assert.match(html,/unified-workspace\.mjs/);
 assert.match(html,/unified-workspace\.css/);
 assert.doesNotMatch(html,/iframe/i,'no iframe: same-page viewer');
 const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(x=>x[1]);
 assert.equal(new Set(ids).size,ids.length,'unique DOM ids: '+file);
 for(const id of ['source-name','source-back','source-dataset','source-model','source-load','source-canvas','source-query','source-status','source-license','source-details','source-part','part-isolate','part-show','source-clip','clip-play','clip-pause','source-opacity','opacity-value','view-reset','view-front','view-side','source-mesh-info','source-count','source-warning','library-audit','quality-status','composition-sex','composition-parts','composition-status']){
  assert.ok(ids.includes(id),file+' missing '+id);
 }
}
const logic=readFileSync('tools/anatomy-3d/unified-workspace.mjs','utf8');
assert.match(logic,/import\('\.\.\/atla-ai\/model-preview\.mjs'\)/);
assert.match(logic,/history\.replaceState/);
console.log('PASS unified anatomy single-page contract (both entrypoints, unique IDs, lazy first-party viewer).');
