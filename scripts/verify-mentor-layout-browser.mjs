/**
 * Real Chromium smoke for grouped Mentor code. Checks old public URLs,
 * new centralized scripts and CSS, and the rendered ATLA home plus legacy training cockpit.
 */
import {chromium} from 'playwright';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,sep,extname} from 'node:path';
import assert from 'node:assert/strict';

const root=resolve('.');
const types={'.html':'text/html; charset=utf-8','.js':'application/javascript; charset=utf-8',
 '.mjs':'application/javascript; charset=utf-8','.css':'text/css; charset=utf-8',
 '.json':'application/json','.webp':'image/webp','.glb':'model/gltf-binary'};
const srv=createServer(async(req,res)=>{
 try{
  const url=new URL(req.url,'http://127.0.0.1');
  const path=resolve(root,'.'+decodeURIComponent(url.pathname));
  if(path!==root&&!path.startsWith(root+sep)){res.writeHead(403);res.end();return;}
  const bytes=await readFile(path);
  res.writeHead(200,{'Content-Type':types[extname(path)]||'application/octet-stream'});
  res.end(bytes);
 }catch{res.writeHead(404);res.end('Not found');}
});
await new Promise(ok=>srv.listen(0,'127.0.0.1',ok));
const base='http://127.0.0.1:'+srv.address().port+'/';
let browser;
try{
 browser=await chromium.launch({headless:true});
 const page=await browser.newPage({viewport:{width:390,height:844}});
 const errors=[],failures=[],requests=[];
 page.on('pageerror',error=>errors.push(error.message));
 page.on('response',r=>{
  if(r.status()>=400 && /(?:mentor|assets)/.test(r.url()))failures.push(r.status()+' '+r.url());
 });
 page.on('request',r=>requests.push(new URL(r.url()).pathname));
 await page.goto(base+'mentor-lab.html',{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>document.getElementById('status')?.textContent.includes('έτοιμο'),null,{timeout:45000});
 assert.ok(requests.includes('/mentor/app/lab.js'));
 assert.ok(requests.includes('/mentor/voice/speech.mjs'));
 assert.ok(requests.includes('/mentor/styles/mentor-lab.css'));
 assert.ok(requests.includes('/mentor/avatar/real3d.bundle.mjs'));
 assert.ok(requests.includes('/mentor/app/adaptive.js'));
 assert.ok(requests.includes('/mentor/app/personal-v1.js'));
 await page.locator('#tab-memory').click();
 assert.equal(await page.locator('#panel-memory').isVisible(),true);
 for(const p of ['mentor-live.html','mentor-oral.html','mentor-ecg.html','mentor-library.html','mentor-scenarios.html']){
  await page.goto(base+p,{waitUntil:'domcontentloaded'});
  await page.waitForTimeout(160);
  assert.ok((await page.locator('body').innerText()).length>50,p);
 }
 await page.goto(base+'index.html',{waitUntil:'domcontentloaded'});
 await page.waitForTimeout(800);
 assert.ok(requests.includes('/atla/assistant.mjs'),'ATLA assistant must be loaded');
 await page.locator('.atla-launcher').click();
 assert.ok(await page.locator('.atla-panel').isVisible(),'ATLA assistant panel must open');
 await page.locator('.atla-close').click();
 assert.ok(!await page.locator('.atla-panel').isVisible(),'ATLA panel must close');
 // Contextual SAEK micro-practice: no second simulator and no answer-grader writes.
 await page.goto(base+'saek-course-01.html#lesson-1',{waitUntil:'domcontentloaded'});
 await page.locator('#lesson-1.atlas-noop, #lesson-1').first().waitFor({timeout:20000});
 await page.locator('#lesson-1').evaluate(el=>{el.open=true;});
 await page.locator('#lesson-1 .atlas-chapter-practice summary').waitFor({timeout:20000});
 await page.locator('#lesson-1 .atlas-chapter-practice summary').click();
 await page.locator('#lesson-1 .atlas-practice-answer').fill('Η ανατομική θέση χρησιμοποιεί συγκεκριμένους όρους.');
 await page.locator('#lesson-1 .atlas-practice-btn').click();
 assert.ok(await page.locator('#lesson-1 .atlas-practice-reference').isVisible(),'SOS feedback is shown on demand');
 await page.locator('#lesson-1 .atlas-practice-atlas').click();
 assert.ok(await page.locator('.atla-panel').isVisible(),'ATLAS opt-in from SAEK');
 assert.match(await page.locator('.atla-context').textContent(),/κεφάλαιο ΣΑΕΚ/);
 await page.locator('.atla-close').click();
  assert.equal(await page.locator('#lesson-1 .atlas-practice-cockpit').count(),0,'No unrelated simulator mission should be offered');
  const oldUrl='mentor-next.html?from=saek-course-01.html&chapter=lesson-1&focus='+encodeURIComponent('Ανατομία');
  await page.goto(new URL(oldUrl,base).href,{waitUntil:'domcontentloaded'});
 await page.locator('#atlas-cockpit-entry').waitFor({timeout:20000});
 assert.ok(await page.locator('#atlas-cockpit-entry [href^="saek-course-01.html"]').count());
 await page.locator('#atlas-cockpit-entry [data-atla-open]').click();
 assert.ok(await page.locator('.atla-panel').isVisible(),'ATLAS opt-in from Cockpit');
 await page.setViewportSize({width:390,height:844});
 const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2);
 assert.equal(overflow,false,'Cockpit ATLAS entry must not cause horizontal overflow on mobile');
 // ATLA Paramedic contextual links: real DOM interactions (not just file-string assertions).
 await page.goto(base+'saek-course-01.html#lesson-10',{waitUntil:'domcontentloaded'});
 await page.locator('#lesson-10').waitFor({state:'attached',timeout:20000});
 await page.locator('#lesson-10').evaluate(el=>{el.open=true;});
 await page.locator('#lesson-10 .atlas-chapter-practice > summary').waitFor({timeout:20000});
 await page.locator('#lesson-10 .atlas-chapter-practice > summary').click();
 assert.equal(await page.locator('#lesson-10 .atlas-practice-link').count(),0,'No unwanted 3D CTA before learner consent');
 await page.locator('#lesson-10 .atlas-practice-actions button').filter({hasText:'Θέλω να εξασκηθώ'}).click();
 const heartHref=await page.locator('#lesson-10 .atlas-practice-link').getAttribute('href');
 assert.match(heartHref,/focus=heart&from=01&chapter=10/,'Heart lesson must target the real viewer');
 // The 3D viewer should parse the deep link and offer an exact chapter return.
 // This deliberately does not claim that its external large mesh has loaded.
 await page.goto(new URL(heartHref,base).href,{waitUntil:'domcontentloaded'});
 await page.locator('#chapterReturn').waitFor({state:'visible',timeout:18000});
 assert.equal(await page.locator('#chapterReturn').getAttribute('href'),'../../saek-course-01.html#lesson-10');

 assert.equal(await page.locator('#lesson-1 .atlas-practice-link').count(),0,'Unrelated anatomy chapter has no 3D CTA');
 await page.goto(base+'saek-course-02.html#lesson-7',{waitUntil:'domcontentloaded'});
 await page.locator('#lesson-7').waitFor({state:'attached',timeout:20000});
 await page.locator('#lesson-7').evaluate(el=>{el.open=true;});
 await page.locator('#lesson-7 .atlas-chapter-practice > summary').waitFor({timeout:20000});
 await page.locator('#lesson-7 .atlas-chapter-practice > summary').click();
 await page.locator('#lesson-7 .atlas-practice-actions button').filter({hasText:'Θέλω να εξασκηθώ'}).click();
 const ecgHref=await page.locator('#lesson-7 .atlas-practice-link').getAttribute('href');
 assert.match(ecgHref,/^mentor-ecg\.html\?from=02&chapter=7#ecg-practice$/);
 await page.goto(new URL(ecgHref,base).href,{waitUntil:'domcontentloaded'});
 await page.locator('.ecg-wrap > a').waitFor({timeout:15000});
 await page.waitForFunction(()=>document.querySelector('.ecg-wrap > a')?.getAttribute('href')==='saek-course-02.html#lesson-7');
 assert.equal(await page.locator('#ecg-practice').count(),1,'Existing ECG engine remains the only practice page');
 await page.goto(base+'theory.html?question=EOP-A-070',{waitUntil:'domcontentloaded'});
 await page.locator('#atlas-eoppep-tool').waitFor({state:'visible',timeout:30000});
 assert.match(await page.locator('#catalogReaderNumber').textContent(),/Ομάδα A · Ερώτηση 70/);
 assert.equal(await page.locator('#atlas-eoppep-tool .atlas-contextual-link').count(),0);
 await page.locator('#atlas-eoppep-tool .atlas-contextual-action').click();
 const eopHref=await page.locator('#atlas-eoppep-tool .atlas-contextual-link').getAttribute('href');
 assert.match(eopHref,/^mentor-ecg\.html\?from=eoppep&question=EOP-A-070#ecg-practice$/);
 await page.goto(new URL(eopHref,base).href,{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>document.querySelector('.ecg-wrap > a')?.getAttribute('href')==='theory.html?question=EOP-A-070',null,{timeout:15000});

 await page.goto(base+'theory.html?question=EOP-A-071',{waitUntil:'domcontentloaded'});
 await page.locator('#catalogReaderNumber').waitFor({state:'visible',timeout:30000});
 await page.waitForFunction(()=>document.querySelector('#catalogReaderNumber')?.textContent?.includes('Ερώτηση 71'),null,{timeout:30000});
 assert.equal(await page.locator('#atlas-eoppep-tool').isVisible(),false,'No unrelated ECG for neighboring question');
 await page.goto(base+'theory.html?mode=exam',{waitUntil:'domcontentloaded'});
 await page.locator('#atlas-eoppep-tool').waitFor({state:'attached',timeout:30000});
 assert.equal(await page.locator('#atlas-eoppep-tool').isVisible(),false,'No ECG help in active exam');
 await page.goto(base+'saek-course-10.html#lesson-7',{waitUntil:'domcontentloaded'});
 await page.locator('#lesson-7 .atlas-chapter-practice > summary').waitFor({timeout:20000});
 assert.equal(await page.locator('#lesson-7 .atlas-practice-actions button').filter({hasText:'Θέλω να εξασκηθώ'}).count(),0,'No synthetic waveform suggested for ACS');
 assert.equal(await page.locator('#lesson-7 .atlas-practice-cockpit').count(),0,'No unreviewed clinical case suggested');
 assert.deepEqual(errors,[], 'Browser script errors: '+errors.join(' | '));
 assert.deepEqual(failures,[],'Missing centralized assets: '+failures.join(' | '));
 console.log('Mentor layout: Chromium public URLs, modules, styles and progress read-only smoke PASSED');
}finally{
 await browser?.close();
 await new Promise(ok=>srv.close(ok));
}
