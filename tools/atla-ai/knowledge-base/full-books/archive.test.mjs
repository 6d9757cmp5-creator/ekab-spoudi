import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {isAllowedSource,validateSource} from './archive.mjs';

const catalog=JSON.parse(await readFile(new URL('./catalog.json',import.meta.url),'utf8'));
test('ten academically sourced full book candidates, not yet falsely archived',()=>{
 assert.equal(catalog.schema_version,1);
 assert.equal(catalog.book_count,10);
 assert.equal(catalog.books.length,10);
 assert.equal(catalog.verified_full_books_persisted,0);
 assert.equal(new Set(catalog.books.map(x=>x.id)).size,10);
 assert.equal(catalog.books.filter(x=>x.full_book_archival_requested).length,9);
 assert.ok(catalog.books.some(x=>x.id==='uwm-cell-molecular-biology-5e'));
 assert.ok(catalog.books.every(x=>x.content_status==='NOT_YET_ARCHIVED'&&x.atla_ai_retrieval_enabled===false));
});
test('source host and license verification rejects untrusted or AI-restricted books',()=>{
 const allowed=catalog.books.find(x=>x.id==='open-rn-nbk610445');
 assert.doesNotThrow(()=>validateSource(allowed));
 for(const uri of ['https://example.com/books.pdf','https://www.ncbi.nlm.nih.gov.evil.com/books/x.pdf',
 'http://www.ncbi.nlm.nih.gov/books/x.pdf','https://www.ncbi.nlm.nih.gov@evil.com/x.pdf',
 'https://openstax.org/books/biology-2e.pdf','https://github.com/random/book.pdf']){
  assert.equal(isAllowedSource(uri),false,uri);
 }
 assert.throws(()=>validateSource({...allowed,license:'All Rights Reserved'}));
 assert.throws(()=>validateSource({...allowed,content_status:'VERIFIED'}));
 assert.throws(()=>validateSource({...allowed,atla_ai_retrieval_enabled:true}));
 assert.throws(()=>validateSource({...allowed,official_pdf:'https://openstax.org/books/biology-2e.pdf'}));
});
test('each official PDF is version linked and the complete object is expected',()=>{
 for(const x of catalog.books){
  assert.match(x.official_pdf,/\.pdf(?:\?|$)/);
  assert.match(x.source_page,/^https:\/\//);
  assert.ok(x.attribution.length>25);
  assert.match(x.license,/^CC BY 4\.0/);
  assert.ok(x.rights_scope.includes('review')||x.rights_scope.includes('notices'));
  assert.equal(x.independent_clinical_review,'pending');
  if(x.full_book_archival_requested)assert.doesNotThrow(()=>validateSource(x));
 }
});
test('do not automatically archive an enormous textbook in initial collection',()=>{
 const large=catalog.books.find(x=>x.source_id==='NBK596735');
 assert.equal(large.full_book_archival_requested,false);
 assert.equal(large.content_status,'NOT_YET_ARCHIVED');
});
