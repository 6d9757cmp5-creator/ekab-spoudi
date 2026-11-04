#!/usr/bin/env node
/** Safe, deterministic next NIH3D original-source archival batch selection. No downloads. */
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {screenSourceResearch} from '../tools/atla-ai/nih3d-scientific-ontology.mjs';
import {biomedicalScope, NIH_BIOMEDICAL_SCOPE_STATUS as BIOMEDICAL_SCOPE} from '../tools/atla-ai/nih3d-biomedical-scope.mjs';

const FORMAT=new Set(['GLB','STL','OBJ','X3D','WRL','GLTF','PLY','3MF']);
const SAFE_SOURCE=/^https:\/\/3d\.nih\.gov\/api\/submissions\/\d+\/runs\/[a-f0-9-]+\/output-files\/\d+$/i;
const CATEGORY_PRIORITIES={'Anatomy':0,'Cells and Organelles':1,'Viruses':2,'Biomacromolecules':3,'Small Molecules':4,'Prosthetics':5,'Devices and Hardware':6};
const DEFAULTS=Object.freeze({maxBatchBytes:1_000_000_000,maxFileBytes:200_000_000,maxOriginalFiles:400,maxModels:60});
// The owner states permission for every NIH source; each model keeps its original license text.
const declaredLicense=value=>Boolean(String(value??'').trim())&&!/^unknown$/i.test(String(value).trim());

export function planNextBatch(rows,archivedIds,settings={}){
 const config={...DEFAULTS,...settings};
 if(!Number.isSafeInteger(config.maxBatchBytes)||config.maxBatchBytes<=0)throw Error('Bad maximum batch size');
 const archived=new Set([...archivedIds].map(Number));
 const seen=new Set(),eligible=[],skipped={alreadyComplete:0,sourceRightsReview:0,
  noOriginalFiles:0,fileLimitExceeded:0,batchLimitExceeded:0,malformedSource:0,unknownScientificCategory:0,
  biomedicalReviewRequired:0,likelyOutOfMedicalScope:0};
 for(const row of rows){
  const id=Number(row.entryId??row.id);
  if(!Number.isInteger(id)||id<1||id>25000||seen.has(id))throw Error('Unexpected NIH source identity or duplicate: '+id);
  seen.add(id);
  if(archived.has(id)){skipped.alreadyComplete++;continue;}
  if(!declaredLicense(row.licenseRaw)){skipped.sourceRightsReview++;continue;}
  const category=String(row.category??'');
  const science=screenSourceResearch(row);
  if(!(category in CATEGORY_PRIORITIES)){skipped.unknownScientificCategory++;continue;}
  const biomedical=biomedicalScope(row);
  if(biomedical.status===BIOMEDICAL_SCOPE.OUT){skipped.likelyOutOfMedicalScope++;continue;}
  if(biomedical.status!==BIOMEDICAL_SCOPE.IN){skipped.biomedicalReviewRequired++;continue;}
  if(!/^https:\/\/3d\.nih\.gov\/entries\/3DPX-\d+$/.test(String(row.url??''))){skipped.malformedSource++;continue;}
  if(!Array.isArray(row.files)||row.files.length===0){skipped.noOriginalFiles++;continue;}
  const urls=new Set();let bytes=0,invalid=false,oversize=false;
  for(const file of row.files){
   const size=Number(file.size),type=String(file.format??'').toUpperCase();
   if(!Number.isSafeInteger(size)||size<=0||!SAFE_SOURCE.test(file.url??'')||!FORMAT.has(type)||urls.has(file.url)){
    invalid=true;break;
   }
   if(size>config.maxFileBytes){oversize=true;break;}
   bytes+=size;urls.add(file.url);
  }
  if(invalid){skipped.malformedSource++;continue;}
  if(oversize||bytes>config.maxBatchBytes||row.files.length>config.maxOriginalFiles){skipped.fileLimitExceeded++;continue;}
  eligible.push({entryId:id,accession:row.accession,title:row.title,
    sourcePage:row.url,sourceVersion:row.version??null,category,license:row.licenseRaw,
    expectedFiles:row.files.length,expectedBytes:bytes,
    priority:category==='Anatomy' ? (science.humanAnatomyResearchCandidate?0:7) : CATEGORY_PRIORITIES[category]+1,
    sourceConceptCandidates:science.conceptCandidates,
    biomedicalResearchScope:biomedical.status,biomedicalResearchDomain:biomedical.domain,
    explicitNonhuman:science.speciesFlag==='explicitly_nonhuman',
    pathologyContext:science.pathologyContext,
    sourceRefs:row.files.map((f,i)=>({i,url:f.url,format:f.format,size:Number(f.size),name:f.name??null}))});
 }
 // Anatomy first, then cells/microbiology/molecular medicine; smallest first within domain.
 eligible.sort((a,b)=>a.priority-b.priority||a.expectedBytes-b.expectedBytes||a.entryId-b.entryId);
 const selected=[];let bytes=0,files=0;
 for(const item of eligible){
  if(selected.length>=config.maxModels)break;
  if(bytes+item.expectedBytes>config.maxBatchBytes||files+item.expectedFiles>config.maxOriginalFiles){
   skipped.batchLimitExceeded++;continue;
  }
  selected.push(item);bytes+=item.expectedBytes;files+=item.expectedFiles;
 }
 return {schemaVersion:1,status:'PLAN_ONLY_NO_MODEL_BYTES_COPIED',rules:config,
  reviewRequired:true,expertClinicalApprovals:0,sourceScanned:seen.size,
  eligibleRemaining:eligible.length,skipped,selected,
  selectedModels:selected.length,selectedOriginalFiles:files,
  selectedExpectedSourceBytes:bytes,
  unselectedEligible:eligible.length-selected.length,
  originalFilesDownloadedByPlanner:0,
  originalFilesSHA256VerifiedByPlanner:0,
  licenseRule:'Every declared source license, on the owner-stated permission; the original license stays with each file',
  biomedicalRule:'Only evidence-supported NIH biomedical research categories automatically selected; generic hardware and unresolved chemicals retained for review',
  sourceAccuracyRule:'Model title/category do not certify anatomical or clinical correctness'};
}
export async function buildPlan(catalogRoot,archiveRegistry,output){
 const index=JSON.parse(await fs.readFile(path.join(catalogRoot,'catalog-index.json'),'utf8'));
 const stored=JSON.parse(await fs.readFile(archiveRegistry,'utf8'));
 if(!stored.sourceSHA256AndAnonymousRecoveryVerified||stored.fullNIHArchiveComplete)
  throw Error('Archive ledger is missing or incorrectly marked complete');
 const segments=(await fs.readdir(path.join(catalogRoot,'segments'))).filter(x=>/^entries-\d+-\d+\.json$/.test(x))
   .sort((a,b)=>Number(a.split('-')[1])-Number(b.split('-')[1]));
 if(segments.length!==50)throw Error('NIH original metadata segment gap');
 const entries=[];
 for(let i=0;i<segments.length;i++){
  const name='entries-'+(i*500+1)+'-'+(i*500+500)+'.json';
  if(segments[i]!==name)throw Error('NIH original metadata segment order gap: '+name);
  const payload=JSON.parse(await fs.readFile(path.join(catalogRoot,'segments',name),'utf8'));
  const rows=payload.items??payload.entries??[];
  if(rows.length!==payload.totalEntries)throw Error('NIH source segment row-count mismatch '+name);
  entries.push(...rows);
 }
 assert.equal(entries.length,index.publishedEntriesFound,'NIH source catalogue changed during selection');
 const archived=new Set(stored.models.filter(m=>m.allOriginalFilesPersistentlyRecovered)
  .map(m=>Number(m.entryId)));
 const report=planNextBatch(entries,archived);
 if(report.selectedModels===0)throw Error('No safely licensed bounded original-source batch is currently eligible');
 report.sourceCatalogEntries=index.publishedEntriesFound;
 report.verifiedAlreadyCompleteModels=archived.size;
 report.fullNIHArchiveComplete=false;
 await fs.mkdir(path.dirname(output),{recursive:true});
 await fs.writeFile(output,JSON.stringify(report,null,2)+'\n');
 console.log('NIH NEXT ORIGINAL-SOURCE BATCH PLAN',JSON.stringify({source:report.sourceScanned,
   verified:archived.size,eligible:report.eligibleRemaining,
   selected:report.selectedModels,files:report.selectedOriginalFiles,bytes:report.selectedExpectedSourceBytes,
   skipped:report.skipped}));
 return report;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 await buildPlan(
  process.argv[2]??'tools/atla-ai/resources/nih3d-master-plan-2026',
  process.argv[3]??'tools/atla-ai/resources/nih3d-verified-originals-2026.json',
  process.argv[4]??'tools/atla-ai/resources/nih3d-next-originals-plan-2026.json');
}
