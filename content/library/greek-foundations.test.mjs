import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {KNOWLEDGE_PACK,KNOWLEDGE_CARDS,KNOWLEDGE_SOURCES,KNOWLEDGE_DOMAINS} from './greek-foundations-30.mjs';
import {verifyCandidatePack,previewCandidateCards,approvedCards} from './greek-foundations-query.mjs';
const source=path=>readFileSync(new URL('../../'+path,import.meta.url),'utf8');

test('preserve all 30 candidate cards and nine cataloged source links with no signoff',()=>{
 assert.deepEqual(verifyCandidatePack(),{candidates:30,reference_catalog:9,domains:8,published:0,independent_review_completed:0});
 assert.equal(new Set(KNOWLEDGE_CARDS.map(c=>c.id)).size,30);
 assert.equal(KNOWLEDGE_PACK.publishable,false);
 assert.equal(KNOWLEDGE_PACK.automatic_ai_context,false);
 assert.equal(KNOWLEDGE_PACK.curriculum_match_verified,false);
 assert.equal(KNOWLEDGE_PACK.model_training,false);
 assert.equal(approvedCards().length,0);
 for(const card of KNOWLEDGE_CARDS){
  assert.ok(card.source_ids.every(id=>Object.hasOwn(KNOWLEDGE_SOURCES,id)));
  assert.match(card.status,/pending/);
  assert.ok(card.recall_guide.length>10);
 }
});
test('editorial preview is read-only, constrained and Greek accent tolerant',()=>{
 assert.equal(previewCandidateCards().length,30);
 const abc=previewCandidateCards({query:'ABCDE'});
 assert.ok(abc.some(c=>c.id==='assessment-abcde'));
 const triage=previewCandidateCards({query:'διαλογη'});
 assert.ok(triage.some(c=>c.id==='triage-purpose'));
 assert.ok(previewCandidateCards({query:'αεραγωγός',domain:'assessment'}).some(c=>c.id==='assessment-airway'));
 assert.deepEqual(previewCandidateCards({domain:'not-a-domain'}),[]);
 assert.deepEqual(previewCandidateCards({limit:0}),[]);
 assert.equal(approvedCards().length,0);
});
test('cards do not auto-connect to old MENTOR, live ATLAS or AI grading',()=>{
 for(const file of ['index.html','mentor-lab.html','mentor-lab.js','atla/assistant.mjs']){
  let body;
  try{body=source(file);}catch{if(file==='atla/assistant.mjs')continue;throw Error('Missing main source '+file);}
  assert.ok(!body.includes('greek-foundations-30.mjs'),file);
  assert.ok(!body.includes('greek-foundations-query.mjs'),file);
 }
 const cardModule=source('content/library/greek-foundations-30.mjs');
 const queryModule=source('content/library/greek-foundations-query.mjs');
 assert.doesNotMatch(cardModule+queryModule,/fetch\s*\(|localStorage|sessionStorage|eval\s*\(|new\s+Function|ai-grading-client|answer-grader/);
 for(const key of ['progress.js','notes-store.js','official_questions.json']){
  assert.ok(!cardModule.includes(key)&&!queryModule.includes(key));
 }
});
