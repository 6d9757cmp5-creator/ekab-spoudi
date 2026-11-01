import {chromium} from 'playwright';
import {mkdirSync,writeFileSync} from 'node:fs';
const report={url:'https://playground.ai.cloudflare.com/',status:'unknown',at:new Date().toISOString()};
let browser;
try{
 browser=await chromium.launch({headless:true});
 const page=await browser.newPage({viewport:{width:1440,height:1100}});
 const errors=[];page.on('pageerror',e=>errors.push(e.message.slice(0,140)));
 const resp=await page.goto(report.url,{waitUntil:'domcontentloaded',timeout:35000});
 await page.waitForTimeout(8000);
 report.status='loaded';
 report.statusCode=resp?.status();
 report.finalUrl=page.url();
 report.title=await page.title();
 report.bodyText=(await page.locator('body').innerText().catch(()=>'')).slice(0,5000);
 report.buttons=await page.locator('button').evaluateAll(els=>els.slice(0,60).map(x=>({text:x.innerText?.trim().slice(0,90),aria:x.getAttribute('aria-label'),title:x.getAttribute('title')})));
 report.inputs=await page.locator('input, textarea, [role="textbox"], [contenteditable="true"], select').evaluateAll(els=>els.slice(0,35).map(x=>({tag:x.tagName,role:x.getAttribute('role'),placeholder:x.getAttribute('placeholder'),aria:x.getAttribute('aria-label'),outer:x.outerHTML.slice(0,220)})));
 report.pageErrors=errors.slice(0,10);
 console.log('PLAYGROUND_PROBE',JSON.stringify({status:report.status,statusCode:report.statusCode,finalUrl:report.finalUrl,title:report.title,body:report.bodyText.slice(0,2100),buttons:report.buttons,inputs:report.inputs,errors:report.pageErrors}).slice(0,9000));
}catch(e){report.status='error';report.error=String(e?.message||e).slice(0,600);console.log('PLAYGROUND_PROBE_ERROR',report.error);}
finally{
 mkdirSync('audit-results',{recursive:true});
 writeFileSync('audit-results/cloudflare-playground-probe.json',JSON.stringify(report,null,2)+'\n');
 await browser?.close();
}
