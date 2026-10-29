import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
const server=spawn('python3',['-m','http.server','8765','--bind','127.0.0.1'],{stdio:'ignore'});
let browser;
try {
  let ready=false;
  for(let i=0;i<60;i++){
    try { const r=await fetch('http://127.0.0.1:8765/index.html'); if(r.ok){ready=true;break;} } catch {}
    await new Promise(resolve=>setTimeout(resolve,200));
  }
  if(!ready)throw Error('Application server did not start');
  browser=await chromium.launch({headless:true});
  for(const [device,width,height,isMobile] of [['mobile',390,844,true],['desktop',1440,900,false]]) {
    const context=await browser.newContext({viewport:{width,height},isMobile,hasTouch:isMobile,serviceWorkers:'block'});
    const page=await context.newPage();
    const response=await page.goto('http://127.0.0.1:8765/index.html',{waitUntil:'load',timeout:30000});
    if(!response?.ok())throw Error(device+': HTTP '+response?.status());
    const loaded=await page.locator('body').evaluate(el=>Boolean(el.textContent?.trim())&&getComputedStyle(el).display!=='none');
    if(!loaded)throw Error(device+': page body did not render');
    console.log('PASS '+device+': application loads');
    await context.close();
  }
} finally {await browser?.close();server.kill();}
