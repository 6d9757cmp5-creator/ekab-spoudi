import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {readFileSync,readdirSync} from 'node:fs';

const tracked=execFileSync('git',['ls-files','*.html','*.js','*.mjs'],{encoding:'utf8',maxBuffer:64*1024*1024}).split('\n').filter(Boolean);
const review=file=>file.startsWith('mentor/library/')||file.startsWith('scripts/')||file.startsWith('docs/')||file.includes('.test.');

test('unreviewed textbooks cannot reach a learner surface',()=>{
 const refs=tracked.filter(file=>!review(file)).filter(file=>/mentor\/library\/(?:corpus|retrieval|search-books)|library\/corpus\//.test(readFileSync(file,'utf8')));
 assert.deepEqual(refs,[],'Learner code must not read the review-only corpus');
 assert.doesNotMatch(readFileSync('sw.js','utf8'),/mentor\/library\/corpus/,'The corpus is not cached for learners');
});
test('every imported passage stays a draft, with its source',()=>{
 const dir=new URL('./corpus/',import.meta.url);
 let passages=0;
 for(const name of readdirSync(dir).filter(x=>x.endsWith('.json')&&x!=='manifest.json')){
  const raw=JSON.parse(readFileSync(new URL(name,dir),'utf8'));
  const rows=Array.isArray(raw)?raw:raw.passages||raw.items||raw.chunks||raw.sections||[];
  assert(rows.length>0,name+' has no passages');
  for(const row of rows){
   passages++;
   assert.equal(row.review_status,'draft',name+' '+row.id);
   assert(row.source_id&&row.source_url,name+' '+row.id+' lacks its source');
  }
 }
 assert(passages>0);
});
test('no source claims clinical approval',()=>{
 const catalog=JSON.parse(readFileSync(new URL('./catalog.json',import.meta.url),'utf8'));
 for(const source of catalog.sources){
  assert.notEqual(source.status,'approved',source.id);
  assert.notEqual(source.clinical_use_approved,true,source.id);
 }
});
