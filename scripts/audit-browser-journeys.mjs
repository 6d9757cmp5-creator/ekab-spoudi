/* Isolated mobile + desktop browser regression before any repository cleanup.
 * No production credentials; data is written only in temporary browser contexts.
 * Complements, but cannot certify, the complete set of possible user actions.
 */
import {chromium} from 'playwright';
import {spawn} from 'node:child_process';
import {get as nodeHttpGet} from 'node:http';
import {readdirSync,mkdirSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import assert from 'node:assert/strict';

const port=8766,base='http://127.0.0.1:'+port+'/';
const server=spawn('python3',['-m','http.server',String(port),'--bind','127.0.0.1'],{stdio:'ignore'});
const outcomes=[],errors=[];
function httpStatus(path){
 return new Promise((resolve,reject)=>{
  const req=nodeHttpGet(base+path,response=>{response.resume();response.once('end',()=>resolve(response.statusCode));response.once('error',reject);});
  req.once('error',reject);
 });
}
function allHtml(dir='.',prefix=''){
 const found=[];
 for(const ent of readdirSync(dir,{withFileTypes:true})){
  if(['node_modules','.git','audit-results','browser-qa-results'].includes(ent.name))continue;
  const name=prefix+ent.name;
  if(ent.isDirectory())found.push(...allHtml(join(dir,ent.name),name+'/'));
  else if(ent.isFile()&&ent.name.endsWith('.html'))found.push(name);
 }
 return found;
}
let browser;
async function check(name,fn){
 try{await fn();outcomes.push({name,ok:true});console.log('PASS '+name)}
 catch(e){const message=String(e.stack||e);errors.push({name,message:message.slice(0,2000)});outcomes.push({name,ok:false});console.error('FAIL '+name+': '+message.slice(0,700));}
}
const devices=[
 {name:'mobile',viewport:{width:390,height:844},isMobile:true,hasTouch:true},
 {name:'desktop',viewport:{width:1440,height:900},isMobile:false,hasTouch:false}
];
try{
 let ready=false;
 for(let i=0;i<80;i++){try{if((await httpStatus('index.html'))===200){ready=true;break}}catch{}await new Promise(ok=>setTimeout(ok,150));}
 assert(ready,'Local test server failed');
 browser=await chromium.launch({headless:true,args:['--use-gl=angle','--use-angle=swiftshader']});
 const pages=allHtml();
 await check('All '+pages.length+' HTML routes return HTTP 200',async()=>{
   assert.equal(pages.length,60,'HTML page count unexpectedly changed; inspect before cleanup');
   for(let i=0;i<pages.length;i+=12){
     const batch=await Promise.all(pages.slice(i,i+12).map(async path=>{
       const status=await httpStatus(path);
       return {path,status,ok:status===200};
     }));
     for(const r of batch)assert(r.ok,r.path+' returns '+r.status);
   }
 });
 for(const device of devices){
  const ctx=await browser.newContext({viewport:device.viewport,isMobile:device.isMobile,hasTouch:device.hasTouch,serviceWorkers:'block',acceptDownloads:true,reducedMotion:'reduce'});
  const page=await ctx.newPage();
  page.setDefaultTimeout(13000);
  const open=async path=>{const r=await page.goto(base+path,{waitUntil:'domcontentloaded',timeout:45000});assert(r?.ok(),'Unable to load '+path);};
  await check(device.name+' home theme and primary navigation',async()=>{
   await open('index.html');
   for(const path of ['saek.html','eoppep.html','farmaka.html','seminar-prep.html','protocols.html','mentor-lab.html'])assert(await page.locator('a[href="'+path+'"]').count()>0,'Missing home link '+path);
   const toggle=page.locator('#themeToggle');
   await toggle.click();
   assert.equal(await toggle.getAttribute('aria-pressed'),'true','Dark theme did not switch on');
   await toggle.click();
   assert.equal(await toggle.getAttribute('aria-pressed'),'false','Dark theme did not switch off');
  });
  await check(device.name+' SAEK all-semesters and tabs',async()=>{
   await open('saek.html');
   assert.equal(await page.locator('[data-semester-tab]').count(),4);
   await page.locator('[data-semester-tab]').nth(1).click();
   assert.equal(await page.locator('[data-semester-tab]').nth(1).getAttribute('aria-pressed'),'true');
   await page.locator('#saekAllCoursesToggle').click();
   assert.equal(await page.locator('#saekAllCoursesToggle').getAttribute('aria-pressed'),'true');
  });
  await check(device.name+' SAEK chapter marking/undo and persistence',async()=>{
   await open('saek-course-01.html');
   const btn=page.locator('.read-button[data-lesson]').first();
   assert(await btn.count()>0,'Missing read buttons');
   await btn.click();
   assert.equal(await btn.getAttribute('aria-pressed'),'true');
   assert.equal(await page.evaluate(()=>localStorage.getItem('ekab.saek.read.v1.01.1')),'1');
   await page.reload({waitUntil:'domcontentloaded'});
   assert.equal(await page.locator('.read-button[data-lesson]').first().getAttribute('aria-pressed'),'true');
   await page.locator('.read-button[data-lesson]').first().click();
   assert.equal(await page.evaluate(()=>localStorage.getItem('ekab.saek.read.v1.01.1')),null);
  });
  await check(device.name+' EOPPEP group navigation',async()=>{
   await open('eoppep.html');
   await page.locator('[data-eop-group="B"]').click();
   assert.equal(await page.locator('[data-eop-group="B"]').getAttribute('aria-pressed'),'true');
   assert((await page.locator('#eopRead').getAttribute('href')).includes('group=B'));
  });
  await check(device.name+' EOPPEP reader catalogue and filters',async()=>{
   await open('theory.html?view=catalog');
   await page.waitForFunction(()=>document.querySelectorAll('.all-question-item').length>100,null,{timeout:22000});
   await page.locator('#catalogSearch').fill('πρότασηαδύνατον000');
   assert((await page.locator('#catalogResultInfo').textContent()).includes('Δεν βρέθηκε'));
   await page.locator('#catalogSearch').fill('');
   await page.locator('#allQuestionsList .all-question-item').first().click();
   assert(await page.locator('#catalogReaderContent').isVisible(),'Reader not opened');
   const readBtn=page.locator('#catalogReaderMarkRead');
   await readBtn.click();
   assert.equal(await readBtn.getAttribute('aria-pressed'),'true');
   await readBtn.click();
   assert.equal(await readBtn.getAttribute('aria-pressed'),'false');
  });
  await check(device.name+' Pharmacology filters and results',async()=>{
   await open('farmaka.html');
   const results=page.locator('#drugResults');
   await page.waitForFunction(()=>document.querySelector('#drugResults')?.textContent?.length>0);
   await page.locator('#drugSearch').fill('zzzz-no-drug-123');
   assert((await results.textContent()).includes('Δεν βρέθηκαν φάρμακα'));
   await page.locator('#drugSearch').fill('');
   assert((await page.locator('#resultCount').textContent()).includes('καρτέλες'));
  });
  await check(device.name+' Seminar cards, theory, quiz and back',async()=>{
   await open('seminar-prep.html');
   await page.waitForFunction(()=>document.querySelectorAll('#seminarCards .seminar-start').length===5);
   await page.locator('#seminarCards .seminar-start').first().click();
   assert(await page.locator('#seminarCourse').isVisible());
   await page.locator('#seminarMarkStudied').click();
   await page.locator('[data-seminar-tab="quiz"]').click();
   assert(await page.locator('#seminarQuiz').isVisible());
   await page.locator('[data-seminar-tab="oral"]').click();
   assert(await page.locator('#seminarOral').isVisible());
   await page.locator('#seminarBack').click();
   assert(await page.locator('#seminarHome').isVisible());
  });
  await check(device.name+' SAEK exam start and save/resume',async()=>{
   await open('saek-exams.html');
   await page.waitForFunction(()=>!document.getElementById('examStart')?.disabled,null,{timeout:22000});
   await page.locator('#examStart').click();
   assert(await page.locator('#examLive').isVisible(),'Exam did not start');
   await page.locator('#examLeave').click();
   assert(await page.locator('#examSetup').isVisible(),'Exam did not save and exit');
   assert(await page.locator('#examResume').isVisible(),'Resume is absent');
  });
  await ctx.close();
 }
}finally{
 try{await browser?.close()}catch{}
 server.kill();
 mkdirSync('audit-results',{recursive:true});
 writeFileSync('audit-results/browser-journeys.json',JSON.stringify({checkedAt:new Date().toISOString(),checks:outcomes,failures:errors},null,2));
}
console.log('Browser audit: '+outcomes.filter(x=>x.ok).length+'/'+outcomes.length+' passed');
if(errors.length)process.exitCode=1;
