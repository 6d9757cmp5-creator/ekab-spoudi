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
    await page.locator('#mentor-home-question').fill('ΚΑΡΠΑ');
    await page.locator('#mentor-home-question-form button[type=submit]').click();
    await page.waitForFunction(()=>document.getElementById('mentor-home-answer')?.textContent?.includes('Θωρακικές συμπιέσεις'),null,{timeout:20000});
    const costLabel=await page.locator('#mentor-home-speech-status').textContent();
    if(!costLabel.includes('0 AI credits'))throw Error(device+': basic MENTOR answer was not labelled free/local');
    console.log('PASS '+device+': bare ΚΑΡΠΑ answered locally with zero AI usage');
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
    await page.locator('#interview-panel > summary').click();
    await page.locator('#interview-choices button.choice').first().click();
    if(!await page.locator('#interview-history li').count())throw Error(device+': educational interview has no turn');
    await page.locator('#suite-debrief-link').click();
    await page.waitForFunction(()=>document.querySelectorAll('#debrief-history li').length>0,null,{timeout:10000});
    if(!await page.locator('#debrief-history li').count())throw Error(device+': debrief missing decision history');
    if(!await page.locator('#debrief-interview-history li').count())throw Error(device+': unified debrief missing interview');
    if(await page.locator('#debrief-export').isDisabled())throw Error(device+': debrief download is disabled');
    const [reportDownload]=await Promise.all([page.waitForEvent('download',{timeout:10000}),page.locator('#debrief-export').click()]);
    if(!reportDownload.suggestedFilename().endsWith('.txt'))throw Error(device+': invalid debrief report filename');
    console.log('PASS '+device+': MIT report export and scripted role-based patient interview');
    const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+4);
    if(overflow)throw Error(device+': protocol lab overflows viewport width');
    console.log('PASS '+device+': Greek protocols, contextual LAB and DEBRIEF');


    // Existing single MENTOR Live session, with the original synthetic teaching cockpit.
    const simulator=await page.goto('http://127.0.0.1:8765/mentor-live.html',{waitUntil:'domcontentloaded',timeout:30000});
    if(!simulator?.ok())throw Error(device+': simulation cockpit page failed to load');
    await page.waitForFunction(()=>document.querySelectorAll('#sim-toolbar button').length===8,null,{timeout:15000});
    if(!await page.locator('#sim-person-name').isVisible())throw Error(device+': no patient monitor');
    if((await page.locator('#sim-vitals b').allTextContents()).join(',')!=='106,22,96,—')
      throw Error(device+': synthetic vital indicators wrong');
    await page.locator('#sim-tool-actions button').first().click();
    if(!await page.locator('#sim-tool-result').textContent().then(x=>x.includes('Άτομο Α')))
      throw Error(device+': scripted dialogue not recorded');
    await page.locator('[data-sim-person="b"]').click();
    if(!await page.locator('#sim-person-name').textContent().then(x=>x==='Άτομο Β'))
      throw Error(device+': patient selection failed');
    await page.locator('#sim-toolbar button').filter({hasText:'Φάκελος'}).click();
    if(await page.locator('.sim-records li').count()!==1)
      throw Error(device+': history not unified in session');
    await page.locator('#sim-pause').click();
    if(!await page.locator('#live-choices button').first().isDisabled())
      throw Error(device+': pause did not block actions');
    await page.locator('#sim-pause').click();
    await page.locator('#live-choices button').first().click();
    if(!await page.locator('#live-step').textContent().then(x=>x.includes('2 / 4')))
      throw Error(device+': original decision engine not connected');
    await page.reload({waitUntil:'domcontentloaded'});
    await page.waitForFunction(()=>document.querySelectorAll('#sim-toolbar button').length===8,null,{timeout:15000});
    await page.locator('#sim-toolbar button').filter({hasText:'Φάκελος'}).click();
    if(await page.locator('.sim-records li').count()!==1)
      throw Error(device+': observation not preserved after refresh');
    if(!await page.locator('#live-step').textContent().then(x=>x.includes('2 / 4')))
      throw Error(device+': stage progress not preserved after refresh');
    await page.locator('#sim-toolbar button').filter({hasText:'Φάρμακα'}).click();
    if(await page.locator('#sim-tool-actions button').count()!==0)
      throw Error(device+': unreviewed medication actions must remain locked');
    if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+4))
      throw Error(device+': simulation cockpit overflows '+device+' viewport');
    console.log('PASS '+device+': single Mentor simulation cockpit, scripted tools, paused controls and reload');
    await page.locator('#sim-toolbar button').filter({hasText:'Φάκελος'}).click();
    await page.locator('.sim-drawer-choices a[href="#live-debrief"]').click();
    if(!await page.locator('#live-debrief').isVisible())throw Error(device+': live debrief not visible');
    if(await page.locator('#live-review-observations li').count()!==1)
      throw Error(device+': same mission observations missing from debrief');
    if(await page.locator('#live-review-decisions li').count()!==1)
      throw Error(device+': same mission decisions missing from debrief');
    await page.locator('[data-sim-view="b"]').click();
    if(!await page.locator('#sim-person-name').textContent().then(x=>x==='Άτομο Β'))
      throw Error(device+': view focus did not select patient');
    await page.locator('#sim-clear').click();
    if(await page.locator('.sim-drawer').isVisible())throw Error(device+': close tool did not hide the panel');
    await page.locator('#sim-toolbar button').filter({hasText:'Συνομιλία'}).click();
    if(!await page.locator('.sim-drawer').isVisible())throw Error(device+': tool did not reopen the panel');
    const [reportFile]=await Promise.all([
      page.waitForEvent('download',{timeout:10000}),
      page.locator('#live-export').click()
    ]);
    if(!reportFile.suggestedFilename().endsWith('.txt'))
      throw Error(device+': MENTOR Live debrief export invalid');
    console.log('PASS '+device+': live case-linked DEBRIEF, view focus, tool reset and report export');


    await context.close();
  }
} finally {await browser?.close();server.kill();}
