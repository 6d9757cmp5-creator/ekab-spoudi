import assert from 'node:assert/strict';
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
const source=fs.readFileSync('scripts/nih3d-build-central-ledger.mjs','utf8');
assert(source.includes('noClinicalAccuracyInferredFromTechnicalSHA:true'));
assert(source.includes('noDraftPR197MergeUntilNIHComplete:true'));
assert(source.includes('noHistoricalArtifactEquatedWithPermanentPreservation:true'));
assert(source.includes("online.legacyArtifacts=await api('/actions/runs/'"));
const r=JSON.parse(fs.readFileSync('docs/ATLA_NIH3D_ATLA_CENTRAL_LEDGER_2026.json','utf8'));
assert.equal(r.state,'CENTRAL_TASK_INCOMPLETE');
assert.equal(r.completionPercentage,null);
assert.equal(r.counts.sourceEntries,15688);
assert.equal(r.counts.originalMetadataSourceReferences,204346);
assert.equal(r.counts.biomedicalCandidates+r.counts.scientificRelevanceReviewsPending+r.counts.likelyNonmedicalPreserved,15688);
assert(r.counts.fullOriginalModelsSHARecovered>0);
assert(r.counts.fullOriginalModelsSHARecovered<r.counts.biomedicalCandidates);
assert.equal(r.counts.independentClinicalModelApprovals,0);
assert(r.counts.currentTechnicalStructuralFilesSHAReverified===r.counts.uniqueOriginalSourceFilesSHARecovered);
assert(r.issues.length>=12);
assert(r.issues.some(x=>x.id==='NIH-05'&&x.state!=='VERIFIED_COMPLETE_FOR_STATED_SCOPE'));
assert(r.issues.some(x=>x.id==='ATLA-01'&&x.state==='UNVERIFIED_OR_PENDING'));
assert(r.issues.some(x=>x.id==='ATLA-02'&&x.state==='UNVERIFIED_OR_PENDING'));
assert(r.issues.some(x=>x.id==='NIH-07'&&x.state==='UNVERIFIED_OR_PENDING'));
assert(r.issues.some(x=>x.id==='NIH-08'&&x.state==='UNVERIFIED_OR_PENDING'));
assert(r.coreSafety.noAIEndpointActivationRequested);
assert(r.coreSafety.noDraftPR197MergeUntilNIHComplete);
assert(r.github.historicalArtifactRun===41363970707);
if(r.github.pr197.number){
 assert.equal(r.github.pr197.number,197);
 assert.equal(r.github.pr197.draft,true);
 assert.equal(r.github.pr197.merged,false);
 assert(r.github.pr197.headSha.length===40);
}
const md=fs.readFileSync('docs/ATLA_NIH3D_ATLA_CENTRAL_LEDGER_2026.md','utf8');
assert(md.includes('NIH-09')&&md.includes('ATLA-03'));
assert(md.includes('πρωτότυπα'));
console.log('ATLA NIH3D unified central ledger source assertions passed:',r.issues.length,'tasks,',
 r.issues.filter(x=>x.state!=='VERIFIED_COMPLETE_FOR_STATED_SCOPE').length,'unverified');
