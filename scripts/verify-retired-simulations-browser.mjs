/** Old simulator routes must reach the ECG with no patient engine at mobile/desktop. */
import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
import {chromium} from 'playwright';
import {spawn} from 'node:child_process';
const port=8893,base='http://127.0.0.1:'+port;
const legacy=['mentor-next.html','mentor-live.html','mentor-scenarios.html'];
mkdirSync('audit-results/retired-sim',{recursive:true});
const server=spawn('python3',['-m','http.server',String(port),'--bind','127.0.0.1'],{stdio:'ignore'});
let browser;
try{
 let ready=false;for(let i=0;i<75;i++){try{if((await fetch(base+'/mentor-ecg.html')).ok){ready=true;break;}}catch{}await new Promise(ok=>setTimeout(ok,200));}
 assert(ready,'ECG server not available');
 browser=await chromium.launch({headless:true});
 for(const [label,width,height] of [['phone',390,844],['desktop',1440,900]]){
  const page=await browser.newPage({viewport:{width,height},serviceWorkers:'block'});const errors=[];
  page.on('pageerror',e=>errors.push(String(e)));
  for(const route of legacy){
   const response=await page.goto(base+'/'+route,{waitUntil:'load'});
   assert(response?.ok(),route+' legacy HTTP');
   await page.waitForURL(/\/mentor-ecg\.html$/, {timeout:15000});
   await page.waitForFunction(()=>document.getElementById('ecg-curve')?.getAttribute('points')?.length>500);
   assert.equal(await page.locator('#next-canvas,#next-tool-panels,#sim-person-name').count(),0,'Patient simulator DOM must be gone');
   assert(await page.locator('#ecg-practice-choices button').count()>0);
  }
  await page.goto(base+'/paramedic.html',{waitUntil:'load'});
  assert(await page.locator('a[href="mentor-ecg.html"]').count()>=1);
  assert.equal(await page.locator('a[href="mentor-next.html"],a[href="mentor-live.html"],a[href="mentor-scenarios.html"]').count(),0);
  await page.screenshot({path:'audit-results/retired-sim/'+label+'-ecg-entry.png',fullPage:true,animations:'disabled'});
  assert.deepEqual(errors,[],'No errors on active ECG');
  console.log('PASS '+label+': retired URLs resolve to ECG, active hub has no simulator');
  await page.close();
 }
 writeFileSync('audit-results/retired-sim/report.json',JSON.stringify({legacy,ecg:'mentor-ecg.html',simulatorInactive:true,clinicalCertification:false},null,2));
}finally{await browser?.close();server.kill();}
