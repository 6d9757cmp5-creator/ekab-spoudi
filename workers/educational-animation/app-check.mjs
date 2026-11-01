import {chromium} from 'playwright';
import {createServer} from 'node:http';
import {readFile,stat} from 'node:fs/promises';
import path from 'node:path';
import {root,assertLocked} from './worker.mjs';
assertLocked();
const app=path.resolve(root,'../..');
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.glb':'model/gltf-binary','.png':'image/png','.webp':'image/webp','.woff2':'font/woff2'};
const server=createServer(async(req,res)=>{
  try {
    const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
    const file=path.resolve(app,'.'+(pathname==='/'?'/index.html':pathname));
    if(!file.startsWith(app+path.sep)) {res.writeHead(403);res.end();return;}
    const info=await stat(file);
    if(!info.isFile()) throw Error('Not file');
    res.setHeader('Content-Type',mime[path.extname(file)]||'application/octet-stream');
    res.end(await readFile(file));
  } catch {res.writeHead(404);res.end();}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const origin='http://127.0.0.1:'+server.address().port;
let browser;
try {
  browser=await chromium.launch({channel:'msedge',headless:true});
  for(const [device,width,height,isMobile] of [['mobile',390,844,true],['desktop',1440,900,false]]) {
    const context=await browser.newContext({viewport:{width,height},isMobile,hasTouch:isMobile,serviceWorkers:'block'});
    // Compatibility check must not call AI/TTS or load videos/external services.
    await context.route('**/*',route=>{
      const request=route.request();
      if(!request.url().startsWith(origin+'/') || !['GET','HEAD'].includes(request.method()) || request.resourceType()==='media') return route.abort();
      return route.continue();
    });
    const page=await context.newPage();
    for(const file of ['index.html','saek.html','protocols.html']) {
      const response=await page.goto(origin+'/'+file,{waitUntil:'load',timeout:30000});
      if(!response?.ok()) throw Error(device+': HTTP failure '+file);
      if(!await page.locator('body').evaluate(el=>!!el.textContent.trim()&&getComputedStyle(el).display!=='none')) throw Error('Invisible body');
      console.log('PASS '+device+': '+file+' loads (external services and media blocked)');
    }
    await context.close();
  }
} finally {await browser?.close();await new Promise(resolve=>server.close(resolve));}
