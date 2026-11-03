import assert from 'node:assert/strict';
import fs from 'node:fs';
import {biomedicalScope,NIH_BIOMEDICAL_SCOPE_STATUS as ST} from '../tools/atla-ai/nih3d-biomedical-scope.mjs';
const data=JSON.parse(fs.readFileSync('tools/atla-ai/resources/nih3d-master-plan-2026/segments/entries-1-500.json','utf8'));
const get=id=>data.items.find(e=>e.entryId===id);
for(const [id,status] of [[1,ST.IN],[3,ST.IN],[6,ST.IN],[10,ST.IN],[12,ST.IN],[109,ST.OUT]]){
 const source=get(id);assert(source,'Expected source '+id);
 const row=biomedicalScope(source);assert.equal(row.status,status,'Incorrect NIH scientific triage '+id);
 assert.equal(row.clinicalUseApproved,false);
 assert.equal(row.scientificAccuracy,'NOT_INDEPENDENTLY_VERIFIED');
 assert.equal(row.originalBinariesStoredByThisScreen,0);
 assert.equal(row.originalFileReferences,source.files.length);
}
const tested=get(168);
assert.equal(biomedicalScope(tested).status,ST.IN);
const molecular=biomedicalScope({...tested,category:'Biomacromolecules',title:'Human bone morphogenetic protein'});
assert.equal(molecular.domain,'biomedical_molecular_structure');
assert.equal(molecular.clinicalUseApproved,false);
assert.equal(biomedicalScope({...tested,category:'Small Molecules',title:'Water molecule'}).status,ST.REVIEW,
 'Scientific chemical references cannot all automatically become medical teaching aids');
assert.equal(biomedicalScope({...tested,category:'Devices and Hardware',title:'LED holder',description:''}).status,ST.OUT);
assert.equal(biomedicalScope({...tested,category:'Devices and Hardware',title:'Clinical ventilator part',description:''}).status,ST.REVIEW);
assert.equal(biomedicalScope({...tested,category:'Prosthetics',title:'Artificial hip joint'}).status,ST.IN);
const valid=biomedicalScope(tested);
assert.equal(valid.unsupportedOrMalformedFileReferences,0);
const malicious=biomedicalScope({...tested,files:[{url:'https://not-nih.example/malware.glb',format:'GLB',size:100}]});
assert.equal(malicious.unsupportedOrMalformedFileReferences,1);
assert.equal(biomedicalScope({...tested,license:'Unknown',licenseRaw:'Unknown'}).licenseStatus,'LICENSE_REQUIRES_INDIVIDUAL_REVIEW');
assert.equal(biomedicalScope({...tested,license:'Public Domain',licenseRaw:'Public Domain'}).licenseStatus,'SOURCE_LABEL_PERMITS_POSSIBLE_REUSE_WITH_LICENSE_CONDITIONS');
assert.throws(()=>biomedicalScope({id:'not-an-id'}),/identity/);
console.log('NIH3D research scope safety fixtures passed');
