import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {dirname,join} from 'node:path';
import {validateReviewManifest} from './book-loader.mjs';
import {assertReviewBook,findForEditorialPreview} from './review-search.mjs';
const dir=join(dirname(fileURLToPath(import.meta.url)),'../review-corpus');
test('All seven actual GitHub book extracts are copied without modification and remain unapproved',async()=>{
 const manifest=validateReviewManifest(JSON.parse(await readFile(join(dir,'manifest.json'),'utf8')));
 const ids=new Set();
 let passages=0,words=0;
 for(const item of manifest.books){
  assert.equal(ids.has(item.source_id),false,'Duplicate book');
  ids.add(item.source_id);
  const raw=await readFile(join(dir,item.source_id+'.json'));
  assert.equal(createHash('sha256').update(raw).digest('hex'),item.sha256,item.source_id+' changed unexpectedly');
  const book=assertReviewBook(JSON.parse(raw),item.source_id,manifest);
  assert.equal(book.passages.length,item.passage_count);
  assert.ok(book.passages.every(p=>p.review_status==='draft'));
  assert.ok(book.passages.every(p=>/^https:\/\//.test(p.source_url)));
  passages+=book.passages.length;
  words+=item.word_count;
 }
 assert.equal(ids.size,7);
 assert.ok(passages>2000,'Import contains too few excerpts');
 assert.ok(words>1_000_000,'A significant source corpus is missing');
});
test('Real, unapproved EMR textbook can be looked up with a Greek term without producing clinical advice',async()=>{
 const manifest=JSON.parse(await readFile(join(dir,'manifest.json'),'utf8'));
 const book=JSON.parse(await readFile(join(dir,'wistech-emr-2025.json'),'utf8'));
 const result=findForEditorialPreview({query:'αεραγωγός',book,sourceId:'wistech-emr-2025',manifest,limit:4});
 assert.ok(result.length>0);
 assert.ok(result.every(r=>r.review_status==='draft'));
 assert.ok(result.every(r=>r.source_url==='https://wtcs.pressbooks.pub/emergencymedtech/'));
 assert.ok(result.every(r=>r.excerpt.length<=262));
});
