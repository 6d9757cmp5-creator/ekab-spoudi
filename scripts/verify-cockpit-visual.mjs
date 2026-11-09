/** Browser screenshots of the sole public ECG trainer after patient simulator retirement. */
import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
import {chromium} from 'playwright';
import {spawn} from 'node:child_process';
const port=8892,base='http://127.0.0.1:'+port;
const server=spawn('python3',['-m','http.server',String(port),'--bind','127.0.0.1'],{stdio:'ignore'});
mkdirSync('audit-results',{recursive:true});
let browser;
try{
 let ok=false;for(let i=0;i<80;i++){try{if((await fetch(base+'/mentor-ecg.html')).ok){ok=true;break;}}catch{}await new Promise(r=>setTimeout(r,250));}
 assert(ok,'ECG visual local server unavailable');
 browser=await chromium.launch({headless:true});
 const report=[];
 for(const [device,width,height] of [['mobile',390,844],['tablet',820,1180],['desktop',1440,900]]){
  const context=await browser.newContext({viewport:{width,height},isMobile:device==='mobile',hasTouch:device==='mobile',serviceWorkers:'block'});
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(String(e)));
  await page.goto(base+'/mentor-ecg.html',{waitUntil:'load'});
  await page.waitForFunction(()=>document.getElementById('ecg-curve')?.getAttribute('points')?.length>500);
  assert(await page.locator('#ecg-practice-curve').isVisible());
  assert(await page.locator('#ecg-rate').isVisible());
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth+3);
  assert(!overflow,device+' ECG has horizontal document overflow');
  assert.deepEqual(errors,[],device+' ECG page JS');
  const path='audit-results/ecg-visual-'+device+'-'+width+'x'+height+'.png';
  await page.screenshot({path,fullPage:true,animations:'disabled'});
  report.push({device,width,height,ecgVisible:true,overflow,jsErrors:errors,screenshot:path});
  console.log('PASS '+device+': ECG waveform, mobile-safe layout and QRS practice');
  await context.close();
 }
 writeFileSync('audit-results/ecg-visual-report.json',JSON.stringify({verified:report,clinicalValidity:'not evaluated'},null,2));
}finally{await browser?.close();server.kill();}
