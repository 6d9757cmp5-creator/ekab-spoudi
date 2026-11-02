/**
 * Real STUDY-ONLY offline PWA + WebKit mobile viewport smoke.
 * WebKit on Linux is NOT physical iPhone Safari. The 3D and ECG tools are online-only.
 */
import {chromium,webkit} from 'playwright';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,sep,extname} from 'node:path';
import assert from 'node:assert/strict';

const root=resolve('.');
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8',
 '.mjs':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8',
 '.json':'application/json; charset=utf-8','.webmanifest':'application/manifest+json',
 '.svg':'image/svg+xml','.webp':'image/webp'};
const server=createServer(async(req,res)=>{
 try{
  const url=new URL(req.url,'http://127.0.0.1');
  const path=resolve(root,'.'+decodeURIComponent(url.pathname));
  if(path!==root&&!path.startsWith(root+sep))throw Error('unsafe');
  const body=await readFile(path);
  res.writeHead(200,{'Content-Type':types[extname(path)]||'application/octet-stream','Cache-Control':'no-cache'});
  res.end(body);
 }catch{res.writeHead(404);res.end('Not found');}
});
await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
const base='http://127.0.0.1:'+server.address().port+'/';

async function chromiumOffline(){
 const browser=await chromium.launch({headless:true});
 try{
  const context=await browser.newContext({viewport:{width:390,height:844}});
  let page=await context.newPage();
  await page.goto(base+'index.html',{waitUntil:'domcontentloaded'});
  const result=await page.evaluate(async()=>{
   if(!('serviceWorker' in navigator))return 'missing api';
   const reg=await navigator.serviceWorker.register('./sw.js',{updateViaCache:'none'});
   await navigator.serviceWorker.ready;
   if(!navigator.serviceWorker.controller){
    await new Promise(resolve=>navigator.serviceWorker.addEventListener('controllerchange',resolve,{once:true}));
   }
   return reg.active?.state||'missing active worker';
  });
  assert.equal(result,'activated','real service worker must activate on local host');
  // updates.js reloads its original tab on controllerchange; start with a fresh tab.
  await page.close();
  page=await context.newPage();

  // Read the actual 314-topic EOPPEP reader and a SAEK chapter before disconnecting.
  await page.goto(base+'theory.html?question=EOP-A-070',{waitUntil:'domcontentloaded'});
  await page.locator('#catalogReaderAnswer').waitFor({state:'visible',timeout:25000});
  assert.ok((await page.locator('#catalogReaderAnswer').innerText()).length>30,'Question answer is populated online');
  await page.goto(base+'saek-course-01.html#lesson-10',{waitUntil:'domcontentloaded'});
  await page.locator('#lesson-10 .chapter-heading').waitFor({state:'attached'});
  await page.locator('img[src="saek-skeleton.svg"]').waitFor({state:'attached'});
  await page.waitForFunction(()=>document.querySelector('img[src="saek-skeleton.svg"]')?.naturalWidth>0);

  // Educational pictures cache as viewed, not through bulk preload.
  const image='assets/education/heart-chambers-and-valves-el.svg';
  await page.goto(base+image,{waitUntil:'load'});
  await page.waitForFunction(async()=>{
   const keys=await caches.keys();
   const active=keys.find(k=>k.includes('study-materials-only-20261102'));
   if(!active)return false;
   return Boolean(await (await caches.open(active)).match('./assets/education/heart-chambers-and-valves-el.svg'));
  },null,{timeout:10000});

  await context.setOffline(true);
  await page.goto(base+'theory.html?question=EOP-A-070',{waitUntil:'domcontentloaded',timeout:20000});
  await page.locator('#catalogReaderAnswer').waitFor({state:'visible',timeout:20000});
  assert.ok((await page.locator('#catalogReaderAnswer').innerText()).length>30,'EOPPEP answer survives offline');
  assert.match(await page.locator('#catalogReaderNumber').textContent(),/Ερώτηση 70/);
  await page.goto(base+'saek-course-01.html#lesson-10',{waitUntil:'domcontentloaded',timeout:20000});
  await page.locator('#lesson-10 .chapter-heading').waitFor({state:'attached'});
  assert.ok(await page.locator('img[src="saek-skeleton.svg"]').evaluate(img=>img.complete&&img.naturalWidth>0),'SAEK anatomy image available offline');
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2),false,'Offline SAEK fits mobile');
  await page.goto(base+image,{waitUntil:'load',timeout:20000});
  assert.ok((await page.locator('svg').count())>0,'Viewed education image is cached offline');
  await assert.rejects(
   page.goto(base+'mentor-ecg.html?from=02&chapter=7',{waitUntil:'domcontentloaded',timeout:9000}),
   /ERR_INTERNET_DISCONNECTED|net::|failed|offline/i,
   'Non-study ECG tool must NOT be artificially available offline'
  );

  await context.setOffline(false);
  await page.goto(base+'paramedic.html',{waitUntil:'domcontentloaded'});
  assert.ok(await page.locator('a[href="saek.html"]').isVisible(),'Paramedic still works normally online');
  await page.goto(base+'mentor-ecg.html?from=02&chapter=7#ecg-practice',{waitUntil:'domcontentloaded'});
  assert.ok(await page.locator('#ecg-practice').isVisible(),'ECG works normally online');
  console.log('PASS: offline EOPPEP answers, SAEK chapters, read images; online-only tools remain online.');
 }finally{await browser.close();}
}
async function mobileWebkit(){
 const browser=await webkit.launch({headless:true});
 try{
  const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  const page=await context.newPage();
  await page.goto(base+'paramedic.html',{waitUntil:'domcontentloaded'});
  assert.ok(await page.locator('h1').isVisible(),'Paramedic title in WebKit mobile emulation');
  assert.ok(await page.locator('a[href="saek.html"]').isVisible(),'SAEK is nested under Paramedic');
  assert.ok(await page.locator('a[href="eoppep.html"]').isVisible(),'EOPPEP is nested under Paramedic');
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2),false,'No mobile horizontal overflow');
  await page.goto(base+'saek-course-02.html#lesson-7',{waitUntil:'domcontentloaded'});
  await page.locator('#lesson-7').evaluate(node=>{node.open=true});
  await page.locator('#lesson-7 .atlas-chapter-practice>summary').waitFor({timeout:20000});
  await page.locator('#lesson-7 .atlas-chapter-practice>summary').click();
  await page.locator('#lesson-7 .atlas-practice-actions button').filter({hasText:'Θέλω να εξασκηθώ'}).click();
  assert.match(await page.locator('#lesson-7 .atlas-practice-link').getAttribute('href'),/mentor-ecg\.html\?from=02&chapter=7/);
  console.log('PASS: WebKit mobile simulation Paramedic navigation and contextual SAEK link');
 }finally{await browser.close();}
}
try{await chromiumOffline();await mobileWebkit();}
finally{await new Promise(ok=>server.close(ok));}
