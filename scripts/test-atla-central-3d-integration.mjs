import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {sharedRegistryAssets,safeAssetUrl} from '../tools/atla-ai/model-preview-catalog.mjs';
const read=p=>readFileSync(p,'utf8');
const lib=JSON.parse(read('tools/atla-ai/resources/model-library.json'));
test('the shared library supplies all existing source viewer datasets without per-source network manifests',()=>{
 const expected=[
  ['anatomy','primary',54],['anatomy','secondary',5],
  ['cockpit','primary',2],['cockpit','secondary',3],
  ['cockpit','makehuman',2],['cockpit','rigged',1]
 ];
 for(const [tool,dataset,count] of expected){
  const rows=sharedRegistryAssets(lib,{tool,dataset});
  assert.equal(rows.length,count,tool+'/'+dataset);
  assert(rows.every(a=>a.available&&a.tool===tool),'available assets must be in proper tool namespace');
  for(const row of rows)assert.equal(safeAssetUrl(row,row.tool,'https://example.org/ekab/').origin,'https://example.org');
  if(tool==='cockpit'&&dataset==='secondary')assert(rows.every(x=>x.integrity.algorithm==='gitBlobSha'));
  else assert(rows.every(x=>x.integrity.algorithm==='sha256'));
 }
 const all=sharedRegistryAssets(lib,{tool:'anatomy',dataset:'all'});
 assert.equal(all.length,lib.models.length);
 assert(all.some(x=>!x.available),'archived metadata cannot silently become playable');
 assert(all.some(x=>x.source==='hra'));
 assert(all.some(x=>x.source==='nih3d'));
 assert(all.some(x=>x.source==='patients'));
});
test('external paths, forged hashes, unavailable originals and cross-tool paths never become playable',()=>{
 const fake={models:[
  {id:'tampered',source:'hra',label:'T',license:'CC BY',delivery:{path:'../private.glb',sha256:'a'.repeat(64),bytes:2000}},
  {id:'missing',source:'nih3d',label:'N',license:'Public Domain',delivery:null,surfaces:['library']},
  {id:'cross',source:'patients',label:'X',license:'CC0',delivery:{path:'tools/anatomy-3d/resources/hra-v1.2/heart.glb',sha256:'b'.repeat(64),bytes:2000}}
 ]};
 assert(sharedRegistryAssets(fake,{dataset:'all'}).every(x=>!x.available));
 assert.equal(sharedRegistryAssets(fake,{tool:'anatomy',dataset:'primary'}).length,0);
});
test('public UI is a Greek central library with explicit render, integrity and composition controls',()=>{
 const html=read('ui-tools/atla-resource-preview.html');
 const script=read('tools/atla-ai/model-preview.mjs');
 assert.match(html,/Κεντρική Βιβλιοθήκη Τρισδιάστατων Μοντέλων/);
 for(const id of ['source-query','library-audit','quality-status','composition-sex','composition-parts','composition-status','source-canvas','source-load'])
  assert(html.includes('id="'+id+'"'),id);
 assert.match(script,/loadLibrary\(root\)/,'The preview reads the one shared library');
 assert.doesNotMatch(script,/getResourceCatalogUrls|Promise\.all\(selected/,'No parallel ad hoc manifests at view time');
 assert.match(script,/proposeBodyComposition\(registry/);
 assert.match(script,/choose3DQuality\(/);
 assert.match(script,/loadVerifiedGlb\(item,modelUrl\)/);
 assert.match(script,/matchesRegistryHash\(item,bytes\)/,'Both GLB and OBJ must verify against the registry');
 assert.match(read('ui-tools/anatomy-3d/index.html'),/Κεντρική Βιβλιοθήκη Τρισδιάστατων Μοντέλων/);
 assert.match(read('mentor-next.html'),/Κεντρική Βιβλιοθήκη Τρισδιάστατων Μοντέλων/);
});
