/**
 * Regression for the official-source practical EOPPEP teaching page:
 * 6 scenarios and 12 skills remain as study material, no patient simulator launch.
 */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {chromium} from 'playwright';
import {spawn} from 'node:child_process';
const html=readFileSync('practical_exam.html','utf8');
assert.match(html,/12 ενδεικτικές πρακτικές δεξιότητες/);
assert.match(html,/6 ενδεικτικά σενάρια/);
assert.doesNotMatch(html,/src="eoppep-practical-cockpit.mjs"/);
assert.doesNotMatch(html,/href="mentor-next\.html"/);
const server=spawn('python3',['-m','http.server','8787','--bind','127.0.0.1'],{stdio:'ignore'});
let browser;
try{
 let started=false;for(let i=0;i<80;i++){try{if((await fetch('http://127.0.0.1:8787/practical_exam.html')).ok){started=true;break;}}catch{}await new Promise(r=>setTimeout(r,250));}
 assert(started,'EOPPEP practical source unavailable');
 browser=await chromium.launch({headless:true});
 for(const [device,width,height] of [['mobile',390,844],['desktop',1440,900]]){
  const page=await browser.newPage({viewport:{width,height},serviceWorkers:'block'});
  await page.goto('http://127.0.0.1:8787/practical_exam.html',{waitUntil:'domcontentloaded'});
  assert.equal(await page.locator('.practical-video-card').count()>=8,true,'Original equipment/skills and six case teaching videos remain');
  assert.equal(await page.locator('.practical-cockpit-row').count(),0,'No retired simulator entry injected');
  assert(await page.locator('#practical-scenarios').count()===1);
  console.log('PASS '+device+': official EOPPEP practical content retained, no patient simulator');
  await page.close();
 }
}finally{await browser?.close();server.kill();}
