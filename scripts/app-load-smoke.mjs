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
    await page.waitForFunction(()=>document.querySelector('#mentor-home-presence-frame')?.contentDocument?.getElementById('mentor-cinematic-stage')?.dataset.real3d==='ready',null,{timeout:90000});
    if(!await page.locator('#mentor-home-visual-shell').isVisible())throw Error(device+': no permanent MENTOR 3D on home');
    const embedded=page.frameLocator('#mentor-home-presence-frame');
    if(!await embedded.locator('#mentor-real3d-canvas').isVisible())throw Error(device+': embedded 3D character not visible');
    await page.locator('#mentor-home-visual-toggle').click();
    if(await page.locator('#mentor-home-visual-shell').isVisible())throw Error(device+': hide 3D character failed');
    await page.locator('#mentor-home-visual-toggle').click();
    if(!await page.locator('#mentor-home-visual-shell').isVisible())throw Error(device+': show 3D character failed');
    await page.locator('#mentor-home-question').fill('Τι είναι ΚΑΡΠΑ;');
    await page.locator('#mentor-home-question-form button[type=submit]').click();
    await page.waitForFunction(()=>document.getElementById('mentor-home-answer')?.textContent?.includes('Θωρακικές συμπιέσεις'),null,{timeout:20000});
    console.log('PASS '+device+': visible MENTOR 3D, user hide/show and local Greek Q&A');

    const mentorPage=await page.goto('http://127.0.0.1:8765/mentor-lab.html',{waitUntil:'domcontentloaded',timeout:30000});
    if(!mentorPage?.ok())throw Error(device+': MENTOR page does not load');
    await page.waitForFunction(()=>document.getElementById('mentor-cinematic-stage')?.dataset.real3d==='ready',
      null,{timeout:70000});
    if(await page.locator('#mentor-3d-canvas,.mentor-photo-img,img.cinematic-character').count())throw Error(device+': legacy character still visible');
    if(!await page.locator('#mentor-real3d-canvas').isVisible())throw Error(device+': actual GLB canvas not visible');
    console.log('PASS '+device+': 3D MENTOR loads without old avatar');
    const protocolPage=await page.goto('http://127.0.0.1:8765/protocols.html',{waitUntil:'load',timeout:30000});
    if(!protocolPage?.ok())throw Error(device+': protocols page did not load');
    await page.waitForFunction(()=>document.querySelectorAll('#protocol-list .topic').length>=10);
    if(!await page.getByRole('heading',{name:'Ελληνικά Πρωτόκολλα'}).count())throw Error(device+': missing protocols navigation');
    await page.locator('#protocol-list .topic .btn').first().click();
    if(!page.url().includes('mentor-protocol-suite.html'))throw Error(device+': lab link failed');
    await page.locator('#lab-choices .choice').first().click();
    if(!await page.locator('#lab-feedback').isVisible())throw Error(device+': lab did not capture a decision');
    await page.locator('#suite-debrief-link').click();
    await page.waitForFunction(()=>document.querySelectorAll('#debrief-history li').length>0,null,{timeout:10000});
    if(!await page.locator('#debrief-history li').count())throw Error(device+': debrief missing decision history');
    const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+4);
    if(overflow)throw Error(device+': protocol lab overflows viewport width');
    console.log('PASS '+device+': Greek protocols, contextual LAB and DEBRIEF');

    await context.close();
  }
} finally {await browser?.close();server.kill();}
