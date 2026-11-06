#!/usr/bin/env node
// Real browser acceptance of EVERY previewable item in each selected dataset.
// No clinical validation, physiological accuracy or third-party feature parity is inferred.
import {chromium} from 'playwright';
import {spawn} from 'node:child_process';
import {readFile, mkdir, writeFile} from 'node:fs/promises';
import {buildModelList} from '../tools/atla-ai/model-preview-catalog.mjs';

const mode=process.argv[2]||'hra-0';
const defs={
 'hra-0':[{tool:'anatomy',type:'primary',dataset:'primary',files:['tools/anatomy-3d/resources/imported-manifest.json'],shard:0,of:3}],
 'hra-1':[{tool:'anatomy',type:'primary',dataset:'primary',files:['tools/anatomy-3d/resources/imported-manifest.json'],shard:1,of:3}],
 'hra-2':[{tool:'anatomy',type:'primary',dataset:'primary',files:['tools/anatomy-3d/resources/imported-manifest.json'],shard:2,of:3}],
 'research':[{tool:'anatomy',type:'research',dataset:'secondary',files:['tools/anatomy-3d/resources/z-anatomy-research/imported-manifest.json']}],
 'cockpit':[
  {tool:'cockpit',type:'primary',dataset:'primary',files:['tools/patient-simulator/resources/quaternius/imported-manifest.json']},
  {tool:'cockpit',type:'patients',dataset:'secondary',files:['tools/patient-simulator/assets/patients/preview-manifest.json']},
  {tool:'cockpit',type:'rigged',dataset:'rigged',files:['tools/patient-simulator/assets/patients/atla-makehuman-rigged-manifest.json']},
  {tool:'cockpit',type:'makehuman',dataset:'makehuman',files:['tools/patient-simulator/resources/makehuman/imported-manifest.json','tools/patient-simulator/resources/makehuman/supplemental-imported-manifest.json']}
 ]
};
if(!defs[mode])throw Error('Invalid 3D audit mode '+mode);
const BASE='http://127.0.0.1:8879/';
const result={mode,started:new Date().toISOString(),scope:'Every previewable model, actual browser load and interactive controls; no clinical equivalence',records:[],errors:[]};
const server=spawn('python3',['-m','http.server','8879','--bind','127.0.0.1'],{stdio:'ignore'});
let browser=null;
await mkdir('audit-results',{recursive:true});
await mkdir('browser-qa-results',{recursive:true});
const save=async()=>writeFile('audit-results/atla-3d-browser-'+mode+'.json',JSON.stringify(result,null,2)+'\n');
function selectInputs(def){return Promise.all(def.files.map(p=>readFile(p,'utf8').then(x=>buildModelList(def.tool,JSON.parse(x),def.type)))).then(a=>a.flat().sort((a,b)=>a.label.localeCompare(b.label,'el')))}
try{
 let ready=false;
 for(let i=0;i<100;i++){try{if((await fetch(BASE)).ok){ready=true;break}}catch{} await new Promise(r=>setTimeout(r,200))}
 if(!ready)throw Error('Local browser test server did not start');
 browser=await chromium.launch({headless:true,args:['--use-gl=angle','--use-angle=swiftshader','--enable-webgl','--no-sandbox']});
 for(const def of defs[mode]){
  const all=await selectInputs(def);
  if(!all.length)throw Error('Empty catalog '+def.tool+'/'+def.type);
  const begin=def.shard===undefined?0:Math.floor(all.length*def.shard/def.of);
  const end=def.shard===undefined?all.length:Math.floor(all.length*(def.shard+1)/def.of);
  console.log('AUDIT DATASET '+def.tool+' '+def.type+' '+begin+'-'+end+'/'+all.length);
  let page=null,errors=[],networkErrors=[];
  async function open(){
   await page?.close();
   errors=[];networkErrors=[];
   page=await browser.newPage({viewport:{width:1100,height:800},deviceScaleFactor:1,acceptDownloads:false});
   page.on('pageerror',e=>errors.push(String(e.message)));
   page.on('requestfailed',request=>networkErrors.push(request.url()+' '+request.failure()?.errorText));
   page.on('dialog',dialog=>dialog.accept());
   await page.goto(BASE+'ui-tools/atla-resource-preview.html?tool='+def.tool,{waitUntil:'domcontentloaded'});
   if(def.dataset!=='primary')await page.selectOption('#source-dataset',def.dataset);
   await page.waitForFunction(expected=>{
    const sel=document.querySelector('#source-model');
    return sel?.options.length===expected&&!document.querySelector('#source-load')?.disabled &&
      document.querySelector('#source-status')?.textContent.includes('Επίλεξε μοντέλο');
   },all.length,{timeout:45000});
  }
  for(let i=begin;i<end;i++){
   const item=all[i],record={dataset:def.type,tool:def.tool,index:i,path:item.path,sourceStatus:item.status,format:item.format,passed:false};
   try{
    if(!page||(i-begin)%8===0)await open();
    if(networkErrors.length)throw Error('Startup network failures: '+networkErrors.slice(0,2).join('; '));
    if(errors.length)throw Error('Startup page errors: '+errors.slice(0,2).join('; '));
    await page.selectOption('#source-model',String(i));
    await page.locator('#source-load').click();
    await page.waitForFunction(()=>{
     const el=document.querySelector('#source-status');
     return el?.dataset.error==='true'||el?.textContent.includes('Φορτώθηκε');
    },null,{timeout:55000});
    const state=await page.evaluate(()=>({
     message:document.querySelector('#source-status')?.textContent,
     error:document.querySelector('#source-status')?.dataset.error,
     canvasWidth:document.querySelector('#source-canvas')?.width,
     canvasHeight:document.querySelector('#source-canvas')?.height,
     selectableMeshes:document.querySelector('#source-part')?.options.length,
     clips:document.querySelector('#source-clip')?.disabled?0:document.querySelector('#source-clip')?.options.length,
     info:document.querySelector('#source-mesh-info')?.textContent,
     license:document.querySelector('#source-license')?.textContent
    }));
    record.state=state;
    if(state.error==='true')throw Error('Model load returned: '+state.message);
    if(!state.message?.includes('Φορτώθηκε')||state.canvasWidth<100||state.canvasHeight<100||state.selectableMeshes<1)throw Error('No usable rendered geometry controls');
    if(!(await page.locator('#part-isolate').isEnabled()))throw Error('Part isolation disabled');
    await page.locator('#part-isolate').click();
    await page.locator('#part-show').click();
    await page.locator('#view-front').click();
    await page.locator('#view-side').click();
    await page.locator('#view-reset').click();
    await page.locator('#source-opacity').fill('50');
    if((await page.locator('#opacity-value').textContent())!=='50%')throw Error('Opacity did not change to 50%');
    await page.locator('#source-opacity').fill('100');
    if((await page.locator('#opacity-value').textContent())!=='100%')throw Error('Opacity did not restore');
    if(def.type==='rigged'&&state.clips<2)throw Error('Rigged avatar has fewer than 2 clips');
    if(def.type==='primary'&&def.tool==='cockpit'&&item.label.includes('universal-animation')&&state.clips<43)throw Error('Quaternius missing animation library clips');
    if(state.clips>0){await page.locator('#clip-pause').click();await page.locator('#clip-play').click()}
    if(networkErrors.length)throw Error('Network: '+networkErrors.slice(0,2).join('; '));
    if(errors.length)throw Error('JavaScript: '+errors.slice(0,2).join('; '));
    record.passed=true;
    console.log('PASS '+(i+1)+'/'+all.length+' '+item.path+' meshes='+state.selectableMeshes+' clips='+state.clips);
    if(i===begin)await page.screenshot({path:'browser-qa-results/atla-exhaustive-'+mode+'-sample.png'});
   }catch(e){
    record.error=String(e.message||e);
    result.errors.push({path:item.path,message:record.error});
    console.error('FAIL '+item.path+' '+record.error);
    try{await page?.screenshot({path:'browser-qa-results/atla-exhaustive-'+mode+'-failure-'+i+'.png'})}catch{}
    await page?.close().catch(()=>{});
    page=null;
   }
   result.records.push(record);
   await save();
  }
  await page?.close();
 }
}catch(e){result.errors.push({scope:'runner',message:String(e.message||e)});console.error('RUNNER FAILURE '+String(e.stack||e))}
finally{
 await browser?.close().catch(()=>{});
 server.kill('SIGTERM');
 result.finished=new Date().toISOString();
 result.checked=result.records.length;
 result.passed=result.records.filter(x=>x.passed).length;
 result.failed=result.errors.length;
 await save();
 console.log('AUDIT '+mode+' '+result.passed+'/'+result.checked+' browser records pass; errors='+result.failed);
}
if(result.errors.length)process.exitCode=1;
