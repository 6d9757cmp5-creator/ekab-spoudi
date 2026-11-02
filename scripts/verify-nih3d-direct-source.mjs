#!/usr/bin/env node
/**
 * Build a trustworthy 100%-of-metadata coverage report, not an archive-completion claim.
 * No 3D download, no Release publishing and no Actions artifact usage.
 */
import {readFile,readdir,mkdir,writeFile} from 'node:fs/promises';
import {join,dirname} from 'node:path';
import {sourceFileRefs} from '../tools/atla-ai/nih3d-original-source-gateway.mjs';
const root=process.argv[2]??'tools/atla-ai/resources/nih3d-master-plan-2026';
const out=process.argv[3]??'docs/ATLA_NIH3D_DIRECT_SOURCE_STATUS_2026.json';
const index=JSON.parse(await readFile(join(root,'catalog-index.json'),'utf8'));
const names=(await readdir(join(root,'segments')))
 .filter(n=>/^entries-\d+-\d+\.json$/.test(n))
 .sort((a,b)=>Number(a.split('-')[1])-Number(b.split('-')[1]));
if(index.status!=='TARGET_RANGE_SCANNED'||index.apiErrors!==0||index.verifiedScannedIds!==25000)
 throw Error('NIH catalog original scan not complete');
if(names.length!==50)throw Error('Expected 50 original NIH metadata segments, found '+names.length);
const seen=new Map(),formats={},licenses={},issues=[],filesByClass={valid:0,invalid:0};
let sourceRecords=0,metadataFileReferences=0,modelsWithFiles=0,modelsWithoutFiles=0,bytes=0;
for(let i=0;i<names.length;i++){
 const start=i*500+1,end=start+499,expected=`entries-${start}-${end}.json`;
 if(names[i]!==expected)throw Error('Missing original segment '+expected);
 const json=JSON.parse(await readFile(join(root,'segments',expected),'utf8'));
 if(json.range?.start!==start||json.range?.end!==end)throw Error('Range mismatch '+expected);
 const items=json.items??json.entries??[];
 if(json.totalEntries!==items.length)throw Error('Segment row count mismatch '+expected);
 for(const e of items){
  sourceRecords++;
  const id=Number(e.entryId??e.id);
  if(!Number.isInteger(id)||id<start||id>end)throw Error('Bad source ID '+id+' in '+expected);
  if(seen.has(id))throw Error('Duplicate NIH source ID '+id);
  seen.set(id,e.accession??null);
  if(!e.url||!String(e.url).startsWith('https://3d.nih.gov/entries/'))issues.push('Missing official page '+id);
  licenses[e.license??'unresolved']=(licenses[e.license??'unresolved']??0)+1;
  const all=Array.isArray(e.files)?e.files:[];
  metadataFileReferences+=all.length;
  const valid=sourceFileRefs(e);
  if(valid.length)modelsWithFiles++;else modelsWithoutFiles++;
  filesByClass.valid+=valid.length;filesByClass.invalid+=all.length-valid.length;
  for(const f of valid){
   formats[f.format]=(formats[f.format]??0)+1;
   if(Number.isFinite(f.sizeBytes))bytes+=f.sizeBytes;
  }
 }
}
if(sourceRecords!==index.publishedEntriesFound)throw Error('Published count mismatch: '+sourceRecords+' vs '+index.publishedEntriesFound);
if(issues.length)throw Error('Official NIH entries without source page: '+issues.slice(0,4).join(', '));
const report={
 schemaVersion:1, mode:'DIRECT_SOURCE_ON_DEMAND_NO_GITHUB_RELEASE',
 catalogMetadataVerified:true,
 originalNIHScanNumericIds:index.verifiedScannedIds,
 publishedEntries:sourceRecords,uniqueIDs:seen.size,
 sourceSegments:names.length,modelsWithSupportedDirectFileRefs:modelsWithFiles,
 modelsWithoutSupportedDirectFileRefs:modelsWithoutFiles,
 metadataFileReferences,validatedDirectFileRefs:filesByClass.valid,
 rejectedUnsupportedOrMalformedFileRefs:filesByClass.invalid,
 metadataEstimatedFileBytes:bytes,formats,licenses,
 externalSource:'https://3d.nih.gov',liveSourceAvailabilityVerified:false,
 archivedModelBinariesByThisGateway:0,permanentlyStoredModelFilesByThisGateway:0,
 independentSHA256VerifiedModelFilesByThisGateway:0,
 medicalScientificApprovalNotImplied:true,
 caveats:['NIH links are references, not physically transferred or preserved originals.',
 'The archived NIH metadata may omit newer outputs; use the live NIH API for current full format sets.',
 'Browser cross-origin/availability and original file SHA256 have not been verified by this metadata audit.',
 'This index neither copies nor publishes NIH 3D binaries, and does not incur GitHub artifact storage.']
};
await mkdir(dirname(out),{recursive:true});
await writeFile(out,JSON.stringify(report,null,2)+'\n');
console.log('NIH 3D SOURCE GATEWAY VERIFIED '+JSON.stringify({entries:sourceRecords,segments:names.length,modelsWithFiles,refs:filesByClass.valid,invalid:filesByClass.invalid,bytes}));
