import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {isEducationPath,choosePaths,validateReview,runReview,MAX_FILES} from './educational-scientific-review.mjs';

test('all core educational and clinical areas trigger review',()=>{
 for(const path of [
  'official_questions.json','saek-course-03.html','farmaka-clinical-2026.js',
  'seminar-tracks.js','protocols-data.mjs','mentor/scenario-atlas/catalog.mjs',
  'mentor/knowledge/retrieve.mjs','docs/SAEK-REVIEW-SUMMARY-2026-10-25.md'
 ]) assert.equal(isEducationPath(path),true,path);
 // Unexpected names and directories are still automatically discovered.
 for(const path of [
  'future-2035/unknown-subject/lesson.html','new-area/curriculum.yml',
  'a-completely-new-topic/data.json','future-module/clinical-content.tsx',
  'media/generated-figure.svg','assets/new-teaching-image.png',
  'learning-2030/guidance.md','brand-new/lecture.pdf'
 ]) assert.equal(isEducationPath(path),true,path);
 for(const path of ['../secret','/tmp/file','README.md','AGENTS.md',
  '.github/workflows/review.yml','scripts/build-content.mjs','new-topic/example.test.mjs',
  'node_modules/third-party/lesson.js','docs/archive/old-medical-notes.md'])
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

test('an arbitrary future module remains discoverable after creation',()=>{
 const first=choosePaths(['unplanned-2029/brand-new-title.html']);
 const subsequent=choosePaths(['unplanned-2029/brand-new-title.html']);
 assert.deepEqual(first,subsequent);
 assert.equal(first.length,1);
});
test('new multimedia content is flagged instead of treated as verified text',()=>{
 assert.deepEqual(choosePaths(['future/assets/new-medical-image.webp','future/assets/new-lesson.mp4']),[
  'future/assets/new-lesson.mp4','future/assets/new-medical-image.webp'
 ]);
});

test('actual future binary module stays pending, not falsely screened',async()=>{
 const root=await mkdtemp(join(tmpdir(),'ekab-future-review-'));
 try{
  await mkdir(join(root,'docs'),{recursive:true});
  await mkdir(join(root,'future','new-section'),{recursive:true});
  await writeFile(join(root,'docs','INDEPENDENT_EDUCATIONAL_SCIENTIFIC_AUDIT.md'),'Audit rules');
  await writeFile(join(root,'future','new-section','image.png'),Buffer.from([137,80,78,71]));
  const result=await runReview({
   manual:'future/new-section/image.png',root,dryRun:true,
   fetchImpl:()=>{throw Error('unexpected network')}
  });
  assert.equal(result.status,'incomplete');
  assert.equal(result.reviewed_count,0);
  assert.ok(result.pending.some(x=>x.reason==='visual_or_media_review_required'));
  assert.equal(result.files[0].mode,'binary_media');
 }finally{await rm(root,{recursive:true,force:true});}
});

test('independent-review API request omits unsupported temperature and preserves evidence gate',async()=>{
 const root=await mkdtemp(join(tmpdir(),'ekab-scientific-request-'));
 const previousKey=process.env.ANTHROPIC_API_KEY;
 try{
  await mkdir(join(root,'docs'),{recursive:true});
  await mkdir(join(root,'future'),{recursive:true});
  await writeFile(join(root,'docs','INDEPENDENT_EDUCATIONAL_SCIENTIFIC_AUDIT.md'),'Verify claims and mark unverified');
  await writeFile(join(root,'future','lesson.html'),'<h1>Demo anatomy</h1>');
  process.env.ANTHROPIC_API_KEY='unit-test-key-do-not-use';
  let called=0;
  const result=await runReview({manual:'future/lesson.html',root,fetchImpl:async(url,options)=>{
   called++;
   const req=JSON.parse(options.body);
   assert.equal(Object.hasOwn(req,'temperature'),false,'adaptive thinking must not include temperature');
   assert.equal(req.max_tokens,8192,'ensure enough room for adaptive thinking and complete JSON review');
   assert.equal(req.messages[0].role,'user');
   assert.match(req.messages[0].content,/future\/lesson\.html/);
   return {ok:true,json:async()=>({
     stop_reason:'end_turn',
     content:[{type:'text',text:JSON.stringify({checked_scope:'supplied demo only',findings:[],unverified:[],not_checked:[]})}]
   })};
  }});
  assert.equal(called,1);
  assert.equal(result.status,'screened');
  assert.equal(result.reviewed_count,1);
 }finally{
  if(previousKey===undefined)delete process.env.ANTHROPIC_API_KEY;
  else process.env.ANTHROPIC_API_KEY=previousKey;
  await rm(root,{recursive:true,force:true});
 }
});
