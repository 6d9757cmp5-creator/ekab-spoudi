import test from 'node:test';
import assert from 'node:assert/strict';
import {csvField,hint,recordsForBook,generate,toCsv} from './create-review-checklist.mjs';

test('no automatic clinical approval, same text remains hash-addressable',()=>{
 const b={source_id:'emr',passages:[{id:'abc-1',source_id:'emr',section:'p1',source_url:'https://example.org',text:'Medication dose given for review',review_status:'draft'}]};
 const a=recordsForBook(b);
 assert.equal(a.length,1);
 assert.equal(a[0].review_status,'pending-human');
 assert.equal(a[0].reviewer,'');
 assert.equal(a[0].license_verified,'');
 assert.equal(a[0].automated_topic_hint,'check-pharmacology');
 assert.match(a[0].text_sha256,/^[a-f0-9]{64}$/);
 assert.throws(()=>recordsForBook({...b,passages:[{...b.passages[0],review_status:'human-reviewed'}]}),/Unexpected approval/);
});
test('spreadsheet injection and quotes safely escaped in CSV',()=>{
 assert.equal(csvField('=HYPERLINK("bad")'),'"\'=HYPERLINK(""bad"")"');
 assert.equal(csvField('+1'),'"\'+1"');
 assert.equal(csvField('test"quote'),'"test""quote"');
 const line=toCsv([{passage_id:'abc'}]);
 assert.match(line,/review_status/); // review status is explicitly a column, not an automatic approval
});
test('entire existing review corpus receives exactly one pending record per passage',async()=>{
 const result=await generate();
 assert.equal(result.books,7);
 assert.equal(result.records.length,2799);
 assert.equal(new Set(result.records.map(r=>r.source_id+':'+r.passage_id)).size,2799);
 assert.ok(result.records.every(r=>r.review_status==='pending-human'&&!r.reviewer&&!r.license_verified));
});
