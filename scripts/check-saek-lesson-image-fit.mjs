#!/usr/bin/env node
/**
 * Verify all 247 SAEK image selections are wired to real lesson headings and
 * check 38 editorially repaired mappings do not silently regress.
 * Does NOT certify clinical, anatomical, licensing, or pedagogical correctness.
 */
import {readFile, writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {dirname,resolve} from 'node:path';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const read=async file=>readFile(resolve(root,file),'utf8');
const registry=JSON.parse(await read('saek-image-audit-2026.json'));
const manifest=JSON.parse(await read('saek-lesson-fit-review.json'));
const allAssets=registry.assets||{}, courses=registry.courses||[];
const errors=[],pending=[],checked=[],selected=new Set(),totalCourses=20,totalChapters=247;
if(courses.length!==totalCourses)errors.push('Expected 20 courses');
if(Object.keys(manifest.chapterChecks||{}).length!==49)errors.push('Expected 49 documented editorial repairs');
const escapeHTML=text=>String(text||'').replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&#39;/g,"'");
for(const course of courses){
 const courseNo=String(course.course).padStart(2,'0');
 let html='';
 try{html=await read('saek-course-'+courseNo+'.html');}catch{errors.push('Missing HTML for '+courseNo);continue;}
 const headings=new Map([...html.matchAll(/<a href="#lesson-(\d+)">(?:\d+\s*·\s*)?([^<]+)<\/a>/g)].map(m=>[Number(m[1]),escapeHTML(m[2].trim())]));
 if(headings.size!==course.chapters.length)errors.push(courseNo+': TOC titles '+headings.size+' vs chapters '+course.chapters.length);
 for(let i=0;i<course.chapters.length;i++){
  const chapter=course.chapters[i],chapterNo=i+1,id=courseNo+'-'+String(chapterNo).padStart(2,'0'),ids=chapter.images||[];
  const heading=headings.get(chapterNo);
  if(!heading)errors.push(id+': lesson heading not found');
  if(!html.includes('id="lesson-'+chapterNo+'"'))errors.push(id+': target HTML chapter missing');
  if(!Array.isArray(ids)||!ids.length)errors.push(id+': no images selected');
  if(new Set(ids).size!==ids.length)errors.push(id+': duplicated asset inside one chapter');
  if(JSON.stringify(registry.placements?.[id])!==JSON.stringify(ids))errors.push(id+': placement map differs');
  for(const assetId of ids){
    const asset=allAssets[assetId];
    if(!asset||!asset.localPath||!asset.title||!asset.caption)errors.push(id+': missing image or Greek title/caption for '+assetId);
    else selected.add(assetId);
  }
  const signed=manifest.chapterChecks?.[id],expected=signed?.expectedImageIds;
  if(signed&&JSON.stringify(expected)!==JSON.stringify(ids))errors.push(id+': a documented editorial fix changed without updating its review evidence');
  checked.push({chapter:id,heading:heading||'',selectedImageIds:ids,editorialCorrectionRecorded:!!signed,independentEducationalFitVerified:false,independentMedicalApprovalVerified:false});
  if(!signed)pending.push(id);
 }
}
if(checked.length!==totalChapters)errors.push('Expected 247 chapters, got '+checked.length);
for(const id of Object.keys(manifest.chapterChecks||{})){
 if(!checked.some(item=>item.chapter===id))errors.push('Review references nonexistent chapter '+id);
}
const report={
 generatedAt:new Date().toISOString(),
 scope:'Chapter heading/placement integrity and explicit history of AI-assisted editorial corrections; NOT independent pedagogical/clinical review',
 summary:{courses:courses.length,chapters:checked.length,placements:checked.reduce((n,r)=>n+r.selectedImageIds.length,0),distinctSelectedAssets:selected.size,registeredAssets:Object.keys(allAssets).length,unselectedAssets:Object.keys(allAssets).length-selected.size,editorialCorrectionsRecorded:checked.length-pending.length,remainingChapterFitReviews:pending.length,independentlyEducationalFitVerified:0,independentlyClinicallyApproved:0,errors:errors.length},
 errors,chapters:checked,pendingIndependentEducationalReview:checked.map(r=>r.chapter)
};
await writeFile(resolve(root,'saek-lesson-fit-report.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report.summary,null,2));
for(const error of errors)console.error('FAIL',error);
if(errors.length)process.exitCode=1;
