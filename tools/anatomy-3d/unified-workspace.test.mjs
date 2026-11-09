import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {viewerHref} from '../atla-ai/nih3d-library.mjs';
for(const file of ['ui-tools/anatomy-3d/index.html']){
 const html=readFileSync(file,'utf8');
 assert.match(html,/id="base-anatomy"/);
 assert.match(html,/id="models"/);
 assert.match(html,/id="atlas-canvas"/);
 assert.match(html,/<select id="source-dataset" hidden/);
 assert.match(html,/id="source-canvas"/);
 assert.match(html,/id="atlas-version"/);
 assert.match(html,/id="atlas-load"/);
 assert.match(html,/id="atlas-unload"/);
 assert.match(html,/id="unified-basic"/);
 assert.match(html,/id="unified-catalog"/);
 for(const id of ['study-filter','source-education-summary','source-preview-caption','source-quality-note','source-zoom-in','source-zoom-out','source-camera-reset'])
  assert.match(html,new RegExp('id="'+id+'"'),'usable 3D model view: '+id);
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
const atlas=readFileSync('tools/anatomy-3d/inline-atlas.js','utf8');
assert.match(atlas,/new AtlasRenderer\(canvas\)/);
assert.match(atlas,/bp3d40/);
assert.match(atlas,/bp3d43/);
assert.match(atlas,/crypto\.subtle\.digest/);
const origin='https://example.test/ekab-spoudi/';
const nih=viewerHref({accession:'TEST-ACCESSION'},{rootUrl:origin,tool:'anatomy'});
assert.match(nih,/\/ui-tools\/anatomy-3d\/index\.html\?/);
assert.match(nih,/dataset=all/);
assert.match(nih,/model=TEST-ACCESSION/);
assert.match(nih,/#models$/);
const cockpit=viewerHref({accession:'TEST-ACCESSION'},{rootUrl:origin,tool:'cockpit'});
assert.match(cockpit,/atla-resource-preview\.html/);
assert.doesNotMatch(cockpit,/#models$/);
console.log('PASS unified anatomy single-page contract (both entrypoints, unique IDs, lazy first-party viewer).');
