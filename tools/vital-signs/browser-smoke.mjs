#!/usr/bin/env node
/** Real control/browser smoke for synthetic training only. Run after page-smoke with local HTTP server. */
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const base=(process.argv[2]||'http://127.0.0.1:8799').replace(/\/$/,'');
const browser=await chromium.launch();
let results=[];
try{
 for(const width of [390,1280]){
  const context=await browser.newContext({viewport:{width,height:844},serviceWorkers:'block'});
  const page=await context.newPage();
  const errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  try{
   await page.goto(base+'/mentor-vitals.html',{waitUntil:'load',timeout:45000});
   await page.locator('#vs-hr').waitFor();
   const noHorizontalOverflow=await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1);
   assert.equal(noHorizontalOverflow,true,'no horizontal overflow on vital-signs page');
   assert.equal((await page.locator('#vs-hr').textContent()).trim(),'78','default pulse');
   assert.equal(await page.locator('#vs-observation-panel').isVisible(),true);
   assert.equal(await page.locator('#vs-quiz-panel').isVisible(),false);
   const plethA=await page.locator('#vs-pleth path').getAttribute('d');
   await page.waitForTimeout(190);
   const plethB=await page.locator('#vs-pleth path').getAttribute('d');
   assert.notEqual(plethA,plethB,'pleth is animated, not a frozen screenshot');
   await page.locator('#vs-animation-toggle').click();
   const stillA=await page.locator('#vs-pleth path').getAttribute('d');
   await page.waitForTimeout(130);
   assert.equal(await page.locator('#vs-pleth path').getAttribute('d'),stillA,'pause freezes trace');
   await page.locator('#vs-animation-toggle').click();
   await page.locator('#vs-next-record').click();
   assert.equal((await page.locator('#vs-hr').textContent()).trim(),'82','next pulse');
   await page.locator('#vs-compare').click();
   assert.match(await page.locator('#vs-compare-result').textContent(),/\+4\/min/);
   await page.locator('#vs-example').selectOption('artefact');
   await page.locator('#vs-next-record').click();
   assert.match(await page.locator('#vs-quality').textContent(),/αμφίβολη/);
   assert.equal(await page.locator('#vs-wave-warning').isVisible(),true,'unreliable wave warning');
   assert.equal(await page.locator('#vs-pleth path').getAttribute('d'),'','no misleading waveform with bad signal');
   await page.locator('#vs-compare').click();
   assert.match(await page.locator('#vs-compare-result').textContent(),/δεν υπολογίζεται ασφαλής διαφορά/);
   await page.locator('#vs-topic-nav button').filter({hasText:'Παλμική οξυμετρία'}).click();
   await page.locator('#vs-interaction button').filter({hasText:'Αμφίβολο σήμα'}).click();
   assert.match(await page.locator('#vs-interaction .vs-task-status').textContent(),/Σωστά/);
   await page.locator('#vs-topic-nav button').filter({hasText:'Σφυγμός'}).click();
   await page.locator('#vs-count-answer').fill('76');
   await page.locator('#vs-interaction button').filter({hasText:'Έλεγχος υπολογισμού'}).click();
   assert.match(await page.locator('#vs-interaction .vs-task-status').textContent(),/Σωστά/);
   await page.locator('#vs-topic-nav button').filter({hasText:'Θερμοκρασία'}).click();
   await page.locator('#vs-interaction select').selectOption('unknown');
   await page.locator('#vs-interaction button').filter({hasText:'Έλεγξε την καταγραφή'}).click();
   assert.match(await page.locator('#vs-interaction .vs-task-status').textContent(),/Σωστά/);
   await page.locator('#vs-topic-nav button').filter({hasText:'Αρτηριακή πίεση'}).click();
   assert.equal(await page.locator('#vs-bp-demo').isVisible(),true,'BP tool visible for BP topic');
   await page.locator('#vs-bp-start').click();
   await page.waitForTimeout(200);
   assert.match(await page.locator('#vs-bp-state').textContent(),/διόγκωση|εκτόνωση/,'BP measurement demonstration moves');
   await page.locator('#vs-topic-nav button').filter({hasText:'Αναπνοές'}).click();
   const rrA=await page.locator('#vs-resp-trace path').getAttribute('d');
   await page.waitForTimeout(190);
   assert.notEqual(await page.locator('#vs-resp-trace path').getAttribute('d'),rrA,'respiratory trace animates');
   await page.locator('#vs-topic-nav button').filter({hasText:'Επίπεδο συνείδησης'}).click();
   await page.locator('#vs-interaction button[aria-label="Επιλογή A κατά AVPU"]').click();
   assert.match(await page.locator('#vs-interaction .vs-task-status').textContent(),/Σωστά/);
   await page.locator('#vs-interaction button').filter({hasText:'Άλλη παρατήρηση'}).click();
   await page.locator('#vs-interaction button[aria-label="Επιλογή V κατά AVPU"]').click();
   assert.match(await page.locator('#vs-interaction .vs-task-status').textContent(),/Σωστά/);
   await page.locator('#vs-topic-nav button').filter({hasText:'Επανεκτίμηση & παράδοση'}).click();
   await page.locator('#vs-interaction .vs-inline-label input').nth(0).fill('2');
   await page.locator('#vs-interaction .vs-inline-label input').nth(1).fill('1');
   await page.locator('#vs-interaction .vs-uncertainty input').check();
   await page.locator('#vs-interaction button').filter({hasText:'Έλεγξε τις μεταβολές'}).click();
   assert.match(await page.locator('#vs-interaction .vs-task-status').textContent(),/Σωστά/);
   // Quiz feedback and live links remain operational.
   await page.locator('[data-vs-step="quiz"]').click();
   assert.equal(await page.locator('#vs-quiz-panel').isVisible(),true,'quiz step visible');
   assert.equal(await page.locator('#vs-observation-panel').isVisible(),false,'monitor hidden in quiz step');
   await page.locator('#vs-choices button').nth(1).click();
   assert.match(await page.locator('#vs-feedback').textContent(),/απάντηση|επανάληψη/);
   await page.locator('[data-vs-step="handover"]').click();
   assert.equal(await page.locator('#vs-handover-panel').isVisible(),true,'handover step visible');
   assert.match(await page.locator('#vs-handover').textContent(),/ΑΝΤΙΚΕΙΜΕΝΙΚΗ|Αντικειμενική|καταγραφή/i);
   assert.equal(await page.locator('a[href="mentor-ecg.html"]').count()>0,true,'existing ECG link');
   assert.equal(await page.locator('a[href="mentor-oral.html?practice=handover"]').count()>0,true,'handover link');
   assert.equal(errors.length,0,'no uncaught JavaScript errors: '+errors.join('; '));
   // Verify the existing canonical ECG monitor really moves and pause works.
   const ecgPage=await context.newPage();
   const ecgErrors=[];ecgPage.on('pageerror',e=>ecgErrors.push(e.message));
   await ecgPage.goto(base+'/tools/ecg-lab/monitor.html',{waitUntil:'load',timeout:45000});
   await ecgPage.locator('#pause-monitor:not([disabled])').waitFor();
   await ecgPage.waitForTimeout(190);
   const ecgFirst=await ecgPage.locator('#trace').evaluate(el=>el.toDataURL());
   await ecgPage.waitForTimeout(310);
   const ecgSecond=await ecgPage.locator('#trace').evaluate(el=>el.toDataURL());
   assert.notEqual(ecgFirst,ecgSecond,'canonical ECG monitor animates after load');
   await ecgPage.locator('#pause-monitor').click();
   const ecgPaused=await ecgPage.locator('#trace').evaluate(el=>el.toDataURL());
   await ecgPage.waitForTimeout(150);
   assert.equal(await ecgPage.locator('#trace').evaluate(el=>el.toDataURL()),ecgPaused,'canonical ECG pause stops movement');
   assert.deepEqual(ecgErrors,[],'ECG browser has no JavaScript errors');
   await ecgPage.close();
   results.push(width+'px: focused UX, pleth/resp motion, pause, BP cycle, quality, AVPU, quiz & handover OK');
  }finally{await context.close()}
 }
}finally{await browser.close()}
console.log('Vital-signs interactive smoke passed · '+results.join(' · '));
