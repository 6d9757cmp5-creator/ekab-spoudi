/** Browser acceptance for read-only shared ECG Lab inside Clinical Cockpit. */
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {chromium} from 'playwright';
const PORT=8771,BASE='http://127.0.0.1:'+PORT;
const server=spawn('python3',['-m','http.server',String(PORT),'--bind','127.0.0.1'],{stdio:'ignore'});
let browser;
try{
  let ready=false;
  for(let i=0;i<70;i++){
    try{if((await fetch(BASE+'/mentor-next.html')).ok){ready=true;break;}}catch{}
    await new Promise(resolve=>setTimeout(resolve,200));
  }
  assert.equal(ready,true,'local cockpit server ready');
  browser=await chromium.launch({headless:true});
  for(const [device,width,height] of [['mobile',390,844],['desktop',1440,900]]){
    const ctx=await browser.newContext({viewport:{width,height},serviceWorkers:'block'});
    const page=await ctx.newPage();
    const errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    const res=await page.goto(BASE+'/mentor-next.html',{waitUntil:'domcontentloaded',timeout:30000});
    assert.equal(res?.ok(),true,device+': cockpit HTML response');
    const curve=page.locator('#next-ecg-wave');
    await page.waitForFunction(()=>document.querySelector('#next-ecg-wave')?.getAttribute('points')?.split(' ').length===240,null,{timeout:25000});
    const original=await curve.getAttribute('points');
    assert.match(await page.locator('.next-monitor').innerText(),/Ενδεικτικό εκπαιδευτικό ΗΚΓ/);
    await page.locator('[data-next-patient="b"]').click();
    const other=await curve.getAttribute('points');
    assert.notEqual(other,original,device+': patient B uses distinct synthetic rate');
    await page.locator('[data-next-patient="a"]').click();
    assert.equal(await curve.getAttribute('points'),original,device+': patient A restores same deterministic trace');
    await page.locator('#next-step').click();
    assert.notEqual(await curve.getAttribute('points'),original,device+': synthetic case minute changes the displayed curve');
    assert.equal(errors.length,0,device+': no uncaught browser errors: '+errors.join(' / '));
    const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
    assert.ok(overflow<=4,device+': unexpected horizontal overflow '+overflow);
    console.log('PASS',device,'single ECG Lab engine inside existing cockpit monitor; no client exceptions');
    await ctx.close();
  }
}finally{
  await browser?.close();
  server.kill();
}
