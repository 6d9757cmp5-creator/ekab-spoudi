import assert from 'node:assert/strict';
import {planNextBatch} from './nih3d-plan-next-originals.mjs';
const fmt=(id,size)=>({
 url:'https://3d.nih.gov/api/submissions/'+id+'/runs/11111111-2222-3333-4444-555555555555/output-files/'+(id+100),
 format:'GLB',size,name:'source.glb'});
const entry=(id,title,category,license='Public Domain',fileSize=1000)=>({
 entryId:id,accession:'3DPX-'+String(id).padStart(6,'0'),
 title,category,license,licenseRaw:license,
 url:'https://3d.nih.gov/entries/3DPX-'+String(id).padStart(6,'0'),
 files:[fmt(id,fileSize)]
});
const inputs=[
 entry(1,'Medical human heart','Anatomy'),
 entry(2,'Molecular proteins','Biomacromolecules'),
 entry(3,'Cells','Cells and Organelles'),
 entry(4,'Unlicensed anatomy','Anatomy','Unknown'),
 entry(5,'Too large human anatomy','Anatomy','Public Domain',250000),
 entry(6,'Already complete anatomical source','Anatomy'),
 {...entry(7,'Unsafe URL','Anatomy'),files:[{...fmt(7,2000),url:'https://example.com/virus'}]}
];
const plan=planNextBatch(inputs,new Set([6]),{maxBatchBytes:3000,maxFileBytes:200000,maxOriginalFiles:3,maxModels:3});
assert.equal(plan.sourceScanned,inputs.length);
assert.deepEqual(plan.selected.map(x=>x.entryId),[1,3,2]);
assert.equal(plan.selectedExpectedSourceBytes,3000);
assert.equal(plan.selectedOriginalFiles,3);
assert.equal(plan.skipped.sourceRightsReview,1);
assert.equal(plan.skipped.fileLimitExceeded,1);
assert.equal(plan.skipped.alreadyComplete,1);
assert.equal(plan.skipped.malformedSource,1);
assert.equal(plan.originalFilesDownloadedByPlanner,0);
assert.equal(plan.expertClinicalApprovals,0);
const smaller=planNextBatch([entry(15,'Heart anatomy','Anatomy'),entry(16,'Brain anatomy','Anatomy')],
 new Set(),{maxBatchBytes:1000,maxFileBytes:2000,maxOriginalFiles:1,maxModels:1});
assert.equal(smaller.selectedModels,1);
assert(smaller.unselectedEligible>=1);
assert.throws(()=>planNextBatch([entry(1,'A','Anatomy'),entry(1,'B','Anatomy')],new Set()),/duplicate/);
assert.deepEqual(planNextBatch([entry(10,'Unknown','Anatomy','CC BY 4.0')],new Set()).selected,[],
 'CC BY must not be copied without explicit review of attribution');
console.log('NIH original-source batch planner safety tests passed');
