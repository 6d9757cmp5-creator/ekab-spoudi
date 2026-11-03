import {chromium} from 'playwright';
import {spawn} from 'node:child_process';
import {mkdirSync} from 'node:fs';
import assert from 'node:assert/strict';
const server=spawn('python3',['-m','http.server','8893','--bind','127.0.0.1'],{stdio:'ignore'});
mkdirSync('browser-qa-results',{recursive:true});
let browser;const errors=[],requests=[];
try{
 let ready=false;
 for(let i=0;i<75;i++){try{if((await fetch('http://127.0.0.1:8893/')).ok){ready=true;break}}catch{}await new Promise(r=>setTimeout(r,180))}
 if(!ready)throw Error('Local server not started');
 browser=await chromium.launch({headless:true,args:['--use-gl=angle','--use-angle=swiftshader','--enable-webgl','--no-sandbox']});
 const page=await browser.newPage({viewport:{width:1280,height:830}});
 page.on('pageerror',e=>errors.push(e.message));
 page.on('console',m=>{
  const msg=m.text();
  // Chromium's software-GPU runner emits this known non-app warning; it does
  // not indicate a WebGL or patient-render failure. Keep all app errors.
  const runnerWarning=/Automatic fallback to software WebGL has been deprecated/.test(msg);
  if(m.type()==='error'||(m.type()==='warning'&&!runnerWarning))
   errors.push('console: '+msg);
 });
 page.on('requestfailed',req=>requests.push(req.url()+' '+req.failure()?.errorText));
 await page.goto('http://127.0.0.1:8893/mentor-next.html',{waitUntil:'domcontentloaded'});
 await page.locator('#next-rigged-toggle').waitFor();
 // The Cockpit starts the static 2-person WebGL scene automatically on load.
 // Wait for it to finish before switching to the rigged actor; otherwise the
 // initial loading state used to silently ignore a user click.
 try {
  await page.waitForFunction(()=>{
   const canvas=document.querySelector('#next-unified-host .next-unified-canvas');
   const toggle=document.querySelector('#next-rigged-toggle');
   return canvas?.dataset.stageStatus==='ready'&&toggle&&!toggle.disabled;
  },null,{timeout:45000});
 }catch(error){
  const state=await page.evaluate(()=>({
   readyButton:document.querySelector('#next-ready-toggle')?.outerHTML?.slice(0,400),
   riggedToggle:document.querySelector('#next-rigged-toggle')?.outerHTML?.slice(0,400),
   unifiedCanvas:[...document.querySelectorAll('#next-unified-host canvas')].map(n=>({name:n.className,data:{...n.dataset}})),
   overlayHidden:document.querySelector('#next-unified-overlay')?.hidden,
   unifiedStatus:document.querySelector('#next-unified-status')?.textContent,
   fallbackMessage:document.querySelector('#next-result')?.textContent?.slice(0,400),
   modelStatus:document.querySelector('#next-mesh-status')?.textContent
  }));
  await page.screenshot({path:'browser-qa-results/atla-cockpit-rigged-debug.png',fullPage:true});
  throw Error('INITIAL_STAGE_DIAGNOSTICS '+JSON.stringify({state,errors:errors.slice(-15),requests:requests.slice(-15)}).slice(0,5000)+' '+String(error));
 }
 assert.equal(await page.locator('#next-rigged-toggle').getAttribute('aria-pressed'),'false');
 // This user choice must not change patient vitals or recorded educational session.
 const original=await page.locator('#next-hr').textContent();
 await page.locator('#next-rigged-toggle').click();
 try {
  await page.waitForFunction(()=>{
   const canvas=document.querySelector('#next-unified-host .next-unified-canvas');
   return canvas?.dataset.stageStatus==='ready'&&canvas.dataset.riggedModel==='ready'&&Number(canvas.dataset.riggedClips)>=2;
  },null,{timeout:35000});
 }catch(error){
  const state=await page.evaluate(()=>({
   unifiedCanvas:[...document.querySelectorAll('#next-unified-host canvas')].map(x=>({className:x.className,data:{...x.dataset}})),
   overlayHidden:document.querySelector('#next-unified-overlay')?.hidden,
   unifiedStatus:document.querySelector('#next-unified-status')?.textContent,
   result:document.querySelector('#next-result')?.textContent?.slice(0,450),
   toggle:document.querySelector('#next-rigged-toggle')?.outerHTML?.slice(0,380),
   stageText:document.querySelector('#next-mesh-status')?.textContent
  }));
  await page.screenshot({path:'browser-qa-results/atla-cockpit-rigged-debug.png',fullPage:true});
  throw Error('RIGGED_STAGE_DIAGNOSTICS '+JSON.stringify({state,errors:errors.slice(-15),requests:requests.slice(-15)}).slice(0,5000)+' '+String(error));
 }
 assert.equal(await page.locator('#next-unified-overlay').isVisible(),true);
 assert.equal(await page.locator('#next-hr').textContent(),original);
 assert.equal(await page.locator('#next-rigged-toggle').getAttribute('aria-pressed'),'true');
 await page.screenshot({path:'browser-qa-results/atla-cockpit-rigged-live.png',fullPage:true});
 console.log('PASS real MakeHuman 163 bone rig and 2 motion clips in live 2-patient scene');
 // Return to the fully validated CC0 static patient scene without losing state.
 await page.locator('#next-rigged-toggle').click();
 await page.waitForFunction(()=>{
  const canvas=document.querySelector('#next-unified-host .next-unified-canvas');
  return canvas?.dataset.stageStatus==='ready'&&canvas.dataset.riggedModel==='off';
 },null,{timeout:120000});
 assert.equal(await page.locator('#next-rigged-toggle').getAttribute('aria-pressed'),'false');
 assert.equal(await page.locator('#next-hr').textContent(),original);
 assert.equal(errors.length,0,errors.slice(0,3).join(' | '));
 console.log('PASS reversible rigged/standard patient scene toggle with no change to vitals');
}finally{await browser?.close();server.kill('SIGTERM')}
