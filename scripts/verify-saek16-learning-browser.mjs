#!/usr/bin/env node
/**
 * Real local Chromium browser acceptance: SAEK 16 chapters 7/9/10.
 * This checks rendered navigation, SOS, sources, details, self-check and storage
 * isolation at mobile/desktop viewports. NOT a clinical certification, physical
 * iPhone Safari test, or verification of the actual GitHub Pages deployment.
 */
import {chromium} from 'playwright';
import {spawn} from 'node:child_process';
import {get as httpGet} from 'node:http';
import {mkdirSync,writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';

const port=8893,base='http://127.0.0.1:'+port+'/';
const server=spawn('python3',['-m','http.server',String(port),'--bind','127.0.0.1'],{stdio:'ignore'});
const cases=[
  {n:7,required:'πλήρη επαναφορά του θώρακα',source:'adult-basic-life-support-guidelines'},
  {n:9,required:'η ενδομυϊκή αδρεναλίνη είναι θεραπεία πρώτης γραμμής',source:'first-aid-guidelines'},
  {n:10,required:'5 λεπτά ή περισσότερο',source:'nice.org.uk/guidance/ng217'}
];
const result={kind:'local-chromium-functional-acceptance',notClinicalCertification:true,
  previewDeploymentTested:false,devices:[],passed:0,failed:[]};
let browser;
const ping=()=>new Promise(done=>httpGet(base+'saek-course-16.html',r=>{
  r.resume();r.on('end',()=>done(r.statusCode===200));
}).on('error',()=>done(false)));
const check=async(label,fn)=>{
  try{await fn();result.passed++;console.log('PASS '+label);}
  catch(e){const item={label,error:String(e.stack||e).slice(0,1250)};
    result.failed.push(item);console.error('FAIL '+label+': '+item.error.slice(0,220));}
};
try{
  let ready=false;
  for(let i=0;i<80;i++){if(await ping()){ready=true;break;}
    await new Promise(done=>setTimeout(done,150));}
  assert(ready,'Local HTTP server unavailable');
  browser=await chromium.launch({headless:true});
  for(const [device,opts] of [
    ['desktop',{viewport:{width:1440,height:900}}],
    ['mobile',{viewport:{width:390,height:844},isMobile:true,hasTouch:true}]
  ]){
    const ctx=await browser.newContext(opts);
    const page=await ctx.newPage();
    const errors=[];page.on('pageerror',e=>errors.push(String(e)));
    result.devices.push(device);
    // State is isolated in this ephemeral browser context, not the learner's real profile.
    await check(device+' source page opens and lists 13 chapters',async()=>{
      await page.goto(base+'saek-course-16.html#lesson-7',{waitUntil:'domcontentloaded'});
      await page.waitForFunction(()=>document.querySelector('#saekChapterCount')?.textContent==='7 / 13');
      assert.equal(await page.locator('.reader-chapters > details.reader-fold').count(),13);
      assert.equal(await page.locator('.reader-chapters > details.reader-fold[open]').count(),1);
    });
    for(const c of cases){
      await check(device+' lesson '+c.n+' full educational view and source',async()=>{
        await page.goto(base+'saek-course-16.html#lesson-'+c.n,{waitUntil:'domcontentloaded'});
        await page.waitForFunction(n=>document.querySelector('#saekChapterCount')?.textContent===n+' / 13',c.n);
        const chapter=page.locator('#lesson-'+c.n);
        assert(await chapter.isVisible());
        assert.equal(await page.locator('.reader-chapters > details.reader-fold[open]').count(),1);
        assert((await chapter.locator('.reader-paragraph').textContent()).includes(c.required));
        assert(await chapter.locator('.lesson-sos').isVisible());
        const hrefs=await chapter.locator('a[href^="https"]').evaluateAll(nodes=>nodes.map(x=>x.href));
        assert(hrefs.some(x=>x.includes(c.source)),'Missing expected primary-source link');
        await chapter.locator('.lesson-more > summary').click();
        assert(await chapter.locator('.lesson-more h3').first().isVisible());
        if(c.n===7) assert((await chapter.locator('.lesson-process').textContent()).includes('μόλις πραγματοποιηθεί η εκφόρτιση'));
        if(c.n===9) assert((await chapter.locator('.lesson-more').textContent()).includes('ΠΔ 62/2007'));
        await chapter.locator('.knowledge-check > summary').click();
        await chapter.locator('.knowledge-check details > summary').click();
        assert(await chapter.locator('.check-answer').isVisible());
      });
    }
    await check(device+' adjacent navigation and storage remain functional',async()=>{
      await page.goto(base+'saek-course-16.html#lesson-9',{waitUntil:'domcontentloaded'});
      await page.waitForFunction(()=>document.querySelector('#saekChapterCount')?.textContent==='9 / 13');
      const key='ekab.saek.lastchapter.16';
      assert.equal(await page.evaluate(k=>localStorage.getItem(k),key),'9');
      await page.locator('#saekChapterNext').click();
      assert.equal(await page.locator('#saekChapterCount').textContent(),'10 / 13');
      assert.equal(await page.evaluate(k=>localStorage.getItem(k),key),'10');
      await page.goto(base+'saek-course-16.html',{waitUntil:'domcontentloaded'});
      await page.waitForFunction(()=>document.querySelector('#saekChapterCount')?.textContent==='10 / 13');
      await page.locator('#saekChapterPrev').click();
      assert.equal(await page.locator('#saekChapterCount').textContent(),'9 / 13');
      assert.equal(await page.evaluate(k=>localStorage.getItem(k),key),'9');
    });
    await check(device+' read-progress retains original key and survives reload',async()=>{
      await page.goto(base+'saek-course-16.html#lesson-9',{waitUntil:'domcontentloaded'});
      await page.waitForFunction(()=>document.querySelector('#saekChapterCount')?.textContent==='9 / 13');
      const key='ekab.saek.read.v1.16.9';
      assert.equal(await page.evaluate(k=>localStorage.getItem(k),key),null);
      await page.locator('#lesson-9 .read-button').click();
      assert.equal(await page.evaluate(k=>localStorage.getItem(k),key),'1');
      assert.match(await page.locator('#read-summary').textContent(),/1\/13/);
      await page.goto(base+'saek-course-16.html',{waitUntil:'domcontentloaded'});
      await page.waitForFunction(()=>document.querySelector('#saekChapterCount')?.textContent==='9 / 13');
      assert.equal(await page.evaluate(k=>localStorage.getItem(k),key),'1');
      assert.equal(await page.locator('#lesson-9 .read-button').getAttribute('aria-pressed'),'true');
      assert.match(await page.locator('#read-summary').textContent(),/1\/13/);
    });
    await check(device+' no uncaught page errors',async()=>assert.deepEqual(errors,[]));
    await ctx.close();
  }
}finally{
  try{await browser?.close()}catch{}
  server.kill();
  mkdirSync('audit-results',{recursive:true});
  writeFileSync('audit-results/saek16-learning-browser.json',JSON.stringify(result,null,2)+'\n');
}
if(result.failed.length)process.exitCode=1;
