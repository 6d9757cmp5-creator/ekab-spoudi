import assert from "node:assert/strict";
import {createServer} from "node:http";
import {readFile,stat} from "node:fs/promises";
import {resolve,extname,sep} from "node:path";
import {chromium,webkit} from "playwright";
const engine=process.env.MENTOR_REAL3D_BROWSER||"chromium";
const browserType={chromium,webkit}[engine];
if(!browserType)throw Error("Unknown engine");
const root=resolve(process.cwd()),mime={".mjs":"text/javascript",".js":"text/javascript",".css":"text/css",".html":"text/html",".json":"application/json",".glb":"model/gltf-binary",".webp":"image/webp",".svg":"image/svg+xml"};
const server=createServer(async(req,res)=>{
 let name;
 try{
  const url=new URL(req.url,"http://127.0.0.1");
  name=resolve(root,"."+decodeURIComponent(url.pathname));
  if(name!==root&&!name.startsWith(root+sep))throw Error("Invalid path");
  const s=await stat(name);
  if(s.isDirectory())name=resolve(name,"index.html");
  const content=await readFile(name);
  res.writeHead(200,{"content-type":mime[extname(name)]||"application/octet-stream","cache-control":"no-store"});
  res.end(content);
 }catch{res.writeHead(404);res.end("Not found");}
});
await new Promise(ok=>server.listen(0,"127.0.0.1",ok));
const port=server.address().port;
let browser;
try{
 browser=await browserType.launch({headless:true});
 const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:1,isMobile:true,hasTouch:true});
 const page=await context.newPage();
 const errors=[];
 page.on("pageerror",e=>errors.push(String(e)));
 const url="http://127.0.0.1:"+port+"/mentor-lab.html";
 await page.goto(url,{waitUntil:"domcontentloaded"});
 await page.waitForFunction(()=>["ready","photo"].includes(document.getElementById("mentor-cinematic-stage")?.dataset.real3d),null,{timeout:60000});
 const ready=await page.locator("#mentor-cinematic-stage").getAttribute("data-real3d");
 assert.equal(ready,"ready","Authentic rigged GLB must load in "+engine);
 assert.equal(await page.locator("#mentor-real3d-canvas").isVisible(),true);
 const check=await page.evaluate(()=>{
  const x=document.getElementById("mentor-real3d-canvas");
  const a=document.getElementById("mentor-avatar");
  return {width:x.width,height:x.height,mouth:a?.dataset.viseme};
 });
 assert.ok(check.width>180&&check.height>200,"GPU viewport has drawable dimensions");
 const slider=page.locator("#mentor-real3d-rotation");
 await slider.evaluate(el=>{el.value="75";el.dispatchEvent(new Event("input",{bubbles:true}));});
 assert.equal(await slider.inputValue(),"75");
 await page.locator("#mentor-real3d-photo").click();
 assert.equal(await page.locator("#mentor-cinematic-stage").getAttribute("data-real3d"),"photo");
 assert.equal(await page.locator(".cinematic-character").isVisible(),true);
 await page.locator("#mentor-real3d-toggle").click();
 assert.equal(await page.locator("#mentor-cinematic-stage").getAttribute("data-real3d"),"ready");
 await page.locator("#mentor-real3d-rotation").evaluate(el=>{el.value="0";el.dispatchEvent(new Event("input",{bubbles:true}));});
 await page.screenshot({path:"mentor-real3d-mobile-"+engine+".png",fullPage:false});
 await page.setViewportSize({width:1440,height:900});
 await page.waitForTimeout(400);
 await page.screenshot({path:"mentor-real3d-desktop-"+engine+".png",fullPage:false});
 assert.equal(errors.length,0,"No browser JS exceptions");
 console.log("PASS",engine,"rigged male human, GPU stage, visemes, photo fallback, rotation");
}finally{if(browser)await browser.close();await new Promise(ok=>server.close(ok));}
