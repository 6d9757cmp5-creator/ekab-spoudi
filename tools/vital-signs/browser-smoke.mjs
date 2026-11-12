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
   assert.equal((await page.locator('#vs-hr').textContent()).trim(),'78','default pulse');
   await page.locator('#vs-next-record').click();
   assert.equal((await page.locator('#vs-hr').textContent()).trim(),'82','next pulse');
   await page.locator('#vs-compare').click();
   assert.match(await page.locator('#vs-compare-result').textContent(),/\+4\/min/);
   await page.locator('#vs-example').selectOption('artefact');
   await page.locator('#vs-next-record').click();
   assert.match(await page.locator('#vs-quality').textContent(),/αμφίβολη/);
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
   await page.locator('#vs-choices button').nth(1).click();
   assert.match(await page.locator('#vs-feedback').textContent(),/απάντηση|επανάληψη/);
   assert.equal(await page.locator('a[href="mentor-ecg.html"]').count()>0,true,'existing ECG link');
   assert.equal(await page.locator('a[href="mentor-oral.html?practice=handover"]').count()>0,true,'handover link');
   assert.equal(errors.length,0,'no uncaught JavaScript errors: '+errors.join('; '));
   results.push(width+'px: monitor, comparison, quality, 5 subtopics, quiz, links OK');
  }finally{await context.close()}
 }
}finally{await browser.close()}
console.log('Vital-signs interactive smoke passed · '+results.join(' · '));
