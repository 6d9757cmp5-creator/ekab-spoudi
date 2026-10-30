import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,mkdir,rm,readFile} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {assertLocked,denyProduction,route,checkResources,verify} from './worker.mjs';
test('feature lock rejects every production action and environment override',()=>{
  for(const action of ['render','ai','tts','dispatch','publish']) assert.throws(()=>denyProduction(action),/blocked/);
  const previous=process.env.VIDEO_GENERATION_ENABLED;
  process.env.VIDEO_GENERATION_ENABLED='true';
  assert.throws(assertLocked,/must remain false/);
  if(previous===undefined) delete process.env.VIDEO_GENERATION_ENABLED; else process.env.VIDEO_GENERATION_ENABLED=previous;
});
const light={width:1280,height:720,durationSeconds:20,sceneCount:5,memoryGiB:2,has3d:false,requiresGpu:false};
test('routing has no dispatch and never assigns GPU to hosted CPU',()=>{
  assert.equal(route(light).destination,'dell-light-candidate');
  assert.equal(route({...light,width:1920}).destination,'github-hosted-cpu-candidate');
  assert.equal(route({...light,has3d:true}).destination,'github-hosted-cpu-candidate');
  assert.equal(route({...light,requiresGpu:true}).destination,'gpu-provider-unconfigured');
  assert.equal(route(light).dispatchEnabled,false);
  assert.throws(()=>route({...light,memoryGiB:NaN}));
  assert.throws(()=>route({...light,requiresGpu:undefined}));
});
test('CPU, RAM and disk pressure refuse work',()=>{
  const healthy={freeMemoryGiB:4,freeDiskGiB:30,cpuLoadPercent:20};
  checkResources(healthy);
  for(const failure of [{freeMemoryGiB:1},{freeDiskGiB:5},{cpuLoadPercent:99}]) assert.throws(()=>checkResources({...healthy,...failure}));
});
test('corrupt checksum and unexpected files are rejected',async()=>{
  const dir=await mkdtemp(path.join(os.tmpdir(),'ekab-worker-test-'));
  try {
    await writeFile(path.join(dir,'file.txt'),'tampered');
    await writeFile(path.join(dir,'bundle-manifest.json'),JSON.stringify({schemaVersion:1,status:'prepared-unapproved',generationEnabled:false,files:[{path:'file.txt',size:8,sha256:'0'.repeat(64)}]}));
    await assert.rejects(()=>verify(dir),/checksum/);
    await writeFile(path.join(dir,'extra.txt'),'extra');
    await assert.rejects(()=>verify(dir),/Unexpected/);
  } finally { await rm(dir,{recursive:true,force:true}); }
});
