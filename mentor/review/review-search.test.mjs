import test from 'node:test';
import assert from 'node:assert/strict';
import {fold,queryTerms,findForEditorialPreview,PREVIEW_MAX,assertReviewBook} from './review-search.mjs';
const manifest={books:[{source_id:'wistech-emr-2025',passage_count:2}]};
const book={schema_version:1,source_id:'wistech-emr-2025',passages:[
 {id:'wistech-emr-2025-0001',source_id:'wistech-emr-2025',title:'Airway',
  text:'Airway assessment is described for a fictional classroom scenario. This is a source excerpt only and not a clinical instruction.',
  source_url:'https://wtcs.pressbooks.pub/emergencymedtech/',section:'whole-book',review_status:'draft'},
 {id:'wistech-emr-2025-0002',source_id:'wistech-emr-2025',title:'Scene safety',
  text:'A classroom discussion about scene safety and equipment identification without treatment or patient instructions.',
  source_url:'https://wtcs.pressbooks.pub/emergencymedtech/',section:'whole-book',review_status:'draft'}
]};
test('Greek normalized search expands to English technical vocabulary',()=>{
 assert.equal(fold('ΑΕΡΑΓΩΓΌΣ'),'αεραγωγοσ');
 assert.ok(queryTerms('αεραγωγός').includes('airway'));
 assert.ok(queryTerms('ΑΝΑΚΟΠΗ').includes('cardiac'));
 assert.deepEqual(queryTerms('a'),[]);
});
test('Preview yields bounded literal text, actual provenance, and not an answer',()=>{
 const hits=findForEditorialPreview({query:'αεραγωγός',book,sourceId:'wistech-emr-2025',manifest});
 assert.equal(hits.length,1);
 assert.equal(hits[0].passage_id,book.passages[0].id);
 assert.equal(hits[0].source_url,book.passages[0].source_url);
 assert.equal(hits[0].review_status,'draft');
 assert.ok(hits[0].excerpt.length<=PREVIEW_MAX+2);
 assert.ok(!Object.hasOwn(hits[0],'medical_answer'));
});
test('No fabricated match or fabricated publisher reference',()=>{
 assert.deepEqual(findForEditorialPreview({query:'unfindabletermszzz',book,sourceId:'wistech-emr-2025',manifest}),[]);
 assert.throws(()=>assertReviewBook(book,'different-source',manifest),/mismatch|Invalid/i);
 assert.throws(()=>findForEditorialPreview({query:'airway',book:{...book,passages:[{...book.passages[0],source_url:'javascript:alert(1)'},book.passages[1]]},sourceId:'wistech-emr-2025',manifest}),/Invalid/);
});
