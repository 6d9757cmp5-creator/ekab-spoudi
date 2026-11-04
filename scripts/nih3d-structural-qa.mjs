#!/usr/bin/env node
/**
 * Screen exact, independently restored NIH 3D source geometry.
 * Structural integrity is NOT anatomical accuracy or medical endorsement.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
export function inspectGeometry(bytes,format){
 const fmt=String(format??'').toUpperCase();
 if(bytes.length<80)return {status:'NEEDS_FORMAT_REVIEW',reason:'Too few bytes to verify source geometry'};
 if(bytes.subarray(0,80).toString('utf8').toLowerCase().includes('<html'))
  return {status:'INVALID_FORMAT',reason:'HTML response, not a 3D original'};
 try {
  if(fmt==='GLB'){
   if(bytes.subarray(0,4).toString('ascii')!=='glTF'||bytes.readUInt32LE(4)!==2||
     bytes.readUInt32LE(8)!==bytes.length)throw Error('GLB header invalid');
   if(bytes.length<20||bytes.readUInt32LE(16)!==0x4e4f534a)throw Error('Missing GLB JSON chunk');
   const n=bytes.readUInt32LE(12);
   if(n<16||20+n>bytes.length)throw Error('Invalid JSON chunk length');
   const obj=JSON.parse(bytes.subarray(20,20+n).toString('utf8'));
   if(!String(obj.asset?.version??'').startsWith('2.'))throw Error('Unknown glTF specification');
   const meshCount=(obj.meshes??[]).length;
   if(meshCount===0)throw Error('No declared GLB meshes');
   return {status:'STRUCTURAL_CHECK_PASSED',kind:'glTF-2-GLB',meshCount,
     primitiveCount:(obj.meshes??[]).reduce((s,m)=>s+(m.primitives??[]).length,0),
     accessorCount:(obj.accessors??[]).length};
  }
  if(fmt==='STL'){
   const faces=bytes.readUInt32LE(80);
   if(84+50*faces===bytes.length&&faces>0)
    return {status:'STRUCTURAL_CHECK_PASSED',kind:'binary-STL',triangleCount:faces};
   const text=bytes.toString('utf8');
   if(/^\s*solid\b/i.test(text)&&/\bfacet normal\b/i.test(text)&&/\bendfacet\b/i.test(text))
    return {status:'STRUCTURAL_CHECK_PASSED',kind:'ascii-STL',triangleCount:(text.match(/\bfacet normal\b/gi)||[]).length};
   throw Error('STL facets or size are inconsistent');
  }
  if(fmt==='OBJ'){
   const t=bytes.toString('utf8'),vertices=(t.match(/^v\s+[-.0-9eE+]+\s+[-.0-9eE+]+\s+[-.0-9eE+]+/gm)||[]).length;
   const faces=(t.match(/^f\s+\S+\s+\S+\s+\S+/gm)||[]).length;
   if(vertices===0||faces===0)throw Error('OBJ has no vertices or faces');
   return {status:'STRUCTURAL_CHECK_PASSED',kind:'Wavefront-OBJ',vertices,faces};
  }
  if(fmt==='X3D'){
   const t=bytes.subarray(0,Math.min(500000,bytes.length)).toString('utf8');
   if(!/<X3D\b/i.test(t)&&!/\bX3D\b/.test(t))throw Error('No X3D marker in beginning of file');
   return {status:'STRUCTURAL_CHECK_PASSED',kind:'X3D-source',structure:'signature-detected'};
  }
  if(fmt==='WRL'){
   const t=bytes.subarray(0,Math.min(500000,bytes.length)).toString('utf8');
   if(!/^\s*#VRML\b/.test(t))throw Error('Missing VRML header');
   return {status:'STRUCTURAL_CHECK_PASSED',kind:'VRML-source',structure:'header-detected'};
  }
  return {status:'NEEDS_FORMAT_REVIEW',kind:fmt,reason:'No safe parser for format'};
 }catch(error){return {status:'NEEDS_FORMAT_REVIEW',kind:fmt,reason:String(error.message??error).slice(0,200)}}
}
const baselineKey=(entryId,sha,image,bytes)=>[entryId,sha,image,bytes].join('|');
/** Rows of an earlier report whose exact original bytes were already restored and hashed. */
export function baselineRows(baseline){
 const rows=new Map();
 if(baseline?.clinicallyApprovedModels!==0||baseline?.scientificAccuracyValidated!==0)return rows;
 for(const row of baseline.files??[]){
  if(row.formatCheck?.status!=='STRUCTURAL_CHECK_PASSED')continue;
  rows.set(baselineKey(row.entryId,row.originalSHA256,row.persistedImage,row.verifiedBytes),row);
 }
 return rows;
}
/** Immutable images that still hold at least one file without an earlier verified row. */
export function imagesToRestore(registry,baseline){
 const known=baselineRows(baseline),images=new Set();
 for(const model of registry.models)for(const file of model.verifiedFiles){
  if(!known.has(baselineKey(model.entryId,file.sha256,file.verifiedOCI.digest,file.size)))images.add(file.verifiedOCI.digest);
 }
 return [...images].sort();
}
export async function auditRestoredModels(registryPath,recoveredRoot,out,baselinePath){
 const registry=JSON.parse(await fs.readFile(registryPath,'utf8'));
 const known=baselineRows(baselinePath?JSON.parse(await fs.readFile(baselinePath,'utf8')):null);
 let reusedPriorVerificationFiles=0;
 if(!registry.sourceSHA256AndAnonymousRecoveryVerified||registry.fullNIHArchiveComplete)throw Error('Unsupported registry state');
 const rows=[],counts={sourceFilesChecked:0,sha256Verified:0,formatPassed:0,formatNeedsReview:0,formatInvalid:0};
 let verifiedBytes=0;
 for(const model of registry.models){
  for(const file of model.verifiedFiles){
   const digest=String(file.verifiedOCI.digest??'').split('@sha256:')[1];
   if(!/^[a-f0-9]{64}$/.test(digest))throw Error('Invalid source OCI digest');
   const prior=known.get(baselineKey(model.entryId,file.sha256,file.verifiedOCI.digest,file.size));
   if(prior){
    verifiedBytes+=file.size;counts.sourceFilesChecked++;counts.sha256Verified++;counts.formatPassed++;
    reusedPriorVerificationFiles++;rows.push(prior);continue;
   }
   const filepath=path.join(recoveredRoot,digest,file.verifiedOCI.filePath);
   const bytes=await fs.readFile(filepath);
   const sha=crypto.createHash('sha256').update(bytes).digest('hex');
   assert.equal(bytes.length,file.size,'Original recovery bytes differ');
   assert.equal(sha,file.sha256,'Original recovery SHA256 differs');
   const structured=inspectGeometry(bytes,file.format);
   verifiedBytes+=bytes.length;counts.sourceFilesChecked++;counts.sha256Verified++;
   if(structured.status==='STRUCTURAL_CHECK_PASSED')counts.formatPassed++;
   else if(structured.status==='INVALID_FORMAT')counts.formatInvalid++;
   else counts.formatNeedsReview++;
   rows.push({entryId:model.entryId,sourceAccession:model.accession,originalFormat:file.format,
    originalFileURL:file.originalSourceUrl,originalSHA256:file.sha256,verifiedBytes:bytes.length,
    persistedImage:file.verifiedOCI.digest,formatCheck:structured,
    medicalAccuracyReview:'NOT_PERFORMED',clinicalApproval:false});
  }
 }
 assert.equal(counts.sha256Verified,registry.uniqueVerifiedOriginalFiles);
 assert.equal(verifiedBytes,registry.totalDistinctVerifiedOriginalBytes);
 const report={schemaVersion:1,status:'ORIGINAL_GEOMETRY_STRUCTURAL_SCREEN_ONLY',
 sourceModels:registry.archiveModelsWithAnyOriginal,counts,verifiedBytes,reusedPriorVerificationFiles,
 scientificAccuracyValidated:0,clinicallyApprovedModels:0,sourceGeometryOriginalsVerified:true,
 allNIHArchiveComplete:false,
 limitations:['SHA-256 validation establishes byte identity, not anatomical or clinical truth.',
  'File headers/mesh structure screen detect some technical problems but do not inspect 3D anatomy.',
  'Non-passing formats remain in the archive; any anomaly requires inspection.',
  'No geometry format is automatically approved for real patient treatment.'],
 files:rows};
 await fs.mkdir(path.dirname(out),{recursive:true});
 await fs.writeFile(out,JSON.stringify(report,null,2)+'\n');
 console.log('NIH3D STRUCTURAL QA',JSON.stringify({sourceModels:report.sourceModels,counts,verifiedBytes}));
 return report;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const [registry,root,out,baseline]=process.argv.slice(2);
 if(registry==='images-to-restore'){
  const read=async file=>JSON.parse(await fs.readFile(file,'utf8'));
  for(const image of imagesToRestore(await read(root),await read(out)))console.log(image);
 }else{
  if(!registry||!root||!out)throw Error('usage: node scripts/nih3d-structural-qa.mjs <registry.json> <recovered-root> <output.json> [baseline.json] | images-to-restore <registry.json> <baseline.json>');
  await auditRestoredModels(registry,root,out,baseline);
 }
}
