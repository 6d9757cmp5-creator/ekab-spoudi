#!/usr/bin/env node
// Regression tests for publishing guard. No API, paid services, or real MP4 required.
import assert from 'node:assert/strict';
import {readFile,mkdtemp,mkdir,writeFile,copyFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';

const temp=await mkdtemp(join(tmpdir(),'ekab-video-gate-test-'));
const check=(name,condition)=>{assert.ok(condition,name);console.log('PASS '+name)};
function validate(){
  return spawnSync(process.execPath,['scripts/validate-saek-video-publication.mjs'],{cwd:temp,encoding:'utf8'});
}
try{
  await mkdir(join(temp,'scripts'));
  for(const file of ['saek-videos.js','scripts/validate-saek-video-publication.mjs'])
    await copyFile(file,join(temp,file));
  const catalogue=await readFile('saek-videos.js','utf8');
  const parser={window:{}};new Function('window',catalogue)(parser.window);
  const total=Object.values(parser.window.EKAB_COURSE_VIDEO_SERIES).reduce((n,c)=>n+c.parts.length,0);
  check('Existing 30 videos in source registry',total===30);
  const registryPath=join(temp,'saek-video-approvals.json');
  await writeFile(registryPath,JSON.stringify({schemaVersion:1,approved:{}},null,2));
  let r=validate();
  check('No approvals is a valid registry',r.status===0);
  check('All existing videos are explicitly pending',r.stdout.includes('held '+total));
  const url=parser.window.EKAB_COURSE_VIDEO_SERIES['01'].parts[0].url;
  await writeFile(registryPath,JSON.stringify({schemaVersion:1,approved:{'01-01':{
    status:'approved',url,videoSha256:'a'.repeat(64),reportPath:'video-reviews/reports/01-01.json',
    approvedBy:'Test Owner',clinicalReviewer:'Test Clinician',approvedAt:'2026-10-28'
  }}},null,2));
  r=validate();
  check('Approval without independent AI report is rejected',r.status!==0&&r.stderr.includes('Missing/unreadable report'));
  await mkdir(join(temp,'video-reviews/reports'),{recursive:true});
  await writeFile(join(temp,'video-reviews/reports/01-01.json'),JSON.stringify({
    course:'01',chapter:1,publishedUrl:url,videoSha256:'a'.repeat(64),
    reference:'video-reviews/references/01-01.md',referenceSha256:'b'.repeat(64),
    status:'hold',score:100,critical:false,humanApprovalRequired:true,
    scores:{spokenAndTeaching:100,visualMin:100},findings:[],missingEvidence:[]
  }));
  r=validate();
  check('A high score with hold status is rejected',r.status!==0&&r.stderr.includes('Failed/stale second-AI report'));
  const source=await readFile('saek-course-series.js','utf8');
  check('Series player reads approval registry',source.includes("fetch('./saek-video-approvals.json'"));
  check('Series player requires clinical signoff',source.includes('approval.clinicalReviewer'));
  const player=await readFile('saek-video-player.js','utf8');
  check('Legacy player reads approval registry',player.includes("fetch('./saek-video-approvals.json'"));
  check('Legacy player requires clinical signoff',player.includes('item.clinicalReviewer'));
  for(const file of ['saek-course-series.js','saek-video-player.js']){
    const parsed=spawnSync(process.execPath,['--check',file],{encoding:'utf8'});
    check('JavaScript syntax '+file,parsed.status===0);
  }
  console.log('All publication gate regression tests passed.');
}finally{
  await rm(temp,{recursive:true,force:true});
}
