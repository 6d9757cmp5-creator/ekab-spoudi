/**
 * Public learner smoke: retired patient simulator routes, intact ATLA learning,
 * independent ECG Lab and saved QRS exercise, tested at mobile/desktop widths.
 */
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {spawn} from 'node:child_process';
const port=8765,base='http://127.0.0.1:'+port;
const server=spawn(process.env.PYTHON_BIN||'python3',['-m','http.server',String(port),'--bind','127.0.0.1'],{stdio:'ignore'});
let browser;
try{
 let ready=false;
 for(let i=0;i<90;i++){
  try{const r=await fetch(base+'/index.html');if(r.ok){ready=true;break;}}catch{}
  await new Promise(r=>setTimeout(r,180));
 }
 assert(ready,'Local application unavailable');
 browser=await chromium.launch({headless:true});
 for(const [device,width,height,mobile] of [['mobile',390,844,true],['desktop',1440,900,false]]){
  const context=await browser.newContext({viewport:{width,height},isMobile:mobile,hasTouch:mobile,serviceWorkers:'block',acceptDownloads:true});
  const page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(String(e)));
  let r=await page.goto(base+'/index.html',{waitUntil:'domcontentloaded'});
  assert(r?.ok(),device+' home HTTP');
  assert(await page.locator('a[href="paramedic.html"]').count()>=1);
  r=await page.goto(base+'/paramedic.html',{waitUntil:'domcontentloaded'});
  assert(r?.ok(),device+' hub HTTP');
  assert(await page.locator('a[href="mentor-ecg.html"]').count()>=1);
  assert.equal(await page.locator('a[href="mentor-next.html"],a[href="mentor-live.html"],a[href="mentor-scenarios.html"]').count(),0,'Retired simulator is not in hub');
  r=await page.goto(base+'/mentor-lab.html',{waitUntil:'domcontentloaded'});
  assert(r?.ok(),device+' study page');
  assert(await page.locator('#mentor-personal').count()===1,'ATLA planner retained');
  assert.equal(await page.locator('#panel-mission,#module-mci,#module-equipment').count(),0,'Patient scenario panels must be retired');
  r=await page.goto(base+'/mentor-ecg.html',{waitUntil:'load'});
  assert(r?.ok(),device+' ECG HTTP');
  await page.waitForFunction(()=>document.getElementById('ecg-curve')?.getAttribute('points')?.split(' ').length>=400);
  const before=await page.locator('#ecg-curve').getAttribute('points');
  await page.locator('[data-ecg-rate="115"]').click();
  assert.notEqual(await page.locator('#ecg-curve').getAttribute('points'),before,'ECG rate must modify strip');
  assert.equal(await page.locator('#ecg-practice-choices button').count(),11,'QRS drill options must be interactive');
  await page.locator('#ecg-practice-choices button').first().click();
  assert.match(await page.locator('#ecg-practice-feedback').innerText(),/QRS/);
  assert(await page.locator('#ecg-practice-next').isVisible());
  const saved=await page.evaluate(()=>localStorage.getItem('ekab.mentor.ecg-practice.v1'));
  assert(saved&&saved.includes('answers'),'ECG progress saved under same canonical key');
  await page.reload({waitUntil:'domcontentloaded'});
  assert.equal(await page.evaluate(()=>localStorage.getItem('ekab.mentor.ecg-practice.v1')),saved,'No progress loss on reload');
  for(const [legacy,destination] of [['mentor-next.html','mentor-ecg.html'],['mentor-live.html','mentor-ecg.html'],['mentor-scenarios.html','mentor-ecg.html'],['mentor-protocol-suite.html','protocols.html']]){
   const response=await page.request.get(base+'/'+legacy);
   assert(response.ok(),legacy+' legacy URL must remain reachable');
   const html=await response.text();
   assert(html.includes('url='+destination),legacy+' must point to active educational page');
   assert(!html.includes('tools/patient-simulator/app/'),legacy+' must not load retired engine');
  }
  assert.deepEqual(errors,[],device+' active pages must not throw JavaScript exceptions');
  console.log('PASS '+device+': ATLA study/planner, independent ECG, rate changes, saved QRS progress, retired simulator URLs');
  await context.close();
 }
}finally{await browser?.close();server.kill();}
