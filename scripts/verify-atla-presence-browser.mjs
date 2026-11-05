import assert from 'node:assert/strict';
import {mkdirSync} from 'node:fs';
import {chromium} from 'playwright';
import {spawn} from 'node:child_process';
const port=8783,base='http://127.0.0.1:'+port;
const server=spawn(process.env.PYTHON_BIN||'python3',['-m','http.server',String(port),'--bind','127.0.0.1'],{stdio:'ignore'});
mkdirSync('audit-results',{recursive:true});
let browser;
async function ready(){
 for(let n=0;n<80;n++){
  try{const r=await fetch(base+'/index.html');await r.text();if(r.ok)return;}catch{}
  await new Promise(r=>setTimeout(r,250));
 }
 throw Error('ATLA presence test server unavailable');
}
const widget='.ekab-mentor-presence';
async function ask(page,question){
 const before=await page.locator('.atla-message').count();
 await page.locator('.atla-input').fill(question);
 await page.locator('.atla-send').click();
 await page.waitForFunction(n=>document.querySelectorAll('.atla-message').length>n+1,before,{timeout:30000});
}
try{
 await ready();
 browser=await chromium.launch({headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
 for(const [device,width,height,isMobile] of [['desktop',1440,900,false],['mobile',390,844,true]]){
  const context=await browser.newContext({viewport:{width,height},isMobile,hasTouch:isMobile,serviceWorkers:'block'});
  await context.addInitScript(()=>{
   window.__spoken=[];window.__micStarts=0;
   window.SpeechRecognition=window.webkitSpeechRecognition=class{start(){window.__micStarts++;setTimeout(()=>{this.onresult?.({results:[[{transcript:'Τι είναι ΚΑΡΠΑ;'}]]});this.onend?.();},50);}abort(){this.onend?.();}};
   window.SpeechSynthesisUtterance=class{constructor(t){this.text=t;}};
   const voices=[{name:'Microsoft Athina - Greek (Greece)',lang:'el-GR',localService:true,voiceURI:'athina'}];
   Object.defineProperty(window,'speechSynthesis',{configurable:true,value:{getVoices:()=>voices,addEventListener(){},cancel(){},
    speak(u){window.__spoken.push(u.text);setTimeout(()=>u.onstart?.(),20);setTimeout(()=>u.onend?.(),200);}}});
  });
  const page=await context.newPage();
  const errors=[];page.on('pageerror',e=>errors.push(String(e)));
  const glb=[];page.on('request',r=>{if(r.url().includes('mentor-presence.html'))glb.push(r.url())});
  await page.goto(base+'/saek-course-01.html',{waitUntil:'load'});
  await page.locator('.atla-launcher').waitFor({state:'visible',timeout:15000});
  assert.equal(await page.locator('.ekab-mentor-launcher').count(),0,'No second assistant button');
  assert.equal(glb.length,0,'The 3D teacher is not downloaded until requested');
  await page.locator('.atla-launcher').click();

  // The welcome gives a next step and working prompts, without exposing grades.
  const welcome=await page.locator('.atla-stream').innerText();
  assert.doesNotMatch(welcome,/βαθμ|λάθη|\d+\s*%/i,'No implicit exposure of grades');
  assert.equal(await page.locator('.atla-chip').count(),3);
  await page.locator('.atla-chip',{hasText:'Τι να επαναλάβω'}).click();
  await page.waitForFunction(()=>/τοπικό ιστορικό/.test([...document.querySelectorAll('.atla-message')].at(-1)?.textContent||''),null,{timeout:15000});
  await page.screenshot({path:'audit-results/atla-panel-'+device+'.png'});
  await page.locator('.atla-footer button',{hasText:'Καθαρισμός'}).click();
  await page.locator('.atla-chip').first().waitFor({timeout:5000});

  // Answers work with no 3D at all, and fake replies never appear.
  await ask(page,'Τι είναι ΚΑΡΠΑ;');
  assert.match(await page.locator('.atla-message').last().innerText(),/θωρακικές συμπιέσεις/i);
  assert.doesNotMatch(await page.locator('.atla-message').last().innerText(),/Εικονικό AI/);
  await page.locator('.atla-footer button',{hasText:'Ανάγνωση'}).click();
  await page.waitForFunction(()=>window.__spoken.length===1);

  // The 3D teacher opens as ATLA's body with no second conversation.
  await page.locator('.atla-3d').click();
  await page.locator('.ekab-mentor-presence').waitFor({state:'visible',timeout:15000});
  assert.equal(await page.locator('.atla-3d').getAttribute('aria-pressed'),'true');
  assert.equal(await page.locator('.emp-bar button[aria-controls="ekab-mentor-ask"]').isVisible(),false,'No second chat inside the 3D teacher');
  assert.equal(await page.locator('.ekab-mentor-launcher').isVisible(),false,'No second launcher');
  await page.waitForFunction(()=>/^(ready|photo)/.test(document.querySelector('.ekab-mentor-presence iframe')?.contentDocument?.getElementById('mentor-cinematic-stage')?.dataset.real3d||''),null,{timeout:90000});

  // ATLA's answers drive its face and voice.
  await ask(page,'Τι είναι η καρδιά;');
  await page.waitForFunction(()=>document.querySelector('.ekab-mentor-presence iframe')?.contentDocument?.getElementById('mentor-cinematic-stage')?.dataset.mentorMood==='explanatory',null,{timeout:15000});
  const saidBefore=await page.evaluate(()=>window.__spoken.length);
  await page.locator('.atla-footer button',{hasText:'Ανάγνωση'}).click();
  await page.waitForFunction(n=>window.__spoken.length>n,saidBefore,{timeout:10000}).catch(async()=>{throw Error('Nothing spoken: '+JSON.stringify(await page.evaluate(()=>window.__spoken)));});
  assert.match(await page.evaluate(()=>window.__spoken.at(-1)),/όργανο/,'The 3D teacher reads the ATLA answer');
  await page.screenshot({path:'audit-results/atla-3d-'+device+'.png'});
  const stream=await page.locator('.atla-stream').boundingBox();
  assert(stream.height>=110,device+': the conversation must stay readable next to the 3D teacher, height='+stream.height);
  const teacher=await page.locator('.ekab-mentor-presence').boundingBox();
  const overlap=Math.max(0,Math.min(stream.y+stream.height,teacher.y+teacher.height)-Math.max(stream.y,teacher.y))*Math.max(0,Math.min(stream.x+stream.width,teacher.x+teacher.width)-Math.max(stream.x,teacher.x));
  assert.equal(overlap,0,device+': the 3D teacher must not cover the conversation');

  // The body keeps every placement control of the old companion.
  const box=()=>page.locator(widget).boundingBox();
  const inView=b=>b&&b.x>=0&&b.y>=0&&b.x+b.width<=width+0.5&&b.y+b.height<=height+0.5;
  const drag=async(dx,dy)=>{
   const g=await page.locator('.emp-grip').boundingBox();
   const sx=g.x+g.width/2,sy=g.y+g.height/2;
   if(isMobile){
    const cdp=await context.newCDPSession(page);
    const touch=(type,x,y)=>cdp.send('Input.dispatchTouchEvent',{type,touchPoints:type==='touchEnd'?[]:[{x,y}]});
    await touch('touchStart',sx,sy);
    for(let i=1;i<=8;i++)await touch('touchMove',sx+dx*i/8,sy+dy*i/8);
    await touch('touchEnd');await cdp.detach();
   }else{
    await page.mouse.move(sx,sy);await page.mouse.down();
    await page.mouse.move(sx+dx,sy+dy,{steps:6});await page.mouse.up();
   }
  };
  for(const label of ['Ελαχιστοποίηση','Απόκρυψη','Ρώτα'])assert.equal(await page.locator('.emp-btn[aria-label^="'+label+'"]').isVisible(),false,label+' belongs to ATLA, not to the body');
  const start=await box();
  const moveY=start.y>height/2?-60:30;
  await drag(40,moveY);
  const moved=await box();
  assert(Math.abs(moved.x-start.x)>=20&&Math.abs(moved.y-start.y)>=20&&inView(moved),device+': drag moves the teacher, stays on screen');
  await drag(-5000,-5000);
  assert(inView(await box()),device+': dragging past the edges stays clamped');
  const w0=(await box()).width;
  await page.locator('.emp-resize').focus();
  await page.keyboard.press('ArrowRight');await page.keyboard.press('ArrowRight');
  assert((await box()).width>w0&&inView(await box()),device+': keyboard resize grows the teacher');
  await page.locator('.emp-btn[aria-haspopup]').click();
  await page.getByRole('button',{name:/Καρφίτσωμα · Πάνω αριστερά/}).click();
  const placed=await box();
  assert(placed.x<=20&&placed.y<=20,device+': pin to the top-left corner');

  // The microphone starts only when pressed and asks the transcribed question.
  assert.equal(await page.evaluate(()=>window.__micStarts),0,'The microphone never starts by itself');
  const before=await page.locator('.atla-message').count();
  await page.locator('.atla-mic').click();
  await page.waitForFunction(n=>document.querySelectorAll('.atla-message').length>n+1,before,{timeout:15000});
  assert.equal(await page.evaluate(()=>window.__micStarts),1);

  // Automatic reading is opt-in and remembered.
  const spoken=await page.evaluate(()=>window.__spoken.length);
  await page.locator('.atla-auto-read input').check();
  await ask(page,'Τι είναι ο πνευμοθώρακας;');
  await page.waitForFunction(n=>window.__spoken.length>n,spoken,{timeout:10000});

  // The choice survives navigation, and switching off releases the 3D scene.
  await page.goto(base+'/saek-course-02.html',{waitUntil:'load'});
  await page.locator('.ekab-mentor-presence').waitFor({state:'visible',timeout:15000});
  assert.equal(await page.locator('.atla-auto-read input').isChecked(),true);
  const kept=await box();
  assert(Math.abs(kept.x-placed.x)<=1&&Math.abs(kept.y-placed.y)<=1,device+': the placement survives navigation');
  await page.locator('.atla-launcher').click();
  await page.locator('.atla-3d').click();
  await page.waitForFunction(()=>!document.querySelector('.ekab-mentor-presence iframe'),null,{timeout:10000});
  await page.reload({waitUntil:'load'});
  await page.waitForTimeout(800);
  assert.equal(await page.locator('.ekab-mentor-presence iframe').count(),0,'Switched off stays off');
  await page.locator('.atla-auto-read input').evaluate(e=>{e.checked=false;e.dispatchEvent(new Event('change'));});

  // Exams refuse answers on every page the old companion served.
  await page.goto(base+'/written_exam.html',{waitUntil:'load'});
  await page.locator('.atla-launcher').click();
  await ask(page,'Τι είναι ΚΑΡΠΑ;');
  assert.match(await page.locator('.atla-message').last().innerText(),/εξέταση/);
  assert.doesNotMatch(await page.locator('.atla-message').last().innerText(),/θωρακικές συμπιέσεις/i);

  assert.deepEqual(errors,[]);
  console.log('PASS '+device+': one ATLA with 3D body, voice, microphone, memory and exam refusal');
  await context.close();
 }
 console.log('PASS ATLA with its 3D body in a real browser');
}finally{await browser?.close();server.kill();}
