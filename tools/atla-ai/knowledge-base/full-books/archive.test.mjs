import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {isAllowedSource,validateSource} from './archive.mjs';

const catalog=JSON.parse(await readFile(new URL('./catalog.json',import.meta.url),'utf8'));
test('all ten complete PDFs archived and their hashes synchronized in catalogue',async()=>{
 assert.equal(catalog.schema_version,1);
 assert.equal(catalog.book_count,10);
 assert.equal(catalog.books.length,10);
 const report=JSON.parse(await readFile(new URL('./archive-manifest.json',import.meta.url),'utf8'));
 assert.equal(catalog.verified_full_books_persisted,report.complete_verified);
 assert.equal(report.books.length,report.complete_verified);
 assert.equal(report.complete_verified,10);
 assert.equal(report.catalog_count,10);
 assert.equal(report.not_archived.length,0);
 assert.equal(report.failures.length,0);
 assert.equal(report.books.length,10);
 assert.equal(report.complete_total_bytes,report.books.reduce((sum,b)=>sum+b.original_pdf_bytes,0));
 const byId=new Map(report.books.map(b=>[b.id,b]));
 for(const item of catalog.books){
  const original=byId.get(item.id);
  assert.ok(original,'Missing full book '+item.id);
  assert.equal(item.content_status,'FULL_PDF_ARCHIVED_SHA256_VERIFIED');
  assert.equal(item.archived_pdf_sha256,original.original_pdf_sha256);
  assert.equal(item.archived_pdf_bytes,original.original_pdf_bytes);
  assert.equal(item.archived_pages,original.pages);
  assert.equal(item.archived_parts,original.parts.length);
  assert.equal(item.archive_verified_at,report.checked_at);
  assert.match(item.archived_pdf_sha256,/^[a-f0-9]{64}$/i);
  assert.equal(item.atla_ai_retrieval_enabled,false);
 }
 assert.equal(report.scientific_approval,false);
 assert.equal(new Set(catalog.books.map(x=>x.id)).size,10);
 assert.equal(catalog.books.filter(x=>x.full_book_archival_requested).length,10);
 assert.ok(catalog.books.some(x=>x.id==='uwm-cell-molecular-biology-5e'));
 assert.ok(catalog.books.every(x=>x.content_status==='FULL_PDF_ARCHIVED_SHA256_VERIFIED'&&x.atla_ai_retrieval_enabled===false));
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
test('full original Nursing Skills textbook is stored and matches archive manifest',()=>{
 const large=catalog.books.find(x=>x.source_id==='NBK596735');
 assert.equal(large.full_book_archival_requested,true);
 assert.match(large.official_pdf,/^https:\/\/www.ncbi.nlm.nih.gov\/sites\/books\/NBK596735\/pdf\//);
 assert.equal(large.content_status,'FULL_PDF_ARCHIVED_SHA256_VERIFIED');
 assert.ok(large.archived_pdf_bytes>400*1024*1024);
});
