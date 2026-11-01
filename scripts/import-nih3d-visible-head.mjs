#!/usr/bin/env node
/* Approved large NIH 3D head GLB as verifiable research-only source shards. */
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const catalog=JSON.parse(await readFile('tools/atla-ai/resources/nih3d-catalog/entries-1-250.json','utf8'));
const e=catalog.items.find(e=>e.entryId===10);
if(!e||e.category!=='Anatomy'||e.license!=='Public Domain'||e.accession!=='3DPX-000010')throw Error('NIH 3D anatomical head license changed');
const file=e.files.find(f=>f.format==='GLB');
if(!file||file.size!==99985956||!file.url.startsWith('https://3d.nih.gov/api/submissions/'))throw Error('Unexpected NIH head source');
const resp=await fetch(file.url,{signal:AbortSignal.timeout(150000)});
if(!resp.ok)throw Error('NIH head HTTP '+resp.status);
const data=Buffer.from(await resp.arrayBuffer());
if(data.length!==file.size||data.toString('ascii',0,4)!=='glTF'||data.readUInt32LE(4)!==2||data.readUInt32LE(8)!==data.length)throw Error('NIH model is not the expected valid GLB');
const dir='tools/anatomy-3d/resources/nih3d-approved/head-3dpx-000010/';
await mkdir(dir,{recursive:true});
const chunks=[];
let n=0;for(let i=0;i<data.length;i+=48*1048576){
 const part=data.subarray(i,i+48*1048576);
 const name='model-part-'+String(n++).padStart(2,'0')+'.bin';
 await writeFile(dir+name,part);
 chunks.push({file:name,bytes:part.length,sha256:createHash('sha256').update(part).digest('hex')});
}
await writeFile(dir+'manifest.json',JSON.stringify({model:'Visible Male Head',source:e.url,downloadUrl:file.url,license:e.license,creator:e.creator,accession:e.accession,format:'GLB',totalBytes:data.length,sha256:createHash('sha256').update(data).digest('hex'),chunks,forTool:'Anatomy Lab',status:'research asset only; not medically or visually validated; not live'},null,2)+'\n');
console.log(JSON.stringify({source:e.accession,license:e.license,bytes:data.length,shards:chunks.length,sha256:createHash('sha256').update(data).digest('hex')}));
