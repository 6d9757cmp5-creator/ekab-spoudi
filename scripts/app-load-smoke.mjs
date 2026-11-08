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
    // The home page has one assistant: ATLA, answering basic questions locally with no AI usage.
    const aiRequests=[];
    page.on('request',r=>{if(/anthropic|workers\.dev|openai/.test(r.url()))aiRequests.push(r.url())});
    await page.locator('.atla-launcher').click();
    if(!await page.locator('.atla-panel').isVisible())throw Error(device+': ATLA panel did not open');
    for(const question of ['Τι είναι ΚΑΡΠΑ;','ΚΑΡΠΑ']){
      await page.locator('.atla-input').fill(question);
      await page.locator('.atla-send').click();
      await page.waitForFunction(q=>{
        const replies=[...document.querySelectorAll('.atla-message')].map(m=>m.textContent);
        const asked=replies.lastIndexOf(q);
        return asked>=0&&replies.slice(asked+1).some(t=>/θωρακικές συμπιέσεις/i.test(t)&&!/Εικονικό AI/.test(t));
      },question,{timeout:20000});
    }
    if(aiRequests.length)throw Error(device+': a basic ATLA answer used AI: '+aiRequests[0]);
    await page.locator('.atla-close').click();
    if(await page.locator('.atla-panel').isVisible())throw Error(device+': ATLA panel did not close');
    console.log('PASS '+device+': bare ΚΑΡΠΑ answered locally through ATLA with zero AI usage');

    const mentorPage=await page.goto('http://127.0.0.1:8765/mentor-lab.html',{waitUntil:'domcontentloaded',timeout:30000});
    if(!mentorPage?.ok())throw Error(device+': MENTOR page does not load');
    await page.locator('#atla-open-chat').waitFor({state:'visible',timeout:30000});
    if(await page.locator('#mentor-cinematic-stage,#mentor-real3d-canvas,#mentor-3d-canvas,.mentor-photo-img,img.cinematic-character').count())throw Error(device+': the 3D figure is still on the ATLA page');
    await page.locator('#atla-open-chat').click();
    await page.locator('.atla-panel').waitFor({state:'visible',timeout:15000});
    await page.locator('.atla-close').click();
    console.log('PASS '+device+': ATLA page opens the one ATLA, with no 3D figure');
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


    const nextResponse=await page.goto('http://127.0.0.1:8765/mentor-next.html',{waitUntil:'load',timeout:30000});
    if(!nextResponse?.ok())throw Error(device+': MENTOR NEXT HTTP '+nextResponse?.status());
    await page.locator('#next-hr').waitFor();
    if(await page.locator('.next-case-picker').evaluate(el=>el.open))
      throw Error(device+': the large case library should be collapsed on entry');
    if(!await page.locator('#next-guide-step').textContent().then(t=>t.includes('ασφάλεια')))
      throw Error(device+': guided flow should start with scene safety');
    const priorGuidedEvents=await page.locator('#next-events li').count();
    await page.locator('#next-guide-action').click();
    if(!await page.locator('#next-tool-title').textContent().then(t=>t.includes('Εξέταση')))
      throw Error(device+': guided flow did not open safety tool');
    if(await page.locator('#next-events li').count()!==priorGuidedEvents)
      throw Error(device+': navigation guide must not log a clinical action');
    const nextInitial=await page.locator('#next-hr').textContent();
    if(!/^\d+$/.test(nextInitial))throw Error(device+': MENTOR NEXT vitals absent');
    await page.locator('#next-step').click();
    if(await page.locator('#next-hr').textContent()===nextInitial)throw Error(device+': MENTOR NEXT synthetic time trend did not change');
    await page.locator('[data-next-patient="b"]').click();
    if(await page.locator('#next-person-name').textContent()!=='Άτομο Β')throw Error(device+': MENTOR NEXT patient selector');
    await page.locator('#next-tools button').filter({hasText:'Εξέταση'}).click();
    await page.locator('#next-actions button').filter({hasText:'Έλεγχος ασφάλειας σκηνής'}).click();
    if(!await page.locator('#next-review-body').textContent().then(s=>s.includes('Ασφάλεια σκηνής')))throw Error(device+': MENTOR NEXT debrief evidence');
    await page.locator('#next-tools button').filter({hasText:'Συνομιλία'}).click();
    await page.locator('#next-question').fill('Τι αισθάνεστε;');
    await page.locator('#next-ask-form button').click();
    if(!await page.locator('#next-result').textContent().then(s=>s.includes('αναστατωμένος')))throw Error(device+': MENTOR NEXT patient dialogue');
    await page.locator('.next-tool-more').click();
    await page.locator('#next-tools button').filter({hasText:'Φάρμακα'}).click();
    if(!await page.locator('#next-actions').textContent().then(s=>s.includes('Κλειδωμένο')))throw Error(device+': MENTOR NEXT safety lock');
    const [nextReport]=await Promise.all([page.waitForEvent('download',{timeout:10000}),page.locator('#next-download').click()]);
    if(!nextReport.suggestedFilename().endsWith('.txt'))throw Error(device+': MENTOR NEXT report');
    console.log('PASS '+device+': MENTOR NEXT synthetic WebGL scene, two patients, scenario, actions and debrief');


    // Body Interact-inspired original v0.2 interface: per-patient evidence and visual posture.
    if(!await page.locator('#next-evidence-grid .next-evidence-person').count().then(n=>n===2))
      throw Error(device+': MENTOR NEXT missing independent patient evidence cards');
    const chart=page.locator('#next-trend-svg');
    if(!await chart.locator('circle').count().then(n=>n===2))throw Error(device+': MENTOR NEXT trend points missing');
    await page.locator('#next-trend-metric').selectOption('rr');
    if(!await page.locator('#next-trend-caption').textContent().then(s=>s.includes('αναπνοών')))
      throw Error(device+': MENTOR NEXT metric switch');
    await page.locator('#next-tools button').filter({hasText:'Στάση'}).click();
    await page.locator('#next-actions button').filter({hasText:'Οπτική στάση: καθιστός'}).click();
    if(!await page.locator('#next-events').textContent().then(s=>s.includes('Οπτική στάση: καθιστός')))
      throw Error(device+': MENTOR NEXT visual posture not recorded');
    await page.locator('#next-tool-panels > summary').click();
    if(await page.locator('#next-insights').isVisible())throw Error(device+': MENTOR NEXT native panel collapse failed');
    await page.locator('#next-nextstep').click();
    if(!await page.locator('#next-insights').isVisible())throw Error(device+': MENTOR NEXT next step did not restore evidence panels');
    if(!await page.locator('.next-workspace-main').isVisible())throw Error(device+': MENTOR NEXT workspace did not reopen');
    if(!await page.locator('#next-tool-title').textContent().then(s=>s.includes('Εξέταση')))throw Error(device+': MENTOR NEXT recommended step not opened');
    console.log('PASS '+device+': MENTOR NEXT v0.2 independent evidence, metric trend, visual posture and panels');


    // MENTOR NEXT v0.3: distinct cases, independent data, and resume.
    if(await page.locator('#next-case-list .next-case-card').count()!==3)
      throw Error(device+': MENTOR NEXT v0.3 missing three selectable scenarios');
    const selectSimulatorCase=async id=>{
      const picker=page.locator('.next-case-picker');
      if(!await picker.evaluate(el=>el.open))await picker.locator('summary').click();
      await page.locator('[data-case-id="'+id+'"]').click();
    };
    const previousCount=await page.locator('#next-events li').count();
    await selectSimulatorCase('home-welfare-next-v1');
    if(!await page.locator('#next-case-title').textContent().then(t=>t.includes('κατοικία')))
      throw Error(device+': MENTOR NEXT did not switch to home case');
    if(!await page.locator('#next-location').textContent().then(t=>t.includes('Κατοικία')))
      throw Error(device+': MENTOR NEXT 3D environment not set to home');
    await page.locator('#next-question').fill('Τι συνέβη;');
    await page.locator('#next-ask-form button').click();
    if(!await page.locator('#next-result').textContent().then(t=>t.includes('δωμάτιο')))
      throw Error(device+': MENTOR NEXT home patient case-specific reply failed');
    await selectSimulatorCase('public-square-next-v1');
    if(!await page.locator('#next-case-title').textContent().then(t=>t.includes('πλατεία')))
      throw Error(device+': MENTOR NEXT square case not selected');
    await page.locator('#next-question').fill('Τι συνέβη;');
    await page.locator('#next-ask-form button').click();
    if(!await page.locator('#next-result').textContent().then(t=>t.includes('παγκάκι')))
      throw Error(device+': MENTOR NEXT square-specific dialogue missing');
    await selectSimulatorCase('home-welfare-next-v1');
    if(!await page.locator('#next-events').textContent().then(t=>t.includes('δωμάτιο')))
      throw Error(device+': MENTOR NEXT per-case resume lost home history');
    await page.reload({waitUntil:'load'});
    if(!await page.locator('#next-case-title').textContent().then(t=>t.includes('κατοικία')))
      throw Error(device+': MENTOR NEXT active case not restored after reload');
    await selectSimulatorCase('crete-two-persons-next-v1');
    if(await page.locator('#next-events li').count()!==previousCount)
      throw Error(device+': MENTOR NEXT original road case history lost');
    console.log('PASS '+device+': MENTOR NEXT v0.3 three original scenarios, contextual dialogue and independent save/resume');


    // v0.4 visual regression: browser loads a CC0 human mesh or explicitly reports fallback.
    const humanAsset=await page.request.get('http://127.0.0.1:8765/tools/patient-simulator/assets/cc0-human-body.glb');
    if(!humanAsset.ok()||(await humanAsset.body()).length<100000)throw Error(device+': missing real CC0 mesh GLB');
    await page.waitForFunction(()=>{
      const c=document.getElementById('next-canvas');
      return c && ['ready','fallback'].includes(c.dataset.humanModel);
    },null,{timeout:20000});
    const visualStatus=await page.locator('#next-canvas').getAttribute('data-human-model');
    if(!['ready','fallback'].includes(visualStatus))throw Error(device+': MENTOR NEXT CC0 model render not initialized');
    if(!await page.locator('#next-mesh-status').textContent().then(t=>t.includes('3D')))
      throw Error(device+': MENTOR NEXT did not announce patient graphics status');
    if(!await page.locator('#next-fullscreen').isVisible())throw Error(device+': missing immersive mode control');
    console.log('PASS '+device+': MENTOR NEXT v0.4 native CC0 human asset, WebGL render status '+visualStatus+' and immersive controls');


    // v0.7: one real Three.js scene renders two actual CC0 patients and original equipment.
    for(const name of ['alex-standing.glb','daniel-lying.glb','amara-sitting.glb']){
      const response=await page.request.get('http://127.0.0.1:8765/tools/patient-simulator/assets/patients/'+name);
      if(!response.ok()||(await response.body()).length<3000000)throw Error(device+': real GLB missing '+name);
    }
    const bundle=await page.request.get('http://127.0.0.1:8765/tools/patient-simulator/vendor/unified-stage.bundle.mjs');
    if(!bundle.ok()||(await bundle.body()).length<100000)throw Error(device+': pinned local Three.js renderer missing');
    try{
      await page.waitForFunction(()=>{
        const overlay=document.querySelector('#next-unified-overlay');
        const stage=document.querySelector('#next-unified-host .next-unified-canvas');
        return overlay&&!overlay.hidden&&stage?.dataset.stageStatus==='ready';
      },null,{timeout:45000});
    }catch{
      const info=await page.evaluate(()=>({
        overlayHidden:document.querySelector('#next-unified-overlay')?.hidden,
        stage:document.querySelector('.next-unified-canvas')?.dataset.stageStatus,
        button:document.querySelector('#next-ready-toggle')?.textContent,
        oldViewerHidden:document.querySelector('#next-ready-overlay')?.hidden,
        status:document.querySelector('#next-unified-status')?.textContent,
        result:document.querySelector('#next-result')?.textContent
      }));
      throw Error(device+': unified two-patient GLB scene not ready '+JSON.stringify(info));
    }
    if(!await page.locator('#next-ready-toggle').getAttribute('aria-pressed').then(x=>x==='true'))
      throw Error(device+': unified scene is not the primary default view');
    if(!await page.locator('#next-unified-host canvas').isVisible())
      throw Error(device+': actual two-patient WebGL canvas not visible');
    await page.locator('[data-next-patient="b"]').click();
    if(!await page.locator('#next-person-name').textContent())throw Error(device+': selecting patient B failed');
    if(await page.locator('[data-next-view="full"]').getAttribute('aria-pressed')!=='true')
      throw Error(device+': patient selection did not open closer full-body view');
    await page.locator('[data-next-view="head"]').click();
    await page.locator('[data-next-view="full"]').click();
    await selectSimulatorCase('public-square-next-v1');
    await page.waitForFunction(()=>document.querySelector('.next-unified-canvas')?.dataset.stageStatus==='ready',null,{timeout:25000});
    if(!await page.locator('#next-unified-host canvas').isVisible())
      throw Error(device+': scene failed after case switch');
    await page.locator('#next-ready-toggle').click();
    if(await page.locator('#next-unified-overlay').isVisible())
      throw Error(device+': unified scene fallback switch failed');
    if(!await page.locator('#next-canvas').isVisible())
      throw Error(device+': original procedural fallback not visible');
    console.log('PASS '+device+': unified WebGL stage, two textured CC0 patients, scene focus, scenario changes and fallback');
    
    // Repeated architecture pass: PDF library root URL still resolves its independent app script.
    await page.goto('http://127.0.0.1:8765/pdf-library.html',{waitUntil:'domcontentloaded'});
    const pdfAsset=await page.request.get('http://127.0.0.1:8765/tools/pdf-library/app/pdf-library.js');
    if(!pdfAsset.ok())throw Error(device+': PDF canonical app missing');
    await page.waitForFunction(()=>{
      const l=document.getElementById('pdfList'),s=document.getElementById('pdfStatus');
      return Boolean(l?.textContent?.trim()||s?.textContent?.includes('Η τοπική αποθήκευση'));
    },null,{timeout:10000});
    if(!await page.locator('#pdfFile').isVisible())throw Error(device+': PDF library upload control missing');
    if(await page.locator('script[src*="3.11.174"]').count())throw Error(device+': vulnerable PDF.js legacy script still present');
    console.log('PASS '+device+': PDF library stable root URL and canonical independent module');

    await context.close();
  }
} finally {await browser?.close();server.kill();}
