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
  await page.locator('#atlas-recall-window').waitFor({state:'attached',timeout:15000});
  assert.equal(await page.locator('.atlas-recall-chip').count(),0,'No floating recall button on lesson page');
  assert.equal(await page.locator('.atlas-recall-window:visible').count(),0,'No immediate interruption to reading');
  // Separate fresh session: prove automatic offer and permanent pause without a launcher.
  const pauseContext=await browser.newContext({viewport:{width,height},serviceWorkers:'block'});
  const pausePage=await pauseContext.newPage();
  await pausePage.goto(origin+'index.html',{waitUntil:'domcontentloaded'});
  await pausePage.evaluate(()=>localStorage.setItem('ekab.saek.read.v1.01.1','1'));
  await pausePage.reload({waitUntil:'domcontentloaded'});
  await pausePage.locator('#atlas-recall-window').waitFor({state:'attached',timeout:15000});
  await pausePage.clock.install();
  await pausePage.evaluate(()=>{
   const key='ekab.atlas.recall.settings.v1',s=JSON.parse(localStorage.getItem(key));
   s.nextAt=Date.now()+1000;localStorage.setItem(key,JSON.stringify(s));
  });
  await pausePage.clock.fastForward(30000);
  await pausePage.evaluate(()=>window.dispatchEvent(new Event('ekab:recall-check')));
  await pausePage.locator('.atlas-recall-question').waitFor({state:'visible',timeout:15000});
  await pausePage.getByRole('button',{name:'Παύση υπενθυμίσεων'}).click();
  assert.equal(await pausePage.evaluate(()=>JSON.parse(localStorage.getItem('ekab.atlas.recall.settings.v1')).enabled),false);
  assert.equal(await pausePage.locator('.atlas-recall-chip').count(),0,'Never show a permanent control, even after pausing');
  // The existing Account dialog, not a new permanent floating control, owns the resume setting.
  await pausePage.locator('[data-account-open]').waitFor({state:'visible',timeout:15000});
  await pausePage.locator('[data-account-open]').click();
  await pausePage.locator('#accountDialog[open]').waitFor({state:'visible'});
  await pausePage.locator('details.atlas-recall-settings summary').click();
  const toggle=pausePage.locator('[data-atlas-recall-toggle]');
  await toggle.waitFor({state:'visible'});
  assert.match(await toggle.innerText(),/Επανενεργοποίηση υπενθυμίσεων/);
  await toggle.click();
  const resumed=await pausePage.evaluate(()=>JSON.parse(localStorage.getItem('ekab.atlas.recall.settings.v1')));
  assert.equal(resumed.enabled,true,'Resumed after explicit pause');
  assert.ok(resumed.nextAt>Date.now(),'Resume must schedule future random offer, not interrupt immediately');
  assert.match(await toggle.innerText(),/Παύση υπενθυμίσεων/);
  assert.equal(await pausePage.locator('.atlas-recall-chip').count(),0,'Still no permanent page control after resume');
  await pausePage.locator('#accountDialog .dialog-close').click();
  await pausePage.reload({waitUntil:'domcontentloaded'});
  const saved=await pausePage.evaluate(()=>JSON.parse(localStorage.getItem('ekab.atlas.recall.settings.v1')));
  assert.equal(saved.enabled,true,'Resume persists across navigation');
  assert.equal(await pausePage.locator('.atlas-recall-chip').count(),0,'No permanent page button after reload');
  await pauseContext.close();
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
