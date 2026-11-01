import assert from 'node:assert/strict';
import {readFileSync,statSync,existsSync} from 'node:fs';
import {join} from 'node:path';
const root=process.cwd();
const read=p=>JSON.parse(readFileSync(join(root,p),'utf8'));
const anatomy='tools/anatomy-3d/resources/';
const cockpit='tools/patient-simulator/resources/';
const files=[
{path:anatomy+'imported-manifest.json',count:54,roots:[anatomy+'hra-v1.2/']},
{path:anatomy+'z-anatomy-research/imported-manifest.json',count:5,roots:[anatomy+'z-anatomy-research/']},
{path:cockpit+'makehuman/imported-manifest.json',count:2,roots:[cockpit+'makehuman/']},
{path:cockpit+'quaternius/imported-manifest.json',count:2,roots:[cockpit+'quaternius/']}
];
let all=0,bytes=0;
for(const section of files){
 const data=read(section.path);
 assert.equal(data.assets.length,section.count,section.path+' wrong number of imported models');
 const seen=new Set();
 for(const a of data.assets){
  const path=a.output||a.path;
  assert(section.roots.some(x=>path.startsWith(x)),path+' wrong tool folder');
  assert(!seen.has(path),'duplicate path '+path);
  seen.add(path);
  const payload=join(root,path);
  assert(existsSync(payload),'missing imported source file: '+path);
  const stat=statSync(payload);
  assert.equal(stat.size,a.bytes||a.size,path+' source byte mismatch');
  assert.match(a.sha256,/^[0-9a-f]{64}$/);
  all++;bytes+=stat.size;
 }
}
assert(!existsSync(join(root,anatomy+'z-anatomy-research/nervous.glb')),'mixed license nervous GLB leaked');
assert(!existsSync(join(root,anatomy+'z-anatomy-research/visceral.glb')),'mixed license visceral GLB leaked');
assert(existsSync(join(root,anatomy+'z-anatomy-research/UPSTREAM-LICENSE.txt')));
assert(existsSync(join(root,cockpit+'makehuman/LICENSE-CC0.ASSETS.md')));
assert(existsSync(join(root,cockpit+'quaternius/LICENSE-BASE-CHARACTERS.txt')));
assert(existsSync(join(root,anatomy+'../vendor/open-anatomy-atlas/LICENSE')));
const original=read(anatomy+'catalog.json');
assert.equal(original.anatomyAssets.length,54);
assert(original.anatomyAssets.every(x=>x.approved&&x.license==='CC-BY-4.0'));
const bp=anatomy+'bp3d40/atlases/bp3d40/build/';
if(existsSync(join(root,bp+'index.json'))){
 const index=read(bp+'index.json');
 assert((index.counts?.elements||0)>=1200,'insufficient BP3D source coverage');
 assert(statSync(join(root,bp+'meshes.bin')).size>1024,'missing named BP3D geometry');
}
const supplemental=read(cockpit+'makehuman/supplemental-imported-manifest.json');
assert.equal(supplemental.files.length,8,'missing official MakeHuman rig/eyes/skin/motion');
for(const a of supplemental.files){
 assert(a.path.startsWith(cockpit+'makehuman/'));
 assert.equal(statSync(join(root,a.path)).size,a.bytes);
 assert.match(a.sha256,/^[0-9a-f]{64}$/);
 all++;bytes+=a.bytes;
}
const bp43=anatomy+'bp3d43/compiled-shards/';
const shards=read(bp43+'manifest.json');
assert.equal(shards.anatomyElements,3210,'full-resolution BP3D 4.3 atlas missing meshes');
assert.equal(shards.namedStructures,3954,'full-resolution BP3D named structures incomplete');
assert.equal(shards.parts.length,shards.partCount);
const numBytes=shards.parts.reduce((n,x)=>{
 assert.match(x.sha256,/^[0-9a-f]{64}$/);
 assert.equal(statSync(join(root,bp43+x.file)).size,x.bytes);
 return n+x.bytes;
},0);
assert.equal(numBytes,shards.totalBytes);
assert((read(bp43+'index.json').counts?.elements||0)>=3000);
console.log(JSON.stringify({verifiedAssets:all,mb:+(bytes/1048576).toFixed(2),isolated:true,containsMixedZRelease:false,vendorLicensePresent:true,bp3d40Built:existsSync(join(root,bp+'index.json')),bp3d43Built:true,bp3d43Meshes:shards.anatomyElements}));
