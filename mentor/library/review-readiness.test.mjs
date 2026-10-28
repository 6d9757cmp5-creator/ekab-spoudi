import test from 'node:test';
import assert from 'node:assert/strict';
import {assessReadiness} from './review-readiness.mjs';

test('unreviewed extracted source must not be publishable',()=>{
  const a=assessReadiness({sources:[{id:'a',fulltext_ingested:true,clinical_review:'pending',license:'CC BY 4.0'}]}, {books:[{source_id:'a'}]});
  assert.equal(a.text_imported_count,1);
  assert.equal(a.ready_for_publication,false);
  assert.ok(a.outstanding.some(v=>v.includes('clinical review pending')));
  assert.ok(a.outstanding.some(v=>v.includes('rights not independently verified')));
});
test('identified URL alone does not count as book',()=>{
  const a=assessReadiness({sources:[{id:'a',fulltext_ingested:false}]},{books:[]});
  assert.equal(a.text_imported_count,0);
  assert.equal(a.ready_for_publication,false);
});
test('release needs explicit source-level review, rights and deployment evidence',()=>{
  const entry={id:'a',fulltext_ingested:true,clinical_review:'approved',rights_review:'verified',production_retrieval:'validated'};
  const a=assessReadiness({sources:[entry]},{books:[{source_id:'a'}]});
  assert.equal(a.ready_for_publication,true);
  assert.equal(a.outstanding.length,0);
});
test('invalid inventory fails closed',()=>{
  assert.throws(()=>assessReadiness({},{}),/Invalid/);
  assert.equal(assessReadiness({sources:[]},{books:[]}).ready_for_publication,false);
});
