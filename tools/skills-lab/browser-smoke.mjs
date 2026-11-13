#!/usr/bin/env node
/** Real browser check of the airway, equipment and auscultation labs on phone and desktop width:
 * every subsection renders, every exercise is answered through the page and scores full marks,
 * a wrong answer is reported, sound graphs are computed from the files and audio plays. */
import assert from 'node:assert/strict';
import {chromium,webkit} from 'playwright';
import {readFileSync} from 'node:fs';
const base=(process.argv[2]||'http://127.0.0.1:8799').replace(/\/$/,'');
const lab=id=>JSON.parse(readFileSync(new URL(`./labs/${id}.json`,import.meta.url),'utf8'));
// Optional second argument "webkit": the Safari engine, with phone width as a touch device (iPhone behaviour).
const engine=process.argv[3]==='webkit'?webkit:chromium;
const browser=await engine.launch(engine===chromium?{args:['--autoplay-policy=no-user-gesture-required']}:{});

async function answer(sec,e){
 switch(e.type){
  case 'label':for(const [n,v] of Object.entries(e.answers))await sec.locator(`select[data-key="${n}"]`).selectOption(v);break;
  case 'identify':for(const [i,it] of e.items.entries())await sec.locator(`select[data-item="${i}"]`).selectOption(it.answer);break;
  case 'classify':for(const [i,it] of e.items.entries())await sec.locator(`select[data-item="${i}"]`).selectOption(it.answer);break;
  case 'truefalse':for(const [i,it] of e.items.entries())await sec.locator(`input[name="${e.id}-${i}"][value="${it.answer}"]`).check();break;
  case 'numbers':for(const f of e.fields)await sec.locator(`input[data-field="${f.id}"]`).fill(String(f.answer));break;
  case 'locate':for(const [i,it] of e.items.entries()){await sec.locator('.sl-locate-item').nth(i).click();await sec.locator(`.sl-point[data-point="${it.answer}"]`).click();}break;
  case 'order':
   for(const [i,s] of e.steps.entries()){
    for(;;){const ids=await sec.locator('.sl-order li').evaluateAll(l=>l.map(x=>x.dataset.id));const at=ids.indexOf(s.id);if(at<=i)break;
     await sec.locator(`.sl-order li[data-id="${s.id}"] .sl-move`).first().click();}
   }
 }
}
const verdict=sec=>sec.locator('.sl-verdict').textContent();
const overflow=page=>page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1?'':[...document.querySelectorAll('body *')].filter(e=>e.getBoundingClientRect().right>innerWidth+1).slice(0,4).map(e=>e.tagName+'.'+e.className).join(', '));

try{
 for(const width of [390,1280]){
  const context=await browser.newContext({viewport:{width,height:844},serviceWorkers:'block',...(engine===webkit&&width<500?{isMobile:true,hasTouch:true,deviceScaleFactor:3}:{})});
  const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
  for(const id of ['airway','equipment','auscultation']){
   const L=lab(id);
   for(const t of L.topics){
    await page.goto(`${base}/mentor-${id}.html?topic=${t.id}`,{waitUntil:'load',timeout:45000});
    await page.waitForSelector('body[data-ready]',{state:'attached',timeout:30000});
    assert.equal(await page.locator('#sl-title').textContent(),t.title);
    assert.equal(await page.locator('#sl-topic-nav button').count(),L.topics.length);
    for(const e of t.exercises){
     const sec=page.locator(`.sl-ex[data-exercise="${e.id}"]`);
     await answer(sec,e);
     const wide=await overflow(page);assert.equal(wide,'',`${width}px ${id}/${e.id}: no horizontal overflow before checking`);
     await sec.locator('.sl-check').click();
     assert.match(await verdict(sec),/^Σωστά (\d+) από \1\./,`${width}px ${id}/${e.id} full marks`);
    }
    assert.equal(await overflow(page),'',`${width}px ${id}/${t.id}: no horizontal overflow`);
    for(const img of await page.locator('.sl-figure img').all()){await img.scrollIntoViewIfNeeded();assert.ok(await img.evaluate(i=>i.complete&&i.naturalWidth>0),`${id}/${t.id} image loads`);}
    assert.ok((await page.locator('#sl-source-list a').count())>=2,`${id}/${t.id} sources listed`);
   }
   assert.equal(await page.locator('.sl-credit,#sl-credits').count(),0,id+': no credits inside the lab');
   assert.equal(await page.locator('a[href="mentor-media-credits.html"]').count(),1,id+': one licences link');
  }

  // Licences live on their own page.
  await page.goto(`${base}/mentor-media-credits.html`,{waitUntil:'load'});await page.waitForSelector('body[data-ready]',{state:'attached'});
  assert.ok((await page.locator('#credits li').count())>=30,'licences listed');

  // A wrong answer is reported with the right one.
  await page.goto(`${base}/mentor-airway.html?topic=oxygen`,{waitUntil:'load'});await page.waitForSelector('body[data-ready]',{state:'attached'});
  const tf=page.locator('.sl-ex[data-exercise="o2-safety"]');
  await tf.locator('input[name="o2-safety-2"][value="true"]').check();await tf.locator('.sl-check').click();
  assert.match(await verdict(tf),/^Σωστά 0 από 6\./);
  assert.match(await tf.locator('.sl-rows').textContent(),/καύση/);

  // Sound: graph computed from the file, saturation measured, audio plays and the marker moves.
  await page.goto(`${base}/mentor-auscultation.html?topic=technical`,{waitUntil:'load'});await page.waitForSelector('body[data-ready]',{state:'attached'});
  const first=page.locator('.sl-sound').first();await first.scrollIntoViewIfNeeded();
  await first.locator('.sl-sound-info[data-clipped]').waitFor({state:'attached',timeout:20000});
  assert.ok(Number(await first.locator('.sl-sound-info').getAttribute('data-clipped'))>0.005,'noisy recording shows saturation');
  const clean=page.locator('.sl-sound').nth(1);await clean.scrollIntoViewIfNeeded();
  await clean.locator('.sl-sound-info[data-clipped]').waitFor({state:'attached',timeout:20000});
  assert.equal(Number(await clean.locator('.sl-sound-info').getAttribute('data-clipped')),0,'clean recording is not saturated');
  const played=await first.locator('audio').evaluate(async a=>{a.muted=true;await a.play();await new Promise(r=>setTimeout(r,700));a.pause();return a.currentTime;});
  assert.ok(played>0.2,'audio plays');
  assert.ok(await first.locator('canvas').evaluate(c=>{const d=c.getContext('2d').getImageData(0,0,c.width,c.height).data;let red=0;for(let i=0;i<d.length;i+=4)if(d[i]>200&&d[i+1]<60&&d[i+2]<110)red++;return red>c.height;}),'playback marker drawn');

  assert.deepEqual(errors,[],width+': no page errors');
  await context.close();
  console.log('skills labs ok at',width+'px',engine.name());
 }
}finally{await browser.close();}
