#!/usr/bin/env node
// Exhaustive read-only geometry/integrity inventory. Not a clinical validation.
import {readFile, readdir, stat, mkdir, writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';

const ROOTS=['assets','mentor/assets','tools/anatomy-3d/resources','tools/patient-simulator/assets','tools/patient-simulator/resources'];
const MANIFESTS=[
 'tools/anatomy-3d/resources/imported-manifest.json',
 'tools/anatomy-3d/resources/z-anatomy-research/imported-manifest.json',
 'tools/patient-simulator/resources/quaternius/imported-manifest.json',
 'tools/patient-simulator/assets/patients/preview-manifest.json',
 'tools/patient-simulator/assets/patients/atla-makehuman-rigged-manifest.json',
 'tools/patient-simulator/resources/makehuman/imported-manifest.json',
 'tools/patient-simulator/resources/makehuman/supplemental-imported-manifest.json'
];
const expected=new Map(),findings=[],entries=[];
for(const path of MANIFESTS){
 const m=JSON.parse(await readFile(path,'utf8'));
 for(const rec of (m.assets||m.files||[])){
  const p=rec.path||rec.output;
  if(!p){findings.push({type:'manifest-no-path',manifest:path});continue;}
  if(expected.has(p)){findings.push({type:'duplicate-manifest-path',path:p});continue;}
  expected.set(p,{...rec,manifest:path});
 }
}
async function collect(dir){
 const names=await readdir(dir,{withFileTypes:true}),found=[];
 for(const entry of names){
  const p=dir+'/'+entry.name;
  if(entry.isDirectory())found.push(...await collect(p));
  if(entry.isFile()&&p.toLowerCase().endsWith('.glb'))found.push(p);
 }
 return found;
}
function sha256(data){return createHash('sha256').update(data).digest('hex')}
function gitBlobSha(data){
 return createHash('sha1').update('blob '+data.length+'\0').update(data).digest('hex');
}
function readGlb(data){
 assert(data.length>=20,'GLB too short');
 assert.equal(data.toString('ascii',0,4),'glTF','Invalid GLB magic');
 assert.equal(data.readUInt32LE(4),2,'Not glTF v2');
 assert.equal(data.readUInt32LE(8),data.length,'GLB declared length differs');
 let offset=12;const chunks=[];
 while(offset<data.length){
  assert(offset+8<=data.length,'Truncated chunk header');
  const len=data.readUInt32LE(offset),type=data.toString('ascii',offset+4,offset+8);
  offset+=8;
  assert(len%4===0,'Unaligned chunk');
  assert(offset+len<=data.length,'Chunk exceeds file');
  chunks.push({type,bytes:data.subarray(offset,offset+len)});
  offset+=len;
 }
 assert.equal(offset,data.length,'Truncated GLB payload');
 assert.equal(chunks[0]?.type,'JSON','Missing JSON chunk');
 const gltf=JSON.parse(chunks[0].bytes.toString('utf8').replace(/\x00+$/g,'').trim());
 assert.equal(gltf.asset?.version,'2.0','Invalid glTF asset version');
 assert(Array.isArray(gltf.meshes)&&gltf.meshes.length>0,'Missing geometry meshes');
 let primitives=0,vertices=0;
 for(const mesh of gltf.meshes){
  assert(Array.isArray(mesh.primitives)&&mesh.primitives.length>0,'Mesh without primitives');
  for(const p of mesh.primitives){
   primitives++;
   assert(p.attributes&&Object.keys(p.attributes).length>0,'Primitive lacks attributes');
   for(const index of Object.values(p.attributes)){
    assert(Number.isInteger(index)&&index>=0&&index<(gltf.accessors?.length||0),'Invalid accessor reference');
   }
   if(p.indices!==undefined)assert(Number.isInteger(p.indices)&&p.indices>=0&&p.indices<(gltf.accessors?.length||0),'Invalid index accessor');
   const a=gltf.accessors[p.attributes.POSITION];
   if(a)vertices+=a.count||0;
  }
 }
 const chunksBin=chunks.filter(x=>x.type==='BIN\0');
 for(const [i,view] of (gltf.bufferViews||[]).entries()){
  assert(Number.isSafeInteger(view.byteLength)&&view.byteLength>=0,'Invalid bufferView length '+i);
  assert(Number.isSafeInteger(view.buffer)&&view.buffer>=0&&view.buffer<(gltf.buffers?.length||0),'Invalid bufferView buffer '+i);
  const buffer=gltf.buffers[view.buffer];
  if(!buffer.uri){
   assert.equal(view.buffer,0,'Multiple implicit BIN buffers not supported');
   const bin=chunksBin[0]?.bytes;
   assert(bin,'Missing BIN buffer');
   assert((view.byteOffset||0)+view.byteLength<=bin.length,'BufferView overflow '+i);
  }
 }
 for(const [i,acc] of (gltf.accessors||[]).entries()){
  assert(Number.isSafeInteger(acc.count)&&acc.count>=0,'Invalid accessor count '+i);
  if(acc.bufferView!==undefined)assert(acc.bufferView>=0&&acc.bufferView<(gltf.bufferViews?.length||0),'Invalid accessor view '+i);
 }
 return {meshes:gltf.meshes.length,primitives,vertices,nodes:gltf.nodes?.length||0,skins:gltf.skins?.length||0,
  joints:(gltf.skins||[]).reduce((s,x)=>s+(x.joints?.length||0),0),
  animations:gltf.animations?.length||0,extensions:gltf.extensionsUsed||[],
  externalUris:(gltf.buffers||[]).filter(b=>b.uri&&!b.uri.startsWith('data:')).map(b=>b.uri),
  textures:gltf.textures?.length||0};
}
const paths=(await Promise.all(ROOTS.map(collect))).flat().sort();
for(const path of paths){
 const rec=expected.get(path),row={path,manifest:rec?.manifest||null,technical:'pending'};
 try{
  const bytes=await readFile(path);
  row.bytes=bytes.length;
  row.sha256=sha256(bytes);
  row.gitBlobSha=gitBlobSha(bytes);
  if(rec){
   row.metadataValid=true;
   const declared=rec.bytes??rec.size;
   if(declared!==undefined&&Number(declared)!==bytes.length)throw Error('Manifest byte size differs: '+declared);
   if(rec.sha256&&rec.sha256.toLowerCase()!==row.sha256)throw Error('Manifest SHA-256 mismatch');
   if(rec.gitBlobSha&&rec.gitBlobSha.toLowerCase()!==row.gitBlobSha)throw Error('Manifest Git blob hash mismatch');
  }else{
   row.metadataValid=false;
   findings.push({type:'no-matching-asset-registry',path,severity:'review_required'});
  }
  row.geometry=readGlb(bytes);
  if(rec?.glb?.meshes&&rec.glb.meshes!==row.geometry.meshes)throw Error('Manifest mesh count mismatch');
  if(rec?.glb?.nodes&&rec.glb.nodes!==row.geometry.nodes)throw Error('Manifest node count mismatch');
  if(rec?.bones&&row.geometry.joints<rec.bones)throw Error('Rigged joints below declared bones');
  if(rec?.animations!==undefined&&row.geometry.animations!==Number(rec.animations))throw Error('Declared animation count mismatch');
  if(row.geometry.externalUris.length)findings.push({type:'externally-referenced-GLB-buffers',path,uris:row.geometry.externalUris,severity:'review_required'});
  row.technical='pass';
 }catch(e){row.technical='fail';row.error=String(e.message||e);findings.push({type:'technical-model-failure',path,detail:row.error,severity:'blocking'});}
 entries.push(row);
 console.log(row.technical.toUpperCase()+' '+path+(row.error?' '+row.error:''));
}
for(const [path,rec] of expected){
 try{
  const s=await stat(path);
  if(!s.isFile())throw Error('Not a regular file');
  if(rec.bytes!==undefined||rec.size!==undefined){
   const n=Number(rec.bytes??rec.size);
   if(n!==s.size)throw Error('Incorrect file size '+n+' vs '+s.size);
  }
  if(!path.toLowerCase().endsWith('.glb')){
   const body=await readFile(path);
   if(rec.sha256&&rec.sha256.toLowerCase()!==sha256(body))throw Error('Invalid SHA-256');
   if(rec.gitBlobSha&&rec.gitBlobSha.toLowerCase()!==gitBlobSha(body))throw Error('Invalid Git blob SHA');
  }
 }catch(e){findings.push({type:'manifest-resource-failure',path,detail:String(e.message||e),severity:'blocking'});}
}
const summary={createdAt:new Date().toISOString(),scope:'All repository GLB geometry assets across the five specified roots, plus all seven named manifests and their non-GLB resource files',
 totalGlbs:entries.length,pass:entries.filter(x=>x.technical==='pass').length,fail:entries.filter(x=>x.technical!=='pass').length,
 manifestTracked:entries.filter(x=>x.metadataValid).length,untracked:entries.filter(x=>!x.metadataValid).length,
 sha256Computed:entries.length,filesInNamedManifests:expected.size,
 scientificValidation:'NOT_PERFORMED; HRA staged-not-clinically-validated; research/educational resources not clinical patient simulators',
 visualRendering:'NOT_PERFORMED in this structural audit; separate browser matrix',
 findings,entries};
await mkdir('audit-results',{recursive:true});
await writeFile('audit-results/atla-3d-every-glb-structural.json',JSON.stringify(summary,null,2)+'\n');
console.log(JSON.stringify({totalGlbs:summary.totalGlbs,pass:summary.pass,fail:summary.fail,manifestTracked:summary.manifestTracked,untracked:summary.untracked,findings:findings.length},null,2));
if(summary.fail||findings.some(x=>x.severity==='blocking'))process.exitCode=1;
