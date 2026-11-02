/**
 * Real PWA + WebKit mobile viewport smoke.
 * WebKit on Linux is NOT physical iPhone Safari. 3D external meshes are online-only.
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
  const page=await context.newPage();
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
  // Let the install cache finish. The brand-new Paramedic entry must load completely offline.
  await context.setOffline(true);
  const offline=await page.goto(base+'paramedic.html',{waitUntil:'domcontentloaded',timeout:20000});
  assert.ok(offline&&offline.status()===200,'Offline Paramedic HTML must return from cache');
  await page.locator('a[href="saek.html"]').waitFor();
  assert.ok(await page.locator('a[href="eoppep.html"]').isVisible());
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2),false,'offline Paramedic fits mobile viewport');
  // The linked ECG and its scripts must also be in the same-origin PWA cache.
  await page.goto(base+'mentor-ecg.html?from=02&chapter=7#ecg-practice',{waitUntil:'domcontentloaded',timeout:20000});
  assert.ok(await page.locator('#ecg-practice').isVisible(),'Offline synthetic ECG retains its learning screen');
  assert.equal(await page.evaluate(()=>document.querySelector('.ecg-wrap > a')?.getAttribute('href')),'saek-course-02.html#lesson-7');
  console.log('PASS: real service worker PWA Paramedic and ECG offline in Chromium mobile viewport');
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
