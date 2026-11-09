/**
 * Real Chromium integration smoke of the ONE anatomy workspace.
 * No AI requests; no student data updates. Optional heavy atlas validation.
 */
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {chromium} from 'playwright';
import {readFileSync} from 'node:fs';
import {sharedRegistryAssets} from '../tools/atla-ai/model-preview-catalog.mjs';
import {atlasRole} from '../tools/atla-ai/anatomy-curation.mjs';
const library=JSON.parse(readFileSync(new URL('../tools/atla-ai/resources/model-library.json',import.meta.url),'utf8'));
const byId=new Map(library.models.map(m=>[String(m.id),m]));
const curated={anatomy:0,pathology:0};
for(const item of sharedRegistryAssets(library,{tool:'anatomy',dataset:'all'}).filter(x=>x.available)){const role=atlasRole(byId.get(item.id)).role;if(role)curated[role]++;}
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
  const response=await page.goto(root+'tools/anatomy-3d/index.html?focus=heart',{waitUntil:'load',timeout:45000});
  assert(response?.ok(),size+': legacy anatomy URL');
  await page.waitForURL(/\/ui-tools\/anatomy-3d\/index\.html\?focus=heart$/,{timeout:15000});
  const path='ui-tools/anatomy-3d/index.html';
  {
   await page.goto(root+path,{waitUntil:'domcontentloaded',timeout:45000});
   assert.equal(await page.locator('#unified-basic[aria-selected=true]').count(),1);
   assert.equal(await page.locator('#unified-catalog[aria-selected=false]').count(),1);
   assert.match(await page.locator('#unified-catalog').textContent(),/Λεπτομερής εξερεύνηση/);
   assert.equal(await page.locator('iframe').count(),0,'same-page first-party only');
   assert(await page.locator('#base-anatomy').isVisible(),size+': base human body hidden');
   // Whole body: select a heart structure, then open its detail models on the same page.
   await page.locator('#anatomySearch').fill('τριγλώχινας');
   await page.locator('.item-name').first().waitFor({timeout:30000});
   await page.locator('.item-name').first().click();
   assert.match(await page.locator('#detailOriginal').textContent(),/tricuspid/i);
   await page.locator('#detailExplore').click();
   await page.waitForFunction(()=>/Λεπτομερή μοντέλα|Δεν υπάρχει ακόμη/.test(document.getElementById('source-status')?.textContent||''),null,{timeout:30000});
   assert.match(await page.locator('#source-status').textContent(),/Λεπτομερή μοντέλα/);
   const heart=await page.locator('#source-model option').allTextContents();
   assert.ok(heart.length>=5&&heart.some(o=>/Καρδιά/.test(o)),'heart detail models listed');
   assert.ok(heart.every(o=>!/εγκεφάλ|κοιλιακ/i.test(o)),'no unrelated structures: '+heart.join(' | '));
   // Curated library: only human anatomy and labelled pathology, never molecules or simulator characters.
   await page.locator('#source-query').fill('');
   await page.locator('#study-filter').selectOption('anatomy');
   assert.match(await page.locator('#source-count').textContent(),new RegExp('^'+curated.anatomy+' εγγραφές'),'curated anatomy count');
   await page.locator('#study-filter').selectOption('pathology');
   assert.match(await page.locator('#source-count').textContent(),new RegExp('^'+curated.pathology+' εγγραφές'),'pathology is separate');
   assert.equal(await page.locator('#study-filter option[value="research"]').count(),0,'no research category in the atlas');
   await page.locator('#study-filter').selectOption('all');
   for(const hidden of ['pollen','Ebola','MakeHuman','Bulldog'])
    {await page.locator('#source-query').fill(hidden);assert.match(await page.locator('#source-count').textContent(),/^0 εγγραφές/,hidden+' must not reach the atlas');}
   await page.locator('#study-filter').selectOption('anatomy');
   await page.locator('#source-query').fill('3DPX-000170');
   assert.match(await page.locator('#source-education-summary').textContent(),/Επιγονατίδα/,'NIH accession search works');
   await page.locator('#source-query').fill('patella');
   assert.match(await page.locator('#source-education-summary').textContent(),/Επιγονατίδα/,'original English NIH title search works');
   await page.locator('#source-query').fill('');
   assert.equal(await page.locator('#models').isVisible(),true,'detail view must be in-page');
   assert.equal(await page.locator('#source-canvas').count(),1);
   assert.equal(new URL(page.url()).pathname,'/'+path,'same-path navigation');
   await page.locator('#atlas-version').selectOption('bp3d43');
   await page.locator('#atlas-version').selectOption('bp3d40');
   await page.locator('#unified-basic').click();
   assert(await page.locator('#base-anatomy').isVisible(),'base model must restore');
   assert(!await page.locator('#models').isVisible(),'detail view should be hidden');
   assert(!(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+8)),size+': viewport horizontal overflow');
   console.log('PASS '+size+': one anatomy atlas, structure detail exploration, curated library and atlas controls');
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
