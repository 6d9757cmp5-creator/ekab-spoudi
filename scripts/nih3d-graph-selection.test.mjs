import assert from 'node:assert/strict';
import {mkdtempSync,writeFileSync,readFileSync,mkdirSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
import {selectContextualModels} from './nih3d-contextual-selection.mjs';
const items=[
 {id:10,accession:'3DPX-000010',title:'Human heart',decision:'medical_candidate',sourceUrl:'https://3d.nih.gov/entries/3DPX-000010',topics:['cardiovascular'],sourceVersion:3},
 {id:20,title:'Human lungs',decision:'medical_candidate',topics:['respiratory']},
 {id:30,title:'Possible brain tissue',decision:'manual_review',topics:['neurology']}
];
assert.deepEqual(selectContextualModels(items,{surface:'lesson',learningObjective:'Καρδιολογία',require3D:true}),[],'No scientific approval -> no display');
assert.deepEqual(selectContextualModels(items,{surface:'lesson',learningObjective:'Καρδιολογία',reviewedModels:[10]}),[],'No educational benefit -> no 3D');
assert.deepEqual(selectContextualModels(items,{surface:'lesson',learningObjective:'Καρδιολογία',require3D:true,reviewedModels:[10]}).map(x=>x.id),[10]);
assert.deepEqual(selectContextualModels(items,{surface:'exam',learningObjective:'Καρδιολογία',require3D:true,reviewedModels:[10]}),[],'No exam hints by default');
assert.deepEqual(selectContextualModels(items,{surface:'exam',learningObjective:'Καρδιολογία',require3D:true,reviewedModels:[10],questionRequires3D:true}).map(x=>x.id),[10]);
assert.deepEqual(selectContextualModels(items,{surface:'cockpit',learningObjective:'Αναπνευστική ανεπάρκεια',require3D:true,reviewedModels:[10,20]}).map(x=>x.id),[20]);
assert.deepEqual(selectContextualModels(items,{surface:'cockpit',learningObjective:'Νευρολογία',require3D:true,reviewedModels:[30]}),[],'Unverified candidates not shown');
const d=mkdtempSync(join(tmpdir(),'atla-graph-'));
try{
 const src=join(d,'src'),out=join(d,'out');
 mkdirSync(join(src,'segments'),{recursive:true});
 writeFileSync(join(src,'summary.json'),JSON.stringify({sourceSegments:1,uniqueRecords:3}));
 writeFileSync(join(src,'segments','entries-1-500.json'),JSON.stringify({rows:items}));
 const r=spawnSync(process.execPath,['scripts/nih3d-build-knowledge-graph.mjs',src,out],{encoding:'utf8'});
 assert.equal(r.status,0,r.stderr);
 const summary=JSON.parse(readFileSync(join(out,'summary.json'),'utf8'));
 assert.equal(summary.modelNodes,3);
 assert.equal(summary.proposedEdges,3);
 assert.equal(summary.scientificEvidenceStatus,'UNVERIFIED');
 console.log('ATLA NIH3D graph and contextual selection tests passed.');
}finally{rmSync(d,{recursive:true,force:true});}
