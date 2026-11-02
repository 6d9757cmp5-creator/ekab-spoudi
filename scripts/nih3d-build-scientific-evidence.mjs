#!/usr/bin/env node
/**
 * Build an auditable course-structure crosswalk from all 50 NIH original source segments.
 * It is an evidence ledger: medical relevance proposals only, zero clinical approvals.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {screenSourceResearch,selectScientificSources,SCIENTIFIC_CONCEPTS} from '../tools/atla-ai/nih3d-scientific-ontology.mjs';
const source=process.argv[2]??'tools/atla-ai/resources/nih3d-master-plan-2026';
const output=process.argv[3]??'tools/atla-ai/resources/nih3d-educational-evidence-2026';
const sourceIndex=JSON.parse(await fs.readFile(path.join(source,'catalog-index.json'),'utf8'));
const originalFiles=(await fs.readdir(path.join(source,'segments'))).filter(x=>/^entries-\d+-\d+\.json$/.test(x))
 .sort((a,b)=>Number(a.split('-')[1])-Number(b.split('-')[1]));
assert.equal(originalFiles.length,50,'All 50 NIH source segments required');
let archived=new Map();
try{
 const audit=JSON.parse(await fs.readFile('docs/ATLA_NIH3D_GHCR_ANATOMY_BATCH_2026.json','utf8'));
 if(audit.everySourceSHA256CheckedAfterRecovery===true&&audit.completeForTheseCatalogEntries===true&&
    audit.immutableDigest?.startsWith('ghcr.io/6d9757cmp5-creator/atla-nih3d-archive@sha256:')){
  archived=new Map(audit.sourceManifest.originalModels.map(model=>[model.id,{digest:audit.immutableDigest,
    originalFiles:audit.sourceManifest.originalFiles.filter(f=>f.entryId===model.id).length,
    independentlyRestored:true}]));
 }
}catch{} // Source evidence index remains usable without a saved OCI mirror.
const termIndex=Object.fromEntries(SCIENTIFIC_CONCEPTS.map(c=>[c.id,[]]));
const totals={sourceRecords:0,sourceSegments:originalFiles.length,conceptMatched:0,
 explicitNonhuman:0,conditionScoped:0,verifiedOriginalArchiveModels:0,
 scholarlyClinicalApprovals:0,unmatchedRetained:0};
const recorded=new Set(),candidates=[],sourceRows=new Map();
await fs.mkdir(path.join(output,'segments'),{recursive:true});
for(let i=0;i<originalFiles.length;i++){
 const name=originalFiles[i],start=i*500+1,end=start+499;
 if(name!==`entries-${start}-${end}.json`)throw Error('Original source coverage gap '+name);
 const data=JSON.parse(await fs.readFile(path.join(source,'segments',name),'utf8'));
 const rows=data.items??data.entries??[];
 if(rows.length!==data.totalEntries)throw Error('Original source segment count mismatch '+name);
 const proposals=[],unmatchedIds=[];
 for(const raw of rows){
  const row=screenSourceResearch(raw),id=Number(row.entryId);
  if(!Number.isInteger(id)||id<start||id>end||recorded.has(id))throw Error('NIH duplicate/invalid ID '+id);
  recorded.add(id);totals.sourceRecords++;sourceRows.set(id,raw);
  if(row.speciesFlag==='explicitly_nonhuman')totals.explicitNonhuman++;
  if(row.pathologyContext!=='normal_or_unspecified')totals.conditionScoped++;
  const mirror=archived.get(id);
  if(mirror){row.archiveEvidence=mirror;totals.verifiedOriginalArchiveModels++;}
  if(!row.conceptCandidates.length){unmatchedIds.push(id);totals.unmatchedRetained++;continue;}
  totals.conceptMatched++;
  proposals.push(row);
  candidates.push(row);
  for(const topic of row.conceptCandidates)termIndex[topic].push(id);
 }
 await fs.writeFile(path.join(output,'segments',name),JSON.stringify({
  sourceSegment:name,scanned:rows.length,matched:proposals.length,
  pendingReviewWithoutConcept:unmatchedIds,sourceResearchProposals:proposals
 })+'\n');
}
if(totals.sourceRecords!==sourceIndex.publishedEntriesFound)throw Error('Source catalog count discrepancy');
assert.equal(totals.sourceRecords,totals.conceptMatched+totals.unmatchedRetained);
const outById=new Map(candidates.map(x=>[x.entryId,x]));
const triad=[168,169,170],humanBoneIds=triad.filter(id=>outById.get(id)?.humanAnatomyResearchCandidate);
if(humanBoneIds.length!==triad.length)throw Error('Original NIH human leg anatomy model missing');
const sourceDescription=(id)=>String(sourceRows.get(id)?.description??'').replace(/<[^>]*>/g,' ').replace(/&amp;/g,'&');
const expectations={168:[169,170],169:[168,170],170:[168,169]};
const descrWords={168:['femur'],169:['tibia','fibula'],170:['patella']};
const relations=[];
for(const from of triad)for(const to of expectations[from]){
 const excerpt=sourceDescription(from);
 if(!descrWords[to].every(term=>excerpt.toLowerCase().includes(term)))throw Error('Missing explicit NIH described anatomical relationship '+from+' -> '+to);
 relations.push({from:'nih3d:'+from,to:'nih3d:'+to,
  type:'NIH_SOURCE_DESCRIBES_MATCHING_LEG_SEGMENTATION',evidenceSource:sourceRows.get(from).url,
  evidenceExcerpt:excerpt.slice(0,300),externalScientificReview:'NOT_COMPLETED',
  inferenceRule:'Exact matching structure terms in NIH source description'});
}
const courseText=await fs.readFile('saek-course-01.html','utf8');
for(const word of ['μηριαίο','επιγονατίδα','κνήμη','περόνη'])
 if(!courseText.includes(word))throw Error('Expected SAEK course 01 anatomy source term missing: '+word);
const educationalCrosswalk={
 schemaVersion:1,source:'SAEK course 01 anatomy source + original NIH descriptions',
 course:'01',chapter:'2',
 clinicalUse:'RESEARCH_REFERENCE_ONLY',academicApproval:'NOT_ESTABLISHED',
 anatomyStructureProposals:[
  {entryId:168,concept:'ATLA-ANATOMY-femur',sourceEvidence:'NIH CT segmentation description + explicit SAEK skeletal reference'},
  {entryId:169,concepts:['ATLA-ANATOMY-tibia','ATLA-ANATOMY-fibula'],sourceEvidence:'NIH CT segmentation description + explicit SAEK skeletal reference'},
  {entryId:170,concept:'ATLA-ANATOMY-patella',sourceEvidence:'NIH CT segmentation description + explicit SAEK skeletal reference'}
 ],
 relationEvidence:relations,
 requiresNoExamAnswerLeak:true,requiresExplicitConfirmationInClinicalCases:true
};
const userCase=selectScientificSources(candidates,{surface:'lesson',objective:'Ανατομία επιγονατίδας',limit:10});
if(!userCase.some(x=>x.id===170))throw Error('Educational source selector unexpectedly lost patella');
const summary={
 schemaVersion:1,title:'ATLA NIH3D scientific-source evidence ledger',
 scope:'Complete 15,688 NIH metadata identities screened; no unsupported clinical scientific approvals',
 sourceCatalogSnapshot:'ATLA NIH3D Master Plan 2026',counts:totals,
 conceptVocabulary:SCIENTIFIC_CONCEPTS.map(c=>({id:c.id,greek:c.greek,aliases:c.aliases})),
 proposedSourceMatchesByConcept:Object.fromEntries(Object.entries(termIndex).map(([k,v])=>[k,v.length])),
 relatedSourceAnatomyEvidenceLinks:relations.length,
 verifiedFullOriginalsFromPublicGHCR:totals.verifiedOriginalArchiveModels,
 scientificApprovalStatus:'NOT_COMPLETED',
 originalBinaryMirroringComplete:false,
 knownLimitations:['Anatomy category and exact source title only propose educational relevance.',
  'NIH descriptions establish source claims, not independent expert assessment or geometric correctness.',
  'No model is authorized for real-patient diagnosis or intervention by this ledger.',
  'All unmatched sources remain accessible in the original NIH catalog, including molecular candidates.',
  'Only externally separately approved models may render inline for an educational goal.']
};
await fs.writeFile(path.join(output,'summary.json'),JSON.stringify(summary,null,2)+'\n');
await fs.writeFile(path.join(output,'concept-index.json'),JSON.stringify(termIndex)+'\n');
await fs.writeFile(path.join(output,'course-01-leg-evidence.json'),JSON.stringify(educationalCrosswalk,null,2)+'\n');
console.log('ATLA NIH MEDICAL EVIDENCE LEDGER',JSON.stringify({source:totals.sourceRecords,matched:totals.conceptMatched,unmatched:totals.unmatchedRetained,archived:totals.verifiedOriginalArchiveModels,relations:relations.length}));
