#!/usr/bin/env node
/**
 * Opens every published page in Chromium and fails on uncaught JavaScript errors.
 * Network failures of outside services (sign-in, CDNs) are not counted: the pages
 * must keep working without them. Usage: node tools/ci/page-smoke.mjs http://127.0.0.1:8799
 */
import {readdirSync} from 'node:fs';
import {chromium} from 'playwright';
const base=(process.argv[2]||'http://127.0.0.1:8799').replace(/\/$/,'');
const skip=/^(pr6-images-preview|oauth-callback)\.html$/;
const pages=[...readdirSync('.').filter(f=>f.endsWith('.html')&&!skip.test(f)),'ui-tools/anatomy-3d/index.html'];
const browser=await chromium.launch();
const failures=[];
for(const [i,page] of pages.entries()){
 for(const viewport of [{width:390,height:844},{width:1280,height:800}]){
  const context=await browser.newContext({viewport,serviceWorkers:'block'});
  const tab=await context.newPage();const errors=[];
  tab.on('pageerror',e=>errors.push(e.message.split('\n')[0]));
  try{await tab.goto(base+'/'+page,{waitUntil:'load',timeout:45000});await tab.waitForTimeout(1500)}
  catch(e){errors.push('did not load: '+e.message.split('\n')[0])}
  if(errors.length)failures.push(page+' ('+viewport.width+'px): '+[...new Set(errors)].join(' | '));
  await context.close();
 }
 process.stdout.write('.'+((i+1)%20?'':'\n'));
}
await browser.close();
console.log('');
if(failures.length){console.error(failures.length+' page(s) with errors:\n'+failures.join('\n'));process.exit(1)}
console.log('OK · '+pages.length+' pages load without JavaScript errors on phone and desktop width');
