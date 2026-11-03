#!/usr/bin/env node
/** Reconcile original NIH3D catalog against ACTUALLY restored GHCR original-source archives. */
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';

const root=process.argv[2]??'tools/atla-ai/resources/nih3d-master-plan-2026';
const output=process.argv[3]??'tools/atla-ai/resources/nih3d-verified-originals-2026.json';
const docs=[
 'docs/ATLA_NIH3D_GHCR_ARCHIVE_PROOF_2026.json',
 'docs/ATLA_NIH3D_GHCR_ANATOMY_BATCH_2026.json',
 'docs/ATLA_NIH3D_GHCR_NEURO_BATCH_2026.json',
 'docs/ATLA_NIH3D_GHCR_MOLECULAR_BATCH_2026.json',
 'docs/ATLA_NIH3D_GHCR_MEDICAL_SEVEN_BATCH_2026.json'
];
const generated=(await fs.readdir('docs')).filter(name=>/^ATLA_NIH3D_GHCR_BATCH_[a-f0-9]{16}_2026\.json$/.test(name)).sort();
docs.push(...generated.map(name=>'docs/'+name));
const provenance=[],records=[];
const digestPattern=/^ghcr\.io\/6d9757cmp5-creator\/atla-nih3d-archive@sha256:[a-f0-9]{64}$/;
for(const filepath of docs){
 const report=JSON.parse(await fs.readFile(filepath,'utf8'));
 assert(digestPattern.test(report.immutableDigest),'Not an immutable verified OCI tag');
 let files;
 let tag;
 if(Array.isArray(report.sha256Audit)){
  assert(report.originalSha256VerifiedAfterAnonymousRestore===true,'No independent anonymous restore proof');
  files=report.sha256Audit.map(f=>({
   id:Number(f.entryId),accession:f.accession,url:f.sourceUrl,format:f.format,
   size:Number(f.bytes),sha256:f.sha256,
   ghcrPath:'originals/'+f.fileName,modelTitle:f.title,license:f.license
  }));
  tag=report.package;
 }else{
  assert(report.everySourceSHA256CheckedAfterRecovery===true,'Missing full restore proof');
  assert(report.completeForTheseCatalogEntries===true,'Incomplete source batch');
  files=report.sourceManifest.originalFiles.map(f=>{
   const info=report.sourceManifest.originalModels.find(x=>Number(x.id??x.entryId)===Number(f.entryId));
   assert(info,'Unattributed original NIH source file');
   return {id:Number(f.entryId),accession:f.accession,url:f.url,format:f.originalFormat,
    size:Number(f.verifiedBytes),sha256:f.sha256,ghcrPath:f.archivePath,
    modelTitle:info.title,license:info.license};
  });
  tag=report.imageTag;
 }
 assert(typeof tag==='string'&&tag.startsWith('ghcr.io/6d9757cmp5-creator/atla-nih3d-archive:'));
 provenance.push({sourceReport:filepath,ociTag:tag,ociDigest:report.immutableDigest,
  filesVerifiedInReport:files.length,verifiedByAnonymousOCIRecovery:true});
 for(const file of files){
  assert(/^https:\/\/3d\.nih\.gov\/api\/submissions\//.test(file.url),'Non-NIH source URL');
  assert(/^[a-f0-9]{64}$/.test(file.sha256),'No source SHA-256');
  assert(Number.isInteger(file.size)&&file.size>0,'Invalid source size');
  assert(/^originals\/[\w.\/-]+$/.test(file.ghcrPath)&&!file.ghcrPath.includes('..'),'Unsafe container file path');
  records.push({...file,archive:{tag,digest:report.immutableDigest,filePath:file.ghcrPath},sourceProof:filepath});
 }
}
const index=JSON.parse(await fs.readFile(path.join(root,'catalog-index.json'),'utf8'));
const files=(await fs.readdir(path.join(root,'segments'))).filter(x=>/^entries-\d+-\d+\.json$/.test(x));
if(files.length!==50)throw Error('Missing source segments');
const references=new Map(),models=new Map();let published=0;
for(const filename of files){
 const segment=JSON.parse(await fs.readFile(path.join(root,'segments',filename),'utf8'));
 const rows=segment.items??segment.entries??[];
 published+=rows.length;
 for(const row of rows){
  const model={entryId:row.entryId,accession:row.accession,title:row.title,
   originalLicenseRaw:row.licenseRaw??null,originalLicenseCategory:row.license??null,
   originalPage:row.url,sourceVersion:row.version,sourceFilesTotal:row.files?.length??0,
   verifiedFiles:[],missingOriginalFileCount:0,allOriginalFilesPersistentlyRecovered:false,
   scientificApproval:'NOT_ESTABLISHED',clinicalUseApproved:false};
  models.set(row.entryId,model);
  for(const f of row.files??[]){
   if(references.has(f.url))throw Error('Duplicate NIH source-file reference '+f.url);
   references.set(f.url,{id:row.entryId,accession:row.accession,format:f.format,size:Number(f.size)});
  }
 }
}
assert.equal(published,index.publishedEntriesFound,'Catalog snapshot drift');
const unique=new Map(),duplicates=[];
for(const row of records){
 const original=references.get(row.url);
 if(!original||original.id!==row.id||original.accession!==row.accession||
 original.format!==row.format||original.size!==row.size)
  throw Error('Verified artifact provenance no longer matches source NIH metadata '+row.accession);
 const key=row.url;
 if(unique.has(key)){
  const prev=unique.get(key);
  assert.equal(prev.sha256,row.sha256,'OCI archives contain conflicting SHA for same source URL');
  assert.equal(prev.size,row.size,'OCI archives contain different original lengths');
  prev.alternateArchives.push(row.archive);
  duplicates.push({url:row.url,entryId:row.id});
 }else unique.set(key,{...row,alternateArchives:[]});
}
for(const entry of unique.values())models.get(entry.id).verifiedFiles.push({
 format:entry.format,size:entry.size,sha256:entry.sha256,originalSourceUrl:entry.url,
 verifiedOCI:entry.archive,alternateVerifiedOCI:entry.alternateArchives,
 verifiedOriginalSourceAndAnonymousRestore:true
});
const complete=[],partial=[];
for(const model of models.values()){
 if(!model.verifiedFiles.length)continue;
 model.missingOriginalFileCount=model.sourceFilesTotal-model.verifiedFiles.length;
 if(model.missingOriginalFileCount<0)throw Error('Verified files exceed known source files');
 model.allOriginalFilesPersistentlyRecovered=model.missingOriginalFileCount===0;
 (model.allOriginalFilesPersistentlyRecovered?complete:partial).push(model);
}
const coverage={
 schemaVersion:1,status:'PARTIAL_VERIFIED_PERSISTENT_ORIGINAL_ARCHIVE',
 catalogSourceEntries:published,allCatalogModelsReferenced:published,
 archiveModelsWithAnyOriginal:complete.length+partial.length,
 modelsWithAllCatalogOriginalFilesVerified:complete.length,
 modelsWithPartialCatalogOriginalsVerified:partial.length,
 modelsWithoutAnyVerifiedOriginals:published-complete.length-partial.length,
 individualCatalogOriginalFileReferences:references.size,
 uniqueVerifiedOriginalFiles:unique.size,
 duplicateCopiesAcrossOCIImages:duplicates.length,
 totalDistinctVerifiedOriginalBytes:[...unique.values()].reduce((a,b)=>a+b.size,0),
 sourceSHA256AndAnonymousRecoveryVerified:true,
 fullNIHArchiveComplete:false,
 clinicalScientificReviewComplete:false,
 noMedicalClinicalApprovalImplied:true,
 provenance,models:[...complete,...partial].sort((a,b)=>a.entryId-b.entryId),
 notes:['All source-file counts are based on saved NIH 3D Master Plan 2026 snapshot, not a live full NIH rescan.',
 'OCI image SHA and original model-file SHA are different integrity layers.',
 'Containers are publicly readable, but permanent availability remains subject to GitHub service policy.',
 'The registry cannot automatically turn a container archive into a cross-origin browser-supported viewer.',
 'No source-only NIH URL is counted as a stored original binary.']
};
await fs.mkdir(path.dirname(output),{recursive:true});
await fs.writeFile(output,JSON.stringify(coverage,null,2)+'\n');
console.log('NIH ORIGINAL ARCHIVE AUDIT '+JSON.stringify({models:coverage.archiveModelsWithAnyOriginal,complete:complete.length,partial:partial.length,files:unique.size,duplicates:duplicates.length,bytes:coverage.totalDistinctVerifiedOriginalBytes}));
