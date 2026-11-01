#!/usr/bin/env node
/* Quaternius CC0 Standard free character + animation GLB research, never a medical patient. */
import {readFile,writeFile,mkdir,rename} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const dir='tools/patient-simulator/resources/quaternius/';
const cat=JSON.parse(await readFile(resolve(root,dir+'catalog.json'),'utf8'));
if(cat.files?.length!==2||!cat.pinnedCommit.match(/^[a-f0-9]{40}$/))throw Error('invalid CC0 research catalog');
const allow=new Set(['night-striker.glb','universal-animation-library.glb']);
const files=cat.files;
if(files.some(a=>!allow.has(a.name)))throw Error('unexpected model or paid Source kit');
if(process.argv.includes('--dry-run')){console.log(JSON.stringify(files.map(x=>({name:x.name,bytes:x.bytes}))));process.exit(0)}
if(!process.argv.includes('--import'))throw Error('pass --import');
const imported=[];
for(const a of files){
 const upstream='https://raw.githubusercontent.com/Seyamalam/blood-league-kickoff/'+cat.pinnedCommit+'/public/assets/vendor/quaternius/'+a.name;
 if(a.source!==upstream||a.dest!==dir+a.name)throw Error('unapproved source path');
 const res=await fetch(upstream,{signal:AbortSignal.timeout(120000)});
 if(!res.ok)throw Error(a.name+' HTTP '+res.status);
 const data=Buffer.from(await res.arrayBuffer());
 const blob=createHash('sha1').update(Buffer.from('blob '+data.length+'\0')).update(data).digest('hex');
 if(blob!==a.sha||data.length!==a.bytes)throw Error('source verification failed '+a.name);
 if(data.length<32||data.toString('ascii',0,4)!=='glTF'||data.readUInt32LE(4)!==2||data.readUInt32LE(8)!==data.length||data.readUInt32LE(16)!==0x4e4f534a)throw Error('bad glTF '+a.name);
 const gltf=JSON.parse(data.subarray(20,20+data.readUInt32LE(12)).toString('utf8'));
 if(a.name==='night-striker.glb'&&(!gltf.meshes?.length||!gltf.nodes?.length))throw Error('missing character geometry');
 if(a.name==='universal-animation-library.glb'&&!gltf.animations?.length)throw Error('missing animations');
 const dest=resolve(root,a.dest);await mkdir(dirname(dest),{recursive:true});
 await writeFile(dest+'.incoming',data);await rename(dest+'.incoming',dest);
 const row={name:a.name,path:a.dest,sha256:createHash('sha256').update(data).digest('hex'),size:data.length,meshes:gltf.meshes?.length||0,animations:gltf.animations?.length||0,skins:gltf.skins?.length||0,license:'CC0-1.0 (original Quaternius free packs)',source:upstream,clinicalStatus:'NOT CLINICALLY VALIDATED'};
 imported.push(row);console.log('VERIFIED '+a.name+' meshes='+row.meshes+' animations='+row.animations);
}
await writeFile(resolve(root,dir+'imported-manifest.json'),JSON.stringify({pinnedRehostCommit:cat.pinnedCommit,originalSources:[cat.freePack,cat.freeAnimations],rehostSource:cat.rehostSource,rightsNotes:cat.rightsReview,assets:imported},null,2)+'\n');
console.log('SUCCESS '+imported.length+' CC0 research files');
