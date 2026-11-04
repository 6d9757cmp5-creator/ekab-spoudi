import test from 'node:test';
import assert from 'node:assert/strict';
import {hasSourceCheckedEducationalImage,statusIsSafeForEducationalInventory} from './saek-educational-image-evidence.mjs';
const valid=()=>({
  sha256:'a'.repeat(64),clinicalReview:'pending',
  educationalSourceReview:{
    status:'source-checked-educational',scope:'educational-only',
    clinicalUseApproved:false,unresolvedHighRisk:false,
    assetSha256:'a'.repeat(64),checkedAt:'2026-11-04',
    sourceUrl:'https://openstax.org/books/anatomy-and-physiology-2e',
    sourceSection:'Figure 1.13 anatomical position',sourceCaptureSha256:'b'.repeat(64),
    secondAiReview:{status:'passed',evidenceUrl:'https://agent.tinyfish.ai/research/report'},
    claimCompared:'Anatomical axis and label positions checked against original source'
  }
});
test('a pending media asset stays pending without source-evidence review',()=>{
  const x={sha256:'a'.repeat(64),clinicalReview:'pending'};
  assert.equal(hasSourceCheckedEducationalImage(x),false);
  assert.equal(statusIsSafeForEducationalInventory(x),true);
});
test('two-pass source check requires current asset hash and scope without granting clinical use',()=>{
  const x=valid();assert.equal(hasSourceCheckedEducationalImage(x),true);
  assert.equal(statusIsSafeForEducationalInventory(x),true);
});
test('stale hash, missing source, missing second AI or unresolved risk are rejected',()=>{
  for(const mutate of [
    x=>{x.educationalSourceReview.assetSha256='0'.repeat(64);},
    x=>{x.educationalSourceReview.sourceUrl='http://source.invalid';},
    x=>{x.educationalSourceReview.secondAiReview.status='pending';},
    x=>{x.educationalSourceReview.unresolvedHighRisk=true;},
    x=>{x.educationalSourceReview.clinicalUseApproved=true;},
    x=>{x.educationalSourceReview.sourceSection='';},
    x=>{x.educationalSourceReview.scope='clinical';}
  ]){const x=valid();mutate(x);assert.equal(hasSourceCheckedEducationalImage(x),false);
    assert.equal(statusIsSafeForEducationalInventory(x),false);}
});
test('a naked clinical-approved flag is prohibited even with source evidence',()=>{
  const x=valid();x.clinicalReview='approved';
  assert.equal(statusIsSafeForEducationalInventory(x),false);
});
