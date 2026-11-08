import assert from 'node:assert/strict';
import {chromium,webkit} from 'playwright';
import {spawn} from 'node:child_process';
import {mkdirSync,readFileSync} from 'node:fs';
const port=8768,base='http://127.0.0.1:'+port;
const server=spawn('python3',['-m','http.server',String(port),'--bind','127.0.0.1'],{stdio:'ignore'});
const library=JSON.parse(readFileSync('tools/atla-ai/resources/model-library.json','utf8'));
const served=library.models.filter(m=>m.source==='nih3d'&&m.delivery);
const refs=(page,scope='')=>page.locator(scope+' .nih3d-research-reference');
mkdirSync('browser-qa-results',{recursive:true});
let browser;
async function ready(){
 for(let n=0;n<80;n++){
  try{const r=await fetch(base+'/saek-course-01.html');await r.text();if(r.ok)return;}catch{}
  await new Promise(r=>setTimeout(r,250));
 }
 throw Error('NIH browser test server unavailable');
}
async function visit(page,path){const r=await page.goto(base+path,{waitUntil:'domcontentloaded',timeout:45000});assert(r?.ok(),path+' HTTP '+r?.status());}
function tracked(page){
 const nih=[],errors=[];
 page.on('request',r=>{if(/(^|\.)nih\.gov/.test(new URL(r.url()).hostname))nih.push(r.url())});
 page.on('pageerror',e=>errors.push(String(e)));
 return {nih,errors};
}
async function contextualSurfaces(ctx,name){
 const page=await ctx.newPage();
 const {nih,errors}=tracked(page);
 await visit(page,'/saek-course-01.html');
 const link=page.locator('#lesson-2 .nih3d-research-reference a[data-accession="3DPX-000170"]');
 await link.waitFor({state:'attached',timeout:20000});
 const href=await link.getAttribute('href');
 assert.match(href,/atla-resource-preview\.html\?tool=anatomy&dataset=nih&model=3DPX-000170&from=/);
 assert.equal(await link.getAttribute('target'),null,'A lesson link keeps the same tab so the return works');
 assert(await refs(page,'#lesson-2').count()<=12,'No mass listing in a chapter');
 assert.equal(await refs(page,'#lesson-1').count(),0,'No model without chapter evidence');
 await visit(page,'/saek-exams.html');
 const exam=(text,revealed)=>page.evaluate(detail=>window.dispatchEvent(new CustomEvent('atla:saek-exam-question',{detail})),{text,revealed});
 assert.equal(await refs(page,'#examReference').count(),0);
 await exam('Τι είναι η επιγονατίδα;',false);
 await page.waitForTimeout(500);
 assert.equal(await refs(page,'#examReference').count(),0,'Never hint before answer reveal');
 assert.equal(await page.evaluate(()=>performance.getEntriesByType('resource').some(r=>r.name.includes('model-library.json'))),false,'The library is not even fetched before reveal');
 await exam('Τι είναι η επιγονατίδα;',true);
 await refs(page,'#examReference').first().waitFor({state:'attached'});
 assert.equal(await page.locator('#examReference .nih3d-research-reference a').getAttribute('target'),'_blank','The running exam stays intact');
 await exam('Τι είναι η αορτή;',true);
 await page.waitForFunction(()=>document.querySelectorAll('#examReference .nih3d-research-reference').length===0);
 await visit(page,'/mentor-next.html');
 const cockpit=(confirmedAnatomy,clinicalStructureConfirmed)=>page.evaluate(detail=>window.dispatchEvent(new CustomEvent('atla:nih3d-cockpit-anatomy',{detail})),{confirmedAnatomy,clinicalStructureConfirmed});
 assert.equal(await refs(page).count(),0,'Synthetic incidents are not confirmed fractures');
 await cockpit('Επιγονατίδα',false);
 await page.waitForTimeout(500);
 assert.equal(await refs(page).count(),0);
 await cockpit('Βραχιόνιο',true);
 await page.waitForTimeout(500);
 assert.equal(await refs(page).count(),0,'A named structure alone never shows a fracture');
 await cockpit('Επιγονατίδα',true);
 await page.locator('.nih3d-research-reference[data-cockpit]').waitFor({state:'attached'});
 await cockpit('Τροχαίο',true);
 await page.waitForFunction(()=>document.querySelectorAll('.nih3d-research-reference').length===0);
 await visit(page,'/ui-tools/anatomy-3d/index.html');
 await page.evaluate(()=>{
  document.querySelector('#detailName').textContent='Επιγονατίδα';
  document.querySelector('#detailCard').hidden=false;
 });
 await page.locator('#detailCard .nih3d-research-reference').waitFor({state:'attached'});
 await page.evaluate(()=>{document.querySelector('#detailName').textContent='Μηριαία αρτηρία';});
 await page.waitForFunction(()=>document.querySelectorAll('#detailCard .nih3d-research-reference').length===0);
 assert.deepEqual(nih,[],'Contextual surfaces make no NIH network request');
 assert.deepEqual(errors,[]);
 console.log('PASS contextual surfaces: '+name);
 await page.close();
}
async function viewerJourney(ctx,name,accession){
 const page=await ctx.newPage();
 const {nih,errors}=tracked(page);
 await visit(page,'/saek-course-01.html#lesson-2');
 const link=page.locator('#lesson-2 .nih3d-research-reference a[data-accession="'+accession+'"]');
 await link.waitFor({state:'attached',timeout:20000});
 const modelRequests=[];
 page.on('request',r=>{if(/\.glb($|\?)/.test(r.url()))modelRequests.push(r.url())});
 await page.goto(new URL(await link.getAttribute('href'),base).href,{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>/Φορτώθηκε/.test(document.querySelector('#source-status')?.textContent||''),null,{timeout:90000});
 assert.equal(modelRequests.length,1,'Exactly the requested model is downloaded');
 assert.equal(new URL(modelRequests[0]).origin,base,'The model comes from our own infrastructure');
 assert(modelRequests[0].endsWith('tools/atla-ai/resources/nih3d-library/models/'+accession+'.glb'));
 const details=await page.locator('#source-details').innerText();
 for(const text of ['Κατάσταση έγκρισης','Χωρίς επιστημονική ή κλινική επικύρωση','Πλευρικότητα',accession,'Πρωτότυπη σελίδα NIH 3D'])assert(details.includes(text),'Missing detail: '+text);
 assert.equal(await page.locator('#source-license').innerText().then(t=>t.includes('Public Domain')),true);
 for(const id of ['part-isolate','part-show','view-front','view-side','view-reset'])await page.click('#'+id);
 await page.fill('#source-opacity','40').catch(()=>page.locator('#source-opacity').evaluate(e=>{e.value='40';e.dispatchEvent(new Event('input'))}));
 assert.equal(await page.locator('#opacity-value').innerText(),'40%');
 const canvas=await page.locator('#source-canvas').boundingBox();
 await page.mouse.move(canvas.x+canvas.width/2,canvas.y+canvas.height/2);
 await page.mouse.down();await page.mouse.move(canvas.x+canvas.width/2+60,canvas.y+canvas.height/2+20);await page.mouse.up();
 const pixels=await page.locator('#source-canvas').screenshot({path:'browser-qa-results/nih3d-'+name+'-'+accession+'.png'});
 assert(pixels.length>4000,'The canvas rendered visible content');
 await page.click('#source-back');
 await page.waitForURL(/saek-course-01\.html#lesson-2$/,{timeout:30000});
 assert.equal(await page.locator('#lesson-2').evaluate(e=>e.open),true,'Returns to the same open chapter');
 assert.deepEqual(nih,[],'The model never depends on a live NIH URL');
 assert.deepEqual(errors,[]);
 console.log('PASS real model load and return: '+name+' '+accession);
 await page.close();
}
async function failureModes(ctx,name){
 const page=await ctx.newPage();
 const accession='3DPX-000170';
 const url='/ui-tools/atla-resource-preview.html?tool=anatomy&dataset=nih&model='+accession+'&from=https://evil.example/';
 await page.route('**/models/'+accession+'.glb',async route=>{
  const response=await route.fetch();const body=Buffer.from(await response.body());body[100]^=255;
  await route.fulfill({response,body});
 });
 await visit(page,url);
 await page.waitForFunction(()=>document.querySelector('#source-status')?.dataset.error==='true',null,{timeout:60000});
 assert.match(await page.locator('#source-status').innerText(),/SHA-256/,'Altered bytes never reach the parser');
 assert.doesNotMatch(await page.locator('#source-back').getAttribute('href'),/evil/,'No external return redirect');
 await page.unroute('**/models/'+accession+'.glb');
 await page.route('**/models/'+accession+'.glb',route=>route.fulfill({status:503,body:'x'}));
 await visit(page,url);
 await page.waitForFunction(()=>document.querySelector('#source-status')?.dataset.error==='true',null,{timeout:60000});
 assert.match(await page.locator('#source-status').innerText(),/503/,'Greek error, not a blank canvas');
 await page.unroute('**/models/'+accession+'.glb');
 await page.route('**/model-library.json',route=>route.fulfill({status:500,body:'x'}));
 await visit(page,'/saek-course-01.html');
 await page.waitForTimeout(1500);
 assert.equal(await refs(page).count(),0,'A missing registry fails closed and leaves the lesson usable');
 assert.equal(await page.locator('#lesson-2').count(),1);
 console.log('PASS failure modes: '+name);
 await page.close();
}
try{
 await ready();
 assert(served.length>=10,'Real served NIH models required');
 const glArgs=['--use-gl=angle','--use-angle=swiftshader','--enable-webgl','--ignore-gpu-blocklist','--no-sandbox'];
 browser=await chromium.launch({headless:true,args:glArgs});
 for(const [name,width,height] of [['desktop',1440,900],['mobile',390,844]]){
  const ctx=await browser.newContext({viewport:{width,height},serviceWorkers:'block'});
  await contextualSurfaces(ctx,name);
  await viewerJourney(ctx,name,'3DPX-000170');
  await failureModes(ctx,name);
  await ctx.close();
 }
 // Every model that is served must really load: the registry is not trusted on its word.
 const ctx=await browser.newContext({viewport:{width:900,height:700},serviceWorkers:'block'});
 const page=await ctx.newPage();
 const {nih}=tracked(page);
 const results=[];
 for(const model of served){
  await visit(page,'/ui-tools/atla-resource-preview.html?tool=anatomy&dataset=nih&model='+model.accession);
  await page.waitForFunction(()=>{const s=document.querySelector('#source-status');return s&&(/Φορτώθηκε/.test(s.textContent)||s.dataset.error==='true')},null,{timeout:90000});
  const status=await page.locator('#source-status').innerText();
  results.push({accession:model.accession,loaded:/Φορτώθηκε/.test(status),status,bytes:model.delivery.bytes});
 }
 await ctx.close();
 const failed=results.filter(r=>!r.loaded);
 console.log('NIH_MODEL_LOADS',JSON.stringify({total:results.length,failed}));
 assert.deepEqual(failed,[],'Every served model must load');
 assert.deepEqual(nih,[]);
 await browser.close();
 browser=await webkit.launch({headless:true});
 const phone=await browser.newContext({viewport:{width:390,height:844},serviceWorkers:'block'});
 await viewerJourney(phone,'webkit-mobile','3DPX-000170');
 await phone.close();
 console.log('PASS NIH shared library browser acceptance');
}finally{await browser?.close();server.kill();}
