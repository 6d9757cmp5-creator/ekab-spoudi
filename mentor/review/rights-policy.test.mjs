import test from 'node:test';
import assert from 'node:assert/strict';
import {SOURCE_POLICY,canPreviewSource,assertEditorialSource,assertNoClinicalApproval} from './rights-policy.mjs';

const expected=['wistech-emr-2025','openrn-health','openrn-skills','openrn-pharm','openrn-advanced','who-bec','medical-surgical-nursing'];
test('All seven books are inventoried and zero can be used for LLMs, RAG, public release, or medical guidance',()=>{
 assert.deepEqual(Object.keys(SOURCE_POLICY).sort(),expected.sort());
 for(const value of Object.values(SOURCE_POLICY)){
  assert.equal(value.ai_retrieval_allowed,false);
  assert.equal(value.model_training_allowed,false);
  assert.equal(value.production_publication_allowed,false);
  assert.equal(value.clinical_review,'pending');
  assert.ok(['pending','user-attested-unverified'].includes(value.rights_signoff));
  assert.notEqual(value.rights_signoff,'verified');
  assert.match(value.source,/^https:\/\//);
 }
});
test('OpenStax and WHO remain AI-blocked even when the owner asserts review-preview permission',()=>{
 for(const id of ['who-bec','medical-surgical-nursing']){
  assert.equal(canPreviewSource(id),true,'Preview permission is user-attested, not publisher-verified');
  assert.equal(assertEditorialSource(id).preview_allowed,true);
  assert.equal(SOURCE_POLICY[id].rights_signoff,'user-attested-unverified');
  assert.equal(SOURCE_POLICY[id].ai_retrieval_allowed,false);
  assert.equal(SOURCE_POLICY[id].production_publication_allowed,false);
 }
 for(const id of expected.filter(x=>!['who-bec','medical-surgical-nursing'].includes(x))){
  assert.equal(canPreviewSource(id),true);
  assert.ok(assertEditorialSource(id).source.startsWith('https://'));
 }
 assert.match(SOURCE_POLICY['medical-surgical-nursing'].license,/prior written permission/i);
 assert.match(SOURCE_POLICY['who-bec'].license,/noncommercial/i);
 assert.equal(canPreviewSource('unknown'),false);
});
test('Clinical sign-off never results from automatic extraction or passing tests',()=>{
 const manifest={books:expected.map(source_id=>({source_id}))};
 const catalog=expected.map(id=>({id,clinical_retrieval_enabled:false,independent_clinical_review:'not_verified',publication_rights_review:'not_verified'}));
 assert.equal(assertNoClinicalApproval(manifest,catalog),true);
 assert.throws(()=>assertNoClinicalApproval(manifest,catalog.map(x=>({...x,clinical_retrieval_enabled:true}))),/Premature/);
 assert.throws(()=>assertNoClinicalApproval({...manifest,books:manifest.books.slice(1)},catalog),/inventory/i);
});
