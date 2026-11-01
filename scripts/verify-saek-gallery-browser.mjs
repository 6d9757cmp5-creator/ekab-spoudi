/* SAEK educational image gallery: actual Chromium interaction checks, not scientific review. */
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import {get as getHttp} from 'node:http';
import {mkdirSync,writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const port=8874,base='http://127.0.0.1:'+port+'/';
const server=spawn('python3',['-m','http.server',String(port),'--bind','127.0.0.1'],{stdio:'ignore'});
let browser;
const results=[],failures=[];
async function check(label,fn){
 try{await fn();results.push({label,ok:true});console.log('PASS '+label)}
 catch(error){failures.push({label,message:String(error.stack||error).slice(0,1300)});results.push({label,ok:false});console.error('FAIL '+label,String(error).slice(0,320))}
}
function ping(){
 return new Promise((done)=>{
  getHttp(base+'saek-images.html',r=>{r.resume();r.on('end',()=>done(r.statusCode===200))}).on('error',()=>done(false));
 });
}
try{
 let ready=false;
 for(let t=0;t<75;t++){if(await ping()){ready=true;break}await new Promise(done=>setTimeout(done,150));}
 assert(ready,'Local test server unavailable');
 browser=await chromium.launch({headless:true});
 for(const [device,context] of [
  ['mobile',{viewport:{width:390,height:844},isMobile:true,hasTouch:true}],
  ['desktop',{viewport:{width:1440,height:900}}]
 ]){
  const ctx=await browser.newContext(context),page=await ctx.newPage();
  const issues=[];
  page.on('pageerror',e=>issues.push(String(e)));
  await check(device+' gallery loads 247 chapter placements',async()=>{
   await page.goto(base+'saek-images.html',{waitUntil:'domcontentloaded'});
   await page.waitForFunction(()=>!document.querySelector('#imageStatus')?.textContent.includes('Φόρτωση'),null,{timeout:25000});
   const registry=await page.evaluate(async()=>await (await fetch('saek-image-audit-2026.json')).json());
   const count=registry.courses.reduce((sum,c)=>sum+c.chapters.reduce((n,ch)=>n+(ch.images||[]).length,0),0);
   const status=await page.locator('#imageStatus').textContent();
   assert(status.includes('από '+count+' τοποθετήσεις'),'Wrong placement count: '+status);
   assert.equal(await page.locator('#imageGalleryGrid article').count(),Math.min(24,count));
   assert(await page.locator('#imageRetry').isHidden());
   assert((await page.locator('#imageGalleryGrid img').first().getAttribute('alt')).trim().length>2);
  });
  await check(device+' images, filters and safe reuse',async()=>{
   await page.locator('#imageMore').click();
   assert.equal(await page.locator('#imageGalleryGrid article').count(),48);
   await page.locator('#imageSemester').selectOption('Δ');
   assert((await page.locator('#imageStatus').textContent()).includes('τοποθετήσεις'));
   await page.locator('#imageCourse').selectOption('19');
   assert((await page.locator('#imageGalleryGrid article').count())>0);
   const title=await page.locator('#imageGalleryGrid article').first().textContent();
   assert(title.includes('Διακομιδές Ασθενών'));
   await page.locator('#imageCourse').selectOption('all');
   await page.locator('#imageSemester').selectOption('all');
  });
  await check(device+' image zoom and return to lesson',async()=>{
   const trigger=page.locator('#imageGalleryGrid .saek-gallery-image-button').first();
   await trigger.click();
   assert(await page.locator('#imageLightbox').isVisible());
   const link=await page.locator('#imageChapterLink').getAttribute('href');
   assert(/^saek-course-\d{2}\.html#lesson-\d+$/.test(link),'Invalid lesson link: '+link);
   await page.locator('#imageClose').click();
   assert(await page.locator('#imageLightbox').isHidden());
  });
  await check(device+' no uncaught gallery errors',async()=>assert.deepEqual(issues,[]));
  await ctx.close();
 }
}finally{
 try{await browser?.close()}catch{}
 server.kill();
 mkdirSync('audit-results',{recursive:true});
 writeFileSync('audit-results/saek-gallery-browser.json',JSON.stringify({checkedAt:new Date().toISOString(),checks:results,failures,scope:'Local Chromium mobile/desktop, not physical Safari, offline or independent clinical approval'},null,2));
}
if(failures.length)process.exitCode=1;
