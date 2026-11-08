#!/usr/bin/env node
/** Read-only verification of every served ATLA 3D model and its supporting assets. */
import {readFileSync,statSync,mkdirSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';

const library=JSON.parse(readFileSync('tools/atla-ai/resources/model-library.json','utf8'));
const report={schemaVersion:1,scope:'ALL_SERVED_3D_ASSETS',total:library.models.length,
 served:0,viewableGeometry:0,supportFiles:0,excluded:[],bySource:{},checks:[],failures:[]};
const paths=new Set(),ids=new Set();
function failure(id,reason){report.failures.push({id:String(id),reason:String(reason).slice(0,280)});}
for(const m of library.models){
 const id=m.id,source=m.source;
 report.bySource[source]??={listed:0,available:0,verified:0};
 report.bySource[source].listed++;
 if(ids.has(id))failure(id,'Duplicate model ID');ids.add(id);
 if(!m.delivery?.path){
  report.excluded.push({id,reason:m.restrictionCode??'UNKNOWN'});
  if(m.restrictionCode!=='OUT_OF_SCOPE')failure(id,'Missing delivery without out-of-scope classification');
  continue;
 }
 const d=m.delivery,p=d.path;
 report.served++;report.bySource[source].available++;
 const ext=p.split('.').pop().toLowerCase();
 const geometric=['glb','gltf','obj'].includes(ext);
 if(geometric)report.viewableGeometry++;else report.supportFiles++;
 try {
  assert(typeof p==='string'&&p.length>0&&!p.startsWith('/')&&!p.includes('..')&&!paths.has(p),'Untrusted, invalid or duplicate path');
  paths.add(p);
  assert(Number.isSafeInteger(d.bytes)&&d.bytes>0,'Invalid declared byte count');
  const buffer=readFileSync(p),stat=statSync(p);
  assert.equal(stat.size,d.bytes,'File byte count differs from library');
  const sha=String(d.sha256??'');
  let actual;
  if(sha.length===64)actual=createHash('sha256').update(buffer).digest('hex');
  else if(sha.length===40)actual=createHash('sha1').update('blob '+buffer.length+'\\0').update(buffer).digest('hex');
  else throw Error('Missing SHA-256 or legacy Git blob SHA-1');
  assert.equal(actual,sha,'Content hash differs from library');
  if(ext==='glb'){
   assert(buffer.length>=20,'Too short to be a GLB');
   assert.equal(buffer.toString('ascii',0,4),'glTF','GLB magic mismatch');
   assert.equal(buffer.readUInt32LE(4),2,'GLB 2.0 expected');
   assert.equal(buffer.readUInt32LE(8),buffer.length,'GLB header byte count mismatch');
   const n=buffer.readUInt32LE(12);
   assert(n>4&&n<buffer.length-20,'Invalid JSON chunk size');
   assert.equal(buffer.toString('ascii',16,20),'JSON','Missing JSON chunk');
   const json=JSON.parse(buffer.subarray(20,20+n).toString('utf8'));
   assert(json.asset?.version?.startsWith('2'),'Invalid glTF asset metadata');
   assert((json.meshes?.length??0)>0||(json.nodes?.length??0)>0,'No mesh or node geometry');
  }else if(ext==='obj'){
   const text=buffer.toString('utf8');
   assert(/^v\\s+[-.0-9]/m.test(text)&&/^f\\s+[0-9]/m.test(text),'OBJ lacks vertices or faces');
  }
  report.bySource[source].verified++;
  report.checks.push({id,source,bytes:buffer.length,hash:'MATCH',format:ext});
 }catch(e){failure(id,e.message??e);}
}
try {
 assert.equal(report.total,538,'Registry changed: update the test expected count after source review');
 assert.equal(report.served,533,'Unexpected delivered file count');
 assert.equal(report.viewableGeometry,525,'Unexpected displayable geometry count');
 assert.equal(report.supportFiles,8,'Unexpected MakeHuman auxiliary file count');
 assert.equal(report.excluded.length,5,'Unexpected restricted model count');
}catch(e){failure('SUMMARY',e.message);}
mkdirSync('audit-results',{recursive:true});
writeFileSync('audit-results/atla-every-3d-asset.json',JSON.stringify(report,null,2)+'\\n');
console.log('ATLA 3D ASSET COVERAGE',JSON.stringify({total:report.total,served:report.served,viewable:report.viewableGeometry,
  support:report.supportFiles,excluded:report.excluded.length,verified:report.checks.length,failures:report.failures.length}));
for(const f of report.failures.slice(0,35))console.error('FAIL',f.id,f.reason);
if(report.failures.length)process.exitCode=1;
