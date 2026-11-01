#!/usr/bin/env node
import {createReadStream} from 'node:fs';
import {readFile,writeFile,mkdir,copyFile,stat} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const home='tools/anatomy-3d/resources/bp3d43/';
const source=home+'atlases/bp3d43/build/';
const destination=home+'compiled-shards/';
const index=JSON.parse(await readFile(source+'index.json','utf8'));
if((index.counts?.elements||0)<3000)throw Error('BodyParts3D 4.3 full atlas incomplete');
const file=source+'meshes.bin';
await mkdir(destination,{recursive:true});
const totalHash=createHash('sha256'),files=[];
let count=0,bytes=0;
for await(const chunk of createReadStream(file,{highWaterMark:64*1024*1024})){
 const name='mesh-part-'+String(count++).padStart(2,'0')+'.bin';
 const sha=createHash('sha256').update(chunk).digest('hex');
 totalHash.update(chunk);bytes+=chunk.length;
 await writeFile(destination+name,chunk);
 files.push({file:name,bytes:chunk.length,sha256:sha});
 console.log(name,chunk.length,sha);
}
if(!files.length||files.some(x=>x.bytes>=95*1024*1024))throw Error('Invalid GitHub shard layout');
if(bytes!==(await stat(file)).size)throw Error('Missing input source bytes');
await copyFile(source+'index.json',destination+'index.json');
await writeFile(destination+'manifest.json',JSON.stringify({
 source:'DBCLS/BodyParts3D 4.3 (Anatomography)',
 sourceUri:'https://lifesciencedb.jp/bp3d/',
 license:'CC BY 4.0 according to current official license page; verify source release terms',
 attribution:'BodyParts3D, The Database Center for Life Science',
 category:'ATLA Anatomy Lab only - high resolution research source',
 compiledIndex:'index.json',
 totalBytes:bytes,
 sha256:totalHash.digest('hex'),
 partCount:files.length,
 parts:files,
 anatomyElements:index.counts.elements,
 namedStructures:index.counts.concepts,
 validation:'Source importer successful; no independent clinical/visual QA'
},null,2)+'\n');
console.log('SHARDED '+files.length+' parts, '+bytes+' bytes');
