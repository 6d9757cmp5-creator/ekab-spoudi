#!/usr/bin/env node
/** Inventory only: check zero-cost GitHub Release feasibility BEFORE any bulk upload. */
import {readFile,readdir,writeFile,mkdir} from 'node:fs/promises';
import {join} from 'node:path';
const src=process.argv[2]??'tools/atla-ai/resources/nih3d-master-plan-2026';
const triage=process.argv[3]??'tools/atla-ai/resources/nih3d-medical-index';
const out=process.argv[4]??'tools/atla-ai/resources/nih3d-medical-transfer-plan.json';
const index=JSON.parse(await readFile(join(triage,'summary.json'),'utf8'));
const files=(await readdir(join(src,'segments'))).filter(x=>/^entries-\d+-\d+\.json$/.test(x))
 .sort((a,b)=>Number(a.split('-')[1])-Number(b.split('-')[1]));
if(files.length!==index.sourceSegments)throw Error('Missing NIH catalog segments');
const VALID_FORMATS=new Set(['GLB','GLTF','STL','OBJ','X3D','WRL','PLY','3MF']);
const releases=new Map(),formats={},allIds=new Set();
let medicalCandidates=0,licenseOk=0,licenseReview=0,filesReferenced=0,rawBytes=0,withoutFormats=0;
for(const filename of files){
 const source=JSON.parse(await readFile(join(src,'segments',filename),'utf8'));
 const labels=JSON.parse(await readFile(join(triage,'segments',filename),'utf8'));
 const byId=new Map(labels.rows.map(x=>[Number(x.id),x]));
 for(const row of source.items??source.entries??[]){
  const label=byId.get(Number(row.entryId??row.id));
  if(!label)throw Error('No triage record for source entry '+row.entryId);
  if(label.decision!=='medical_candidate')continue;
  medicalCandidates++;
  if(label.licensing!=='catalog_license_allows_with_conditions'){licenseReview++;continue;}
  licenseOk++;
  const id=Number(row.entryId??row.id),releaseStart=Math.floor((id-1)/500)*500+1,releaseEnd=releaseStart+499;
  const tag='atla-nih3d-medical-'+String(releaseStart).padStart(5,'0')+'-'+String(releaseEnd).padStart(5,'0');
  if(!releases.has(tag))releases.set(tag,{tag,sourceIdRange:[releaseStart,releaseEnd],models:0,files:0,rawBytes:0});
  const group=releases.get(tag);group.models++;allIds.add(id);
  let count=0;
  for(const f of row.files??[]){
   if(!VALID_FORMATS.has(String(f.format??'').toUpperCase()))continue;
   if(!/^https:\/\/3d\.nih\.gov\/api\/submissions\//.test(f.url??''))continue;
   const bytes=Number(f.size);
   if(!Number.isSafeInteger(bytes)||bytes<0)throw Error('Invalid source file size for '+id);
   count++;group.files++;group.rawBytes+=bytes;filesReferenced++;rawBytes+=bytes;
   const format=String(f.format).toUpperCase();formats[format]=(formats[format]??0)+1;
  }
  if(!count)withoutFormats++;
 }
}
if(medicalCandidates!==index.counts.medical_candidate)throw Error('Candidate count mismatch');
const plan={schemaVersion:1,status:'METADATA_ONLY_NO_UPLOAD',targetCost:'0 EUR (not guaranteed by GitHub storage policies)',
 checkedSourceEntries:index.uniqueRecords,medicalCandidates,licenseOk,licenseReview,withoutSupportedFormats:withoutFormats,
 originalFileReferences:filesReferenced,uncompressedBytesFromSourceMetadata:rawBytes,formats,
 releaseGroups:[...releases.values()].sort((a,b)=>a.sourceIdRange[0]-b.sourceIdRange[0]),
 notes:['Raw byte total is an estimate from NIH metadata, NOT verified downloads.',
 'Release group tags are proposed, not created. Assets limits, actual archives, licensing and quotas need validation.',
 'No NIH file binary is downloaded, uploaded or redistributed by this inventory.']};
await mkdir(join(out,'..'),{recursive:true});
await writeFile(out,JSON.stringify(plan,null,2)+'\n');
console.log('ATLA NIH3D MEDICAL TRANSFER INVENTORY '+JSON.stringify({medicalCandidates,licenseOk,licenseReview,withoutFormats,filesReferenced,rawBytes,releaseGroups:releases.size}));
