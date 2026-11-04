#!/usr/bin/env node
/** Archive one deterministic, rights-filtered NIH3D source plan, then verify OCI recovery. */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import {Readable,Transform} from 'node:stream';
import {pipeline} from 'node:stream/promises';

const action=process.argv[2],root=process.env.NIH_BATCH_DIR;
if(!root||!['prepare','verify'].includes(action))throw Error('NIH_BATCH_DIR required and prepare|verify action');
const PLAN_PATH='tools/atla-ai/resources/nih3d-next-originals-plan-2026.json';
const CAT='tools/atla-ai/resources/nih3d-master-plan-2026/segments';
const REGISTRY='tools/atla-ai/resources/nih3d-verified-originals-2026.json';
const SAFE=/^https:\/\/3d\.nih\.gov\/api\/submissions\/\d+\/runs\/[a-f0-9-]+\/output-files\/\d+$/i;
const EXTS={GLB:'glb',STL:'stl',OBJ:'obj',WRL:'wrl',X3D:'x3d',GLTF:'gltf',PLY:'ply','3MF':'3mf'};
const p=x=>path.join(root,x);
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');

function inspectHeader(b,type){
 if(b.length<80||b.subarray(0,80).toString('utf8').toLowerCase().includes('<html'))throw Error('Not original NIH 3D source bytes');
 if(type==='GLB'){
  assert.equal(b.subarray(0,4).toString('ascii'),'glTF');
  assert.equal(b.readUInt32LE(4),2);
  assert.equal(b.readUInt32LE(8),b.length);
 }
 if(type==='STL'){
  assert(b.readUInt32LE(80)*50+84===b.length||b.subarray(0,5).toString('ascii').toLowerCase()==='solid','Invalid STL');
 }
}
if(action==='prepare'){
 const plan=JSON.parse(fs.readFileSync(PLAN_PATH,'utf8'));
 const index=JSON.parse(fs.readFileSync('tools/atla-ai/resources/nih3d-master-plan-2026/catalog-index.json','utf8'));
 const originalRegistry=JSON.parse(fs.readFileSync(REGISTRY,'utf8'));
 assert.equal(plan.schemaVersion,1);
 assert.equal(plan.sourceCatalogEntries,index.publishedEntriesFound);
 assert.equal(originalRegistry.catalogSourceEntries,index.publishedEntriesFound);
 assert.equal(plan.verifiedAlreadyCompleteModels,originalRegistry.modelsWithAllCatalogOriginalFilesVerified);
 assert(plan.selectedModels>0&&plan.selectedModels<=20&&plan.selectedOriginalFiles>0&&plan.selectedOriginalFiles<=85);
 assert(plan.selectedExpectedSourceBytes>0&&plan.selectedExpectedSourceBytes<=100_000_000);
 const existing=new Set(originalRegistry.models.filter(x=>x.allOriginalFilesPersistentlyRecovered).map(x=>x.entryId));
 const segments=new Map(),models=[],files=[],urls=new Set();
 for(const selection of plan.selected){
  const id=Number(selection.entryId),start=Math.floor((id-1)/500)*500+1,end=start+499;
  const filename=CAT+'/entries-'+start+'-'+end+'.json';
  if(!segments.has(filename))segments.set(filename,JSON.parse(fs.readFileSync(filename,'utf8')));
  const entry=segments.get(filename).items.find(x=>x.entryId===id);
  if(!entry||existing.has(id))throw Error('Source entry missing or already archived: '+id);
  if(!String(entry.licenseRaw??'').trim()||selection.license!==entry.licenseRaw)
   throw Error('Source license differs from the plan '+id);
  if(entry.accession!==selection.accession||entry.title!==selection.title||entry.url!==selection.sourcePage||
    entry.files.length!==selection.expectedFiles||entry.category!==selection.category)
   throw Error('Current source metadata changed after batch planning '+id);
  let perModelBytes=0;
  for(let k=0;k<entry.files.length;k++){
   const source=entry.files[k],predicted=selection.sourceRefs[k],
   fmt=String(source.format??'').toUpperCase(),size=Number(source.size);
   if(!predicted||source.url!==predicted.url||size!==predicted.size||fmt!==predicted.format||
     !EXTS[fmt]||!SAFE.test(source.url)||urls.has(source.url))
    throw Error('Unsafe or changed source original '+entry.entryId);
   if(!Number.isSafeInteger(size)||size<=80||size>200_000_000)throw Error('Individual NIH original exceeds download cap');
   urls.add(source.url);perModelBytes+=size;
   const archivePath='originals/'+entry.accession+'/'+String(k).padStart(3,'0')+'.'+EXTS[fmt];
   files.push({entryId:id,accession:entry.accession,originalName:source.name??null,
     originalFormat:fmt,url:source.url,expectedBytes:size,archivePath});
  }
  if(perModelBytes!==selection.expectedBytes)throw Error('Per-model original bytes changed');
  models.push({id,accession:entry.accession,title:entry.title,category:entry.category,
    license:entry.licenseRaw,originalPage:entry.url,sourceVersion:entry.version??null,
    sourceConceptCandidates:selection.sourceConceptCandidates??[],
    pathologyContext:selection.pathologyContext??null,independentScientificApproval:false});
 }
 const total=files.reduce((s,f)=>s+f.expectedBytes,0);
 if(files.length!==plan.selectedOriginalFiles||total!==plan.selectedExpectedSourceBytes)
  throw Error('Original planned total mismatch');
 fs.mkdirSync(p('originals'),{recursive:true});
 let done=0;
 for(const item of files){
  fs.mkdirSync(path.dirname(p(item.archivePath)),{recursive:true});
  let success=false,lastReason='';
  for(let n=0;n<3&&!success;n++){
   try{
    const res=await fetch(item.url,{signal:AbortSignal.timeout(80000),headers:{Accept:'application/octet-stream'}});
    if(!res.ok||!res.body)throw Error('Original NIH source HTTP '+res.status);
    let streamed=0;
    const cap=new Transform({transform(chunk,_enc,cb){
      streamed+=chunk.byteLength;
      if(streamed>item.expectedBytes||streamed>200_000_000)return cb(Error('Unexpected source byte count'));
      cb(null,chunk);
    }});
    await pipeline(Readable.fromWeb(res.body),cap,fs.createWriteStream(p(item.archivePath)));
    const original=fs.readFileSync(p(item.archivePath));
    assert.equal(original.length,item.expectedBytes);
    inspectHeader(original,item.originalFormat);
    item.sha256=sha(original);item.verifiedBytes=original.length;
    success=true;console.log('NIH SOURCE SHA OK',++done+'/'+files.length,item.accession,item.originalFormat);
   }catch(error){
    fs.rmSync(p(item.archivePath),{force:true});
    lastReason=String(error.message??error);
    if(n<2)await new Promise(resolve=>setTimeout(resolve,1250*(n+1)));
   }
  }
  if(!success)throw Error('Original source batch incomplete; archive not published: '+item.accession+' '+lastReason);
 }
 const manifest={
   schemaVersion:2,origin:'NIH 3D Master Plan 2026',sourceCatalogEntries:index.publishedEntriesFound,
   originalModelCount:models.length,originalFileCount:files.length,originalByteCount:total,
   allListedOriginalFormatsForTheseCatalogEntries:true,
   scientificApproval:'NOT_COMPLETED',fullNIHArchiveComplete:false,
   originalModels:models,originalFiles:files
 };
 fs.writeFileSync(p('MANIFEST.json'),JSON.stringify(manifest,null,2)+'\n');
 console.log('NIH PLANNED SOURCE BATCH VERIFIED',JSON.stringify({models:models.length,files:files.length,bytes:total}));
}
if(action==='verify'){
 const original=JSON.parse(fs.readFileSync(p('MANIFEST.json'),'utf8'));
 const restored=JSON.parse(fs.readFileSync(p('recovered/MANIFEST.json'),'utf8'));
 assert.deepEqual(restored,original);
 let total=0;
 for(const file of restored.originalFiles){
  const bytes=fs.readFileSync(p('recovered/'+file.archivePath));
  assert.equal(bytes.byteLength,file.verifiedBytes);
  assert.equal(sha(bytes),file.sha256);
  inspectHeader(bytes,file.originalFormat);
  total+=bytes.byteLength;
 }
 assert.equal(total,original.originalByteCount);
 console.log('NIH ANONYMOUS RECOVERY SHA VERIFIED',JSON.stringify({models:restored.originalModelCount,files:restored.originalFileCount,bytes:total}));
}
