/**
 * Browser integration: ATLA study, SAEK chapter recall, ECG Lab and retired
 * patient-simulator URLs. No simulated patient engine is allowed to load.
 */
import {chromium} from 'playwright';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,sep,extname} from 'node:path';
import assert from 'node:assert/strict';
const root=resolve('.');
const types={'.html':'text/html; charset=utf-8','.js':'application/javascript; charset=utf-8',
 '.mjs':'application/javascript; charset=utf-8','.css':'text/css; charset=utf-8',
 '.json':'application/json; charset=utf-8','.webp':'image/webp'};
const server=createServer(async(req,res)=>{
 try{
  const path=resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname));
  if(path!==root&&!path.startsWith(root+sep)){res.writeHead(403);res.end();return;}
  const body=await readFile(path);
  res.writeHead(200,{'Content-Type':types[extname(path)]||'application/octet-stream'});
  res.end(body);
 }catch{res.writeHead(404);res.end('Not found');}
});
await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
const base='http://127.0.0.1:'+server.address().port+'/';
let browser;
try{
 browser=await chromium.launch({headless:true});
 const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,serviceWorkers:'block'});
 const page=await context.newPage(),errors=[],missing=[],requests=[];
 page.on('pageerror',err=>errors.push(page.url()+': '+err.message));
 page.on('request',req=>requests.push(new URL(req.url()).pathname));
 page.on('response',res=>{if(res.status()>=400 && new URL(res.url()).origin===new URL(base).origin)missing.push(res.status()+' '+res.url());});
 await page.goto(base+'mentor-lab.html',{waitUntil:'domcontentloaded'});
 await page.locator('#mentor-personal-form').waitFor({state:'attached',timeout:20000});
 await page.locator('#mentor-personal-open').waitFor({state:'attached'});
 assert(await page.locator('a[href="mentor-ecg.html"]').count()>0);
 assert.equal(await page.locator('a[href="mentor-next.html"],a[href="mentor-live.html"],a[href="mentor-scenarios.html"]').count(),0);
 assert(requests.includes('/mentor/app/adaptive.js'));
 assert(requests.includes('/mentor/app/personal-v1.js'));
 assert(requests.includes('/atla/assistant.mjs'));
 assert(!requests.includes('/mentor/app/lab.js'),'Retired mission renderer must not load');
 await page.goto(base+'paramedic.html',{waitUntil:'domcontentloaded'});
 await page.locator('.atla-launcher').waitFor({state:'visible',timeout:15000});
 await page.locator('.atla-launcher').click();
 assert(await page.locator('.atla-panel').isVisible(),'ATLA assistant remains operational');
 await page.locator('.atla-close').click();
 assert(!await page.locator('.atla-panel').isVisible());
 await page.goto(base+'mentor-ecg.html',{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>document.querySelector('#ecg-curve')?.getAttribute('points')?.split(' ').length>400,null,{timeout:20000});
 const before=await page.locator('#ecg-curve').getAttribute('points');
 await page.locator('[data-ecg-rate="115"]').click();
 const after=await page.locator('#ecg-curve').getAttribute('points');
 assert.notEqual(before,after,'ECG waveform rate control works');
 assert(await page.locator('#ecg-practice-choices button').count()>0,'ECG training exercise is available');
 await page.goto(base+'saek-course-01.html#lesson-1',{waitUntil:'domcontentloaded'});
 await page.locator('#lesson-1').evaluate(el=>{el.open=true;});
 await page.locator('#lesson-1 .atlas-chapter-practice summary').waitFor({state:'attached',timeout:25000});
 await page.locator('#lesson-1 .atlas-chapter-practice summary').click();
 await page.locator('#lesson-1 .atlas-practice-answer').fill('Γραπτή επανάληψη της ανατομίας.');
 await page.locator('#lesson-1 .atlas-practice-btn').click();
 assert(await page.locator('#lesson-1 .atlas-practice-reference').isVisible());
 assert.equal(await page.locator('#lesson-1 .atlas-practice-cockpit').count(),0);
 for(const old of ['mentor-next.html','mentor-live.html','mentor-scenarios.html']){
  await page.goto(base+old,{waitUntil:'domcontentloaded'});
  await page.waitForURL(/mentor-ecg\.html$/,{timeout:15000});
  assert.equal(await page.locator('#next-rigged-toggle, #next-case-library, .live-patient').count(),0);
 }
 const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2);
 assert.equal(overflow,false,'ECG layout must not overflow a mobile viewport');
 assert.deepEqual(errors,[],errors.join(' | '));
 assert.deepEqual(missing,[],missing.join(' | '));
 assert(!requests.some(path=>path.includes('/tools/patient-simulator/')||/\/mentor\/app\/live\.js$/.test(path)),'No retired patient assets downloaded');
 console.log('PASS independent ATLA+SAEK+ECG mobile browser and safe legacy redirects');
 await context.close();
}finally{await browser?.close();await new Promise(ok=>server.close(ok));}
