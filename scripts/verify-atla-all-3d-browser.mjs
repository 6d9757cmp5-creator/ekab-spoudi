#!/usr/bin/env node
/** Exhaustive real-browser rendering of every viewable model in the existing ATLA library. */
import {chromium} from 'playwright';
import {spawn} from 'node:child_process';
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {buildModelList,libraryAssets} from '../tools/atla-ai/model-preview-catalog.mjs';

const registry=JSON.parse(readFileSync('tools/atla-ai/resources/model-library.json','utf8'));
const base='http://127.0.0.1:8876/';
const cases=[
 {tool:'anatomy',sourceType:'nih',dataset:'nih',expected:458},
 {tool:'anatomy',sourceType:'primary',dataset:'primary',expected:54},
 {tool:'anatomy',sourceType:'research',dataset:'secondary',expected:5},
 {tool:'cockpit',sourceType:'primary',dataset:'primary',expected:2},
 {tool:'cockpit',sourceType:'patients',dataset:'secondary',expected:3},
 {tool:'cockpit',sourceType:'makehuman',dataset:'makehuman',expected:2},
 {tool:'cockpit',sourceType:'rigged',dataset:'rigged',expected:1}
];
const report={scope:'FULL_525_MODEL_REAL_WEBGL_RENDERING',expected:525,checked:0,passes:0,failures:[],byCollection:[]};
const server=spawn('python3',['-m','http.server','8876','--bind','127.0.0.1'],{stdio:'ignore'});
mkdirSync('audit-results',{recursive:true});
let browser=null;
function failure(id,error){report.failures.push({id,error:String(error).slice(0,320)});}
try {
 let online=false;
 for(let k=0;k<75;k++){
  try{if((await fetch(base)).ok){online=true;break}}catch{}
  await new Promise(r=>setTimeout(r,200));
 }
 if(!online)throw Error('Local 3D source server did not start');
 browser=await chromium.launch({headless:true,args:['--use-gl=angle','--use-angle=swiftshader','--enable-webgl','--ignore-gpu-blocklist','--no-sandbox']});
 for(const item of cases){
  const assets=buildModelList(item.tool,libraryAssets(registry,item.tool,item.sourceType),item.sourceType);
  if(assets.length!==item.expected)failure(item.sourceType,'Catalogue expected '+item.expected+' but contains '+assets.length);
  let ok=0;
  // Reopen the page periodically so WebGL buffers and decoded textures cannot accumulate indefinitely.
  for(let start=0;start<assets.length;start+=20){
   const page=await browser.newPage({viewport:{width:1024,height:768},deviceScaleFactor:1,serviceWorkers:'block'});
   const errors=[];
   page.on('pageerror',e=>errors.push(String(e).slice(0,180)));
   try {
    await page.goto(base+'ui-tools/atla-resource-preview.html?tool='+item.tool,{waitUntil:'domcontentloaded',timeout:45000});
    if(item.dataset!=='primary')await page.selectOption('#source-dataset',item.dataset);
    await page.waitForFunction(count=>{
     const sel=document.querySelector('#source-model'),btn=document.querySelector('#source-load');
     return sel?.options.length===count&&!btn?.disabled;
    },assets.length,{timeout:45000});
    for(let index=start;index<Math.min(assets.length,start+20);index++){
     const asset=assets[index],id=item.sourceType+':'+asset.path;
     report.checked++;
     try {
      await page.selectOption('#source-model',String(index));
      await page.locator('#source-load').click({timeout:25000});
      await page.waitForFunction(()=>{
       const status=document.querySelector('#source-status');
       return status?.dataset.error==='true'||status?.textContent?.includes('Φορτώθηκε');
      },null,{timeout:90000});
      const text=await page.locator('#source-status').textContent();
      if(!text.includes('Φορτώθηκε')||await page.locator('#source-status').getAttribute('data-error')==='true')
       throw Error('Viewer rejected file: '+text);
      const hasCanvas=await page.locator('#source-canvas canvas').count()>0;
      const meshes=await page.locator('#source-part option').count();
      if(!hasCanvas||meshes<1)throw Error('No actual canvas / selectable mesh elements: '+meshes);
      report.passes++;ok++;
     }catch(e){
      failure(id,e?.message||e);
      if(report.failures.length<12)await page.screenshot({path:'audit-results/failed-'+report.failures.length+'.png'}).catch(()=>{});
     }
    }
    if(errors.length)failure(item.sourceType+':page-errors',errors.join(' | '));
   }catch(e){
    failure(item.sourceType+':batch-'+start,e.message||e);
    // No false claims: every skipped model in this batch is explicitly marked failed.
    for(let index=start;index<Math.min(start+20,assets.length);index++){
     const asset=assets[index];
     const id=item.sourceType+':'+asset.path;
     if(!report.failures.some(v=>v.id===id)){
      report.checked++;failure(id,'Cannot load collection batch or initialize viewer');
     }
    }
   }finally{await page.close();}
  }
  report.byCollection.push({tool:item.tool,sourceType:item.sourceType,expected:assets.length,passes:ok});
  console.log('3D RENDER',item.tool,item.sourceType,ok+'/'+assets.length);
 }
}catch(e){failure('FATAL',e.message||e);}
finally{
 await browser?.close().catch(()=>{});
 server.kill('SIGTERM');
 writeFileSync('audit-results/atla-every-3d-render.json',JSON.stringify(report,null,2)+String.fromCharCode(10));
}
console.log('REAL WEBGL ALL MODELS',JSON.stringify({expected:report.expected,checked:report.checked,passes:report.passes,errors:report.failures.length}));
for(const e of report.failures.slice(0,25))console.error('FAIL',e.id,e.error);
if(report.checked!==525||report.passes!==525||report.failures.length)process.exitCode=1;
