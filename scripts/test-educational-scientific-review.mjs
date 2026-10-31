import test from 'node:test';
import assert from 'node:assert/strict';
import {isEducationPath,choosePaths,validateReview,runReview,MAX_FILES} from './educational-scientific-review.mjs';

test('all core educational and clinical areas trigger review',()=>{
 for(const path of [
  'official_questions.json','saek-course-03.html','farmaka-clinical-2026.js',
  'seminar-tracks.js','protocols-data.mjs','mentor/scenario-atlas/catalog.mjs',
  'mentor/knowledge/retrieve.mjs','docs/SAEK-REVIEW-SUMMARY-2026-10-25.md'
 ]) assert.equal(isEducationPath(path),true,path);
 for(const path of ['app.js','sync-local.js','../secret','/tmp/file','README.md','mentor/avatar/hologram.mjs'])
  assert.equal(isEducationPath(path),false,path);
});
test('deduplicated and bounded input selection',()=>{
 assert.deepEqual(choosePaths([], 'official_questions.json,saek-course-03.html,official_questions.json'),[
  'official_questions.json','saek-course-03.html'
 ]);
 assert.equal(Number.isInteger(MAX_FILES)&&MAX_FILES>0,true);
});
test('incomplete or fabricated findings cannot satisfy review schema',()=>{
 const good={checked_scope:'selected excerpt',findings:[{
  severity:'HIGH',location:'x:4',evidence:'exact phrase',problem:'incorrect explanation',
  proposed_fix:'correct wording',source:'ΜΗ ΕΠΑΛΗΘΕΥΜΕΝΟ'
 }],unverified:['no external source access'],not_checked:[]};
 assert.equal(validateReview(good),true);
 assert.equal(validateReview({...good,findings:[{...good.findings[0],severity:'PASS'}]}),false);
 assert.equal(validateReview({...good,unverified:null}),false);
 assert.equal(validateReview({...good,findings:[{severity:'HIGH'}]}),false);
});
test('dry-run prepares report without external calls or changing lessons',async()=>{
 const old=process.env.ANTHROPIC_API_KEY;
 try{
  delete process.env.ANTHROPIC_API_KEY;
  const report=await runReview({manual:'official_questions.json',dryRun:true,fetchImpl:()=>{throw Error('unexpected network')}});
  assert.equal(report.requested_count,1);
  assert.equal(report.reviewed_count,0);
  assert.equal(report.status,'incomplete');
  assert.ok(report.pending.some(x=>x.reason==='dry_run'));
  assert.ok(report.files[0].sha256.length===64);
 }finally{
  if(old===undefined)delete process.env.ANTHROPIC_API_KEY;else process.env.ANTHROPIC_API_KEY=old;
 }
});
