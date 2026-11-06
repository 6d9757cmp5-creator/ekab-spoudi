import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,readFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
const d=mkdtempSync(join(tmpdir(),'atla-plan-'));
try{
 const src=join(d,'original'),triage=join(d,'classified'),out=join(d,'plan.json');
 mkdirSync(join(src,'segments'),{recursive:true});mkdirSync(join(triage,'segments'),{recursive:true});
 writeFileSync(join(triage,'summary.json'),JSON.stringify({sourceSegments:1,uniqueRecords:3,counts:{medical_candidate:2}}));
 const entries=[
  {entryId:1,files:[{format:'GLB',size:100,url:'https://3d.nih.gov/api/submissions/1/file'},{format:'STL',size:25,url:'https://3d.nih.gov/api/submissions/1/file2'}]},
  {entryId:2,files:[{format:'GLB',size:500,url:'https://3d.nih.gov/api/submissions/1/file3'}]},
  {entryId:3,files:[{format:'GLB',size:1000,url:'https://3d.nih.gov/api/submissions/1/file4'}]}
 ];
 writeFileSync(join(src,'segments','entries-1-500.json'),JSON.stringify({items:entries}));
 const rows=[
  {id:1,decision:'medical_candidate',licensing:'catalog_license_allows_with_conditions'},
  {id:2,decision:'medical_candidate',licensing:'license_review_required'},
  {id:3,decision:'manual_review',licensing:'catalog_license_allows_with_conditions'}
 ];
 writeFileSync(join(triage,'segments','entries-1-500.json'),JSON.stringify({rows}));
 const r=spawnSync(process.execPath,['scripts/nih3d-plan-medical-transfer.mjs',src,triage,out],{encoding:'utf8'});
 assert.equal(r.status,0,r.stderr);
 const s=JSON.parse(readFileSync(out,'utf8'));
 assert.equal(s.medicalCandidates,2);assert.equal(s.licenseOk,1);assert.equal(s.licenseReview,1);
 assert.equal(s.originalFileReferences,2);assert.equal(s.uncompressedBytesFromSourceMetadata,125);
 assert.equal(s.releaseGroups.length,1);
 console.log('Medical Release inventory fixture tests passed.');
}finally{rmSync(d,{recursive:true,force:true});}
