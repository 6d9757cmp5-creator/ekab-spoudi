import {chromium} from 'playwright';
import {spawn} from 'node:child_process';
import {mkdirSync,readFileSync} from 'node:fs';
import {buildModelList} from '../tools/atla-ai/model-preview-catalog.mjs';
const BASE='http://127.0.0.1:8876/';
mkdirSync('browser-qa-results',{recursive:true});
const server=spawn('python3',['-m','http.server','8876','--bind','127.0.0.1'],{stdio:'ignore'});
let browser;const failures=[];
try{
 let ready=false;
 for(let i=0;i<80;i++){try{const r=await fetch(BASE);if(r.ok){ready=true;break}}catch{}await new Promise(r=>setTimeout(r,200))}
 if(!ready)throw Error('Local server failed to start');
 browser=await chromium.launch({headless:true,args:['--use-gl=angle','--use-angle=swiftshader','--enable-webgl','--no-sandbox']});
 const inputs=[
  {tool:'anatomy',filename:'tools/anatomy-3d/resources/imported-manifest.json',sourceType:'primary',expected:54},
  {tool:'anatomy',filename:'tools/anatomy-3d/resources/z-anatomy-research/imported-manifest.json',sourceType:'research',expected:5},
  {tool:'cockpit',filename:'tools/patient-simulator/resources/quaternius/imported-manifest.json',sourceType:'primary',expected:2},
  {tool:'cockpit',filename:'tools/patient-simulator/assets/patients/preview-manifest.json',sourceType:'patients',expected:3}
 ];
 for(const test of inputs){
  const page=await browser.newPage({viewport:{width:920,height:720},deviceScaleFactor:1});
  const errors=[],requests=[];
  page.on('pageerror',e=>errors.push(e.message));
  page.on('request',req=>{if(/3d\.nih\.gov/.test(req.url()))requests.push(req.url())});
  const sources=JSON.parse(readFileSync(test.filename,'utf8'));
  const opts=buildModelList(test.tool,sources,test.sourceType);
  const smallest=opts.reduce((n,a,i)=>a.bytes<opts[n].bytes?i:n,0);
  await page.goto(BASE+'ui-tools/atla-resource-preview.html?tool='+test.tool,{waitUntil:'domcontentloaded'});
  if(test.sourceType!=='primary')await page.selectOption('#source-dataset','secondary');
  await page.waitForFunction(count=>document.querySelector('#source-model').options.length===count,test.expected,{timeout:60000});
  if(await page.locator('#source-load').isDisabled())throw Error(test.tool+' cannot select source');
  await page.selectOption('#source-model',String(smallest));
  await page.locator('#source-load').click();
  try{
   await page.waitForFunction(()=>document.querySelector('#source-status').textContent.includes('Φορτώθηκε'),null,{timeout:120000});
  }catch(e){
   failures.push(test.tool+' render status: '+await page.locator('#source-status').textContent()+' ; '+String(e).slice(0,150));
  }
  if(requests.length)failures.push(test.tool+' made unexpected NIH download requests');
  if(errors.length)failures.push(test.tool+' page errors: '+errors.slice(0,3).join(' | '));
  await page.screenshot({path:'browser-qa-results/atla-resource-'+test.tool+'-'+test.sourceType+'.png',fullPage:true});
  console.log('BROWSER '+test.tool+' source='+test.sourceType+' assets='+opts.length+' selected='+opts[smallest].label+' errors='+errors.length);
  await page.close();
 }
}finally{
 await browser?.close();
 server.kill('SIGTERM');
}
if(failures.length)throw Error(failures.join('\n'));
console.log('PASS GLB rendering in Anatomy Lab and Clinical Cockpit standalone previews');
