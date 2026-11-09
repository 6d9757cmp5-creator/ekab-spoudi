/**
 * Browser acceptance: shared educational ECG Lab, unchanged scenario and ECG Lab experiences.
 * Browser engines approximate iPhone/Android behaviour, NOT tests on physical devices.
 */
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {chromium,webkit} from 'playwright';
import {mkdirSync,writeFileSync} from 'node:fs';

const PORT=8771,BASE='http://127.0.0.1:'+PORT;
const server=spawn('python3',['-m','http.server',String(PORT),'--bind','127.0.0.1'],{stdio:'ignore'});
const cases=['eoppep-practical-1','eoppep-practical-2','eoppep-practical-4'];
const targets=[
 {device:'Android-size Chromium',engine:chromium,width:390,height:844,mobile:true},
 {device:'iPhone-size WebKit',engine:webkit,width:390,height:844,mobile:true},
 {device:'desktop Chromium',engine:chromium,width:1440,height:900,mobile:false},
];
const evidenceDir='audit-results/shared-ecg';
mkdirSync(evidenceDir,{recursive:true});
const evidence={test:'shared synthetic ECG local browser acceptance',production:false,realPhoneTested:false,devices:[],status:'started'};
let browser;
try{
 let ready=false;
 for(let i=0;i<70;i++){
  try{if((await fetch(BASE+'/mentor-next.html')).ok){ready=true;break;}}catch{}
  await new Promise(resolve=>setTimeout(resolve,200));
 }
 assert.equal(ready,true,'local cockpit server ready');
 for(const {device,engine,width,height,mobile} of targets){
  browser=await engine.launch({headless:true});
  const ctx=await browser.newContext({viewport:{width,height},isMobile:mobile,hasTouch:mobile,serviceWorkers:'block'});
  try{
   const page=await ctx.newPage();
   const errors=[];
   page.on('pageerror',e=>errors.push(e.message));
   const res=await page.goto(BASE+'/mentor-next.html',{waitUntil:'domcontentloaded',timeout:30000});
   assert.equal(res?.ok(),true,device+': cockpit HTML response');
   const curve=page.locator('#next-ecg-wave');
   await page.waitForFunction(()=>document.querySelector('#next-ecg-wave')?.getAttribute('points')?.split(' ').length===240,null,{timeout:25000});
   const original=await curve.getAttribute('points');
   assert.match(await page.locator('.next-monitor').innerText(),/Ενδεικτικό εκπαιδευτικό ΗΚΓ/);
   assert.match(await page.locator('.next-monitor').innerText(),/Παλμοί \(HR\)/);
   await page.locator('[data-next-patient="b"]').click();
   const other=await curve.getAttribute('points');
   assert.notEqual(other,original,device+': patient B has distinct synthetic rate');
   await page.locator('[data-next-patient="a"]').click();
   assert.equal(await curve.getAttribute('points'),original,device+': patient A deterministic trace');
   await page.locator('#next-step').click();
   assert.notEqual(await curve.getAttribute('points'),original,device+': synthetic minute changes the displayed curve');
   const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
   assert.ok(overflow<=4,device+': horizontal overflow '+overflow);
   assert.equal(await page.locator('#next-practical-list .next-case-card').count(),6,'all six EOPPEP practical scenarios');
   const slug=device.toLowerCase().replace(/[^a-z0-9]+/g,'-');
   for(const caseId of cases){
    const picker=page.locator('.next-case-picker');
    if(!await picker.evaluate(el=>el.open))await picker.locator('summary').click();
    await page.locator('[data-case-id="'+caseId+'"]').click();
    await page.waitForFunction(()=>document.querySelector('#next-ecg-wave')?.getAttribute('points')?.split(' ').length===240);
    const a=await curve.getAttribute('points');
    await page.locator('.next-monitor').screenshot({
      path:evidenceDir+'/'+slug+'-'+caseId+'-person-a.png',animations:'disabled'
    });
    await page.locator('[data-next-patient="b"]').click();
    const b=await curve.getAttribute('points');
    await page.locator('.next-monitor').screenshot({
      path:evidenceDir+'/'+slug+'-'+caseId+'-person-b.png',animations:'disabled'
    });
    assert.notEqual(a,b,device+': both patients supported in '+caseId);
   }
   // The new waveform must preserve existing local learner progress and patient focus on reload.
   const beforeProgress=await page.evaluate(()=>({
     active:localStorage.getItem('ekab.mentor.next-v1'),
     library:localStorage.getItem('ekab.mentor.next-library-v1')
   }));
   assert.ok(beforeProgress.active&&beforeProgress.library,device+': learning progress persisted');
   const savedSession=JSON.parse(beforeProgress.active);
   assert.equal(savedSession.caseId,cases[cases.length-1],device+': selected case');
   assert.equal(savedSession.person,'b',device+': second patient selected');
   const savedCurve=await curve.getAttribute('points');
   await page.reload({waitUntil:'domcontentloaded'});
   await page.waitForFunction(()=>document.querySelector('#next-ecg-wave')?.getAttribute('points')?.split(' ').length===240,null,{timeout:25000});
   const afterProgress=await page.evaluate(()=>({
     active:localStorage.getItem('ekab.mentor.next-v1'),
     library:localStorage.getItem('ekab.mentor.next-library-v1')
   }));
   assert.deepEqual(afterProgress,beforeProgress,device+': learning progress values unchanged');
   assert.equal(await curve.getAttribute('points'),savedCurve,device+': ECG deterministic after reload');
   assert.equal(await page.locator('[data-next-patient="b"]').getAttribute('aria-pressed'),'true');
   assert.equal(await page.locator('[data-case-id="'+cases[cases.length-1]+'"]').getAttribute('aria-pressed'),'true');
   assert.match(await page.locator('.next-monitor').innerText(),/Ενδεικτικό εκπαιδευτικό ΗΚΓ/);
   await page.locator('.next-monitor').screenshot({path:evidenceDir+'/'+slug+'-cockpit-monitor.png',animations:'disabled'});
   // Standalone ECG Lab must remain independent with the same canonical engine.
   const lab=await page.goto(BASE+'/mentor-ecg.html',{waitUntil:'domcontentloaded',timeout:30000});
   assert.equal(lab?.ok(),true,device+': standalone ECG Lab URL');
   assert.match(await page.title(),/Εργαστήριο ΗΚΓ/,device+': Greek title');
   await page.waitForFunction(()=>document.querySelector('#ecg-curve')?.getAttribute('points')?.split(' ').length>=400,null,{timeout:15000});
   const labOriginal=await page.locator('#ecg-curve').getAttribute('points');
   await page.locator('[data-ecg-rate="115"]').click();
   const labChanged=await page.locator('#ecg-curve').getAttribute('points');
   assert.notEqual(labOriginal,labChanged,device+': independently controllable ECG Lab');
   await page.locator('#ecg-svg').screenshot({path:evidenceDir+'/'+slug+'-standalone-ecg.png',animations:'disabled'});
   assert.deepEqual(errors,[],device+': no browser script errors');
   evidence.devices.push({device,simulator:'PASS',lab:'PASS',learningProgressReload:'PASS',javascriptErrors:0,screenshotPair:true});
   console.log('PASS',device,': shared cockpit ECG, all scenarios, and standalone ECG Lab');
  }finally{
   await ctx.close();
   await browser.close();
   browser=undefined;
  }
 }
}finally{
 await browser?.close();
 server.kill();
 evidence.status=evidence.devices.length===targets.length?'PASS':'INCOMPLETE';
 writeFileSync(evidenceDir+'/result.json',JSON.stringify(evidence,null,2)+'\n');
}
