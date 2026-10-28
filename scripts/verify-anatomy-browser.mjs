import {chromium,webkit} from 'playwright';
import {spawn} from 'node:child_process';
import {mkdirSync,writeFileSync} from 'node:fs';
const engine=process.env.ANATOMY_ENGINE||'chromium',base='http://127.0.0.1:8765/';
mkdirSync('browser-qa-results',{recursive:true});
const server=spawn('python3',['-m','http.server','8765','--bind','127.0.0.1'],{stdio:'ignore'});
let browser,page,results=[],errors=[],expectedLocalOriginErrors=[];
const check=async(label,fn)=>{try{const note=await fn();results.push({label,ok:true,note});console.log('PASS '+label)}catch(e){results.push({label,ok:false,error:String(e)});console.error('FAIL '+label,e);try{await page.screenshot({path:'browser-qa-results/'+engine+'-'+results.length+'.png',fullPage:true})}catch{}}};
const ensure=(x,msg)=>{if(!x)throw Error(msg)};
try{
 for(let i=0;i<100;i++){try{if((await fetch(base)).ok)break}catch{}await new Promise(r=>setTimeout(r,150))}
 browser=await (engine==='webkit'?webkit:chromium).launch({headless:true,args:engine==='chromium'?['--use-gl=angle','--use-angle=swiftshader','--enable-webgl','--ignore-gpu-blocklist']:[]});
 const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:1,isMobile:true,hasTouch:true,serviceWorkers:'block'});
 page=await context.newPage();
 page.on('pageerror',err=>{const event={url:page.url(),error:String(err)};if(event.error.includes('fra.cloud.appwrite.io/v1/ping')&&event.error.includes('access control'))expectedLocalOriginErrors.push(event);else errors.push(event);});
 page.setDefaultTimeout(15000);
 await check('Homepage has one 3D entry and four main topics',async()=>{
   const r=await page.goto(base+'index.html',{waitUntil:'domcontentloaded'});
   ensure(r?.ok(),'homepage HTTP '+r?.status());
   ensure(await page.locator('a.home-anatomy-single').count()===1,'3D card count not one');
   for(const url of ['saek.html','eoppep.html','farmaka.html','seminar-prep.html'])ensure(await page.locator('a[href="'+url+'"]').count()>=1,'missing '+url);
 });
 await check('SAEK chapter 8 opens precise 3D skull link',async()=>{
   await page.goto(base+'saek-course-01.html',{waitUntil:'domcontentloaded'});
   const ch=page.locator('#lesson-8');ensure(await ch.count()===1,'chapter 8 missing');
   await ch.evaluate(x=>{x.open=true});
   const links=ch.locator('a.saek-anatomy-link');ensure(await links.count()>=2,'missing anatomy links');
   const url=await links.first().getAttribute('href');ensure(url.includes('focus=skull')&&url.includes('chapter=8'),'wrong 3D focus '+url);
 });
 await check('Real 3D atlas loads with WebGL canvas and chapter return',async()=>{
   const r=await page.goto(base+'ui-tools/anatomy-3d/index.html?mode=skeleton&system=skeletal&focus=skull&from=01&chapter=8',{waitUntil:'domcontentloaded'});
   ensure(r?.ok(),'3D page HTTP '+r?.status());
   await page.waitForFunction(()=>document.querySelector('#renderMount canvas')||!document.querySelector('#errorBox').hidden,undefined,{timeout:90000});
   ensure(await page.locator('#errorBox').isHidden(),await page.locator('#errorBox').innerText());
   await page.waitForFunction(()=>document.querySelector('#loading').hidden||!document.querySelector('#errorBox').hidden,undefined,{timeout:170000});
   ensure(await page.locator('#errorBox').isHidden(),await page.locator('#errorBox').innerText());
   ensure(await page.locator('#loading').isHidden(),'infinite model loading');
   ensure(await page.locator('#chapterReturn').isVisible(),'back-to-chapter hidden');
   ensure(await page.locator('#anatomyList button').count()>0,'no Greek anatomical names');
 });
 await check('Viewer: skeleton, organs and combined buttons',async()=>{
   for(const mode of ['organs','both','skeleton']){
     const b=page.locator('[data-mode="'+mode+'"]');await b.click();
     ensure(await b.getAttribute('aria-pressed')==='true','mode not pressed '+mode);
   }
 });
 await check('Isolate disabled without selection; system change clears old highlight',async()=>{
   const iso=page.locator('#isolateBtn');
   ensure(await iso.isDisabled(),'isolate enabled without selected anatomy');
   const first=page.locator('#anatomyList button').first();
   ensure(await first.count()===1,'no Greek anatomy point available for selection');
   await first.click();
   ensure(await iso.isEnabled(),'isolate remained disabled after selecting a point');
   await page.locator('#systemFilter').selectOption('cardiac');
   ensure(await iso.isDisabled(),'isolation remained enabled on cleared selection');
   ensure(await page.locator('[data-mode="organs"]').getAttribute('aria-pressed')==='true','cardiac system did not enable organs view');
   ensure((await page.locator('#modelTag').innerText()).includes('ΚΑΡΔΙΑ'),'model heading does not match cardiac filter');
   await page.locator('#systemFilter').selectOption('skeletal');
   ensure(await page.locator('[data-mode="skeleton"]').getAttribute('aria-pressed')==='true','skeletal filter did not enable skeleton view');
 });
 await check('Anatomy quiz: four unique choices, answer and next',async()=>{
   await page.locator('#quizTab').click();await page.locator('#quizStart').click();
   const buttons=page.locator('#quizOptions button');
   await buttons.first().waitFor({state:'visible',timeout:15000});
   ensure(await buttons.count()===4,'not 4 choices');
   ensure(new Set(await buttons.allInnerTexts()).size===4,'duplicate quiz answers');
   await buttons.first().click();
   ensure((await page.locator('#quizAttempts').innerText()).trim()==='1','attempts did not increase');
   ensure(await page.locator('#quizNext').isVisible(),'no next button');
   await page.locator('#quizNext').click();ensure(await buttons.count()===4,'next question unavailable');
 });
 await check('Female anatomy loads after switching',async()=>{
   await page.locator('[data-sex="female"]').click();
   await page.waitForFunction(()=>document.querySelector('#loading').hidden||!document.querySelector('#errorBox').hidden,undefined,{timeout:170000});
   ensure(await page.locator('#errorBox').isHidden(),await page.locator('#errorBox').innerText());
   ensure((await page.locator('#modelTag').innerText()).includes('ΓΥΝΑΙΚΕΙΟ'),'female not active');
 });
 await check('Main learning pages render without empty body',async()=>{
   for(const url of ['saek.html','eoppep.html','farmaka.html','seminar-prep.html']){
     const r=await page.goto(base+url,{waitUntil:'domcontentloaded'});
     ensure(r?.ok(),url+' HTTP '+r?.status());
     ensure((await page.locator('body').innerText()).trim().length>80,url+' empty');
   }
 });
}finally{
 try{await page?.screenshot({path:'browser-qa-results/'+engine+'-last.png',fullPage:true})}catch{}
 await browser?.close().catch(()=>{});
 server.kill();
 writeFileSync('browser-qa-results/'+engine+'-report.json',JSON.stringify({engine,results,errors,expectedLocalOriginErrors},null,2));
}
console.log('QA: '+results.filter(x=>x.ok).length+'/'+results.length+' browser journeys passed; page errors '+errors.length);
for(const x of errors.slice(0,5))console.error('JS error',x);
console.log('Expected localhost-only Appwrite ping CORS notes: '+expectedLocalOriginErrors.length);if(errors.length)console.error('Unexpected browser JS errors: '+errors.length);
if(results.some(x=>!x.ok)||errors.length)process.exitCode=1;
