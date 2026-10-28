/**
 * Actual headless Chromium smoke for Mentor Foundation.
 * Does not require any Appwrite or AI credentials, nor modify legacy app files.
 */
import {chromium} from 'playwright';
import {createServer} from 'node:http';
import {readFile,mkdir} from 'node:fs/promises';
import {resolve,sep} from 'node:path';
import assert from 'node:assert/strict';
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json'};
const root=resolve('.');
const server=createServer(async(req,res)=>{
  try{
    const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
    const file=resolve(root,'.'+pathname);
    if(file!==root && !file.startsWith(root+sep)){res.writeHead(403);res.end();return;}
    const ext=file.slice(file.lastIndexOf('.'));
    const bytes=await readFile(file);
    res.writeHead(200,{'Content-Type':types[ext]||'application/octet-stream'});
    res.end(bytes);
  }catch{res.writeHead(404);res.end('Not found');}
});
await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
const port=server.address().port;
let browser;
try{
  browser=await chromium.launch({headless:true});
  const context=await browser.newContext({acceptDownloads:true,viewport:{width:390,height:844}});
  const page=await context.newPage();
  const errors=[];
  page.on('pageerror',e=>errors.push(String(e)));
  const url='http://127.0.0.1:'+port+'/mentor-lab.html';
  await page.goto(url,{waitUntil:'networkidle'});
  await page.locator('#status').waitFor();
  await page.waitForFunction(()=>document.getElementById('status').textContent.includes('έτοιμο'));
  assert.equal(await page.title(),'MENTOR OS · Εργαστήριο αποστολών (δοκιμή)');
  assert.equal(await page.locator('#phase').isVisible(),false);
  await page.getByRole('button',{name:/Δύσπνοια σε οικία/}).click();
  await page.waitForFunction(()=>document.getElementById('case-title').textContent==='Δύσπνοια σε οικία');
  assert.equal((await page.locator('#step-count').textContent()).trim(),'0 / 4');
  await page.getByRole('button',{name:/Πλησιάζω αμέσως/}).click();
  await page.waitForFunction(()=>document.getElementById('feedback').dataset.result==='review');
  assert.equal((await page.locator('#step-count').textContent()).trim(),'0 / 4');
  await page.getByRole('button',{name:/Ελέγχω πρώτα την ασφάλεια/}).click();
  await page.waitForFunction(()=>document.getElementById('step-count').textContent==='1 / 4');
  await page.locator('#tab-memory').click();
  await page.waitForFunction(()=>document.getElementById('sessions-count').textContent==='1');
  assert.equal((await page.locator('#review-count').textContent()).trim(),'1');
  await page.screenshot({path:'mentor-foundation-mobile.png',fullPage:true});
  await page.reload({waitUntil:'networkidle'});
  await page.waitForFunction(()=>document.getElementById('step-count').textContent==='1 / 4');
  const original='{"EOP-A-001":{"selfAttempts":2}}';
  await page.evaluate(x=>localStorage.setItem('ekab-eoppep-official-v15',x),original);
  await page.locator('#tab-route').click();
  await page.locator('#read-legacy').click();
  await page.waitForFunction(()=>document.getElementById('legacy-result').textContent.includes('1 / 314'));
  assert.equal(await page.evaluate(()=>localStorage.getItem('ekab-eoppep-official-v15')),original);
  await page.locator('#tab-memory').click();
  const download=page.waitForEvent('download');
  await page.locator('#export-mentor').click();
  const item=await download;
  assert.match(item.suggestedFilename(),/mentor-os-study-backup\.json/);
  page.once('dialog',d=>d.accept());
  await page.locator('#clear-mentor').click();
  await page.waitForFunction(()=>document.getElementById('sessions-count').textContent==='0');
  assert.equal(await page.evaluate(()=>localStorage.getItem('ekab-eoppep-official-v15')),original);
  assert.deepEqual(errors,[],'No browser JS errors');
  console.log('PASS: mobile Chromium real browser flow, IndexedDB persistence, read-only legacy fixture, export and selective delete');
}finally{
  if(browser)await browser.close();
  await new Promise(ok=>server.close(ok));
}
