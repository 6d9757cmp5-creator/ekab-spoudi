#!/usr/bin/env node
/**
 * NIH 3D model mirror for ATLA Master Plan 2026.
 * Downloads real published geometry files from the previously archived NIH metadata.
 * Archives are LOSSLESS .tar.zst packs, never lossy mesh simplifications.
 * Preserves original file bytes, sha256, attribution, exact license text and failures.
 * Meant for GitHub Releases, not the Pages site or Git history.
 */
import {mkdir,readdir,readFile,writeFile,rm,stat,rename,open} from 'node:fs/promises';
import {createWriteStream} from 'node:fs';
import {Readable,Transform} from 'node:stream';
import {pipeline} from 'node:stream/promises';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {join,basename} from 'node:path';

const args=Object.fromEntries(process.argv.slice(2).filter(x=>x.startsWith('--')).map(x=>{let i=x.indexOf('=');return i<0?[x.slice(2),'true']:[x.slice(2,i),x.slice(i+1)];}));
const first=Number(args.start||1),last=Number(args.end||100);
if(!Number.isInteger(first)||!Number.isInteger(last)||first<1||last<first||last-first>=100||last>30000)throw Error('Use one 1–100 record range');
const sources=['tools/atla-ai/resources/nih3d-master-plan-2026/segments','tools/atla-ai/resources/nih3d-catalog'];
const out=args.out||'tmp/atla-nih3d-packs',work=join(out,'work'),maxPack=1200*1024**2,maxIndividual=7500*1024**2;
const wait=ms=>new Promise(r=>setTimeout(r,ms)),allowed=new Set(['GLB','GLTF','STL','OBJ','X3D','WRL','PLY','3MF']);
const all=new Map(),missing=[],failed=[],done=[],packs=[];
const safe=s=>String(s||'model').replace(/[^a-zA-Z0-9._-]/g,'_').slice(0,85);
await mkdir(out,{recursive:true});await mkdir(work,{recursive:true});
let foundMetadata=false;
for(const dir of sources){
 let names=[];try{names=await readdir(dir)}catch{continue}
 for(const name of names.filter(n=>/^entries-\d+-\d+\.json$/.test(n)).sort()){
  const batch=JSON.parse(await readFile(join(dir,name),'utf8'));
  for(const row of batch.items||batch.entries||[]){
   const id=Number(row.entryId??row.id);
   if(id>=first&&id<=last&&!all.has(id))all.set(id,row);
  }
  foundMetadata=true;
 }
}
if(!foundMetadata)throw Error('No NIH source metadata catalog has been archived yet');
const prefix='atla-nih3d-'+String(first).padStart(5,'0')+'-'+String(last).padStart(5,'0');
let currentBytes=0,memberFiles=[],packageNumber=0;
async function flush(){
 if(!memberFiles.length)return;
 const name=prefix+'-part-'+String(packageNumber++).padStart(3,'0')+'.tar.zst',archive=join(out,name);
 const local={range:{start:first,end:last},part:packageNumber,modelFiles:memberFiles,compression:'tar+zstd lossless',
  modelFilesRetainOriginalBytes:true,source:'https://3d.nih.gov/'};
 await writeFile(join(work,'MANIFEST.json'),JSON.stringify(local,null,2)+'\n');
 execFileSync('tar',['-C',work,'--use-compress-program','zstd -3 -T2','-cf',archive,'.'],{stdio:'inherit',timeout:3600000});
 const size=(await stat(archive)).size;
 if(size>=1950*1024**2){
  execFileSync('split',['-b','1750m','-d','-a','3',archive,archive+'.part-'],{stdio:'inherit',timeout:3600000});
  const partNames=(await readdir(out)).filter(x=>x.startsWith(name+'.part-')).sort();
  if(!partNames.length)throw Error('Split produced no archive segments');
  await rm(archive,{force:true});
  packs.push({name,bytes:size,models:memberFiles.length,split:partNames});
 }else packs.push({name,bytes:size,models:memberFiles.length});
 await rm(work,{recursive:true,force:true});await mkdir(work,{recursive:true});
 currentBytes=0;memberFiles=[];
}
async function download(url,target,maxSize){
 for(let attempt=0;attempt<3;attempt++){
  try{
   const response=await fetch(url,{signal:AbortSignal.timeout(240000),headers:{Accept:'application/octet-stream'}});
   if(!response.ok){
    if([429,500,502,503,504].includes(response.status)&&attempt<2){await wait(2500*(attempt+1));continue}
    throw Error('HTTP '+response.status);
   }
   const header=Number(response.headers.get('content-length')||0);
   if(header>maxSize)throw Error('source file exceeds single-file limit');
   let total=0;const hash=createHash('sha256');
   const transform=new Transform({transform(chunk,enc,cb){
    total+=chunk.length;if(total>maxSize)return cb(Error('source stream exceeds single-file limit'));
    hash.update(chunk);cb(null,chunk);
   }});
   await pipeline(Readable.fromWeb(response.body),transform,createWriteStream(target,{flags:'wx'}));
   if(total===0)throw Error('empty response');
   return {bytes:total,sha256:hash.digest('hex')};
  }catch(e){
   await rm(target,{force:true}).catch(()=>{});
   if(attempt===2||/limit|exceeds/i.test(e.message))throw e;
   await wait(2500*(attempt+1));
  }
 }
}
for(let id=first;id<=last;id++){
 const item=all.get(id);
 if(!item){missing.push({entryId:id,reason:'No published metadata was stored for this source ID (may be unpublished or nonexistent)'});continue}
 const files=(item.files||[]).filter(f=>allowed.has(String(f.format||'').toUpperCase())&&/^https:\/\/3d\.nih\.gov\/api\/submissions\//.test(f.url||''));
 if(!files.length){failed.push({entryId:id,reason:'No supported 3D output attached in source metadata'});continue}
 for(let i=0;i<files.length;i++){
  const f=files[i],guess=Number(f.size||f.bytes||0);
  if(guess>maxIndividual){failed.push({entryId:id,file:i,reason:'Individual file too large for GitHub-hosted runner'});continue}
  if(guess&&currentBytes+guess>maxPack)await flush();
  const ext=String(f.format).toLowerCase(),name=String(id).padStart(6,'0')+'-'+String(i).padStart(3,'0')+'-'+safe(f.name||'original')+'.'+ext;
  const path=join(work,name);
  try{
   const result=await download(f.url,path,maxIndividual);
   const file=await open(path,'r');const header=Buffer.alloc(84);
   await file.read(header,0,84,0);await file.close();
   if(ext==='glb'&&(header.toString('ascii',0,4)!=='glTF'||header.readUInt32LE(4)!==2||header.readUInt32LE(8)!==result.bytes))throw Error('Invalid GLB header or file length');
   if(ext==='stl'&&header.readUInt32LE(80)*50+84!==result.bytes&&!header.toString('ascii',0,5).toLowerCase().startsWith('solid'))throw Error('Invalid STL header / triangle length');
   if(header.toString('utf8',0,80).toLowerCase().includes('<!doctype html'))throw Error('HTML returned, not original model');
   const metadata={entryId:id,accession:item.accession,title:item.title,creator:item.creator||'',originalLicense:item.licenseRaw||item.licenseExact||'',
    normalizedLicense:item.license||item.licenseNormalized||'',sourceEntry:item.url||item.officialUrl,sourceFile:f.url,
    originalFilename:f.name||'',archiveFilename:name,section:item.route||item.section||'',...result};
   currentBytes+=result.bytes;memberFiles.push(metadata);done.push(metadata);
   console.log('MIRRORED',id,name,result.bytes);
   if(currentBytes>=maxPack)await flush();
  }catch(e){
   failed.push({entryId:id,source:f.url,error:String(e.message).slice(0,220)});
   console.error('FAILED MODEL',id,String(e.message).slice(0,180));
  }
  await wait(450);
 }
}
await flush();
const report={range:{start:first,end:last},downloadedOriginalFiles:done.length,uniqueEntryIds:new Set(done.map(v=>v.entryId)).size,
 missingOrUnpublishedIds:missing.length,failedOutputFiles:failed.length,losslessCompression:true,fullyMirrored:failed.length===0&&missing.length===0,
 source:'https://3d.nih.gov/',permissionNote:'User affirmed access rights; exact source license information retained for every binary.',
 packs,modelFiles:done,missing,failed};
await writeFile(join(out,prefix+'-RESULT.json'),JSON.stringify(report,null,2)+'\n');
console.log('COMPLETE SHARD',JSON.stringify({range:report.range,files:done.length,models:report.uniqueEntryIds,
 archives:packs.length,failures:failed.length,missing:missing.length,fullyMirrored:report.fullyMirrored}));
