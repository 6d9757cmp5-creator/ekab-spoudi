/** Independent ECG Lab browser evidence; no coupling to retired patient simulator. */
import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
import {chromium} from 'playwright';
import {spawn} from 'node:child_process';
const port=8891,base='http://127.0.0.1:'+port;
const server=spawn('python3',['-m','http.server',String(port),'--bind','127.0.0.1'],{stdio:'ignore'});
const dir='audit-results/shared-ecg';mkdirSync(dir,{recursive:true});
let browser;
try{
 let ok=false;for(let i=0;i<75;i++){try{if((await fetch(base+'/mentor-ecg.html')).ok){ok=true;break;}}catch{}await new Promise(r=>setTimeout(r,250));}
 assert(ok,'Standalone ECG cannot load');
 browser=await chromium.launch({headless:true});
 const evidence=[];
 for(const [device,width,height,mobile] of [['mobile',390,844,true],['desktop',1440,900,false]]){
  const context=await browser.newContext({viewport:{width,height},isMobile:mobile,hasTouch:mobile,serviceWorkers:'block'});
  const page=await context.newPage(),errors=[];page.on('pageerror',error=>errors.push(String(error)));
  const res=await page.goto(base+'/mentor-ecg.html',{waitUntil:'load'});assert(res?.ok());
  await page.waitForFunction(()=>document.querySelector('#ecg-curve')?.getAttribute('points')?.split(' ').length>=400);
  const initial=await page.locator('#ecg-curve').getAttribute('points');
  await page.locator('[data-ecg-rate="115"]').click();
  assert.notEqual(initial,await page.locator('#ecg-curve').getAttribute('points'));
  await page.locator('#ecg-toggle-key').click();
  assert(await page.locator('#ecg-key').isVisible(),'PQRST explanation visible');
  await page.locator('#ecg-practice-choices button').first().click();
  assert.match(await page.locator('#ecg-practice-feedback').innerText(),/QRS/);
  assert(await page.locator('#ecg-practice-next').isVisible());
  await page.locator('#ecg-svg').screenshot({path:dir+'/'+device+'-ecg.png',animations:'disabled'});
  assert.deepEqual(errors,[],'ECG JS errors');
  evidence.push({device,standaloneEcg:'PASS',qrsPractice:'PASS',screenshots:true,realDevice:false,clinicalCertification:false});
  await context.close();
 }
 writeFileSync(dir+'/report.json',JSON.stringify({scope:'standalone ECG only',evidence},null,2));
 console.log('PASS standalone ECG, preserved practice and basic UI across mobile and desktop');
}finally{await browser?.close();server.kill();}
