#!/usr/bin/env node
/**
 * Make phone-sized display copies of verified NIH GLB originals: Draco geometry and WebP textures,
 * never simplification. A copy is kept only when it has exactly the original's triangles and its
 * bounds stay within 0.1% of the original's. Originals stay untouched in the archive.
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
const [{NodeIO},{ALL_EXTENSIONS},{getBounds},{default:draco3d}]=await Promise.all(
 ['@gltf-transform/core','@gltf-transform/extensions','@gltf-transform/functions','draco3dgltf'].map(name=>import(name)));
const cliDir=path.dirname(fileURLToPath(import.meta.url))+'/node_modules/@gltf-transform/cli/';
const cliVersion=JSON.parse(await fs.readFile(cliDir+'package.json','utf8')).version;
if(cliVersion!==GLTF_TRANSFORM_VERSION)throw Error('Pinned gltf-transform '+GLTF_TRANSFORM_VERSION+' required, found '+cliVersion);
const cli=cliDir+'bin/cli.js';
const io=new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({
 'draco3d.decoder':await draco3d.createDecoderModule(),'draco3d.encoder':await draco3d.createEncoderModule()});
const sha256=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');

/** Triangle count and scene bounds; the measure that decides whether a copy shows the same shape. */
async function geometry(file){
 const doc=await io.read(file);
 let triangles=0;
 for(const mesh of doc.getRoot().listMeshes())for(const prim of mesh.listPrimitives()){
  const count=prim.getIndices()?.getCount()??prim.getAttribute('POSITION')?.getCount()??0;
  triangles+=prim.getMode()===4?count/3:0;
 }
 const scene=doc.getRoot().getDefaultScene()??doc.getRoot().listScenes()[0];
 const {min,max}=getBounds(scene);
 return {triangles,min,max};
}
export function boundsDrift(a,b){
 const size=Math.max(...a.max.map((v,i)=>v-a.min[i]))||1;
 return Math.max(...[...a.min,...a.max].map((v,i)=>Math.abs(v-[...b.min,...b.max][i])))/size;
}
async function compress(source,target){
 execFileSync(process.execPath,[cli,'optimize',source,target,'--compress','draco','--texture-compress','webp','--simplify','false'],
  {stdio:['ignore','ignore','pipe'],timeout:1800000,maxBuffer:64*1024**2});
 const [before,after]=[await geometry(source),await geometry(target)];
 const drift=boundsDrift(before,after);
 const problem=after.triangles!==before.triangles?'TRIANGLES_CHANGED':!(drift<=MAX_BOUNDS_DRIFT)?'BOUNDS_CHANGED':null;
 return {triangles:before.triangles,boundsDrift:Number(drift.toExponential(3)),problem};
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
 settings:'optimize --compress draco --texture-compress webp --simplify false',rows},null,1)+'\n');
