import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {buildModelList,getResourceCatalogUrls,safeAssetUrl} from '../tools/atla-ai/model-preview-catalog.mjs';

const get=async path=>JSON.parse(await readFile(path,'utf8'));
test('Anatomy resource list includes exactly 54 locally stored HRA GLBs',async()=>{
 const data=await get('tools/anatomy-3d/resources/imported-manifest.json');
 const a=buildModelList('anatomy',data);
 assert.equal(a.length,54);
 assert.equal(new Set(a.map(x=>x.path)).size,54);
 assert(a.every(x=>x.path.startsWith('tools/anatomy-3d/resources/hra-v1.2/')));
 assert(a.every(x=>x.license.includes('BY')));
});
test('Cockpit preview uses the two separate Quaternius GLBs, not MakeHuman sources',async()=>{
 const data=await get('tools/patient-simulator/resources/quaternius/imported-manifest.json');
 const a=buildModelList('cockpit',data);
 assert.equal(a.length,2);
 assert(a.every(x=>x.path.startsWith('tools/patient-simulator/resources/quaternius/')));
});
test('Strict paths and SHA256 required: refuse external URL, traversal and cross-tool model',()=>{
 const valid={path:'tools/patient-simulator/resources/quaternius/asset.glb',name:'asset.glb',sha256:'a'.repeat(64),size:10000};
 const [item]=buildModelList('cockpit',{assets:[valid]});
 assert.equal(safeAssetUrl(item,'cockpit','https://example.org/').href,'https://example.org/tools/patient-simulator/resources/quaternius/asset.glb');
 const bad=['//evil/glb','tools/patient-simulator/resources/quaternius/../private.glb','https://evil.example/x.glb','tools/anatomy-3d/resources/hra-v1.2/heart.glb'];
 for(const path of bad)assert.throws(()=>safeAssetUrl({...item,path},'cockpit','https://example.org/'));
 assert.equal(buildModelList('cockpit',{assets:[{...valid,sha256:''}]}).length,0);
 assert.equal(buildModelList('anatomy',{assets:[valid]}).length,0);
});
test('Manifest URLs are rooted in this application and never NIH release objects',()=>{
 const u=getResourceCatalogUrls('https://example.org/ekab/');
 assert.equal(u.anatomy.href,'https://example.org/ekab/tools/anatomy-3d/resources/imported-manifest.json');
 assert.equal(u.cockpit.href,'https://example.org/ekab/tools/patient-simulator/resources/quaternius/imported-manifest.json');
});
