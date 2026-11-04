import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {spawn} from 'node:child_process';
const port=8769,base='http://127.0.0.1:'+port;
const server=spawn('python3',['-m','http.server',String(port),'--bind','127.0.0.1'],{stdio:'ignore'});
let browser;
async function ready(){
 for(let n=0;n<80;n++){
  try{const r=await fetch(base+'/saek-course-01.html');await r.text();if(r.ok)return;}catch{}
  await new Promise(r=>setTimeout(r,250));
 }
 throw Error('ATLA browser test server unavailable');
}
async function ask(page,question){
 await page.locator('.atla-input').fill(question);
 const before=await page.locator('.atla-message').count();
 await page.locator('.atla-send').click();
 await page.waitForFunction(n=>document.querySelectorAll('.atla-message').length>n+1,before,{timeout:30000});
 await page.waitForFunction(()=>!document.querySelector('.atla-send')?.disabled,null,{timeout:30000});
}
const modelLinks=page=>page.locator('.atla-panel a[href*="dataset=nih"]');
try{
 await ready();
 browser=await chromium.launch({headless:true,args:['--use-gl=angle','--use-angle=swiftshader','--enable-webgl','--ignore-gpu-blocklist','--no-sandbox']});
 const ctx=await browser.newContext({viewport:{width:390,height:844},serviceWorkers:'block'});
 const page=await ctx.newPage();
 const library=[];
 page.on('request',r=>{if(r.url().includes('model-library.json')&&page.url().includes('saek-course'))library.push(r.url())});
 const errors=[];page.on('pageerror',e=>errors.push(String(e)));
 await page.goto(base+'/saek-course-02.html',{waitUntil:'domcontentloaded'});
 await page.locator('.atla-launcher').click();
 await ask(page,'Τι είναι η επιγονατίδα;');
 assert.equal(await modelLinks(page).count(),0,'Text is enough: no model is offered');
 await ask(page,'Δείξε μου την επιγονατίδα σε 3D');
 const offer=modelLinks(page).last();
 await offer.waitFor({state:'attached',timeout:15000});
 assert.match(await offer.innerText(),/3D μοντέλο: Επιγονατίδα/);
 const href=await offer.getAttribute('href');
 assert.match(href,/model=3DPX-000170/);
 assert.match(href,/from=%2Fsaek-course-02\.html/,'A return point is carried along');
 await ask(page,'Ανατομία της επιγονατίδας σε 3D');
 assert.match(await modelLinks(page).last().getAttribute('href'),/model=3DPX-000170/,'The exact model wins over generic navigation');
 const count=await modelLinks(page).count();
 await ask(page,'Δείξε μου το βραχιόνιο σε 3D');
 assert.equal(await modelLinks(page).count(),count,'A bone name never opens a fracture example');
 await page.goto(new URL(href,base).href,{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>/Φορτώθηκε/.test(document.querySelector('#source-status')?.textContent||''),null,{timeout:90000});
 await page.click('#source-back');
 await page.waitForURL(/saek-course-02\.html/,{timeout:30000});
 await page.goto(base+'/saek-exams.html',{waitUntil:'domcontentloaded'});
 await page.locator('.atla-launcher').click();
 await ask(page,'Δείξε μου την επιγονατίδα σε 3D');
 assert.equal(await modelLinks(page).count(),0,'An active exam never offers a model');
 assert.match(await page.locator('.atla-message').last().innerText(),/εξέταση/);
 assert.deepEqual(errors,[]);
 console.log('PASS ATLA dynamic 3D selection in a real browser');
}finally{await browser?.close();server.kill();}
