import assert from 'node:assert/strict';
import {mkdtempSync,writeFileSync,rmSync,mkdirSync,readFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
import {classifyEntry,extractEntries} from './nih3d-medical-classify.mjs';
const dir=mkdtempSync(join(tmpdir(),'atla-nih3d-'));
try{
 const items=[
  {entryId:1,accession:'3DPX-000001',title:'Human heart anatomy',category:'Anatomy',license:'Public Domain',files:[{format:'GLB'}]},
  {entryId:2,title:'HIV viral spike protein',category:'Viruses',license:'CC BY 4.0'},
  {entryId:3,title:'Breadboard wire guide',category:'Devices and Hardware',license:null},
  {entryId:4,title:'Unknown object',category:'Other'},
  {entryId:5,title:'MR imaging catheter mount',category:'Devices and Hardware'},
  {entryId:6,title:'Mycobacterium tuberculosis',category:'Cells and Organelles'},
  {entryId:7,title:'Lytic polysaccharide monooxygenase',category:'Biomacromolecules'},
  {entryId:8,title:'Human femur',category:'Anatomy'}
 ];
 const labels=items.map(classifyEntry);
 assert.equal(labels[0].decision,'medical_candidate');
 assert.equal(labels[0].id,1);
 assert.equal(labels[0].licensing,'catalog_license_allows_with_conditions');
 assert(labels[0].topics.includes('cardiovascular'));
 assert.equal(labels[1].decision,'manual_review');
 assert(labels[1].topics.includes('microbiology'));
 assert.equal(labels[2].decision,'non_medical_candidate');
 assert.equal(labels[2].licensing,'license_review_required');
 assert.equal(labels[3].decision,'manual_review');
 assert.equal(labels[4].decision,'medical_candidate');
 assert.equal(labels[5].decision,'manual_review');
 assert.equal(labels[6].decision,'manual_review');
 assert.equal(labels[7].decision,'medical_candidate');
 assert(labels.every(x=>x.reviewRequired&&x.contextualSelectionRequired));
 const molecularCases=[
  {title:'Human mitochondrial enzyme complex',category:'Biomacromolecules'},
  {title:'Human bone morphogenetic protein',category:'Biomacromolecules'},
  {title:'SOLUTION STRUCTURE OF OXIDIZED HORSE HEART CYTOCHROME C',category:'Biomacromolecules'},
  {title:'Human cell membrane receptor',category:'Cells and Organelles'}
 ];
 for(const entry of molecularCases){
  const result=classifyEntry(entry);
  assert.equal(result.decision,'manual_review','Biomedical molecules must not be treated as validated macroscopic anatomy');
  assert(result.reviewRequired);
 }
 const patella=classifyEntry({title:'Human patella',category:'Anatomy'});
 assert.equal(patella.decision,'medical_candidate');
 assert(patella.topics.includes('anatomy'));
 assert.equal(classifyEntry({title:'Body camera mount',category:'Devices and Hardware'}).decision,'non_medical_candidate');

 assert.deepEqual(extractEntries({items}),items);
 assert.deepEqual(extractEntries({entries:items}),items);
 assert.deepEqual(extractEntries(items),items);
 assert.throws(()=>extractEntries({garbage:1}));
 const input=join(dir,'entries-1-500.json');
 writeFileSync(input,JSON.stringify({totalEntries:items.length,items}));
 const cli=spawnSync(process.execPath,['scripts/nih3d-medical-classify.mjs',input],{encoding:'utf8'});
 assert.equal(cli.status,0,cli.stderr);
 assert.equal(cli.stdout.trim().split('\n').length,items.length);
 const catalogDir=join(dir,'catalog'),outputDir=join(dir,'out');
 mkdirSync(join(catalogDir,'segments'),{recursive:true});
 writeFileSync(join(catalogDir,'catalog-index.json'),JSON.stringify({publishedEntriesFound:items.length}));
 writeFileSync(join(catalogDir,'segments','entries-1-500.json'),JSON.stringify({totalEntries:items.length,items}));
 const build=spawnSync(process.execPath,['scripts/nih3d-build-medical-index.mjs',catalogDir,outputDir],{encoding:'utf8'});
 assert.equal(build.status,0,build.stderr);
 const summary=JSON.parse(readFileSync(join(outputDir,'summary.json'),'utf8'));
 assert.equal(summary.uniqueRecords,items.length);
 assert.equal(summary.counts.medical_candidate,3);
 assert.equal(summary.counts.manual_review,4);
 assert.equal(summary.counts.non_medical_candidate,1);
 writeFileSync(join(catalogDir,'catalog-index.json'),JSON.stringify({publishedEntriesFound:999}));
 const bad=spawnSync(process.execPath,['scripts/nih3d-build-medical-index.mjs',catalogDir,join(dir,'bad')],{encoding:'utf8'});
 assert.notEqual(bad.status,0,'The builder must refuse mismatched catalog coverage');
 console.log('Medical NIH3D triage tests passed (8 fixtures, source-schema and integrity checks).');
}finally{rmSync(dir,{recursive:true,force:true});}
