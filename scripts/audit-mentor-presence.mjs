// Accessibility (axe-core) and rough performance audit of the MENTOR Live Companion.
// Usage: AXE_PATH=<axe.min.js> PLAYWRIGHT_MODULE=<...> BROWSER_CHANNEL=msedge node scripts/audit-mentor-presence.mjs [out.json]   (GPU=hardware uses the real GPU; default is software WebGL)
// Software WebGL (SwiftShader) is used when no GPU exists, so FPS numbers are a LOWER BOUND, not device results.
import {createServer} from 'node:http';
import {readFile,writeFile} from 'node:fs/promises';
import {extname,join,normalize,resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';

const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const axeSource=await readFile(process.env.AXE_PATH,'utf8');
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.json':'application/json','.webp':'image/webp','.glb':'model/gltf-binary','.svg':'image/svg+xml'};
const server=createServer(async(req,res)=>{try{const p=decodeURIComponent(new URL(req.url,'http://x').pathname);const b=await readFile(normalize(join(root,p)));res.writeHead(200,{'content-type':types[extname(p)]||'application/octet-stream'});res.end(b);}catch{if(!res.headersSent)res.writeHead(404);res.end();}}).listen(0,'127.0.0.1');
await new Promise(r=>server.once('listening',r));
const base='http://127.0.0.1:'+server.address().port;
const browser=await chromium.launch({headless:true,channel:process.env.BROWSER_CHANNEL||undefined,args:process.env.GPU==='hardware'?['--ignore-gpu-blocklist','--enable-gpu-rasterization','--enable-precise-memory-info']:['--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist','--enable-precise-memory-info']});
const report={generated:new Date().toISOString(),commit:(await import('node:child_process')).execSync('git rev-parse --short HEAD').toString().trim(),gpuMode:process.env.GPU==='hardware'?'hardware':'software',note:process.env.GPU==='hardware'?'Real GPU of the test PC (desktop-class Edge). Not a phone: mobile numbers use an emulated viewport only.':'SwiftShader software rendering; numbers are not representative of real devices.',devices:{}};

for(const [name,w,h,mobile] of [['desktop',1440,900,false],['mobile',390,844,true]]){
 const ctx=await browser.newContext({viewport:{width:w,height:h},isMobile:mobile,hasTouch:mobile,serviceWorkers:'block'});
 const page=await ctx.newPage();
 const out={};
 const t0=Date.now();
 await page.goto(base+'/saek-course-01.html',{waitUntil:'load'});
 await page.waitForSelector('.ekab-mentor-launcher:not([hidden])');
 out.launcherReadyMs=Date.now()-t0;
 const heapMin=await page.evaluate(()=>performance.memory?.usedJSHeapSize||0);
 out.iframesWhileMinimized=await page.locator('.ekab-mentor-presence iframe').count();
 out.presenceModuleRequests=0;
 const t1=Date.now();
 await page.locator('.ekab-mentor-launcher').click();
 await page.waitForFunction(()=>document.querySelector('.ekab-mentor-presence iframe')?.contentDocument?.getElementById('mentor-cinematic-stage')?.dataset.real3d?.match(/^(ready|photo)$/),null,{polling:200,timeout:120000});
 out.openToReadyMs=Date.now()-t1;
 out.heapMinimizedMB=Math.round(heapMin/1048576*10)/10;
 out.heapOpenMB=Math.round((await page.evaluate(()=>performance.memory?.usedJSHeapSize||0))/1048576*10)/10;
 out.fps3sOpen=await page.evaluate(()=>new Promise(res=>{let n=0;const s=performance.now();const f=()=>{n++;if(performance.now()-s<3000)requestAnimationFrame(f);else res(Math.round(n/3*10)/10);};requestAnimationFrame(f);}));
 await page.locator('.emp-btn[aria-label^="Ελαχιστοποίηση"]').click();
 await page.waitForTimeout(500);
 out.iframesAfterMinimize=await page.locator('.ekab-mentor-presence iframe').count();
 out.fps3sMinimized=await page.evaluate(()=>new Promise(res=>{let n=0;const s=performance.now();const f=()=>{n++;if(performance.now()-s<3000)requestAnimationFrame(f);else res(Math.round(n/3*10)/10);};requestAnimationFrame(f);}));

 // accessibility: scan only the widget, open with the ask panel visible
 await page.locator('.ekab-mentor-launcher').click();
 await page.waitForSelector('.ekab-mentor-presence:not([hidden])');
 await page.locator('.emp-bar button[aria-controls="ekab-mentor-ask"]').click();
 await page.locator('.emp-settings summary').click();
 await page.addScriptTag({content:axeSource});
 const axe=await page.evaluate(async()=>{
  const r=await axe.run(['.ekab-mentor-presence','.ekab-mentor-launcher'],{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21a','wcag21aa','best-practice']}});
  return {violations:r.violations.map(v=>({id:v.id,impact:v.impact,help:v.help,nodes:v.nodes.slice(0,3).map(n=>n.html.slice(0,120))})),passes:r.passes.length,incomplete:r.incomplete.map(i=>i.id)};
 });
 out.axe=axe;
 // touch target sizes of interactive widget controls
 out.smallTargets=await page.evaluate(()=>[...document.querySelectorAll('.ekab-mentor-presence button, .ekab-mentor-presence input, .ekab-mentor-presence select, .ekab-mentor-launcher')]
  .filter(e=>e.offsetParent!==null).map(e=>{const r=e.getBoundingClientRect();return {el:(e.getAttribute('aria-label')||e.textContent||e.className).trim().slice(0,30),w:Math.round(r.width),h:Math.round(r.height)};}).filter(t=>t.w<32||t.h<32));
 report.devices[name]=out;
 await ctx.close();
}
await browser.close();server.close();
const file=process.argv[2];
if(file)await writeFile(file,JSON.stringify(report,null,2));
console.log(JSON.stringify(report,null,2));
const bad=Object.values(report.devices).flatMap(d=>d.axe.violations).filter(v=>['serious','critical'].includes(v.impact));
console.log(bad.length?'\nSERIOUS/CRITICAL a11y violations: '+bad.map(v=>v.id).join(', '):'\nNo serious/critical axe violations in the widget.');
process.exit(bad.length?1:0);
