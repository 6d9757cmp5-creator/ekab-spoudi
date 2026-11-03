#!/usr/bin/env node
/** Independent anonymous GHCR recovery verifier for ALL files in the evidence ledger. */
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';

const restore=process.env.NIH_RESTORE_DIR;
if(!restore)throw Error('NIH_RESTORE_DIR required');
const sourceDir='tools/atla-ai/resources/nih3d-master-plan-2026';
const ledger=JSON.parse(fs.readFileSync('tools/atla-ai/resources/nih3d-verified-originals-2026.json','utf8'));
const index=JSON.parse(fs.readFileSync(path.join(sourceDir,'catalog-index.json'),'utf8'));
const source=new Map();
for(const seg of index.segments){
 const j=JSON.parse(fs.readFileSync(path.join(sourceDir,'segments',seg.filename),'utf8'));
 for(const item of j.items){
  assert(!source.has(item.entryId),'Duplicate source ID');
  source.set(item.entryId,item);
 }
}
assert.equal(source.size,index.publishedEntriesFound);
assert.equal(source.size,ledger.catalogSourceEntries);
assert.equal(ledger.clinicalScientificReviewComplete,false);
assert.equal(ledger.fullNIHArchiveComplete,false);
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const digestPattern=/^ghcr\.io\/6d9757cmp5-creator\/atla-nih3d-archive@sha256:[a-f0-9]{64}$/;
const unique=new Set(),images=new Set();let files=0,bytes=0;
for(const m of ledger.models){
 const src=source.get(m.entryId);
 assert(src,'Missing source model '+m.entryId);
 assert.equal(src.accession,m.accession);
 assert.equal(src.version,m.sourceVersion);
 assert.equal(src.licenseRaw,m.originalLicenseRaw);
 assert.equal(src.license,m.originalLicenseCategory);
 assert.equal(src.files.length,m.verifiedFiles.length,'Incomplete source model '+m.entryId);
 assert(m.allOriginalFilesPersistentlyRecovered&&m.clinicalUseApproved===false);
 for(const f of m.verifiedFiles){
  assert(!unique.has(f.originalSourceUrl),'Duplicate source URL');
  unique.add(f.originalSourceUrl);
  const orig=src.files.find(x=>x.url===f.originalSourceUrl);
  assert(orig&&orig.format===f.format&&orig.size===f.size,'Original metadata mismatch');
  const image=f.verifiedOCI.digest;
  assert(digestPattern.test(image),'Untrusted OCI digest');
  images.add(image);
  const hash=image.split(':').pop();
  assert(/^originals\/[\w.\/-]+$/.test(f.verifiedOCI.filePath)&&!f.verifiedOCI.filePath.includes('..'));
  const location=path.join(restore,hash,f.verifiedOCI.filePath);
  const b=fs.readFileSync(location);
  assert.equal(b.length,f.size,'Anonymous recovery file size mismatch '+location);
  assert.equal(sha(b),f.sha256,'Anonymous recovery SHA256 mismatch '+location);
  if(f.format==='GLB'){assert.equal(b.subarray(0,4).toString('ascii'),'glTF');assert.equal(b.readUInt32LE(8),b.length);}
  if(f.format==='STL'){assert(b.length>=84&&(b.readUInt32LE(80)*50+84===b.length||b.subarray(0,5).toString('ascii').toLowerCase()==='solid'));}
  files++;bytes+=b.length;
 }
}
assert.equal(files,ledger.uniqueVerifiedOriginalFiles);
assert.equal(bytes,ledger.totalDistinctVerifiedOriginalBytes);
assert.equal(ledger.models.length,ledger.modelsWithAllCatalogOriginalFilesVerified);
assert.equal(ledger.modelsWithPartialCatalogOriginalsVerified,0);
const result={schemaVersion:1,status:'ALL_LEDGER_ORIGINAL_BYTES_RESTORED_ANONYMOUSLY_AND_SHA256_VERIFIED',
 checkedAt:new Date().toISOString(),scope:'Verified NIH original ledger only; NOT full NIH archive',
 sourceCatalogEntries:source.size,verifiedModels:ledger.models.length,verifiedFiles:files,
 verifiedOriginalBytes:bytes,uniqueImages:images.size,immutableImageDigests:[...images].sort(),
 independentClinicalApprovals:0,fullNIHArchiveComplete:false,allSourceOriginalFileSHA256Verified:true};
fs.mkdirSync('docs',{recursive:true});
fs.writeFileSync('docs/ATLA_NIH3D_GHCR_LEDGER_REVALIDATION_2026.json',JSON.stringify(result,null,2)+'\n');
console.log('NIH_GHCR_INDEPENDENT_ANONYMOUS_REVALIDATION',JSON.stringify(result));
