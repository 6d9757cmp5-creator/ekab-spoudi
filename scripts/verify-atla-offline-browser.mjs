import assert from 'node:assert/strict';
import {existsSync,readFileSync} from 'node:fs';
import {chromium} from 'playwright';
import {spawn} from 'node:child_process';
const port=8785,base='http://127.0.0.1:'+port;
// A single missing file would make the whole offline install fail.
const sw=readFileSync('sw.js','utf8');
const assets=[...sw.matchAll(/"\.\/([^"]+)"/g)].map(m=>m[1].split('?')[0].split('#')[0]).filter(Boolean);
const missing=assets.filter(path=>!existsSync(path));
assert.deepEqual(missing,[],'Every offline asset must exist');
for(const needed of ['atla/assistant.mjs','atla/assistant.css','atla/knowledge/retrieve.mjs','mentor/presence/voice.mjs','medical-terms.json','tools/atla-ai/nih3d-library.mjs'])
 assert(assets.includes(needed),'Offline cache misses '+needed);
console.log('PASS offline list: '+assets.length+' assets exist');
const server=spawn(process.env.PYTHON_BIN||'python3',['-m','http.server',String(port),'--bind','127.0.0.1'],{stdio:'ignore'});
let browser;
async function ready(){
 for(let n=0;n<80;n++){
  try{const r=await fetch(base+'/index.html');await r.text();if(r.ok)return;}catch{}
  await new Promise(r=>setTimeout(r,250));
 }
 throw Error('Offline test server unavailable');
}
try{
 await ready();
 browser=await chromium.launch({headless:true});
 const context=await browser.newContext({viewport:{width:390,height:844}});
 const page=await context.newPage();
 await page.goto(base+'/index.html',{waitUntil:'load'});
 // The app reloads itself when a new worker takes over, so each check may lose its page.
 let installed=null;
 for(let i=0;i<180&&!installed;i++){
  await page.waitForTimeout(1000);
  installed=await page.evaluate(async()=>{
   const registration=await navigator.serviceWorker.getRegistration();
   if(!registration?.active||registration.installing||!navigator.serviceWorker.controller)return null;
   const name=(await caches.keys()).find(x=>x.includes('atla-unified'));
   return name&&(await caches.open(name).then(c=>c.keys())).length>10?name:null;
  }).catch(()=>null);
 }
 assert(installed,'The offline cache did not install');
 console.log('PASS offline cache installed: '+installed);
 await page.reload({waitUntil:'load'});
 await context.setOffline(true);
 for(const path of ['/index.html','/saek.html']){
  await page.goto(base+path,{waitUntil:'load',timeout:30000});
  await page.locator('.atla-launcher').waitFor({state:'visible',timeout:15000});
  await page.locator('.atla-launcher').click();
  await page.locator('.atla-input').fill('Τι είναι ΚΑΡΠΑ;');
  await page.locator('.atla-send').click();
  await page.waitForFunction(()=>[...document.querySelectorAll('.atla-message')].some(m=>/θωρακικές συμπιέσεις/i.test(m.textContent)),null,{timeout:20000});
  console.log('PASS offline: ATLA answers locally on '+path);
  await page.evaluate(()=>{try{sessionStorage.clear();}catch{}});
 }
 console.log('PASS ATLA without a network connection');
}finally{await browser?.close();server.kill();}
