/**
 * Independent of the gallery: prove that every one of the 247 lesson HTML
 * sections actually gets its selected registry illustrations in the right
 * course and chapter, on mobile- and desktop-sized Chromium viewports.
 * This is a technical DOM/URL/alt test, NOT clinical/educational certification.
 */
import {chromium} from 'playwright';
import {spawn} from 'node:child_process';
import {get as httpGet} from 'node:http';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import assert from 'node:assert/strict';
const registry=JSON.parse(readFileSync('saek-image-audit-2026.json','utf8'));
const port=8875, base='http://127.0.0.1:'+port+'/';
const srv=spawn('python3',['-m','http.server',String(port),'--bind','127.0.0.1'],{stdio:'ignore'});
const findings=[], failures=[];
let browser;
const ping=()=>new Promise(done=>httpGet(base+'saek-course-01.html',r=>{r.resume();r.on('end',()=>done(r.statusCode===200));}).on('error',()=>done(false)));
try{
 let ready=false;
 for(let i=0;i<80;i++){if(await ping()){ready=true;break;}await new Promise(r=>setTimeout(r,150));}
 assert(ready,'Local source server did not start');
 browser=await chromium.launch({headless:true});
 for(const [device,opts] of [
   ['desktop',{viewport:{width:1440,height:900}}],
   ['mobile',{viewport:{width:390,height:844},isMobile:true,hasTouch:true}]
 ]){
  const context=await browser.newContext(opts);
  for(const course of registry.courses){
   const courseNo=String(course.course).padStart(2,'0');
   const url=base+'saek-course-'+courseNo+'.html';
   const page=await context.newPage();
   const item={device,course:course.course,expectedChapters:course.chapters.length,passed:false};
   try{
    await page.goto(url,{waitUntil:'domcontentloaded',timeout:30000});
    await page.waitForFunction(expected=>document.querySelectorAll('.reader-chapters > details.reader-fold .saek-source-section').length>=expected,course.chapters.length,{timeout:25000});
    const live=await page.evaluate(()=>{
      return Array.from(document.querySelectorAll('.reader-chapters > details.reader-fold')).map((ch,index)=>({
        chapter:index+1,
        id:ch.id,
        images:Array.from(ch.querySelectorAll('.saek-source-section img.saek-source-image')).map(img=>({
          path:new URL(img.src,location.href).pathname.replace(/^\/+/,''),
          alt:img.alt
        })),
        sectionCount:ch.querySelectorAll('.saek-source-section').length
      }));
    });
    assert.equal(live.length,course.chapters.length,courseNo+': chapter count');
    for(let i=0;i<course.chapters.length;i++){
     const expected=course.chapters[i].images.map(id=>registry.assets[id].localPath);
     const actual=live[i]?.images.map(x=>x.path)||[];
     assert.equal(live[i].id,'lesson-'+(i+1),courseNo+': chapter id '+(i+1));
     assert.equal(live[i].sectionCount,1,courseNo+': chapter image section '+(i+1));
     for(const sourcePath of expected){
       assert(actual.includes(sourcePath),courseNo+': chapter '+(i+1)+' missing '+sourcePath);
     }
     const extra=course.course===1&&(i===1||i===7)?1:0;
     assert.equal(actual.length,expected.length+extra,courseNo+': unexpected additional/duplicate image in lesson '+(i+1));
     assert(live[i].images.every(img=>img.alt?.trim().length>8),courseNo+': missing description at '+(i+1));
    }
    // Open the first chapter and verify that an image can actually load when
    // the learner sees the lesson (all other images are lazily loaded).
    const open=page.locator('#lesson-1');
    await open.evaluate(node=>{node.open=true;});
    const first=page.locator('#lesson-1 img.saek-source-image').first();
    await first.scrollIntoViewIfNeeded();
    await page.waitForFunction(()=>{const img=document.querySelector('#lesson-1 img.saek-source-image');return Boolean(img?.complete&&img.naturalWidth>0);},null,{timeout:16000});
    item.passed=true;
    item.verifiedChapterImages=live.reduce((n,ch)=>n+ch.images.length,0);
    console.log('PASS '+device+' course '+courseNo+' — '+live.length+' lessons; '+item.verifiedChapterImages+' images');
   }catch(e){
    item.error=String(e.stack||e).slice(0,950);
    failures.push(item);
    console.error('FAIL '+device+' course '+courseNo+' — '+String(e).slice(0,250));
   }finally{findings.push(item);await page.close();}
  }
  await context.close();
 }
}finally{
 try{await browser?.close();}catch{}
 srv.kill();
 mkdirSync('audit-results',{recursive:true});
 writeFileSync('audit-results/saek-lesson-image-browser.json',JSON.stringify({
   generatedAt:new Date().toISOString(),
   scope:'Actual 247 SAEK lesson HTML headings, asset URL and alt; Chromium mobile/desktop simulation only, not real iOS Safari, clinical or pedagogical certification',
   passed:findings.filter(x=>x.passed).length,total:findings.length,failures,results:findings
 },null,2)+'\n');
}
if(failures.length)process.exitCode=1;
