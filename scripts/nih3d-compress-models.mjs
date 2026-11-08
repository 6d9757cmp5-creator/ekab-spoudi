#!/usr/bin/env node
/**
 * Make phone-sized display copies of verified NIH GLB originals: Draco geometry and WebP textures,
 * never simplification. A copy is kept only when it has exactly the original's triangles, less any
 * zero-area ones (invisible, dropped by the optimizer), keeps every named part the viewer lets a
 * learner select, and its bounds stay within 0.1% of the original's. Originals stay untouched.
 *
 * Bare imports resolve next to the script, so it runs from a copy placed in the directory where
 * @gltf-transform/cli@4.5.1 is installed: node <that-dir>/nih3d-compress-models.mjs <in-dir> <out-dir>
 * Writes <out-dir>/<name>.glb for each accepted copy and <out-dir>/COMPRESSED.json.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

export const GLTF_TRANSFORM_VERSION='4.5.1';
const MAX_BOUNDS_DRIFT=0.001;
// Merging steps stay off: joined meshes would erase the separate structures a learner selects.
export const SETTINGS='--compress draco --texture-compress webp --simplify false --join false --flatten false --instance false --palette false';
const [{NodeIO},{ALL_EXTENSIONS},{getBounds},{default:draco3d}]=await Promise.all(
 ['@gltf-transform/core','@gltf-transform/extensions','@gltf-transform/functions','draco3dgltf'].map(name=>import(name)));
const cliDir=path.dirname(fileURLToPath(import.meta.url))+'/node_modules/@gltf-transform/cli/';
const cliVersion=JSON.parse(await fs.readFile(cliDir+'package.json','utf8')).version;
if(cliVersion!==GLTF_TRANSFORM_VERSION)throw Error('Pinned gltf-transform '+GLTF_TRANSFORM_VERSION+' required, found '+cliVersion);
const cli=cliDir+'bin/cli.js';
const io=new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({
 'draco3d.decoder':await draco3d.createDecoderModule(),'draco3d.encoder':await draco3d.createEncoderModule()});
const sha256=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');

/** Triangles, zero-area triangles and scene bounds; the measure that decides whether a copy shows the same shape. */
async function geometry(file){
 const doc=await io.read(file);
 let triangles=0,degenerate=0;
 // Each named mesh node is a structure the viewer can select, so none may be merged away.
 const parts=doc.getRoot().listNodes().filter(node=>node.getMesh()).map(node=>node.getName()).sort().join('\n');
 const a=[],b=[],c=[],same=(x,y)=>x[0]===y[0]&&x[1]===y[1]&&x[2]===y[2];
 for(const mesh of doc.getRoot().listMeshes())for(const prim of mesh.listPrimitives()){
  const position=prim.getAttribute('POSITION'),indices=prim.getIndices();
  if(prim.getMode()!==4||!position)continue;
  const count=indices?indices.getCount():position.getCount();
  const at=i=>indices?indices.getScalar(i):i;
  triangles+=count/3;
  for(let t=0;t<count;t+=3){
   position.getElement(at(t),a);position.getElement(at(t+1),b);position.getElement(at(t+2),c);
   if(same(a,b)||same(b,c)||same(a,c))degenerate++;
  }
 }
 const scene=doc.getRoot().getDefaultScene()??doc.getRoot().listScenes()[0];
 const {min,max}=getBounds(scene);
 return {triangles,degenerate,parts,min,max};
}
export function boundsDrift(a,b){
 const size=Math.max(...a.max.map((v,i)=>v-a.min[i]))||1;
 return Math.max(...[...a.min,...a.max].map((v,i)=>Math.abs(v-[...b.min,...b.max][i])))/size;
}
async function compress(source,target){
 execFileSync(process.execPath,[cli,'optimize',source,target,...SETTINGS.split(' ')],
  {stdio:['ignore','ignore','pipe'],timeout:1800000,maxBuffer:64*1024**2});
 const [before,after]=[await geometry(source),await geometry(target)];
 const drift=boundsDrift(before,after);
 const removed=before.triangles-after.triangles;
 const problem=removed<0||removed>before.degenerate?'TRIANGLES_CHANGED':after.parts!==before.parts?'PARTS_MERGED':!(drift<=MAX_BOUNDS_DRIFT)?'BOUNDS_CHANGED':null;
 return {triangles:after.triangles,originalTriangles:before.triangles,zeroAreaRemoved:removed,boundsDrift:Number(drift.toExponential(3)),problem};
}

const [inDir,outDir]=process.argv.slice(2);
if(!inDir||!outDir)throw Error('usage: node nih3d-compress-models.mjs <in-dir> <out-dir>');
await fs.mkdir(outDir,{recursive:true});
const rows=[];
for(const name of (await fs.readdir(inDir)).filter(n=>n.endsWith('.glb')).sort()){
 const source=path.join(inDir,name),target=path.join(outDir,name);
 const original=await fs.readFile(source);
 let row={file:name,originalBytes:original.length,originalSha256:sha256(original)};
 try{
  const result=await compress(source,target);
  if(result.problem)await fs.rm(target,{force:true});
  else{const bytes=await fs.readFile(target);Object.assign(result,{bytes:bytes.length,sha256:sha256(bytes)});}
  row={...row,...result};
 }catch(error){
  await fs.rm(target,{force:true});
  row.problem='COMPRESSION_FAILED: '+String(error.stderr??error.message).slice(0,300);
 }
 rows.push(row);
 console.log('COMPRESS',JSON.stringify(row));
}
await fs.writeFile(path.join(outDir,'COMPRESSED.json'),JSON.stringify({gltfTransform:cliVersion,
 settings:'optimize '+SETTINGS,rows},null,1)+'\n');
