#!/usr/bin/env node
// Fail closed on fabricated or stale approval entries. Unreviewed videos stay unpublished.
import {readFile} from 'node:fs/promises';
import {runInNewContext} from 'node:vm';
const errors=[],pending=[];
const manifest=JSON.parse(await readFile('saek-video-approvals.json','utf8'));
if(manifest.schemaVersion!==1||!manifest.approved||Array.isArray(manifest.approved)||typeof manifest.approved!=='object')errors.push('Invalid approval registry');
const context={window:{}};
runInNewContext(await readFile('saek-videos.js','utf8'),context,{timeout:1500});
const catalogue=new Map();
for(const [course,data] of Object.entries(context.window.EKAB_COURSE_VIDEO_SERIES||{})){
 if(!/^\d{2}$/.test(course)||!Array.isArray(data.parts))errors.push('Invalid course entry '+course);
 for(const part of data.parts||[]){
   const id=course+'-'+String(part.chapter).padStart(2,'0');
   if(catalogue.has(id))errors.push('Duplicate video '+id);
   catalogue.set(id,part.url);
 }
}
for(const id of catalogue.keys())if(!manifest.approved[id])pending.push(id);
for(const [id,entry] of Object.entries(manifest.approved||{})){
 if(!/^\d{2}-\d{2}$/.test(id)||!catalogue.has(id))errors.push('Approval not tied to an existing lesson '+id);
 if(!entry||entry.status!=='approved'||typeof entry.url!=='string'||entry.url!==catalogue.get(id))errors.push('URL mismatch or non-approved status '+id);
 if(!/^[a-f0-9]{64}$/.test(entry.videoSha256||''))errors.push('Missing SHA256 '+id);
 if(typeof entry.approvedBy!=='string'||entry.approvedBy.trim().length<3||!/^\d{4}-\d{2}-\d{2}$/.test(entry.approvedAt||''))errors.push('Human sign-off missing '+id);
 if(!/^video-reviews\/reports\/\d{2}-\d{2}\.json$/.test(entry.reportPath||'')){errors.push('Invalid report path '+id);continue;}
 try{
  const report=JSON.parse(await readFile(entry.reportPath,'utf8'));
  const [course,chapter]=id.split('-');
  if(report.status!=='ai_pass_human_review_required'||report.critical!==false||report.humanApprovalRequired!==true||report.score<90||report.scores?.spokenAndTeaching<90||report.scores?.visualMin<90||report.course!==course||report.chapter!==Number(chapter)||report.publishedUrl!==entry.url||report.videoSha256!==entry.videoSha256||!report.referenceSha256||report.missingEvidence?.length!==0)errors.push('Failed/stale second-AI report '+id);
 }catch(e){errors.push('Missing/unreadable report '+id);}
}
console.log('Registered '+catalogue.size+' videos; approved '+Object.keys(manifest.approved||{}).length+'; held '+pending.length+'.');
if(pending.length)console.log('Pending (not publishable): '+pending.join(', '));
if(errors.length){for(const error of errors)console.error('ERROR '+error);process.exitCode=1}else console.log('Approval registry valid. Unreviewed videos must remain hidden.');
