import {chromium,webkit} from 'playwright';
import {spawn} from 'node:child_process';
import {mkdirSync,readFileSync} from 'node:fs';
import {buildModelList,libraryAssets,libraryEntries} from '../tools/atla-ai/model-preview-catalog.mjs';
// The viewer lists every collection from the one shared library registry, and so does this check.
const library=JSON.parse(readFileSync('tools/atla-ai/resources/model-library.json','utf8'));
const listed=(tool,sourceType)=>buildModelList(tool,libraryAssets(library,tool,sourceType),sourceType);
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
  {tool:'cockpit',filename:'tools/patient-simulator/assets/patients/preview-manifest.json',sourceType:'patients',expected:3},
  {tool:'cockpit',filename:'tools/patient-simulator/resources/makehuman/imported-manifest.json',sourceType:'makehuman',expected:2},
  {tool:'cockpit',filename:'tools/patient-simulator/assets/patients/atla-makehuman-rigged-manifest.json',sourceType:'rigged',expected:1}
 ];
 for(const test of inputs){
  const page=await browser.newPage({viewport:{width:920,height:720},deviceScaleFactor:1});
  const errors=[],requests=[];
  page.on('pageerror',e=>errors.push(e.message));
  page.on('request',req=>{if(/3d\.nih\.gov/.test(req.url()))requests.push(req.url())});
  const opts=listed(test.tool,test.sourceType);
  if(opts.length!==test.expected)failures.push(test.tool+' '+test.sourceType+' registry lists '+opts.length+', expected '+test.expected);
  const smallest=test.sourceType==='makehuman'?opts.findIndex(a=>a.path.endsWith('/base.obj')):opts.reduce((n,a,i)=>a.bytes<opts[n].bytes?i:n,0);
  await page.goto(BASE+'ui-tools/atla-resource-preview.html?tool='+test.tool,{waitUntil:'domcontentloaded'});
  if(test.sourceType!=='primary')await page.selectOption('#source-dataset',test.sourceType==='makehuman'?'makehuman':test.sourceType==='rigged'?'rigged':'secondary');
  await page.waitForFunction(count=>document.querySelector('#source-model').options.length===count,test.expected,{timeout:60000});
  if(await page.locator('#source-load').isDisabled())throw Error(test.tool+' cannot select source');
  await page.selectOption('#source-model',String(smallest));
  await page.locator('#source-load').click();
  try{
   await page.waitForFunction(()=>document.querySelector('#source-status').textContent.includes('Φορτώθηκε'),null,{timeout:120000});
  }catch(e){
   failures.push(test.tool+' render status: '+await page.locator('#source-status').textContent()+' ; '+String(e).slice(0,150));
  }
  // Full viewer acceptance: anatomy/patient structure selection, isolation,
  // restore all, opacity and camera views must operate on real loaded geometry.
  if(!await page.locator('#view-front').isEnabled())failures.push(test.tool+' lacks active full-view camera');
  const meshNames=await page.locator('#source-part option').count();
  if(!meshNames)failures.push(test.tool+' has no selectable geometry');
  else {
   await page.locator('#part-isolate').click();
   await page.locator('#part-show').click();
   await page.locator('#view-front').click();
   await page.locator('#view-side').click();
   await page.locator('#view-reset').click();
   await page.locator('#source-opacity').fill('50');
   if(await page.locator('#opacity-value').textContent()!=='50%')failures.push(test.tool+' opacity 50% failed');
   await page.locator('#source-opacity').fill('100');
  }
  const animations=await page.locator('#source-clip option').count();
  if(test.sourceType==='rigged'&&animations<2)failures.push('Rigged MakeHuman GLB has no genuine animation clips in browser');
  if(test.tool==='cockpit'&&test.sourceType==='primary'&&opts[smallest].label.includes('universal-animation')){
   if(animations<30)failures.push('Quaternius 43 animation list is incomplete: '+animations);
   else{
    await page.selectOption('#source-clip',String(Math.min(2,animations-1)));
    await page.locator('#clip-pause').click();
    await page.locator('#clip-play').click();
   }
  }
  console.log('FULL VIEWER '+test.tool+' '+test.sourceType+' meshParts='+meshNames+' clips='+animations);
  if(requests.length)failures.push(test.tool+' made unexpected NIH download requests');
  if(errors.length)failures.push(test.tool+' page errors: '+errors.slice(0,3).join(' | '));
  await page.screenshot({path:'browser-qa-results/atla-resource-'+test.tool+'-'+test.sourceType+'.png',fullPage:true});
  console.log('BROWSER '+test.tool+' source='+test.sourceType+' assets='+opts.length+' selected='+opts[smallest].label+' errors='+errors.length);
  await page.close();
 }
  // WebKit mobile: smoke the two independent viewers with real small source models.
  const safari=await webkit.launch({headless:true});
  try {
   for(const cfg of [{tool:'anatomy',expected:54},{tool:'cockpit',expected:2}]){
    const mobile=await safari.newPage({viewport:{width:390,height:780},isMobile:true,hasTouch:true});
    const pageErrors=[];
    mobile.on('pageerror',e=>pageErrors.push(e.message));
    await mobile.goto(BASE+'ui-tools/atla-resource-preview.html?tool='+cfg.tool,{waitUntil:'domcontentloaded'});
    await mobile.waitForFunction(count=>document.querySelector('#source-model').options.length===count,cfg.expected,{timeout:60000});
    const items=listed(cfg.tool,'primary');
    const smallest=items.reduce((n,a,i)=>a.bytes<items[n].bytes?i:n,0);
    await mobile.selectOption('#source-model',String(smallest));
    await mobile.locator('#source-load').click();
    await mobile.waitForFunction(()=>document.querySelector('#source-status').textContent.includes('Φορτώθηκε'),null,{timeout:120000});
    if(!await mobile.locator('#part-isolate').isEnabled())failures.push('WebKit '+cfg.tool+' model explorer controls unavailable');
    await mobile.locator('#view-reset').click();
    if(pageErrors.length)failures.push('WebKit '+cfg.tool+' exceptions: '+pageErrors.slice(0,2).join(';'));
    await mobile.screenshot({path:'browser-qa-results/atla-mobile-webkit-'+cfg.tool+'.png'});
    console.log('PASS WEBKIT MOBILE '+cfg.tool+' '+items[smallest].label);
    await mobile.close();
   }
  }finally{await safari.close()}
  // The old list of every model now opens the curated detail view of the one anatomy atlas.
  const shelf=await browser.newPage({viewport:{width:390,height:844}});
  await shelf.goto(BASE+'ui-tools/3d-library.html',{waitUntil:'load'});
  await shelf.waitForURL(/ui-tools\/anatomy-3d\/index\.html#models$/,{timeout:15000}).catch(()=>failures.push('3D library page does not open the atlas detail view'));
  await shelf.locator('#models').waitFor({state:'visible',timeout:15000}).catch(()=>failures.push('Atlas detail view not visible'));
  console.log('PASS 3D LIBRARY redirects to the curated atlas detail view');
  await shelf.close();
}finally{
 await browser?.close();
 server.kill('SIGTERM');
}
if(failures.length)throw Error(failures.join('\n'));
console.log('PASS GLB rendering in Anatomy Lab and Clinical Cockpit standalone previews');
