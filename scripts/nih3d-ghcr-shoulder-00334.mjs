#!/usr/bin/env node
/** One bounded, explicitly Public Domain NIH 3D model. No general archive claims. */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import {Readable,Transform} from 'node:stream';
import {pipeline} from 'node:stream/promises';

const cmd=process.argv[2],root=process.env.NIH_BATCH_DIR;
if(!root||!['prepare','verify'].includes(cmd))throw Error('NIH_BATCH_DIR required; use prepare|verify');
const ID=334,MAX_TOTAL=12_000_000,MAX_FILE=5_000_000;
const sourcePath='tools/atla-ai/resources/nih3d-master-plan-2026/segments/entries-1-500.json';
const original=JSON.parse(fs.readFileSync(sourcePath,'utf8')).items.find(e=>e.entryId===ID);
assert(original,'Missing NIH source record');
assert.equal(original.accession,'3DPX-000334');
assert.equal(original.category,'Anatomy');
assert.equal(original.license,'Public Domain');
assert.equal(original.licenseRaw,'Public Domain');
assert.equal(original.version,3);
assert.equal(original.files.length,5);
const known=JSON.parse(fs.readFileSync('tools/atla-ai/resources/nih3d-verified-originals-2026.json','utf8'));
assert(!known.models.some(m=>m.entryId===ID),'Already verified: avoid duplicate NIH archive');
const formats=['STL','X3D','GLB','WRL','OBJ'];
assert.deepEqual(original.files.map(f=>f.format),formats);
const expected=original.files.reduce((n,f)=>n+Number(f.size),0);
assert(expected>0&&expected<=MAX_TOTAL,'Source exceeds bounded batch');
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const file=rel=>path.join(root,rel);
const urlPattern=/^https:\/\/3d\.nih\.gov\/api\/submissions\/\d+\/runs\/[0-9a-f-]+\/output-files\/\d+$/i;
function validateFormat(fmt,b){
  assert(b.length>80,'Original file too small');
  const head=b.subarray(0,4096).toString('utf8');
  if(fmt==='GLB'){
    assert.equal(b.subarray(0,4).toString('ascii'),'glTF');
    assert.equal(b.readUInt32LE(4),2);
    assert.equal(b.readUInt32LE(8),b.length);
  } else if(fmt==='STL'){
    assert(b.length>=84&&(b.readUInt32LE(80)*50+84===b.length||/^solid\b/i.test(head)),'Invalid STL');
  } else if(fmt==='X3D'){
    assert(/<X3D(?:\s|>)/i.test(head),'Invalid X3D XML');
  } else if(fmt==='WRL'){
    assert(/^#VRML\s+V2\.0\s+utf8/i.test(head.trimStart()),'Invalid VRML header');
  } else if(fmt==='OBJ'){
    assert(/(?:^|\n)\s*(?:v|vn|vt|f)\s+[-\d.]/m.test(b.subarray(0,100000).toString('utf8')),'Invalid OBJ geometry');
  } else throw Error('Unsupported original format');
}
if(cmd==='prepare'){
  const apiUrl='https://3d.nih.gov/api/entries/334';
  const liveRes=await fetch(apiUrl,{headers:{Accept:'application/json'},signal:AbortSignal.timeout(30000)});
  assert(liveRes.ok,'Live NIH metadata unavailable '+liveRes.status);
  const live=await liveRes.json();
  assert.equal(Number(live.entryId),ID,'Live NIH ID mismatch');
  const published=(live.submissions??[]).filter(s=>String(s.submissionStatus).toLowerCase()==='published');
  assert.equal(published.length,1,'Ambiguous or missing live published submission');
  assert.equal(Number(published[0].version),original.version,'Live NIH source version changed');
  assert.equal(published[0].metadata?.license,'Public Domain','Live NIH license changed; no public publication');
  const metadata={source:apiUrl,checkedAt:new Date().toISOString(),status:'Published',version:published[0].version,license:published[0].metadata.license};
  fs.mkdirSync(file('originals/3DPX-000334'),{recursive:true});
  const verified=[],urls=new Set();
  for(let i=0;i<original.files.length;i++){
    const f=original.files[i],fmt=f.format;
    assert(urlPattern.test(f.url)&&!urls.has(f.url),'Unsafe or repeated original URL');
    urls.add(f.url);
    assert(Number.isSafeInteger(f.size)&&f.size>0&&f.size<=MAX_FILE,'Source exceeds per-file limit');
    const rel='originals/3DPX-000334/'+String(i).padStart(3,'0')+'.'+fmt.toLowerCase();
    let succeeded=false,why='';
    for(let attempt=0;attempt<3&&!succeeded;attempt++){
      try{
        const res=await fetch(f.url,{headers:{Accept:'application/octet-stream'},signal:AbortSignal.timeout(100000)});
        if(!res.ok||!res.body)throw Error('NIH HTTP '+res.status);
        let bytes=0;
        const limiter=new Transform({transform(chunk,enc,cb){bytes+=chunk.byteLength;cb(bytes<=f.size&&bytes<=MAX_FILE?null:Error('Source byte limit exceeded'),chunk)}});
        await pipeline(Readable.fromWeb(res.body),limiter,fs.createWriteStream(file(rel)));
        const buffer=fs.readFileSync(file(rel));
        assert.equal(buffer.length,f.size,'Original source length mismatch');
        validateFormat(fmt,buffer);
        verified.push({entryId:ID,accession:original.accession,title:original.title,sourceVersion:original.version,originalLicense:'Public Domain',originalName:f.name,originalFormat:fmt,sourceUrl:f.url,archivePath:rel,bytes:buffer.length,sha256:hash(buffer)});
        succeeded=true;
      }catch(e){
        why=String(e.message??e);
        fs.rmSync(file(rel),{force:true});
        if(attempt<2)await new Promise(r=>setTimeout(r,1200*(attempt+1)));
      }
    }
    if(!succeeded)throw Error('No incomplete batch published: '+fmt+' '+why);
  }
  const total=verified.reduce((n,f)=>n+f.bytes,0);
  assert.equal(total,expected);
  const manifest={schemaVersion:1,scope:'NIH 3DPX-000334 ONLY',originalModelCount:1,originalFileCount:5,totalOriginalBytes:total,
    originalPage:original.url,originalAccession:original.accession,originalTitle:original.title,sourceVersion:original.version,
    sourceCategory:original.category,sourceLicense:'Public Domain',liveSourceMetadata:metadata,
    independentScientificApproval:false,clinicalUseApproved:false,fullNIHArchiveComplete:false,files:verified};
  fs.writeFileSync(file('MANIFEST.json'),JSON.stringify(manifest,null,2)+'\n');
  console.log('SOURCE_VERIFIED',JSON.stringify({id:ID,formats,bytes:total,sha256Files:verified.length}));
}
if(cmd==='verify'){
  const before=JSON.parse(fs.readFileSync(file('MANIFEST.json'),'utf8'));
  const after=JSON.parse(fs.readFileSync(file('recovered/MANIFEST.json'),'utf8'));
  assert.deepEqual(after,before,'Recovered manifest mismatch');
  assert.equal(after.originalFileCount,5);
  let total=0;
  for(const f of after.files){
    const bytes=fs.readFileSync(file('recovered/'+f.archivePath));
    assert.equal(bytes.length,f.bytes,'Recovered byte length mismatch');
    assert.equal(hash(bytes),f.sha256,'Recovered SHA-256 mismatch');
    validateFormat(f.originalFormat,bytes);
    total+=bytes.length;
  }
  assert.equal(total,after.totalOriginalBytes);
  console.log('ANONYMOUS_GHCR_SHA256_VERIFIED',JSON.stringify({models:1,files:5,bytes:total}));
}
