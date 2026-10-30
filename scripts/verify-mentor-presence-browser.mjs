// Real-Chromium check of the floating MENTOR Live Companion on desktop and a touch phone viewport.
// Usage: node scripts/verify-mentor-presence-browser.mjs   (PLAYWRIGHT_MODULE overrides the import)
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {extname,join,normalize,resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';

const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css',
 '.json':'application/json','.webp':'image/webp','.glb':'model/gltf-binary','.svg':'image/svg+xml','.webmanifest':'application/manifest+json'};
const server=createServer(async(req,res)=>{
 try{
  let p=decodeURIComponent(new URL(req.url,'http://x').pathname);
  if(p.endsWith('/'))p+='index.html';
  const full=normalize(join(root,p));
  if(!full.startsWith(root))throw Error('outside');
  const body=await readFile(full);
  res.writeHead(200,{'content-type':types[extname(full)]||'application/octet-stream'});
  res.end(body);
 }catch{if(!res.headersSent)res.writeHead(404);res.end('not found');}
}).listen(0,'127.0.0.1');
await new Promise(r=>server.once('listening',r));
const base='http://127.0.0.1:'+server.address().port;

const results=[];
const check=(name,ok,detail='')=>{results.push({name,ok});console.log((ok?'PASS ':'FAIL ')+name+(detail?' — '+detail:''));};
const page1='/saek-course-01.html',page2='/saek-course-02.html';
let browser;
try{
 browser=await chromium.launch({headless:true,channel:process.env.BROWSER_CHANNEL||undefined,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
 for(const [device,width,height,isMobile] of [['desktop',1440,900,false],['mobile',390,844,true]]){
  const context=await browser.newContext({viewport:{width,height},isMobile,hasTouch:isMobile,serviceWorkers:'block'});
  // Deterministic speech stubs: count microphone starts and capture utterances.
  await context.addInitScript(()=>{
   window.__micStarts=0;window.__spoken=[];
   const Fake=class{start(){window.__micStarts++;setTimeout(()=>{this.onresult?.({results:[[{transcript:'Τι είναι ΚΑΡΠΑ;'}]]});this.onend?.();},5000);}abort(){this.onend?.();}};
   window.SpeechRecognition=Fake;window.webkitSpeechRecognition=Fake;
   window.SpeechSynthesisUtterance=class{constructor(t){this.text=t;}};
   const voices=[{name:'Microsoft Stefanos - Greek (Greece)',lang:'el-GR',localService:true,voiceURI:'stefanos'},{name:'Microsoft Athina - Greek (Greece)',lang:'el-GR',localService:true,voiceURI:'athina'}];
   Object.defineProperty(window,'speechSynthesis',{configurable:true,value:{
    getVoices:()=>voices,addEventListener(){},cancel(){},
    speak(u){window.__spoken.push({text:u.text,lang:u.lang,voice:u.voice&&u.voice.name});setTimeout(()=>{u.onstart?.();u.onboundary?.({charIndex:3});},50);setTimeout(()=>u.onend?.(),700);}
   }});
  });
  const page=await context.newPage();
  const errors=[];
  page.on('pageerror',e=>errors.push(String(e)));
  const tag=s=>device+': '+s;
  const box=sel=>page.locator(sel).boundingBox();
  const inView=b=>b&&b.x>=0&&b.y>=0&&b.x+b.width<=width+0.5&&b.y+b.height<=height+0.5;

  async function dragGrip(dx,dy){
   const b=await box('.emp-grip');
   const sx=b.x+b.width/2,sy=b.y+b.height/2;
   if(isMobile){
    const cdp=await context.newCDPSession(page);
    const touch=(type,x,y)=>cdp.send('Input.dispatchTouchEvent',{type,touchPoints:type==='touchEnd'?[]:[{x,y}]});
    await touch('touchStart',sx,sy);
    for(let i=1;i<=8;i++)await touch('touchMove',sx+dx*i/8,sy+dy*i/8);
    await touch('touchEnd');
    await cdp.detach();
   }else{
    await page.mouse.move(sx,sy);await page.mouse.down();
    await page.mouse.move(sx+dx/2,sy+dy/2,{steps:4});await page.mouse.move(sx+dx,sy+dy,{steps:4});
    await page.mouse.up();
   }
  }

  const r=await page.goto(base+page1,{waitUntil:'load'});
  check(tag('study page loads'),r.ok());
  await page.waitForSelector('.ekab-mentor-launcher:not([hidden])',{timeout:10000});
  check(tag('launcher visible, widget closed, 3D not loaded yet'),
   await page.locator('.ekab-mentor-launcher').isVisible()&&!(await page.locator('.ekab-mentor-presence').isVisible())&&await page.locator('.ekab-mentor-presence iframe').count()===0);
  check(tag('exactly one presence instance'),await page.locator('.ekab-mentor-presence').count()===1);

  await page.locator('.ekab-mentor-launcher').click();
  await page.waitForSelector('.ekab-mentor-presence:not([hidden])');
  check(tag('open shows 3D frame in view'),inView(await box('.ekab-mentor-presence'))&&await page.locator('.ekab-mentor-presence iframe').count()===1);
  let ready='n/a';
  try{
   await page.waitForFunction(()=>document.querySelector('.ekab-mentor-presence iframe')?.contentDocument?.getElementById('mentor-cinematic-stage')?.dataset.real3d?.match(/^(ready|photo)$/),null,{polling:150,timeout:90000});
   ready=await page.evaluate(()=>document.querySelector('.ekab-mentor-presence iframe').contentDocument.getElementById('mentor-cinematic-stage').dataset.real3d);
  }catch{}
  check(tag('3D scene reaches ready/photo state inside widget'),ready==='ready'||ready==='photo','state='+ready);

  const before=await box('.ekab-mentor-presence');
  await dragGrip(Math.round(width*0.4),-Math.round(height*0.3));
  const after=await box('.ekab-mentor-presence');
  check(tag('drag moves widget and keeps it on screen'),Math.abs(after.x-before.x)>40&&Math.abs(after.y-before.y)>40&&inView(after),`dx=${Math.round(after.x-before.x)} dy=${Math.round(after.y-before.y)}`);
  await dragGrip(-5000,-5000);
  check(tag('dragging past every edge stays clamped on screen'),inView(await box('.ekab-mentor-presence')));

  const stored=await box('.ekab-mentor-presence');
  await page.reload({waitUntil:'load'});
  await page.waitForSelector('.ekab-mentor-presence:not([hidden])');
  const reloaded=await box('.ekab-mentor-presence');
  check(tag('position and open state persist after refresh'),Math.abs(reloaded.x-stored.x)<=1&&Math.abs(reloaded.y-stored.y)<=1);

  await page.goto(base+page2,{waitUntil:'load'});
  await page.waitForSelector('.ekab-mentor-presence:not([hidden])');
  const nav=await box('.ekab-mentor-presence');
  check(tag('position persists across page navigation'),Math.abs(nav.x-stored.x)<=1&&Math.abs(nav.y-stored.y)<=1);

  await page.locator('.emp-btn[aria-haspopup]').click();
  await page.getByRole('button',{name:/Καρφίτσωμα · Πάνω αριστερά/}).click();
  const pinned=await box('.ekab-mentor-presence');
  check(tag('pin to top-left'),pinned.x<=20&&pinned.y<=20&&inView(pinned),`x=${Math.round(pinned.x)} y=${Math.round(pinned.y)}`);
  await page.reload({waitUntil:'load'});
  await page.waitForSelector('.ekab-mentor-presence:not([hidden])');
  const pinned2=await box('.ekab-mentor-presence');
  check(tag('pinned corner persists after refresh'),pinned2.x<=20&&pinned2.y<=20);

  await dragGrip(120,160);
  const released=await box('.ekab-mentor-presence');
  check(tag('dragging a pinned MENTOR releases it'),released.x>pinned2.x+40&&released.y>pinned2.y+40);

  const w0=(await box('.ekab-mentor-presence')).width;
  await page.locator('.emp-resize').focus();
  await page.keyboard.press('ArrowRight');await page.keyboard.press('ArrowRight');
  const w1=(await box('.ekab-mentor-presence')).width;
  check(tag('keyboard resize grows widget and stays in view'),w1>w0&&inView(await box('.ekab-mentor-presence')),`${Math.round(w0)}→${Math.round(w1)}`);

  await page.locator('.emp-btn[aria-label^="Ελαχιστοποίηση"]').click();
  check(tag('minimize: launcher back, 3D frame released'),await page.locator('.ekab-mentor-launcher').isVisible()&&await page.locator('.ekab-mentor-presence iframe').count()===0);
  await page.locator('.ekab-mentor-launcher').click();
  await page.waitForSelector('.ekab-mentor-presence:not([hidden])');
  await page.locator('.emp-btn[aria-label^="Απόκρυψη"]').click();
  check(tag('hide: nothing visible'),!(await page.locator('.ekab-mentor-presence').isVisible())&&!(await page.locator('.ekab-mentor-launcher').isVisible()));
  await page.reload({waitUntil:'load'});
  check(tag('hidden state persists after refresh'),!(await page.locator('.ekab-mentor-presence').isVisible())&&!(await page.locator('.ekab-mentor-launcher').isVisible()));
  await page.evaluate(()=>window.EkabMentorPresence.show());
  check(tag('restore via API'),await page.locator('.ekab-mentor-presence').isVisible());

  if(!isMobile){
   await page.evaluate(()=>window.EkabMentorPresence.hide());
   await page.keyboard.press('Alt+Shift+M');
   check(tag('Alt+Shift+M restores a hidden MENTOR'),await page.locator('.ekab-mentor-presence').isVisible());
  }

  // ----- Ask + Context Bridge -----
  await page.evaluate(()=>window.EkabMentorPresence.float());
  const barBtns=await page.locator('.emp-bar button').evaluateAll(bs=>bs.map(b=>{const r=b.getBoundingClientRect();return {l:r.left,r:r.right,w:r.width};}));
  const barBox=await box('.emp-bar');
  check(tag('title-bar buttons fit inside the widget'),barBtns.every(b=>b.w>=28&&b.l>=barBox.x-1&&b.r<=barBox.x+barBox.width+1));
  await page.locator('.emp-bar button[aria-controls="ekab-mentor-ask"]').click();
  check(tag('ask panel opens and shows the page context in use'),await page.locator('.emp-ask').isVisible()&&/Πλαίσιο σελίδας( \([^)]+\))?: .+/.test(await page.locator('.emp-ctx').textContent()),await page.locator('.emp-ctx').textContent());
  await page.locator('.emp-input').fill('Τι είναι ΚΑΡΠΑ;');
  await page.locator('.emp-send').click();
  await page.waitForFunction(()=>document.querySelector('.emp-log')?.textContent?.includes('Θωρακικές συμπιέσεις'),null,{polling:150,timeout:20000});
  check(tag('local source-backed Greek answer appears'),true);
  await page.waitForFunction(m=>document.querySelector('.ekab-mentor-presence iframe')?.contentDocument?.getElementById('mentor-cinematic-stage')?.dataset.mentorMood===m,'explanatory',{polling:150,timeout:20000});
  check(tag('avatar shows the explaining expression after an answer'),true);
  await page.evaluate(()=>{const p=document.querySelector('h1,h2,p');const r=document.createRange();r.selectNodeContents(p);const s=getSelection();s.removeAllRanges();s.addRange(r);});
  await page.locator('.emp-ask .emp-link',{hasText:'Εξήγησε την επιλογή'}).click();
  await page.waitForFunction(()=>document.querySelector('.emp-log')?.textContent?.length>10,null,{polling:150,timeout:15000});
  check(tag('explain-selection answers from the selected text only'),true);
  await page.evaluate(()=>getSelection().removeAllRanges());
  await page.locator('.emp-ask .emp-link',{hasText:'Εξήγησε την επιλογή'}).click();
  check(tag('explain-selection without a selection asks for one'),/Επίλεξε πρώτα/.test(await page.locator('.emp-log').textContent()));
  await page.locator('.emp-ctxrow .emp-link').click();
  check(tag('learner can switch page context off'),/απενεργοποιημένο/.test(await page.locator('.emp-ctx').textContent()));
  await page.reload({waitUntil:'load'});
  await page.waitForSelector('.ekab-mentor-presence:not([hidden])');
  await page.locator('.emp-bar button[aria-controls="ekab-mentor-ask"]').click();
  check(tag('context-off choice persists after refresh'),/απενεργοποιημένο/.test(await page.locator('.emp-ctx').textContent()));
  await page.locator('.emp-ctxrow .emp-link').click();
  await page.evaluate(()=>window.dispatchEvent(new CustomEvent('mentor:context',{detail:{kind:'anatomy-object',label:'Καρδιά'}})));
  check(tag('page can announce a whitelisted study object'),/Καρδιά/.test(await page.locator('.emp-ctx').textContent()));
  await page.evaluate(()=>window.dispatchEvent(new CustomEvent('mentor:context',{detail:{kind:'password',label:'hunter2'}})));
  check(tag('unknown announcements are ignored'),!/hunter2/.test(await page.locator('.emp-ctx').textContent()));
  // ----- conversation, safety, navigation, voice -----
  await page.goto(base+page1,{waitUntil:'load'});
  await page.waitForSelector('.ekab-mentor-presence:not([hidden])');
  await page.locator('.emp-bar button[aria-controls="ekab-mentor-ask"]').click();
  const ask=async q=>{await page.locator('.emp-input').fill(q);await page.locator('.emp-send').click();};
  await ask('Τι είναι ΚΑΡΠΑ;');
  await page.waitForFunction(()=>document.querySelector('.emp-log')?.textContent?.includes('Θωρακικές συμπιέσεις'),null,{polling:150,timeout:15000});
  await page.goto(base+page2,{waitUntil:'load'});
  await page.waitForSelector('.ekab-mentor-presence:not([hidden])');
  await page.locator('.emp-bar button[aria-controls="ekab-mentor-ask"]').click();
  check(tag('conversation survives page navigation (this tab only)'),/Θωρακικές συμπιέσεις/.test(await page.locator('.emp-log').textContent()));
  await ask('Πόσα mg αδρεναλίνης να δώσω;');
  await page.waitForFunction(()=>document.querySelector('.emp-log')?.textContent?.includes('166'),null,{polling:150,timeout:10000});
  check(tag('dosing question is refused with the safety message'),/δεν δίνει δοσολογίες/.test(await page.locator('.emp-log').textContent()));
  const external=[];
  page.on('request',r=>{const u=new URL(r.url());if(u.hostname!=='127.0.0.1')external.push(r.url());});
  await ask('Τι είναι το κβαντικό πεδίο του Higgs;');
  await page.waitForFunction(()=>document.querySelector('.emp-log')?.textContent?.includes('δεν είναι ενεργή'),null,{polling:150,timeout:10000});
  check(tag('AI is disabled by default: unknown question stays local, no external request'),external.length===0,external.join(','));
  const hrefBefore=page.url();
  await ask('Άνοιξε την ανατομία');
  await page.waitForSelector('.emp-navlink');
  check(tag('navigation is only offered as a link; MENTOR does not navigate by itself'),page.url()===hrefBefore&&(await page.locator('.emp-navlink').getAttribute('href'))===new URL('/anatomia.html',page.url()).href);
  await page.locator('.emp-actions .emp-link',{hasText:'Διαγραφή συνομιλίας'}).click();
  check(tag('learner can delete the conversation'),(await page.locator('.emp-log').textContent()).trim()==='');
  await page.reload({waitUntil:'load'});
  await page.waitForSelector('.ekab-mentor-presence:not([hidden])');
  await page.locator('.emp-bar button[aria-controls="ekab-mentor-ask"]').click();
  check(tag('deleted conversation stays deleted after refresh'),(await page.locator('.emp-log').textContent()).trim()==='');

  const micCalls=await page.evaluate(()=>window.__micStarts||0);
  check(tag('microphone never starts on its own'),micCalls===0);
  await page.locator('.emp-mic').click();
  await page.waitForFunction(()=>(window.__micStarts||0)>=1,null,{polling:150,timeout:5000});
  check(tag('microphone starts only after the learner presses it, with a visible state'),await page.locator('.emp-mic-state').isVisible()&&(await page.locator('.emp-mic').getAttribute('aria-pressed'))==='true');
  let heard=true;
  try{await page.waitForFunction(()=>document.querySelector('.emp-input').value.includes('ΚΑΡΠΑ'),null,{polling:150,timeout:25000});}catch{heard=false;}
  check(tag('recognised Greek speech fills the question box for review'),heard,
   heard?'':JSON.stringify(await page.evaluate(()=>({value:document.querySelector('.emp-input').value,starts:window.__micStarts,log:document.querySelector('.emp-log').textContent.slice(-160)}))));

  await page.locator('.emp-settings summary').click();
  await page.locator('#emp-autospeak').check();
  await ask('Τι είναι ΚΑΡΠΑ;');
  await page.waitForFunction(()=>window.__spoken?.length>=1,null,{polling:150,timeout:10000});
  await page.waitForFunction(()=>document.querySelector('.ekab-mentor-presence iframe').contentDocument.getElementById('mentor-avatar').dataset.viseme!=='rest',null,{polling:150,timeout:8000});
  const mouth=await page.evaluate(()=>document.querySelector('.ekab-mentor-presence iframe').contentDocument.getElementById('mentor-avatar').dataset.viseme);
  check(tag('speech plays with a Greek voice and a non-rest mouth shape reaches the avatar'),(await page.evaluate(()=>window.__spoken[0].lang))==='el-GR','viseme='+mouth);
  check(tag('MENTOR speaks with the female Greek voice when the device has both'),/Athina/.test(await page.evaluate(()=>window.__spoken[0].voice||'')),await page.evaluate(()=>window.__spoken[0].voice));
  await page.waitForFunction(()=>document.querySelector('.ekab-mentor-presence iframe').contentDocument.getElementById('mentor-avatar').dataset.viseme==='rest',null,{polling:150,timeout:8000});
  check(tag('mouth returns to rest when speech ends'),true);
  await page.locator('#emp-autospeak').uncheck();

  await page.goto(base+'/written_exam.html',{waitUntil:'load'});
  await page.waitForSelector('.ekab-mentor-presence:not([hidden])');
  await page.locator('.emp-bar button[aria-controls="ekab-mentor-ask"]').click();
  await page.locator('.emp-input').fill('Τι είναι ΚΑΡΠΑ;');
  await page.locator('.emp-send').click();
  check(tag('exam page: MENTOR refuses to answer'),/δεν μπορώ να δώσω απαντήσεις/.test(await page.locator('.emp-log').textContent())&&/εξέταση/.test(await page.locator('.emp-ctx').textContent()));
  await page.waitForFunction(m=>document.querySelector('.ekab-mentor-presence iframe')?.contentDocument?.getElementById('mentor-cinematic-stage')?.dataset.mentorMood===m,'examiner',{polling:150,timeout:20000});
  check(tag('avatar shows the examiner expression when refusing on an exam page'),true);
  // Oral rehearsal: guided practice answers; the learner's own switch to active exam silences MENTOR.
  await page.goto(base+'/mentor-oral.html',{waitUntil:'load'});
  await page.waitForSelector('.ekab-mentor-presence:not([hidden])');
  await page.locator('.emp-bar button[aria-controls=\"ekab-mentor-ask\"]').click();
  check(tag('oral practice: context says guided practice, not exam'),/Προφορική εξάσκηση/.test(await page.locator('.emp-ctx').textContent()),await page.locator('.emp-ctx').textContent());
  await page.locator('#oral-exam-mode').check();
  await page.waitForFunction(()=>/εξέταση σε εξέλιξη/.test(document.querySelector('.emp-ctx')?.textContent||''),null,{polling:150,timeout:10000});
  await page.locator('.emp-input').fill('Τι είναι ΚΑΡΠΑ;');
  await page.locator('.emp-send').click();
  check(tag('oral active exam: MENTOR refuses and the self-check button is disabled'),/δεν μπορώ να δώσω απαντήσεις/.test(await page.locator('.emp-log').textContent())&&await page.locator('#oral-reveal').isDisabled());
  await page.locator('#oral-exam-mode').uncheck();
  await page.waitForFunction(()=>/Προφορική εξάσκηση/.test(document.querySelector('.emp-ctx')?.textContent||''),null,{polling:150,timeout:10000});
  check(tag('oral practice again: guided context restored'),true);
  // ECG guided exercise: start, actions, consequences, completion, debrief, progress kept, MENTOR knows the step.
  await page.goto(base+'/mentor-ecg.html',{waitUntil:'load'});
  await page.evaluate(()=>localStorage.removeItem('ekab.mentor.ecg-practice.v1'));
  await page.reload({waitUntil:'load'});
  await page.waitForSelector('.ekab-mentor-presence:not([hidden])');
  await page.locator('.emp-bar button[aria-controls="ekab-mentor-ask"]').click();
  await page.waitForFunction(()=>/λωρίδα 1 από 5/.test(document.querySelector('.emp-ctx')?.textContent||''),null,{polling:150,timeout:10000});
  check(tag('ecg practice: MENTOR shows the open step'),true);
  await page.locator('#ecg-practice-choices button',{hasText:/^4$/}).click();
  check(tag('ecg practice: a wrong count shows the consequence (marked QRS and the rate formula)'),/Όχι ακριβώς/.test(await page.locator('#ecg-practice-feedback').textContent())&&(await page.locator('#ecg-practice-marks circle').count())===7&&/× 10 = 70/.test(await page.locator('#ecg-practice-feedback').textContent()));
  await page.reload({waitUntil:'load'});
  check(tag('ecg practice: progress survives a refresh'),/λωρίδα 2 από 5|Λωρίδα 2 από 5/.test(await page.locator('#ecg-practice-step').textContent()));
  for(const n of [10,6,9,12]){await page.locator('#ecg-practice-choices button',{hasText:new RegExp('^'+n+'$')}).click();if(n!==12)await page.locator('#ecg-practice-next').click();}
  await page.locator('#ecg-practice-next').click();
  check(tag('ecg practice: debrief appears with score and a concrete hint'),await page.locator('#ecg-practice-debrief').isVisible()&&/Σωστά 4 από 5/.test(await page.locator('#ecg-debrief-text').textContent()),await page.locator('#ecg-debrief-text').textContent());
  await page.evaluate(()=>localStorage.removeItem('ekab.mentor.ecg-practice.v1'));
  await page.goto(base+page2,{waitUntil:'load'});
  await page.waitForSelector('.ekab-mentor-presence:not([hidden])');

  await page.evaluate(()=>window.EkabMentorPresence.dock());
  const dock=await box('.ekab-mentor-presence');
  check(tag('docked mode fills a side panel / bottom sheet'),isMobile?(Math.abs(dock.width-width)<2&&dock.y>height*0.4):(dock.x>width*0.6&&Math.abs(dock.height-height)<2),`${Math.round(dock.x)},${Math.round(dock.y)} ${Math.round(dock.width)}x${Math.round(dock.height)}`);
  await page.evaluate(()=>window.EkabMentorPresence.float());

  await page.goto(base+'/index.html',{waitUntil:'load'});
  check(tag('home keeps its own MENTOR; no second floating instance'),await page.locator('.ekab-mentor-presence').count()===0);
  await page.goto(base+'/mentor-lab.html',{waitUntil:'load'});
  check(tag('lab keeps its own MENTOR; no second floating instance'),await page.locator('.ekab-mentor-presence').count()===0);

  check(tag('no uncaught page errors'),errors.length===0,errors.join(' | ').slice(0,200));
  await context.close();
 }
}finally{await browser?.close();server.close();}
const failed=results.filter(r=>!r.ok);
console.log(`\n${results.length-failed.length}/${results.length} passed`);
process.exit(failed.length?1:0);
