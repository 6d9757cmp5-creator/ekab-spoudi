#!/usr/bin/env node
/** Real browser check of the communication & handover lab on phone and desktop width: every
 * subsection renders, accepts a correct answer as fully correct and reports a wrong one. */
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {CASES,ATMIST} from './core.mjs';
const base=(process.argv[2]||'http://127.0.0.1:8799').replace(/\/$/,'');
const browser=await chromium.launch();
const c=CASES[0];
try{
 for(const width of [390,1280]){
  const context=await browser.newContext({viewport:{width,height:844},serviceWorkers:'block'});
  const page=await context.newPage();
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  const open=async topic=>{
   await page.goto(`${base}/mentor-handover.html?topic=${topic}&case=${c.id}`,{waitUntil:'load',timeout:45000});await page.locator('#hl-exercise').waitFor();
   assert.equal(await overflow(),'',`${width}px ${topic}: no horizontal overflow`);
  };
  const verdict=async()=>(await page.locator('.hl-verdict').last().textContent()).trim();
  // Returns '' when nothing sticks out, otherwise the widest offending elements (for the CI log).
  const overflow=()=>page.evaluate(()=>{
   if(document.documentElement.scrollWidth<=window.innerWidth+1)return '';
   return [...document.querySelectorAll('body *')].filter(e=>e.getBoundingClientRect().right>window.innerWidth+1&&!e.closest('.hl-table-wrap'))
    .slice(0,5).map(e=>e.tagName.toLowerCase()+'#'+e.id+'.'+String(e.className).split(' ')[0]+' '+Math.round(e.getBoundingClientRect().right)).join(', ');
  });

  await open('capture');
  assert.equal(await overflow(),'',width+': no horizontal overflow');
  assert.equal(await page.locator('#hl-topic-nav button').count(),6);
  for(const f of c.capture){const el=page.locator(`[data-field="${f.id}"]`);if(f.kind==='choice')await el.selectOption(f.answer);else await el.fill(f.answer);}
  await page.locator('.hl-check').click();
  assert.match(await verdict(),new RegExp(`Σωστά ${c.capture.length} από ${c.capture.length}`));
  await page.locator('[data-field="head"]').selectOption('Όχι');await page.locator('.hl-check').click();
  assert.match(await page.locator('.hl-result').textContent(),/άγνωστο/,'wrong "no" explains unknown');

  await open('dispatch');
  await page.locator('#hl-readback').fill('Ασθενοφόρο 12, Αγίου Νικολάου 18, Νέα Σμύρνη, πίσω αυλή, ένας τραυματίας');
  await page.locator('.hl-check').first().click();
  assert.match(await verdict(),/Σωστά 6 από 6/);
  await page.locator('#hl-readback').fill('Αγίου Νικολάου 81');await page.locator('.hl-check').first().click();
  assert.match(await page.locator('.hl-result').first().textContent(),/Αριθμός 18/);
  // Closed loop starts out of order; put it right with the arrow buttons.
  const loop=page.locator('.hl-order');
  while((await loop.locator('li').first().getAttribute('data-id'))!=='send')await loop.locator('li[data-id="send"] .hl-move').first().click();
  if((await loop.locator('li').nth(1).getAttribute('data-id'))!=='readback')await loop.locator('li[data-id="readback"] .hl-move').first().click();
  await page.locator('.hl-check').nth(1).click();
  assert.match(await verdict(),/Σωστά 3 από 3/);

  await open('prealert');
  for(const s of c.statements)if(s.prealert)await page.locator(`.hl-checklist input[value="${s.id}"]`).check();
  await page.locator('.hl-check').click();
  assert.match(await verdict(),new RegExp(`Σωστά ${c.statements.length} από`));

  await open('structure');
  const selects=page.locator('.hl-structure select');
  assert.equal(await selects.count(),c.statements.length);
  for(let i=0;i<c.statements.length;i++)await selects.nth(i).selectOption(c.statements[i].slot);
  await page.locator('.hl-check').click();
  assert.match(await verdict(),new RegExp(`Σωστά ${c.statements.length} από`));
  assert.match(await page.locator('.hl-model pre').textContent(),/67 ετών/);
  assert.equal(ATMIST.length,7);

  await open('record');
  const inputs=page.locator('.hl-table input');
  const fields=['time','hr','rr','bp','spo2','avpu'];
  for(let r=0;r<c.vitals.length;r++)for(let f=0;f<fields.length;f++)await inputs.nth(r*fields.length+f).fill(String(c.vitals[r][fields[f]]));
  await page.locator(`input[name="hl-trend-${c.id}"][value="${c.trend.answer}"]`).check();
  await page.locator('.hl-check').click();
  assert.match(await verdict(),/Σωστά 13 από 13/);
  assert.equal(await page.locator('.hl-table-wrap').evaluate(e=>e.getBoundingClientRect().right<=window.innerWidth+1),true,'table scrolls inside its box');

  await open('transfer');
  await page.locator('input[name="hl-flaw"][value="0"]').check();
  await page.locator('.hl-check').nth(1).click();
  assert.match(await verdict(),/Σωστά 1 από 1/);
  assert.match(await page.locator('#hl-score').textContent(),/Σωστά σημεία: 1 \/ 1/,'score counts this page visit');
  assert.ok((await page.locator('#hl-source-list a').count())>=2,'sources listed');
  assert.deepEqual(errors,[],width+': no page errors');
  await context.close();
  console.log('handover lab ok at',width+'px');
 }
}finally{await browser.close();}
