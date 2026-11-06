#!/usr/bin/env node
/**
 * Reproducible NIH3D biomedical-only shortlist and scientific review queue.
 * Does not delete, download, or claim expert validation of any NIH model.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {biomedicalScope,NIH_BIOMEDICAL_SCOPE_STATUS as STATUS} from '../tools/atla-ai/nih3d-biomedical-scope.mjs';
const root=process.argv[2]??'tools/atla-ai/resources/nih3d-master-plan-2026';
const output=process.argv[3]??'tools/atla-ai/resources/nih3d-biomedical-scope-2026';
const catalog=JSON.parse(await fs.readFile(path.join(root,'catalog-index.json'),'utf8'));
const segments=(await fs.readdir(path.join(root,'segments'))).filter(x=>/^entries-\d+-\d+\.json$/.test(x))
  .sort((a,b)=>Number(a.split('-')[1])-Number(b.split('-')[1]));
assert.equal(segments.length,50,'NIH model catalog lacks source segment(s)');
const seen=new Set();
const statusCounts={},categoryCounts={},licenses={},reasonCounts={},errors=[];
let originals=0,sourceBytes=0,nonMedicalFiles=0,eligiblePubDomainFiles=0,eligiblePubDomainBytes=0,reviewTotal=0;
await fs.mkdir(path.join(output,'segments'),{recursive:true});
for(let idx=0;idx<50;idx++){
 const name=`entries-${idx*500+1}-${idx*500+500}.json`;
 if(segments[idx]!==name)throw Error('Source segment missing '+name);
 const j=JSON.parse(await fs.readFile(path.join(root,'segments',name),'utf8'));
 const entries=j.items??j.entries??[];
 assert.equal(entries.length,j.totalEntries,'NIH source entry count mismatch '+name);
 const rows=[];
 for(const entry of entries){
  const id=Number(entry.entryId??entry.id);
  if(!Number.isInteger(id)||id<=idx*500||id>idx*500+500||seen.has(id))
   throw Error('Out of range or duplicate NIH entry '+id);
  seen.add(id);
  const result=biomedicalScope(entry);
  if(result.unsupportedOrMalformedFileReferences)errors.push({id,invalidFileReferences:result.unsupportedOrMalformedFileReferences});
  originals+=result.originalFileReferences;
  const totalBytes=(entry.files??[]).reduce((a,b)=>a+(Number(b.size)||0),0);
  sourceBytes+=totalBytes;
  statusCounts[result.status]=(statusCounts[result.status]||0)+1;
  categoryCounts[entry.category]=(categoryCounts[entry.category]||0)+1;
  licenses[result.licenseStatus]=(licenses[result.licenseStatus]||0)+1;
  reasonCounts[result.reason]=(reasonCounts[result.reason]||0)+1;
  if(result.status===STATUS.OUT)nonMedicalFiles+=result.originalFileReferences;
  if(result.requiresHumanDomainReview)reviewTotal++;
  if(result.status===STATUS.IN&&entry.license==='Public Domain'&&entry.licenseRaw==='Public Domain'){
   eligiblePubDomainFiles+=result.originalFileReferences;
   eligiblePubDomainBytes+=totalBytes;
  }
  rows.push(result);
 }
 await fs.writeFile(path.join(output,'segments',name),JSON.stringify({schemaVersion:1,originalSegment:name,
  sourceModelRecords:rows.length,classificationOnly:true,sourceModels:rows})+'\n');
}
assert.equal(seen.size,catalog.publishedEntriesFound,'Published source count changed from archived NIH snapshot');
assert.equal(Object.values(statusCounts).reduce((a,b)=>a+b,0),seen.size);
assert.equal(originals,catalog.totalFileReferences??originals,'NIH original-file metadata count discrepancy');
const summary={
 schemaVersion:1,status:'RESEARCH_SCOPE_CLASSIFICATION_NOT_INDEPENDENT_SCIENTIFIC_APPROVAL',
 source:'NIH 3D Master Plan 2026 saved catalog snapshot',
 originalScannedIdRange:catalog.verifiedScannedIds??null,
 uniqueSourceModelRecords:seen.size,sourceSegments:segments.length,
 totalOriginalModelFileReferences:originals,
 totalOriginalBytesFromMetadata:sourceBytes,
 byScope:statusCounts,byNIHCategory:categoryCounts,byLicenseReview:licenses,byReason:reasonCounts,
 metadataReferencesInLikelyOutOfScopeHardware:nonMedicalFiles,
 primaryBiomedicalCandidatePublicDomainFileReferences:eligiblePubDomainFiles,
 primaryBiomedicalCandidatePublicDomainBytesEstimate:eligiblePubDomainBytes,
 scientificDomainReviewsPending:reviewTotal,independentlyScientificModelsApproved:0,
 medicalUseApprovedModels:0,
 classificationHumanReviewRequiredForAll:true,
 sourceFilesActuallyCopiedByThisTool:0,sourceFilesSHA256VerifiedByThisTool:0,
 invalidSourceFileReferenceRecords:errors.length,
 sourceIntegrityExceptions:errors.slice(0,35),
 caveats:[
  'Scientific research category is not expert validation of clinical use, geometry, morphology or molecular identity.',
  'Devices and Hardware may be useful; generic hardware is only tentatively out-of-scope and is retained in original catalog.',
  'Small Molecules are held for therapeutic relevance review; not automatically copied in bulk.',
  'Licensing status is based on NIH metadata labels, not a universal reuse or redistribution grant.',
  'Original NIH saved source catalog may omit newly published models and versions.',
  'No data removed and all 15,688 source identities remain discoverable.'
 ]
};
await fs.writeFile(path.join(output,'summary.json'),JSON.stringify(summary,null,2)+'\n');
console.log('ATLA NIH BIOMEDICAL SCOPE AUDIT',JSON.stringify({models:seen.size,files:originals,scope:statusCounts,
  candidates:eligiblePubDomainFiles,invalid:errors.length}));
