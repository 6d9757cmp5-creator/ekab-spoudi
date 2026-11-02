import {chromium} from 'playwright';
import {createServer} from 'node:http';
import {readFile,stat} from 'node:fs/promises';
import {resolve,sep,extname} from 'node:path';
import assert from 'node:assert/strict';

const basePath=resolve('.');
const mime={'.html':'text/html; charset=utf-8','.js':'application/javascript; charset=utf-8','.mjs':'application/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json'};
const server=createServer(async(req,res)=>{
 try{
  const url=new URL(req.url,'http://localhost');
  const path=resolve(basePath,'.'+decodeURIComponent(url.pathname));
  if(path!==basePath&&!path.startsWith(basePath+sep)){res.writeHead(403);res.end();return;}
  const bytes=await readFile(path);
  res.writeHead(200,{'Content-Type':mime[extname(path)]||'application/octet-stream'});res.end(bytes);
 }catch{res.writeHead(404);res.end('Not found');}
});
await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
let browser;
const origin='http://127.0.0.1:'+server.address().port+'/';
try{
 browser=await chromium.launch({headless:true});
 for(const [label,width,height] of [['mobile',390,844],['desktop',1440,900]]){
  const context=await browser.newContext({viewport:{width,height},serviceWorkers:'block'});
  const page=await context.newPage();
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(origin+'index.html',{waitUntil:'domcontentloaded'});
  assert.equal(await page.locator('.atlas-recall-chip').count(),0,'No permanent recall launcher anywhere');
  assert.equal(await page.locator('.atlas-recall-window:visible').count(),0,'No pop-up for unread chapters');
  await page.evaluate(()=>localStorage.setItem('ekab.saek.read.v1.01.1','1'));
  await page.reload({waitUntil:'domcontentloaded'});
  assert.equal(await page.locator('.atlas-recall-chip').count(),0,'Read lessons must not create a persistent launcher');
  assert.equal(await page.locator('.atlas-recall-window:visible').count(),0,'Respect initial randomized delay');
  assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('ekab.atlas.recall.settings.v1')).enabled),true,'Automatic recall enabled by default');
  // No activation click. Simulate a quiet learner after the persisted randomized deadline.
  await page.clock.install();
  await page.evaluate(()=>{
   const key='ekab.atlas.recall.settings.v1',s=JSON.parse(localStorage.getItem(key));
   s.nextAt=Date.now()+1000;localStorage.setItem(key,JSON.stringify(s));
  });
  await page.clock.fastForward(30000);
  await page.evaluate(()=>window.dispatchEvent(new Event('ekab:recall-check')));
  await page.locator('.atlas-recall-question').waitFor({state:'visible',timeout:15000});
  assert.match(await page.locator('.atlas-recall-question').innerText(),/εγγύς|άπω/u);
  assert.ok((await page.locator('a[href$="saek-course-01.html#lesson-1"]').count())===1);
  await page.getByRole('button',{name:'Δες απάντηση'}).click();
  assert.equal(await page.locator('.atlas-recall-answer').isVisible(),true);
  await page.getByRole('button',{name:'Θέλω επανάληψη'}).click();
  const data=await page.evaluate(()=>({
    read:localStorage.getItem('ekab.saek.read.v1.01.1'),
    recall:JSON.parse(localStorage.getItem('ekab.atlas.recall.feedback.v1'))['01:1']
  }));
  assert.equal(data.read,'1');
  assert.equal(data.recall.answer,'again');
  assert.equal(await page.locator('.atlas-recall-window:visible').count(),0);
  await page.goto(origin+'saek-course-01.html',{waitUntil:'domcontentloaded'});
  // Module scripts may initialize after DOMContentLoaded; wait for recall service before advancing the fake clock.
  await page.locator('#atlas-recall-window').waitFor({state:'attached',timeout:15000});
  assert.equal(await page.locator('.atlas-recall-chip').count(),0,'No floating recall button on lesson page');
  await page.clock.install();
  await page.evaluate(()=>{
   const key='ekab.atlas.recall.settings.v1',s=JSON.parse(localStorage.getItem(key));
   s.nextAt=Date.now()+1000;localStorage.setItem(key,JSON.stringify(s));
  });
  await page.clock.fastForward(30000);
  await page.evaluate(()=>window.dispatchEvent(new Event('ekab:recall-check')));
  console.log('RECALL_SECOND_DIAGNOSTIC',label,JSON.stringify(await page.evaluate(()=>({
    pathname:location.pathname,
    now:Date.now(),ready:document.readyState,visibility:document.visibilityState,
    completed:localStorage.getItem('ekab.saek.read.v1.01.1'),
    settings:localStorage.getItem('ekab.atlas.recall.settings.v1'),
    panel:!!document.getElementById('atlas-recall-window'),
    hidden:document.getElementById('atlas-recall-window')?.hidden,
    question:!!document.getElementById('lesson-1')?.querySelector('.knowledge-check .check-question'),
    active:document.activeElement?.tagName,
    activeInput:!!document.activeElement?.closest('input,textarea,select,[contenteditable="true"],[role="textbox"]'),
    modal:!!document.querySelector('[aria-modal="true"]:not([hidden]),dialog[open]'),
    studying:!!document.querySelector('#study:not(.hidden),[data-atla-active-exam="true"]'),
    anyVideoPlaying:[...document.querySelectorAll('video')].some(v=>!v.paused&&!v.ended),
    count:document.querySelectorAll('.atlas-recall-question').length
  }))));
  await page.locator('.atlas-recall-question').waitFor({state:'visible',timeout:15000});
  await page.getByRole('button',{name:'Παύση υπενθυμίσεων'}).click();
  assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('ekab.atlas.recall.settings.v1')).enabled),false);
  await page.goto(origin+'theory.html?mode=exam',{waitUntil:'domcontentloaded'});
  assert.equal(await page.locator('.atlas-recall-chip').count(),0,'No floating launcher on exam pages');
  assert.equal(await page.locator('.atlas-recall-window').count(),0,'Never interrupt an examination');
  assert.deepEqual(errors,[],label+': '+errors.join(' | '));
  console.log('PASS '+label+': NO permanent recall control, automatic random-timed popups, self-check, pause, no exam interruption');
  await context.close();
 }
}finally{
 await browser?.close();
 await new Promise(ok=>server.close(ok));
}
