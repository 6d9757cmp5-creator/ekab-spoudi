#!/usr/bin/env node
/** Bounded 7-model NIH original-file archive, with immutable SHA-256 evidence. */
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {Readable,Transform} from 'node:stream';
import {pipeline} from 'node:stream/promises';
import {readApprovalRegistry,requireSourceCredibility} from '../tools/atla-ai/nih3d-credibility-gate.mjs';
const action=process.argv[2],root=process.env.NIH_BATCH_DIR;
const IDS=[105,190,251,277,334,379,451],MAX_TOTAL=70_000_000,MAX_FILE=12_000_000,MAX_COUNT=60;
const SOURCE_RE=/^https:\/\/3d\.nih\.gov\/api\/submissions\/\d+\/runs\/[a-f0-9-]+\/output-files\/\d+$/i;
const EXT={GLB:'glb',STL:'stl',OBJ:'obj',WRL:'wrl',X3D:'x3d',GLTF:'gltf',PLY:'ply','3MF':'3mf'};
if(!root||!['prepare','verify'].includes(action))throw Error('NIH_BATCH_DIR required; action prepare|verify');
const p=x=>path.join(root,x),sha=b=>crypto.createHash('sha256').update(b).digest('hex');
function checkFormat(bytes,fmt){
 assert(bytes.length>80,'Unexpected tiny file');
 assert(!bytes.subarray(0,60).toString('utf8').toLowerCase().includes('<html'),'HTML instead of NIH 3D data');
 if(fmt==='GLB'){assert.equal(bytes.subarray(0,4).toString('ascii'),'glTF');assert.equal(bytes.readUInt32LE(4),2);assert.equal(bytes.readUInt32LE(8),bytes.length);}
 if(fmt==='STL'){assert(bytes.readUInt32LE(80)*50+84===bytes.length||bytes.subarray(0,5).toString('ascii').toLowerCase()==='solid','Invalid STL');}
}
if(action==='prepare'){
 const credibilityRegistry=readApprovalRegistry();
 const catalog=JSON.parse(fs.readFileSync('tools/atla-ai/resources/nih3d-master-plan-2026/segments/entries-1-500.json','utf8'));
 const previous=JSON.parse(fs.readFileSync('tools/atla-ai/resources/nih3d-verified-originals-2026.json','utf8'));
 const already=new Set(previous.models.map(m=>m.entryId));
 const entries=IDS.map(id=>catalog.items.find(x=>x.entryId===id));
 if(entries.some(x=>!x))throw Error('Missing NIH source entry');
 const files=[],models=[],urls=new Set();
 for(const e of entries){
  requireSourceCredibility(e,credibilityRegistry);
  if(already.has(e.entryId))throw Error('Already archived model: '+e.entryId);
  if(e.license!=='Public Domain'||e.licenseRaw!=='Public Domain')throw Error('Unapproved source license '+e.entryId);
  if(!['Anatomy','Biomacromolecules'].includes(e.category))throw Error('Unexpected source category');
  if(!e.url||e.url!=='https://3d.nih.gov/entries/'+e.accession)throw Error('Unexpected NIH entry link');
  if(!Array.isArray(e.files)||!e.files.length)throw Error('Missing original file list '+e.entryId);
  const sources=[];
  for(let i=0;i<e.files.length;i++){
   const f=e.files[i],fmt=String(f.format??'').toUpperCase(),size=Number(f.size);
   if(!EXT[fmt]||!SOURCE_RE.test(f.url)||urls.has(f.url))throw Error('Unsupported, duplicate or unsafe source file');
   if(!Number.isSafeInteger(size)||size<=80||size>MAX_FILE)throw Error('Source file exceeds safe cap '+e.entryId);
   urls.add(f.url);
   const archivePath='originals/'+e.accession+'/'+String(i).padStart(3,'0')+'.'+EXT[fmt];
   const item={entryId:e.entryId,accession:e.accession,format:fmt,originalName:f.name??null,
    sourceURL:f.url,expectedBytes:size,archivePath};
   files.push(item);sources.push(item);
  }
  models.push({entryId:e.entryId,accession:e.accession,title:e.title,
   category:e.category,originalPage:e.url,sourceVersion:e.version??null,
   sourceDescription:e.description??null,sourceLicense:e.licenseRaw,originalFormatsListed:sources.length,
   clinicallyReviewed:false});
 }
 const total=files.reduce((s,f)=>s+f.expectedBytes,0);
 if(files.length>MAX_COUNT||total>MAX_TOTAL)throw Error('Exceeds explicit batch limits');
 fs.mkdirSync(p('originals'),{recursive:true});
 let count=0;
 for(const item of files){
  fs.mkdirSync(path.dirname(p(item.archivePath)),{recursive:true});
  let completed=false,lastError='';
  for(let attempt=0;attempt<3&&!completed;attempt++){
   try{
    const response=await fetch(item.sourceURL,{headers:{Accept:'application/octet-stream'},signal:AbortSignal.timeout(75000)});
    if(!response.ok||!response.body)throw Error('NIH HTTP '+response.status);
    let streamed=0;
    const limiter=new Transform({transform(chunk,_encoding,done){
      streamed+=chunk.byteLength;
      if(streamed>item.expectedBytes||streamed>MAX_FILE)return done(Error('NIH source exceeds expected source size'));
      done(null,chunk);
    }});
    await pipeline(Readable.fromWeb(response.body),limiter,fs.createWriteStream(p(item.archivePath)));
    const payload=fs.readFileSync(p(item.archivePath));
    assert.equal(payload.byteLength,item.expectedBytes,'Unexpected NIH byte length');
    checkFormat(payload,item.format);
    item.sha256=sha(payload);item.verifiedBytes=payload.length;completed=true;
    console.log('Original NIH bytes and SHA-256 verified',++count+'/'+files.length,item.accession,item.format,item.verifiedBytes);
   }catch(e){
    fs.rmSync(p(item.archivePath),{force:true});lastError=String(e.message??e);
    if(attempt<2)await new Promise(resolve=>setTimeout(resolve,(attempt+1)*1200));
   }
  }
  if(!completed)throw Error('Batch aborted, no archive published: '+item.accession+'/'+item.format+' '+lastError);
 }
 const manifest={schemaVersion:2,source:'NIH 3D Master Plan 2026 snapshot',
  archiveStatus:'ALL_LISTED_ORIGINALS_SOURCE_VERIFIED',completeNihArchive:false,
  scientificReviewStatus:'NOT_COMPLETED',selectedModelIDs:IDS,modelCount:models.length,
  originalFileCount:files.length,originalByteCount:total,models,files};
 fs.writeFileSync(p('MANIFEST.json'),JSON.stringify(manifest,null,2)+'\n');
 console.log('PREPARED NIH ORIGINALS',JSON.stringify({models:models.length,files:files.length,bytes:total}));
}
if(action==='verify'){
 const before=JSON.parse(fs.readFileSync(p('MANIFEST.json'),'utf8'));
 const after=JSON.parse(fs.readFileSync(p('recovered/MANIFEST.json'),'utf8'));
 assert.deepEqual(after,before,'Original and OCI manifests differ');
 assert.deepEqual(before.selectedModelIDs,IDS);
 assert.equal(before.originalFileCount,51);
 assert.equal(before.modelCount,7);
 let total=0;const archived=new Set();
 for(const f of after.files){
  const b=fs.readFileSync(p('recovered/'+f.archivePath));
  assert.equal(b.length,f.verifiedBytes,'Restored size mismatch');
  assert.equal(sha(b),f.sha256,'Restored SHA-256 differs');
  checkFormat(b,f.format);total+=b.byteLength;archived.add(f.entryId);
 }
 assert.equal(total,before.originalByteCount);
 assert.equal(archived.size,IDS.length);
 console.log('ANONYMOUS OCI RECOVERY VERIFIED',JSON.stringify({models:archived.size,files:after.files.length,bytes:total}));
}
