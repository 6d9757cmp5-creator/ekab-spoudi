#!/usr/bin/env node
/* Separate research-only Z-Anatomy import: never used automatically in live atlas.
 * Excludes nervous.glb and visceral.glb due inner-ear, kidney and brain origins.
 * Conservative NC-SA notices from upstream are retained.
 */
import {readFile,writeFile,mkdir,rename} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {validateGlb,gitBlobHash,hash} from './import-approved-3d-assets.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const path=resolve(root,'tools/anatomy-3d/resources/z-anatomy-catalog.json');
const resultPath=resolve(root,'tools/anatomy-3d/resources/z-anatomy-research/imported-manifest.json');
const safeNames=new Set(['skeletal.glb','muscular.glb','joints.glb','lymphatic.glb','cardiovascular.glb']);
const catalog=JSON.parse(await readFile(path,'utf8'));
const chosen=catalog.files.filter(x=>x.approved);
if(chosen.length!==5||chosen.some(x=>!safeNames.has(x.name)))throw Error('unsafe changed Z-Anatomy allowlist');
for(const asset of chosen){
 if(!new RegExp('^https://raw\\.githubusercontent\\.com/nqwrc/3d-anatomy/'+catalog.pinnedCommit+'/public/models/[a-z]+\\.glb$').test(asset.url))throw Error('bad URL '+asset.name);
 if(!asset.dest.startsWith('tools/anatomy-3d/resources/z-anatomy-research/'))throw Error('bad output '+asset.name);
 if(!/^[a-f0-9]{40}$/.test(asset.sha))throw Error('bad source SHA');
}
if(process.argv.includes('--dry-run')){console.log(JSON.stringify({chosen:chosen.map(x=>x.name),bytes:chosen.reduce((n,x)=>n+x.bytes,0)}));process.exit(0);}
if(!process.argv.includes('--import'))throw Error('pass --import after explicitly accepting upstream NC-SA terms');
const manifest=[];
for(const asset of chosen){
 const response=await fetch(asset.url,{signal:AbortSignal.timeout(120000)});
 if(!response.ok)throw Error(asset.name+' HTTP '+response.status);
 const bytes=Buffer.from(await response.arrayBuffer());
 if(bytes.length!==asset.bytes||gitBlobHash(bytes)!==asset.sha)throw Error(asset.name+' failed source integrity');
 const info=validateGlb(bytes);
 const dest=resolve(root,asset.dest);
 await mkdir(dirname(dest),{recursive:true});
 await writeFile(dest+'.incoming',bytes);
 await rename(dest+'.incoming',dest);
 manifest.push({name:asset.name,path:asset.dest,source:asset.url,sha256:hash(bytes),gitBlobSha:asset.sha,bytes:bytes.length,meshes:info.meshes,license:'CC BY-NC-SA 4.0 (conservative distribution terms)',status:'research-only-not-approved-for-live-anatomy'});
 console.log('VERIFIED '+asset.name+' '+bytes.length+' bytes '+info.meshes+' meshes');
}
await writeFile(resultPath,JSON.stringify({source:catalog.source,sourceCommit:catalog.pinnedCommit,license:'Conservative upstream NC-SA; preserve UPSTREAM-LICENSE.txt, UPSTREAM-NOTICE.txt and MODELS-LICENSE.txt',scientificApproval:false,commercialUse:false,assets:manifest},null,2)+'\n');
console.log('SUCCESS '+manifest.length+' research models');
