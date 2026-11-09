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
    if(await page.locator('a[href*="mentor-protocol-suite"]').count())throw Error(device+': protocols still link to the removed protocol simulator');
    if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+4))throw Error(device+': protocols page overflows viewport width');
    console.log('PASS '+device+': Greek protocols catalogue without simulator links');
    // Only the EOPPEP practical exam (and ECG practice) remain; general simulators are gone.
    for(const removed of ['mentor-live.html','mentor-scenarios.html','mentor-protocol-suite.html','mentor-presence.html']){
      const r=await page.request.get('http://127.0.0.1:8765/'+removed);
      if(r.ok())throw Error(device+': removed simulator page is still served: '+removed);
    }
    console.log('PASS '+device+': general clinical simulators are removed');


    const nextResponse=await page.goto('http://127.0.0.1:8765/mentor-next.html',{waitUntil:'load',timeout:30000});
    if(!nextResponse?.ok())throw Error(device+': EOPPEP practical cockpit HTTP '+nextResponse?.status());
    await page.locator('#next-hr').waitFor();
    if(await page.locator('.next-case-picker').evaluate(el=>el.open))
      throw Error(device+': the case library should be collapsed on entry');
    if(!await page.locator('#next-case-title').textContent().then(t=>t.startsWith('Σενάριο 1')))
      throw Error(device+': the cockpit must open on an EOPPEP practical scenario');
    const picker=page.locator('.next-case-picker');
    const selectSimulatorCase=async id=>{
      if(!await picker.evaluate(el=>el.open))await picker.locator('summary').click();
      await page.locator('[data-case-id="'+id+'"]').click();
    };
    await picker.locator('summary').click();
    if(await page.locator('#next-practical-list .next-case-card').count()!==6)
      throw Error(device+': the six EOPPEP practical scenarios are not all listed');
    if(await page.locator('#next-general-group,#next-case-list,[data-next-case-category="general"]').count())
      throw Error(device+': general clinical cases are still offered');
    await picker.locator('summary').click();
    if(!await page.locator('#next-guide-step').textContent().then(t=>t.trim().length>0))
      throw Error(device+': guided flow shows no next step');
    const priorGuidedEvents=await page.locator('#next-events li').count();
    await page.locator('#next-guide-action').click();
    if(await page.locator('#next-events li').count()!==priorGuidedEvents)
      throw Error(device+': navigation guide must not log a clinical action');
    const nextInitial=await page.locator('#next-hr').textContent();
    if(!/^\d+$/.test(nextInitial))throw Error(device+': synthetic vitals absent');
    // EOPPEP scenarios keep stable synthetic vitals (slope 0); synthetic time must still advance.
    const minuteBefore=await page.locator('#next-minute').textContent();
    await page.locator('#next-step').click();
    if(await page.locator('#next-minute').textContent()===minuteBefore)throw Error(device+': synthetic time did not advance');
    await page.locator('[data-next-patient="b"]').click();
    if(await page.locator('#next-person-name').textContent()!=='Μάρτυρας')throw Error(device+': patient selector');
    await page.locator('[data-next-patient="a"]').click();
    const [nextReport]=await Promise.all([page.waitForEvent('download',{timeout:10000}),page.locator('#next-download').click()]);
    if(!nextReport.suggestedFilename().endsWith('.txt'))throw Error(device+': practical report');
    console.log('PASS '+device+': EOPPEP practical cockpit, guided flow, synthetic vitals and report');

    // Each practical scenario keeps its own timeline; switching never records an action.
    const originalEvents=await page.locator('#next-events li').count();
    await selectSimulatorCase('eoppep-practical-4');
    if(!await page.locator('#next-case-title').textContent().then(t=>t.includes('πνευμοθώρακας')))
      throw Error(device+': practical scenario 4 not selected');
    await selectSimulatorCase('eoppep-practical-1');
    if(await page.locator('#next-events li').count()!==originalEvents)
      throw Error(device+': returning to scenario 1 did not restore its timeline');
    await page.reload({waitUntil:'load'});
    if(!await page.locator('#next-case-title').textContent().then(t=>t.startsWith('Σενάριο 1')))
      throw Error(device+': active practical scenario not restored after reload');
    console.log('PASS '+device+': independent practical timelines, no implicit case action, reload');

    // S/B/A/R drafts stay per person and never record actions.
    await selectSimulatorCase('eoppep-practical-2');
    await page.locator('[data-next-patient="a"]').click();
    await page.locator('#next-tools button').filter({hasText:'Συνομιλία'}).click();
    await page.locator('#next-question').fill('Τι αισθάνεστε;');
    await page.locator('#next-ask-form button').click();
    const handoverCards=page.locator('.next-handover-person');
    if(await handoverCards.count()!==2)throw Error(device+': S/B/A/R handover must have exactly two separate people');
    const aDraft=handoverCards.filter({has:page.locator('summary:text("Άνδρας 55 ετών")')});
    const bDraft=handoverCards.filter({has:page.locator('summary:text("Μάρτυρας")')});
    if(await aDraft.count()!==1||await bDraft.count()!==1)throw Error(device+': missing per-person handover');
    const aText=await aDraft.locator('pre').textContent(),bText=await bDraft.locator('pre').textContent();
    if(!aText.includes('Δεν μπορώ να πάρω ανάσα')||bText.includes('Δεν μπορώ να πάρω ανάσα'))
      throw Error(device+': S/B/A/R leaked an observation across people');
    if(!bText.includes('Δεν καταγράφηκαν συνθετικά ζωτικά'))
      throw Error(device+': S/B/A/R fabricated unrecorded vitals');
    await bDraft.locator('summary').click();
    const beforeDraftEvents=await page.locator('#next-events li').count();
    await bDraft.locator('.next-handover-copy').click();
    if(await page.locator('#next-events li').count()!==beforeDraftEvents)
      throw Error(device+': copying S/B/A/R unexpectedly logged an action');
    console.log('PASS '+device+': evidence-only per-person S/B/A/R preview and safe copy action');


    // Visual regression: browser loads a CC0 human mesh or explicitly reports fallback.
    const humanAsset=await page.request.get('http://127.0.0.1:8765/tools/patient-simulator/assets/cc0-human-body.glb');
    if(!humanAsset.ok()||(await humanAsset.body()).length<100000)throw Error(device+': missing real CC0 mesh GLB');
    await page.waitForFunction(()=>{
      const c=document.getElementById('next-canvas');
      return c && ['ready','fallback'].includes(c.dataset.humanModel);
    },null,{timeout:20000});
    const visualStatus=await page.locator('#next-canvas').getAttribute('data-human-model');
    if(!await page.locator('#next-mesh-status').textContent().then(t=>t.includes('3D')))
      throw Error(device+': cockpit did not announce patient graphics status');
    if(!await page.locator('#next-fullscreen').isVisible())throw Error(device+': missing immersive mode control');
    console.log('PASS '+device+': native CC0 human asset, WebGL render status '+visualStatus+' and immersive controls');

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
        status:document.querySelector('#next-unified-status')?.textContent
      }));
      throw Error(device+': unified practical scene not ready '+JSON.stringify(info));
    }
    if(!await page.locator('#next-unified-host canvas').isVisible())
      throw Error(device+': WebGL canvas not visible');
    await selectSimulatorCase('eoppep-practical-2');
    await page.waitForFunction(()=>document.querySelector('.next-unified-canvas')?.dataset.stageStatus==='ready',null,{timeout:25000});
    if(!await page.locator('#next-unified-host canvas').isVisible())
      throw Error(device+': scene failed after scenario switch');
    await page.locator('#next-ready-toggle').click();
    if(!await page.locator('#next-canvas').isVisible())
      throw Error(device+': procedural fallback not visible');
    console.log('PASS '+device+': unified WebGL stage, scenario changes and fallback');

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
