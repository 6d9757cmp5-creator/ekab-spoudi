/**
 * Real Chromium integration smoke of the ONE anatomy workspace.
 * No AI requests; no student data updates. Optional heavy atlas validation.
 */
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {chromium} from 'playwright';
const port=8789,root='http://127.0.0.1:'+port+'/';
const server=spawn(process.env.PYTHON_BIN||'python3',['-m','http.server',String(port),'--bind','127.0.0.1'],{stdio:'ignore'});
let browser;
async function ready(){
 for(let i=0;i<80;i++){
  try{const response=await fetch(root+'index.html');if(response.ok)return;}catch{}
  await new Promise(resolve=>setTimeout(resolve,250));
 }
 throw Error('Unable to start site for browser smoke');
}
try{
 await ready();
 browser=await chromium.launch({headless:true,args:['--enable-webgl','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 for(const [size,width,height,isMobile] of [['mobile',390,844,true],['desktop',1440,900,false]]){
  const context=await browser.newContext({viewport:{width,height},isMobile,hasTouch:isMobile,serviceWorkers:'block'});
  const page=await context.newPage();
  for(const path of ['ui-tools/anatomy-3d/index.html','tools/anatomy-3d/index.html']){
   const response=await page.goto(root+path,{waitUntil:'domcontentloaded',timeout:45000});
   assert(response?.ok(),size+': HTTP '+response?.status()+' for '+path);
   assert.equal(await page.locator('#unified-basic[aria-selected=true]').count(),1);
   assert.equal(await page.locator('#unified-catalog[aria-selected=false]').count(),1);
   assert.equal(await page.locator('iframe').count(),0,'same-page first-party only');
   const initial=await page.locator('#base-anatomy').isVisible();
   assert(initial,size+': base human body hidden');
   await page.locator('#unified-catalog').click();
   await page.locator('#source-count').waitFor({state:'visible',timeout:25000});
   await page.waitForFunction(()=>/\d+ εγγραφές/.test(document.getElementById('source-count')?.textContent||''),null,{timeout:30000});
   assert.match(await page.locator('#source-count').textContent(),/264 εγγραφές/,'default view is curated anatomy');
   await page.locator('#study-filter').selectOption('pathology');
   assert.match(await page.locator('#source-count').textContent(),/98 εγγραφές/,'pathology is separate');
   await page.locator('#source-query').fill('επιγονατίδα');
   assert.match(await page.locator('#source-education-summary').textContent(),/Παθολογικό παράδειγμα/,'pathology explained');
   await page.locator('#source-query').fill('');
   await page.locator('#study-filter').selectOption('research');
   assert.match(await page.locator('#source-count').textContent(),/178 εγγραφές/,'research records preserved');
   await page.locator('#study-filter').selectOption('all');
   assert.match(await page.locator('#source-count').textContent(),/540 εγγραφές/,'complete registry still available');
   await page.locator('#study-filter').selectOption('anatomy');
   await page.locator('#source-query').fill('επιγονατίδα');
   assert.match(await page.locator('#source-education-summary').textContent(),/Ανατομική δομή/,'normal anatomy explained');
   await page.locator('#source-query').fill('3DPX-000170');
   assert.match(await page.locator('#source-education-summary').textContent(),/Επιγονατίδα/,'NIH accession search works');
   await page.locator('#source-query').fill('patella');
   assert.match(await page.locator('#source-education-summary').textContent(),/Επιγονατίδα/,'original English NIH title search works');
   await page.locator('#source-query').fill('');
   assert.equal(await page.locator('#models').isVisible(),true,'specialist tab must be in-page');
   assert.equal(await page.locator('#source-canvas').count(),1);
   assert.equal(await page.locator('iframe').count(),0);
   assert.equal(new URL(page.url()).pathname,'/'+path,'same-path navigation');
   await page.locator('#source-query').fill('μηριαίο');
   assert.equal(await page.locator('#source-query').inputValue(),'μηριαίο');
   await page.locator('#atlas-version').selectOption('bp3d43');
   await page.locator('#atlas-version').selectOption('bp3d40');
   await page.locator('#unified-basic').click();
   assert(await page.locator('#base-anatomy').isVisible(),'base model must restore');
   assert(!await page.locator('#models').isVisible(),'catalog should be hidden');
   assert(!(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+8)),size+': viewport horizontal overflow');
   console.log('PASS '+size+' '+path+': single-page anatomy + specialist search + atlas controls');
  }
  await context.close();
 }
 if(process.env.ATLA_REAL_ATLAS==='1'){
  const page=await browser.newPage({viewport:{width:1440,height:900}});
  await page.goto(root+'ui-tools/anatomy-3d/index.html#models',{waitUntil:'domcontentloaded'});
  await page.locator('#atlas-load').click();
  await page.waitForFunction(()=>/Έτοιμος ο άτλας BodyParts3D 4\.0/.test(document.getElementById('atlas-status')?.textContent||'')||
   /Αποτυχία προβολής|Αδυναμία εκκίνησης/.test(document.getElementById('atlas-status')?.textContent||''),null,{timeout:180000});
  const message=await page.locator('#atlas-status').textContent();
  assert.match(message,/Έτοιμος ο άτλας BodyParts3D 4\.0/,'4.0 load failed: '+message);
  assert(await page.locator('#atlas-canvas').isVisible());
  await page.locator('#atlas-search').fill('femur');
  await page.locator('#atlas-results button').first().waitFor({state:'visible',timeout:10000});
  await page.locator('#atlas-results button').first().click();
  assert.match(await page.locator('#atlas-selected').textContent(),/Επιλογή:/);
  await page.locator('#atlas-unload').click();
  assert.equal(await page.locator('#atlas-stage').isVisible(),false);
  console.log('PASS real local BodyParts3D 4.0 WebGL2 render, picking and unload');
  if(process.env.ATLA_REAL_ATLAS_43==='1'){
   const errors=[];page.on('pageerror',error=>errors.push(String(error)));
   await page.locator('#atlas-version').selectOption('bp3d43');
   page.once('dialog',dialog=>dialog.accept());
   await page.locator('#atlas-load').click();
   await page.waitForFunction(()=>/Έτοιμος ο άτλας BodyParts3D 4\.3/.test(document.getElementById('atlas-status')?.textContent||'')||
    /Αποτυχία προβολής|Αδυναμία εκκίνησης/.test(document.getElementById('atlas-status')?.textContent||''),null,{timeout:300000});
   const message43=await page.locator('#atlas-status').textContent();
   assert.match(message43,/Έτοιμος ο άτλας BodyParts3D 4\.3.*3\.210/,'4.3 integrity-checked geometry load failed: '+message43);
   assert(await page.locator('#atlas-canvas').isVisible(),'4.3 canvas hidden');
   await page.locator('#atlas-search').fill('femur');
   await page.locator('#atlas-results button').first().waitFor({state:'visible',timeout:20000});
   await page.locator('#atlas-results button').first().click();
   assert.match(await page.locator('#atlas-selected').textContent(),/Επιλογή:/);
   await page.locator('#atlas-unload').click();
   assert.equal(await page.locator('#atlas-stage').isVisible(),false);
   assert.deepEqual(errors,[],'Uncaught browser errors while rendering 4.3');
   console.log('PASS real local BodyParts3D 4.3 four SHA-256 shards, 3210 meshes, WebGL2, selection and unload');
  }
  await page.close();
 }
}finally{await browser?.close();server.kill();}
