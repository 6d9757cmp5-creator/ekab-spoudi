import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {spawn} from 'node:child_process';
const port=8768,base='http://127.0.0.1:'+port;
const server=spawn('python3',['-m','http.server',String(port),'--bind','127.0.0.1'],{stdio:'ignore'});
let browser;
async function ready(){
 for(let n=0;n<80;n++){
  try{const r=await fetch(base+'/saek-course-01.html');if(r.ok)return;}catch{}
  await new Promise(r=>setTimeout(r,250));
 }
 throw Error('NIH browser test server unavailable');
}
async function visit(page,path){const r=await page.goto(base+path,{waitUntil:'domcontentloaded',timeout:45000});assert(r?.ok(),path+' HTTP '+r?.status());}
try{
 await ready();browser=await chromium.launch({headless:true});
 for(const [name,width,height] of [['desktop',1440,900],['mobile',390,844]]){
  const ctx=await browser.newContext({viewport:{width,height},serviceWorkers:'block'});
  const page=await ctx.newPage();
  await visit(page,'/saek-course-01.html');
  await page.locator('#lesson-2 .nih3d-research-reference a').waitFor({state:'attached',timeout:20000});
  const link=page.locator('#lesson-2 .nih3d-research-reference a');
  assert.equal(await link.getAttribute('href'),'https://3d.nih.gov/entries/3DPX-000170');
  assert.equal(await link.getAttribute('target'),'_blank');
  assert.match(await link.getAttribute('rel'),/noopener/);
  assert.equal(await page.locator('.nih3d-research-reference').count(),1,'No unrelated/duplicated links in all chapters');
  assert.equal(await page.locator('#lesson-1 .nih3d-research-reference').count(),0);
  await visit(page,'/saek-exams.html');
  assert.equal(await page.locator('#examReference .nih3d-research-reference').count(),0);
  await page.evaluate(()=>window.dispatchEvent(new CustomEvent('atla:saek-exam-question',{detail:{text:'Τι είναι η επιγονατίδα;',revealed:false}})));
  assert.equal(await page.locator('#examReference .nih3d-research-reference').count(),0,'Never hint before answer reveal');
  await page.evaluate(()=>window.dispatchEvent(new CustomEvent('atla:saek-exam-question',{detail:{text:'Τι είναι η επιγονατίδα;',revealed:true}})));
  await page.locator('#examReference .nih3d-research-reference').waitFor({state:'attached'});
  await page.evaluate(()=>window.dispatchEvent(new CustomEvent('atla:saek-exam-question',{detail:{text:'Τι είναι η αορτή;',revealed:true}})));
  assert.equal(await page.locator('#examReference .nih3d-research-reference').count(),0,'No stale/irrelevant exam reference');
  await visit(page,'/mentor-next.html');
  assert.equal(await page.locator('.nih3d-research-reference').count(),0,'Synthetic incidents are not confirmed fractures');
  await page.evaluate(()=>window.dispatchEvent(new CustomEvent('atla:nih3d-cockpit-anatomy',{detail:{confirmedAnatomy:'Επιγονατίδα',clinicalStructureConfirmed:false}})));
  assert.equal(await page.locator('.nih3d-research-reference').count(),0);
  await page.evaluate(()=>window.dispatchEvent(new CustomEvent('atla:nih3d-cockpit-anatomy',{detail:{confirmedAnatomy:'Επιγονατίδα',clinicalStructureConfirmed:true}})));
  await page.locator('.nih3d-research-reference[data-cockpit]').waitFor({state:'attached'});
  await page.evaluate(()=>window.dispatchEvent(new CustomEvent('atla:nih3d-cockpit-anatomy',{detail:{confirmedAnatomy:'Τροχαίο',clinicalStructureConfirmed:true}})));
  assert.equal(await page.locator('.nih3d-research-reference').count(),0);
  await visit(page,'/ui-tools/anatomy-3d/index.html');
  await page.evaluate(()=>{
   document.querySelector('#detailName').textContent='Επιγονατίδα';
   document.querySelector('#detailCard').hidden=false;
  });
  await page.locator('#detailCard .nih3d-research-reference').waitFor({state:'attached'});
  await page.evaluate(()=>{document.querySelector('#detailName').textContent='Αορτή';});
  await page.waitForFunction(()=>document.querySelectorAll('#detailCard .nih3d-research-reference').length===0);
  console.log('PASS NIH contextual browser interactions: '+name);
  await ctx.close();
 }
}finally{await browser?.close();server.kill();}
