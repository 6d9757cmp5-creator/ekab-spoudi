import {chromium} from 'playwright';
import {spawn} from 'node:child_process';
import {mkdirSync} from 'node:fs';
import assert from 'node:assert/strict';
mkdirSync('browser-qa-results',{recursive:true});
const server=spawn('python3',['-m','http.server','8894','--bind','127.0.0.1'],{stdio:'ignore'});
let browser;
const errors=[];
try {
 let ready=false;
 for(let i=0;i<100;i++){try{if((await fetch('http://127.0.0.1:8894/')).ok){ready=true;break}}catch{}await new Promise(r=>setTimeout(r,180))}
 if(!ready)throw Error('Local server unavailable');
 browser=await chromium.launch({headless:true,args:['--use-gl=angle','--use-angle=swiftshader','--enable-webgl','--no-sandbox']});
 const page=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true});
 page.on('pageerror',e=>errors.push('pageerror: '+e.message));
 page.on('requestfailed',r=>errors.push('network: '+r.url()+' '+r.failure()?.errorText));
 await page.goto('http://127.0.0.1:8894/mentor-next.html',{waitUntil:'domcontentloaded'});
 const stage=()=>page.locator('#next-unified-host .next-unified-canvas');
 const button=page.locator('#next-rigged-toggle');
 await button.waitFor();
 await page.waitForFunction(()=>{
  const c=document.querySelector('#next-unified-host .next-unified-canvas');
  const b=document.querySelector('#next-rigged-toggle');
  return c?.dataset.stageStatus==='ready'&&b&&!b.disabled;
 },null,{timeout:60000});
 assert.equal(await button.getAttribute('aria-pressed'),'false');
 const before=await page.locator('#next-hr').textContent();
 await button.scrollIntoViewIfNeeded();
 await button.click();
 try{
  await page.waitForFunction(()=>{
   const c=document.querySelector('#next-unified-host .next-unified-canvas');
   return c?.dataset.stageStatus==='ready'&&c?.dataset.riggedModel==='ready'&&Number(c.dataset.riggedClips)>=2;
  },null,{timeout:50000});
 }catch(e){
  const state=await page.evaluate(()=>({
   canvas:document.querySelector('#next-unified-host .next-unified-canvas')?.dataset,
   toggle:document.querySelector('#next-rigged-toggle')?.outerHTML?.slice(0,400),
   status:document.querySelector('#next-unified-status')?.textContent,
   result:document.querySelector('#next-result')?.textContent?.slice(0,400)
  }));
  await page.screenshot({path:'browser-qa-results/atla-rigged-mobile-failed.png',fullPage:true});
  throw Error('Mobile avatar failed '+JSON.stringify({state,errors}).slice(0,2200)+' '+String(e));
 }
 assert.equal(await button.getAttribute('aria-pressed'),'true');
 assert.equal(await page.locator('#next-hr').textContent(),before);
 assert.equal(await page.locator('#next-unified-overlay').isVisible(),true);
 await page.screenshot({path:'browser-qa-results/atla-rigged-mobile-ready.png',fullPage:true});
 await button.click();
 await page.waitForFunction(()=>document.querySelector('#next-unified-host .next-unified-canvas')?.dataset.riggedModel==='off',null,{timeout:50000});
 assert.equal(await button.getAttribute('aria-pressed'),'false');
 assert.equal(await page.locator('#next-hr').textContent(),before);
 assert.deepEqual(errors,[]);
 console.log('PASS mobile 390x844 rigged 163-bone MakeHuman GLB + 2 clips + reversible toggle and unchanged vitals');
} finally {
 await browser?.close();
 server.kill('SIGTERM');
}
