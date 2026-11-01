/**
 * Real-browser visual acceptance baseline, not a claim of clinical fidelity.
 * Creates inspectable screenshots for desktop, tablet and iPhone-size viewport.
 */
import {chromium} from 'playwright';
import {spawn} from 'node:child_process';
import {mkdirSync,writeFileSync} from 'node:fs';
const PORT=8767,BASE='http://127.0.0.1:'+PORT;
const server=spawn('python3',['-m','http.server',String(PORT),'--bind','127.0.0.1'],{stdio:'ignore'});
let browser;
const results=[];
try{
 let up=false;
 for(let i=0;i<60;i++){
  try{const r=await fetch(BASE+'/mentor-next.html');if(r.ok){up=true;break}}catch{}
  await new Promise(done=>setTimeout(done,200));
 }
 if(!up)throw Error('Cockpit local server unavailable');
 mkdirSync('audit-results',{recursive:true});
 browser=await chromium.launch({headless:true});
 for(const [device,width,height,mobile] of [
  ['mobile',390,844,true],['tablet',820,1180,false],['desktop',1440,900,false]
 ]){
  const context=await browser.newContext({viewport:{width,height},isMobile:mobile,hasTouch:mobile,serviceWorkers:'block',reducedMotion:'reduce'});
  const page=await context.newPage();
  const response=await page.goto(BASE+'/mentor-next.html',{waitUntil:'domcontentloaded',timeout:30000});
  if(!response?.ok())throw Error(device+': HTTP '+response?.status());
  await page.locator('#next-canvas').waitFor({state:'visible',timeout:20000});
  await page.waitForFunction(()=>['ready','fallback'].includes(document.querySelector('#next-canvas')?.dataset.humanModel),null,{timeout:25000});
  await page.waitForFunction(()=>!document.querySelector('#next-unified-overlay')?.hidden&&document.querySelector('.next-unified-canvas')?.dataset.stageStatus==='ready',null,{timeout:45000});
  await page.locator('#next-stage').scrollIntoViewIfNeeded();
  await page.locator('#next-immersive-stage').scrollIntoViewIfNeeded();
  const state=await page.evaluate(()=>{
   const $=s=>document.querySelector(s);
   const rect=s=>{const x=$(s)?.getBoundingClientRect();return x?{x:x.x,y:x.y,width:x.width,height:x.height,right:x.right,bottom:x.bottom}:null};
   const root=document.documentElement,stage=rect('#next-immersive-stage'),scene=rect('.next-scene'),monitor=rect('.next-monitor');
   const b=$('#next-play'),sizes=b?.getBoundingClientRect();
   return {
    width:window.innerWidth,height:window.innerHeight,scrollWidth:root.scrollWidth,clientWidth:root.clientWidth,
    theme:getComputedStyle(root).getPropertyValue('--cockpit-accent').trim(),
    stage,scene,monitor,playSize:{width:sizes?.width,height:sizes?.height},
    patientSource:document.querySelector('.next-unified-canvas')?.dataset.stageStatus,
    unifiedVisible:!$('#next-unified-overlay')?.hidden,
    videoCount:document.querySelectorAll('video').length,
    sentinel:!!$('#next-vitals')||!!$('.next-vitals'),
    warningVisible:!!$('.next-warning')?.textContent?.includes('Συνθετικό')
   };
  });
  if(state.theme!=='#76e3d4')throw Error(device+': cockpit design theme missing: '+state.theme);
  if(state.patientSource!=='ready'||!state.unifiedVisible)throw Error(device+': unified two-patient renderer missing during real screenshots');
  if(state.scrollWidth>state.clientWidth+2)throw Error(device+': horizontal page overflow '+JSON.stringify(state));
  if(!state.stage||!state.scene||!state.monitor||!state.sentinel||!state.warningVisible)throw Error(device+': missing UI section');
  if((state.playSize.height||0)<44)throw Error(device+': touch control below 44 CSS px');
  if(width>=1180&&Math.abs(state.monitor.x-state.scene.right)>4)throw Error(device+': monitor not aligned beside patient');
  if(width<=820&&state.monitor.y<state.scene.bottom-4)throw Error(device+': monitor overlaps patient on narrow view');
  const file='audit-results/cockpit-'+device+'-'+width+'x'+height+'.png';
  await page.screenshot({path:file,animations:'disabled',fullPage:false});
  const stageFile='audit-results/cockpit-stage-'+device+'.png';
  await page.locator('#next-immersive-stage').screenshot({path:stageFile,animations:'disabled'});
  results.push({device,viewport:[width,height],assetStatus:state.patientSource,horizontalOverflow:state.scrollWidth-state.clientWidth,screenshot:file,stageScreenshot:stageFile});
  console.log('PASS '+device+': visual cockpit layout, responsive hierarchy, local 3D status '+state.patientSource+', screenshot '+file);
  await context.close();
 }
 writeFileSync('audit-results/cockpit-visual-report.json',JSON.stringify({schema:1,mode:'visual-technical-baseline',clinicalValidation:false,bodyInteractParity:false,results},null,2)+'\n');
}finally{
 await browser?.close();
 server.kill();
}
