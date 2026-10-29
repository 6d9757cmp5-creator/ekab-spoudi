import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {dirname,resolve} from 'node:path';
import {validateStageGates} from './stage-gates.mjs';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
const json=async path=>JSON.parse(await readFile(resolve(root,path),'utf8'));
const [gate,manifest,catalog]=await Promise.all([
 json('mentor/governance/stage-gates.json'),
 json('mentor/review-corpus/manifest.json'),
 json('mentor/library/source-index.json')
]);
const copy=x=>JSON.parse(JSON.stringify(x));

test('Owner instruction is explicitly recorded as a roadmap acceptance, not independent clinical review',()=>{
 assert.match(gate.user_instruction.text,/Στάδιο 2/);
 const result=validateStageGates(gate,{manifest,catalog});
 assert.deepEqual(result,{
  stage_2_owner_gate:'accepted-to-proceed',
  stage_3_development_authorized:true,
  independent_clinical_approval:false,
  publisher_rights_verified:false,
  production_clinical_release_allowed:false
 });
 assert.equal(gate.stage_2.source_texts_clinically_approved,0);
 assert.equal(gate.stage_3.development_status,'ready-to-proceed-in-draft');
});
test('Stage 2 has a verified 7-book, 2799-passage technical audit and a 106-item human-review queue',()=>{
 assert.equal(gate.stage_1.imported_books,7);
 assert.equal(gate.stage_1.extracted_passages,2799);
 assert.equal(gate.stage_2.high_risk_samples_queued,106);
 assert.equal(gate.stage_2.needs_chapter_granularity,5);
 assert.equal(manifest.books.reduce((n,b)=>n+b.passage_count,0),2799);
 assert.ok(catalog.sources.every(s=>s.clinical_retrieval_enabled===false));
});
test('No owner instruction may bypass rights, medical clearance or model safety controls',()=>{
 const tamper=copy(gate);tamper.controls.clinical_retrieval_enabled=true;
 assert.throws(()=>validateStageGates(tamper,{manifest,catalog}),/Clinical production gate/);
 const legal=copy(gate);legal.user_instruction.publisher_rights_document_verified=true;
 assert.throws(()=>validateStageGates(legal,{manifest,catalog}),/Invalid Stage 2/);
 const clinical=copy(gate);clinical.stage_2.clinician_review='approved';
 assert.throws(()=>validateStageGates(clinical,{manifest,catalog}),/independent approval/);
 const progress=copy(gate);progress.controls.legacy_progress_protected=false;
 assert.throws(()=>validateStageGates(progress,{manifest,catalog}),/Clinical production gate/);
});
test('Stage 3 can start source and teaching work, while publication remains blocked',()=>{
 const result=validateStageGates(gate,{manifest,catalog});
 assert.equal(result.stage_3_development_authorized,true);
 assert.equal(result.production_clinical_release_allowed,false);
 assert.ok(gate.stage_3.allowed_now.some(x=>/citation|study|review/i.test(x)));
 assert.ok(gate.stage_3.prohibited_until_signoff.some(x=>/clinical|rights|human-reviewed/i.test(x)));
});
