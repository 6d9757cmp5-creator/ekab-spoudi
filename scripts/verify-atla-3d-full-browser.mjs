/** Full WebGL-rendered atlas smoke in Chromium on CI; physical phone remains separate. */
import {chromium} from 'playwright';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,sep,extname} from 'node:path';
import assert from 'node:assert/strict';
const root=resolve('.');
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.svg':'image/svg+xml'};
const server=createServer(async(req,res)=>{
 try{
  const pathname=new URL(req.url,'http://127.0.0.1').pathname;
  const path=resolve(root,'.'+decodeURIComponent(pathname));
  if(path!==root&&!path.startsWith(root+sep))throw Error('unsafe path');
  const data=await readFile(path);res.writeHead(200,{'Content-Type':mime[extname(path)]||'application/octet-stream'});res.end(data);
 }catch{res.writeHead(404);res.end('Not found');}
});
await new Promise(done=>server.listen(0,'127.0.0.1',done));
const base='http://127.0.0.1:'+server.address().port+'/';
let browser;
try{
 browser=await chromium.launch({headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader','--enable-webgl']});
 const context=await browser.newContext({viewport:{width:1000,height:760}});
 const page=await context.newPage();
 const problems=[];
 page.on('pageerror',e=>problems.push(e.message));
 page.on('requestfailed',req=>{if(req.url().startsWith('https://cdn.jsdelivr.net'))problems.push('Vendor request: '+req.url()+' '+req.failure()?.errorText)});
 await page.goto(base+'ui-tools/anatomy-3d/index.html?mode=organs&system=cardiac&focus=heart&from=01&chapter=10',{waitUntil:'domcontentloaded'});
 await page.locator('#chapterReturn').waitFor({state:'visible',timeout:20000});
 try{
  await page.waitForFunction(()=>{
   const loading=document.getElementById('loading');
   const error=document.getElementById('errorBox');
   const selected=document.getElementById('detailName');
   const canvas=document.querySelector('#renderMount canvas');
   return Boolean(loading?.hidden&&error?.hidden&&canvas&&selected?.textContent?.includes('Καρδιακές'));
  },null,{timeout:170000});
 }catch(err){
  const snapshot=await page.evaluate(()=>({loading:document.getElementById('loading')?.innerText,error:document.getElementById('errorBox')?.innerText,selection:document.getElementById('detailName')?.textContent,canvas:!!document.querySelector('#renderMount canvas')}));
  throw new Error('Full atlas WebGL was not confirmed: '+JSON.stringify(snapshot)+'; request issues: '+problems.slice(0,6).join(' | ')+'; '+err.message);
 }
 assert.equal(await page.locator('#chapterReturn').getAttribute('href'),'../../saek-course-01.html#lesson-10');
 assert.ok(await page.locator('#detailCard').isVisible(),'Loaded heart group must be explained to learner');
 const name=(await page.locator('#detailName').textContent()).trim();
 assert.match(name,/Καρδιακές/);
 await page.screenshot({path:'atlas-heart-webgl-smoke.png'});
 console.log('PASS: FULL vendor atlas loaded into WebGL, focused heart, chapter return; '+name);
}finally{
 await browser?.close();
 await new Promise(done=>server.close(done));
}
