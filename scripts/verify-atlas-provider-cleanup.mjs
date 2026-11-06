import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
const read=p=>readFileSync(p,'utf8');
test('retired BioDigital files are not deployed and native anatomy remains',()=>{
 for(const p of ["tools/anatomy-3d/biodigital-bridge.html","tools/anatomy-3d/biodigital-bridge.mjs","tools/anatomy-3d/biodigital-bridge-core.mjs","tools/anatomy-3d/biodigital-bridge.test.mjs","tools/anatomy-3d/vendor/biodigital-human-api-3.0.0.min.js","tools/anatomy-3d/vendor/BIODIGITAL_HUMAN_API_LICENSE.txt",".github/workflows/atla-biodigital-bridge.yml"])assert.equal(existsSync(p),false,p);
 const canonical=read('tools/anatomy-3d/index.html');
 assert.doesNotMatch(canonical,/biodigital-bridge/);
 assert.match(canonical,/src="hires-anatomy\\.js\\?/);
 assert.match(read('ui-tools/anatomy-3d/index.html'),/tools\\/anatomy-3d\\/hires-anatomy\\.js/);
 assert.ok(existsSync('tools/atla-ai/resources/model-library.json'));
});
test('video asset selection uses only approved non-provider anatomy',()=>{
 const context={};runInNewContext(read('educational-animation-sources.js'),context,{timeout:1000});
 const src=context.EducationalAnimationSources;
 assert.ok(src);
 assert.deepEqual(Object.keys(src.SOURCES),['bodyparts3d','hubmap','nih3d']);
 assert.equal(src.selectAnatomySource({biodigital:{apiEnabled:true,videoRightsVerified:true,modelAvailable:true}}),null);
 const approved={id:'bp3d-test',source:'bodyparts3d',licenseVerified:true,attribution:'DBCLS',provenance:'source',anatomyReviewed:true,videoDerivativesAllowed:true,formatSupported:true,matchesAnatomy:true};
 assert.equal(src.selectAnatomySource({assets:[approved]}).assetId,'bp3d-test');
 assert.equal(src.selectAnatomySource({assets:[{...approved,videoDerivativesAllowed:false}]}),null);
});
test('ATLAS is the visible name of the one teaching assistant',()=>{
 assert.match(read('index.html'),/ATLAS · Εκπαιδευτικός βοηθός/);
 assert.match(read('paramedic.html'),/Ρώτησε τον ATLAS/);
 const tutor=read('atla/assistant.mjs');
 assert.match(tutor,/Γεια σου, είμαι ο ATLAS/);
 assert.match(tutor,/window\\.__ekabAtlaAssistant/);
 assert.equal((read('paramedic.html').match(/data-atla-open/g)||[]).length,1);
});
