import test from 'node:test';
import assert from 'node:assert/strict';
import {auditReviewCorpus,auditMarkdown} from './audit-corpus.mjs';

test('Full seven-book automated audit enumerates all actual extracts and clinician review IDs',async()=>{
 const report=await auditReviewCorpus();
 assert.equal(report.books_total,7);
 assert.equal(report.approved_sources,0);
 assert.equal(report.rights_approved_sources,0);
 assert.equal(report.ready_for_ai,false);
 assert.equal(report.review_previews,7);
 assert.equal(report.restricted,0);
 assert.equal(report.no_chapter_book_count,5);
 assert.ok(report.passages_total>2000);
 assert.ok(report.human_review_queue_count>=25);
 assert.ok(report.review_queue.every(x=>x.reviewer===null&&x.decision===null));
 assert.ok(report.review_queue.every(x=>/^[a-z0-9-]+$/.test(x.passage_id)));
 assert.ok(report.review_queue.every(x=>x.review_status==='human-clinical-review-pending'));
});
test('OpenStax and WHO are previewable under user attestation; all five Pressbooks need chapter locators',async()=>{
 const report=await auditReviewCorpus();
 const restricted=report.books.filter(x=>x.rights==='rights-restricted').map(x=>x.source_id).sort();
 assert.deepEqual(restricted,[]);
 const unanchored=report.books.filter(x=>x.citation_quality==='whole-book-no-chapter');
 assert.equal(unanchored.length,5);
 const openstax=report.books.find(x=>x.source_id==='medical-surgical-nursing');
 assert.ok(openstax.flags.includes('OpenStax-prior-written-AI-permission-requires-documentary-check'));
 assert.equal(openstax.permission_basis,'user-asserted-2026-10-29');
 assert.equal(openstax.permission_documentary_verified,false);
 const who=report.books.find(x=>x.source_id==='who-bec');
 assert.ok(who.flags.includes('WHO-2018-needs-current-2025-crosscheck'));
 const md=auditMarkdown(report);
 assert.match(md,/Κλινικός έλεγχος/i);
 assert.match(md,/νομική πιστοποίηση/i);
});
