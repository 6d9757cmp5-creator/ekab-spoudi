import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
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

test('Isolated Z-Anatomy research GLBs are not silently mixed into standard HRA set',async()=>{
 const data=await get('tools/anatomy-3d/resources/z-anatomy-research/imported-manifest.json');
 const list=buildModelList('anatomy',data,'research');
 assert.equal(list.length,5);
 assert(list.every(x=>x.sourceType==='research'&&x.clinicallyValidated===false&&x.license.includes('NC')));
 assert(list.every(x=>safeAssetUrl(x,'anatomy','https://example.org/').pathname.startsWith('/tools/anatomy-3d/resources/z-anatomy-research/')));
});
test('Three existing static patient GLBs have genuine byte-size and Git blob SHA1 evidence',async()=>{
 const raw=await get('tools/patient-simulator/assets/patients/preview-manifest.json');
 const items=buildModelList('cockpit',raw,'patients');
 assert.equal(items.length,3);
 for(const item of items){
  const bytes=await readFile(item.path);
  assert.equal(bytes.length,item.bytes);
  assert.equal(bytes.toString('ascii',0,4),'glTF');
  const hash=createHash('sha1').update('blob '+bytes.length+'\0').update(bytes).digest('hex');
  assert.equal(hash,item.integrity.value,'patient GLB must exactly match pinned Git source '+item.path);
  assert.equal(item.clinicallyValidated,false);
  assert.match(item.status,/Static/);
  assert.equal(safeAssetUrl(item,'cockpit','https://example.org/').pathname,'/'+item.path);
 }
});
test('Research and patient paths cannot cross tool boundaries',()=>{
 const model={sourceType:'research',path:'tools/anatomy-3d/resources/z-anatomy-research/cardiovascular.glb'};
 assert.throws(()=>safeAssetUrl(model,'cockpit','https://example.org/'));
 assert.throws(()=>safeAssetUrl({...model,path:'tools/anatomy-3d/resources/z-anatomy-research/../../secrets.glb'},'anatomy','https://example.org/'));
 const patient={sourceType:'patients',path:'tools/patient-simulator/assets/patients/daniel-lying.glb'};
 assert.throws(()=>safeAssetUrl(patient,'anatomy','https://example.org/'));
});

test('MakeHuman base and eye OBJ files are sources, not animated patients',async()=>{
 const core=await get('tools/patient-simulator/resources/makehuman/imported-manifest.json');
 const supplemental=await get('tools/patient-simulator/resources/makehuman/supplemental-imported-manifest.json');
 const items=[...buildModelList('cockpit',core,'makehuman'),...buildModelList('cockpit',supplemental,'makehuman')];
 assert.equal(items.length,2);
 assert(items.some(x=>x.path.endsWith('/base.obj')));
 assert(items.some(x=>x.path.endsWith('/high-poly.obj')));
 for(const item of items){
  assert.equal(item.format,'obj');assert.equal(item.clinicallyValidated,false);
  assert.match(item.status,/Unrigged/);
  const bytes=await readFile(item.path);
  assert.equal(bytes.length,item.bytes);
  assert.equal(createHash('sha256').update(bytes).digest('hex'),item.integrity.value);
  assert.match(safeAssetUrl(item,'cockpit','https://example.org/').pathname,/^\/tools\/patient-simulator\/resources\/makehuman\//);
 }
 assert.throws(()=>safeAssetUrl(items[0],'anatomy','https://example.org/'));
});

test('Actual skinned educational MakeHuman GLB is pinned, complete, and has two animations',async()=>{
 const raw=await get('tools/patient-simulator/assets/patients/atla-makehuman-rigged-manifest.json');
 const models=buildModelList('cockpit',raw,'rigged');
 assert.equal(models.length,1);
 const m=models[0];
 const source=await readFile(m.path);
 assert.equal(source.byteLength,m.bytes);
 assert.equal(source.toString('ascii',0,4),'glTF');
 assert.equal(createHash('sha256').update(source).digest('hex'),m.integrity.value);
 const chunkLength=source.readUInt32LE(12);
 const gltf=JSON.parse(source.subarray(20,20+chunkLength).toString());
 assert(gltf.skins?.length>=1,'MakeHuman avatar must have real skinning');
 assert(gltf.animations?.length>=2,'MakeHuman avatar must have actual baked animation clips');
 assert(gltf.nodes?.length>=160);
 assert.equal(m.clinicallyValidated,false);
 assert.match(safeAssetUrl(m,'cockpit','https://example.org/').pathname,/atla-makehuman-rigged-educational\.glb$/);
 assert.throws(()=>safeAssetUrl(m,'anatomy','https://example.org/'));
});
