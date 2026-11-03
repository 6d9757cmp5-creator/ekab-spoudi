#!/usr/bin/env node
/**
 * Bounded real NIH3D original-geometry archive. Intentionally scoped to 3 public-domain
 * human skeletal models to prove all source formats and exact recoverability.
 * NEVER equate this with the 15,688-model, 204,346-reference full archive.
 */
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {Readable,Transform} from 'node:stream';
import {pipeline} from 'node:stream/promises';

const cmd=process.argv[2],root=process.env.NIH_BATCH_DIR;
if(!root||!['prepare','verify'].includes(cmd))throw Error('Usage: NIH_BATCH_DIR=<path> node scripts/nih3d-ghcr-full-anatomy.mjs prepare|verify');
const ids=[252,255,278],MAX_BYTES=90_000_000,MAX_PER_FILE=25_000_000;
const URL_REGEX=/^https:\/\/3d\.nih\.gov\/api\/submissions\/\d+\/runs\/[a-f0-9-]+\/output-files\/\d+$/i;
const EXT={GLB:'glb',STL:'stl',OBJ:'obj',WRL:'wrl',X3D:'x3d',GLTF:'gltf',PLY:'ply', '3MF':'3mf'};
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const file=(rel)=>path.join(root,rel);
if(cmd==='prepare'){
 const catalog=JSON.parse(fs.readFileSync('tools/atla-ai/resources/nih3d-master-plan-2026/segments/entries-1-500.json','utf8'));
 const selected=ids.map(id=>catalog.items.find(x=>x.entryId===id));
 if(selected.some(x=>!x))throw Error('Missing NIH source entry');
 const items=[],files=[],urls=new Set();let estimated=0;
 for(const entry of selected){
  if(entry.category!=='Anatomy'||entry.license!=='CC BY 4.0')throw Error('Source category/license not independently eligible '+entry.entryId);
  if(!Array.isArray(entry.files)||entry.files.length<5||entry.files.length>30)throw Error('Unexpected count of original files '+entry.entryId);
  const formats=new Set(entry.files.map(f=>String(f.format).toUpperCase()));
  for(const fmt of ['GLB','STL','OBJ','WRL','X3D'])if(!formats.has(fmt))throw Error('Incomplete source format for '+entry.entryId+' '+fmt);
  const accession=entry.accession;
  items.push({id:entry.entryId,accession,title:entry.title,license:entry.license,originalPage:entry.url,sourceCategory:entry.category,independentScientificApproval:false});
  for(const [i,f] of entry.files.entries()){
   const size=Number(f.size),fmt=String(f.format).toUpperCase();
   if(!URL_REGEX.test(f.url)||!EXT[fmt]||urls.has(f.url))throw Error('Unsafe, repeated, or unsupported NIH original reference');
   if(!Number.isSafeInteger(size)||size<1||size>MAX_PER_FILE)throw Error('NIH source file over bounded archive size cap');
   urls.add(f.url);estimated+=size;
   files.push({entryId:entry.entryId,accession,originalName:f.name??null,originalFormat:fmt,
    url:f.url,expectedBytes:size,archivePath:`originals/${accession}/${String(i).padStart(3,'0')}.${EXT[fmt]}`});
  }
 }
 if(estimated>MAX_BYTES)throw Error('Total NIH source bytes exceed zero-risk pilot budget');
 fs.mkdirSync(file('originals'),{recursive:true});
 let completed=0;
 for(const source of files){
  fs.mkdirSync(path.dirname(file(source.archivePath)),{recursive:true});
  let ok=false,reason='';
  for(let attempt=0;attempt<3&&!ok;attempt++){
   try{
    const response=await fetch(source.url,{headers:{Accept:'application/octet-stream'},signal:AbortSignal.timeout(100000)});
    if(!response.ok||!response.body)throw Error('NIH original HTTP '+response.status);
    let transferred=0;
    const limiter=new Transform({transform(chunk,encoding,callback){
      transferred+=chunk.byteLength;
      if(transferred>MAX_PER_FILE||transferred>source.expectedBytes){callback(Error('Downloaded NIH bytes larger than source metadata'));return}
      callback(null,chunk);
    }});
    await pipeline(Readable.fromWeb(response.body),limiter,fs.createWriteStream(file(source.archivePath)));
    const bytes=fs.readFileSync(file(source.archivePath));
    assert.equal(bytes.length,source.expectedBytes,'Original source file size mismatch');
    if(source.originalFormat==='GLB'){
      assert.equal(bytes.subarray(0,4).toString('ascii'),'glTF','Not a GLB');
      assert.equal(bytes.readUInt32LE(8),bytes.length,'Invalid GLB declared size');
    }
    if(source.originalFormat==='STL'){
      assert(bytes.length>=84,'Invalid STL length');
      const binary=bytes.readUInt32LE(80)*50+84===bytes.length;
      const ascii=bytes.subarray(0,5).toString('ascii').toLowerCase()==='solid';
      assert(binary||ascii,'Invalid STL header');
    }
    source.sha256=hash(bytes);source.verifiedBytes=bytes.length;ok=true;
    completed++;console.log('Verified original NIH bytes '+completed+'/'+files.length+' '+source.archivePath+' '+source.verifiedBytes);
   }catch(error){
    reason=String(error.message??error);fs.rmSync(file(source.archivePath),{force:true});
    if(attempt<2)await new Promise(resolve=>setTimeout(resolve,1250*(attempt+1)));
   }
  }
  if(!ok)throw Error('Original file download failed (no incomplete package published): '+source.accession+' '+source.originalFormat+' '+reason);
 }
 const manifest={schemaVersion:1,mode:'REAL_ORIGINAL_FILES_NO_TRANSFORM',source:'NIH 3D',snapshot:'ATLA Master Plan 2026',
  sourceCatalogEntries:cataCount(catalog),scope:'3 CC BY 4.0 human neuro-anatomical records',
  allListedFormatsForSelectedModels:true,selectedEntryIDs:ids,originalModelCount:items.length,
  originalFileCount:files.length,originalByteCount:files.reduce((s,f)=>s+f.verifiedBytes,0),
  independentlyScientificallyApproved:false,fullNIHArchiveComplete:false,
  originalModels:items,originalFiles:files};
 fs.writeFileSync(file('MANIFEST.json'),JSON.stringify(manifest,null,2)+'\n');
 console.log('NIH BATCH ORIGINAL SOURCE VERIFY SUCCESS: '+JSON.stringify({models:items.length,files:files.length,bytes:manifest.originalByteCount}));
}
if(cmd==='verify'){
 const orig=JSON.parse(fs.readFileSync(file('MANIFEST.json'),'utf8'));
 const recovered=JSON.parse(fs.readFileSync(file('recovered/MANIFEST.json'),'utf8'));
 assert.deepEqual(recovered,orig,'OCI manifest differs from original');
 assert(orig.originalFiles.length===25&&orig.originalModelCount===3);
 let bytes=0;
 for(const e of recovered.originalFiles){
  const buffer=fs.readFileSync(file('recovered/'+e.archivePath));
  assert.equal(buffer.length,e.verifiedBytes,'Restored file length mismatch');
  assert.equal(hash(buffer),e.sha256,'Restored file SHA-256 mismatch');
  bytes+=buffer.length;
 }
 assert.equal(bytes,orig.originalByteCount);
 console.log('VERIFIED ALL 25 ORIGINAL NIH FILES AFTER ANONYMOUS PUBLIC GHCR RESTORE '+bytes+' bytes');
}
function cataCount(catalog){return catalog.totalEntries??catalog.items.length}
