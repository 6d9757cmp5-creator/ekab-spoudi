import {chromium} from 'playwright';
import {spawn} from 'node:child_process';
import {mkdirSync} from 'node:fs';
mkdirSync('browser-qa-results',{recursive:true});
const server=spawn('python3',['-m','http.server','8891','--bind','127.0.0.1'],{stdio:'ignore'});
let browser;
try{
 let ready=false;
 for(let i=0;i<100;i++){try{if((await fetch('http://127.0.0.1:8891/')).ok){ready=true;break}}catch{}await new Promise(r=>setTimeout(r,180))}
 if(!ready)throw Error('Server not running');
 browser=await chromium.launch({headless:true,args:['--use-gl=angle','--use-angle=swiftshader','--enable-webgl','--no-sandbox']});
 const page=await browser.newPage({viewport:{width:1200,height:850}});
 page.on('dialog',d=>d.accept());
 const allErrors=[];
 page.on('pageerror',e=>allErrors.push('outer: '+e.message));
 await page.goto('http://127.0.0.1:8891/ui-tools/anatomy-full-atlas.html',{waitUntil:'domcontentloaded'});
 if(!await page.locator('#viewer').isHidden())throw Error('Atlas preloaded without user selection');
 for(const [id,count,timeout] of [['bp3d40',1259,95000],['bp3d43',3210,190000]]){
  await page.selectOption('#atlas',id);
  await page.locator('#load').click();
  const iframe=page.frameLocator('#viewer');
  await iframe.locator('#viewport').waitFor({timeout:30000});
  try{
   await page.waitForFunction(expected=>{
    const w=document.querySelector('#viewer')?.contentWindow;
    return !!w?.__atlasDebug?.atlas&&!w.__atlasDebug.atlas.isDemo&&w.__atlasDebug.atlas.elements.length===expected;
   },count,{timeout});
  }catch(e){
   const detail=await iframe.locator('#loading').innerText().catch(()=>'<no error text>');
   throw Error(id+' failed to render verified source atlas: '+detail.slice(0,300)+' ; '+String(e).slice(0,150));
  }
  await iframe.locator('#viewport').screenshot({path:'browser-qa-results/atla-'+id+'-full-atlas.png'});
  const cells=await iframe.locator('#layerList input').count();
  if(cells<5)throw Error(id+' atlas layers not populated');
  console.log('PASS '+id+' complete index, canvas and '+cells+' layers');
  await page.locator('#unload').click();
  if(!await page.locator('#viewer').isHidden())throw Error('Viewer not unloaded');
 }
 if(allErrors.length)throw Error(allErrors.join('\n').slice(0,1500));
 await page.close();
}finally{await browser?.close();server.kill('SIGTERM')}
console.log('PASS: both locally stored full BodyParts3D atlases actually render in Chromium');
