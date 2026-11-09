import assert from 'node:assert/strict';
import {mkdirSync} from 'node:fs';
import {chromium} from 'playwright';
import {spawn} from 'node:child_process';
import {PRACTICAL_CASES,PRACTICAL_SKILLS} from '../tools/patient-simulator/core/eoppep-practical-cases.mjs';
const port=8787,base='http://127.0.0.1:'+port;
const server=spawn(process.env.PYTHON_BIN||'python3',['-m','http.server',String(port),'--bind','127.0.0.1'],{stdio:'ignore'});
mkdirSync('audit-results',{recursive:true});
let browser;
async function ready(){
 for(let n=0;n<80;n++){
  try{const r=await fetch(base+'/practical_exam.html');await r.text();if(r.ok)return;}catch{}
  await new Promise(r=>setTimeout(r,250));
 }
 throw Error('EOPPEP cockpit test server unavailable');
}
const openTool=async(page,label)=>page.locator('#next-tools button',{hasText:label}).first().click();
try{
 await ready();
 browser=await chromium.launch({headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
 for(const [device,width,height,isMobile] of [['desktop',1440,900,false],['mobile',390,844,true]]){
  const context=await browser.newContext({viewport:{width,height},isMobile,hasTouch:isMobile,serviceWorkers:'block'});
  const page=await context.newPage();
  const errors=[];page.on('pageerror',e=>errors.push(String(e)));
  await page.goto(base+'/practical_exam.html',{waitUntil:'load'});
  await page.locator('.practical-cockpit-row a').first().waitFor({state:'attached',timeout:15000});
  assert.equal(await page.locator('.practical-cockpit-row a').count(),6,'One Cockpit entry per official scenario');
  assert.equal(await page.locator('#practical-skills-cockpit li').count(),PRACTICAL_SKILLS.length);
  for(const li of await page.locator('#practical-skills-cockpit li').all())assert(await li.locator('a').count()>=1,'Every skill reaches a scenario');
  for(const item of PRACTICAL_CASES){
   await page.goto(base+'/practical_exam.html',{waitUntil:'load'});
   const link=page.locator('.practical-cockpit-row a[data-case="'+item.id+'"]');
   await link.waitFor({state:'attached',timeout:15000});
   await link.click();
   await page.waitForURL(new RegExp('case='+item.id));
   await page.waitForFunction(title=>document.getElementById('next-case-title')?.textContent===title,item.title,{timeout:20000});
   assert.equal(await page.locator('#next-case-briefing').innerText(),item.briefing,'The official wording is shown');
   assert.equal(await page.locator('#next-case-list .next-case-card').count(),3,'The three original missions stay');
   assert.equal(await page.locator('#next-practical-list .next-case-card').count(),6);
   assert.equal(await page.locator('.next-case-card[data-case-id="'+item.id+'"]').getAttribute('aria-pressed'),'true');
   const facts=await page.locator('#next-case-practical').innerText();
   assert.match(facts,/συνθετικές/,'Synthetic values are labelled');
   assert.match(facts,/σελίδες 17–18/,'The source is shown');
   await openTool(page,'Ενέργειες');
   const buttons=await page.locator('#next-actions button').allInnerTexts();
   for(const step of item.steps)assert(buttons.some(b=>b.startsWith(step.label)),'Missing step: '+step.label);
   const before=await page.locator('#next-hr,#next-vitals').first().innerText().catch(()=>'');
   await page.locator('#next-actions button',{hasText:item.steps[0].label}).click();
   assert.match(await page.locator('#next-result').innerText(),/άσκησης/);
   await openTool(page,'Ανασκόπηση');
   const debrief=await page.locator('#next-actions').innerText();
   assert.match(debrief,/Ελεγμένη σειρά/);
   assert.match(debrief,new RegExp('✓ 1\\. '+item.steps[0].label.slice(0,20)),'The recorded step is ticked');
   assert.match(debrief,/χωρίς βαθμολόγηση/);
   assert.doesNotMatch(debrief,/κανένα βήμα/,'The debrief must not contradict the ticks');
   assert.doesNotMatch(debrief,/\d+\s*\/\s*\d+\s*(?:μονάδες|βαθμ)/,'No grading');
   if(item.practicalNumber===3){
    await openTool(page,'Παρακολούθηση');
    await page.locator('#next-actions button',{hasText:'Έλεγχος ΑΠ'}).click();
    const bp=await page.locator('#next-result').innerText();
    assert.match(bp,/δεν δίνει τιμή/);
    assert.doesNotMatch(bp,/\d{2,3}\s*\/\s*\d{2,3}/,'No invented blood pressure');
   }
   if(item.practicalNumber===4)await page.screenshot({path:'audit-results/eoppep-cockpit-'+device+'.png'});
   await page.locator('#next-return').click();
   await page.waitForURL(new RegExp('practical_exam\\.html#'+item.returnAnchor+'$'),{timeout:20000});
   await page.waitForFunction(id=>document.getElementById(id)?.open===true,item.returnAnchor,{timeout:10000});
  }
  // Each scenario resumes separately and nothing leaks into the original missions.
  await page.goto(base+'/mentor-next.html?case='+PRACTICAL_CASES[0].id,{waitUntil:'load'});
  await page.waitForFunction(title=>document.getElementById('next-case-title')?.textContent===title,PRACTICAL_CASES[0].title);
  await page.locator('.next-case-picker > summary').click();
  await page.locator('#next-case-list .next-case-card').first().click();
  await page.waitForFunction(()=>/Κρήτη/.test(document.getElementById('next-case-title')?.textContent||''));
  await openTool(page,'Ενέργειες');
  const generic=await page.locator('#next-actions button').allInnerTexts();
  assert(!generic.some(b=>/ΑΕΑ|ΚΑΡΠΑ/.test(b)),'Scenario steps stay inside their scenario');
  await page.goto(base+'/mentor-next.html?case=does-not-exist',{waitUntil:'load'});
  await page.locator('#next-case-title').waitFor();
  await page.goto(base+'/mentor-next.html?case='+PRACTICAL_CASES[0].id+'&from=https://evil.example/',{waitUntil:'load'});
  assert.equal(await page.locator('#next-return').isVisible(),false,'No external return link');
  assert.deepEqual(errors,[]);
  console.log('PASS '+device+': six EOPPEP scenarios from the practical page to the Cockpit and back');
  await context.close();
 }
 console.log('PASS EOPPEP practical in the Clinical Cockpit');
}finally{await browser?.close();server.kill();}
