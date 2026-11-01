/**
 * Real Chromium smoke for grouped Mentor code. Checks old public URLs,
 * new centralized scripts and CSS, and the rendered training cockpit.
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
 assert.ok(requests.includes('/mentor/app/home.js'));
 assert.ok(requests.includes('/mentor/styles/mentor-avatar-live.css'));
 assert.deepEqual(errors,[], 'Browser script errors: '+errors.join(' | '));
 assert.deepEqual(failures,[],'Missing centralized assets: '+failures.join(' | '));
 console.log('Mentor layout: Chromium public URLs, modules, styles and progress read-only smoke PASSED');
}finally{
 await browser?.close();
 await new Promise(ok=>srv.close(ok));
}
