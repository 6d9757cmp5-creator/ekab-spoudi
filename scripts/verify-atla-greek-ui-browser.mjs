/**
 * Real-browser Greek-first UI smoke on eight learner routes.
 * Browser viewport simulation is NOT a physical iPhone or Android test.
 */
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {chromium,webkit} from 'playwright';

const PORT=8775,BASE='http://127.0.0.1:'+PORT;
const server=spawn('python3',['-m','http.server',String(PORT),'--bind','127.0.0.1'],{stdio:'ignore'});
const targets=[
 {page:'index.html',expected:'Προσωπικός Εκπαιδευτής'},
 {page:'protocols.html',expected:'Εξάσκηση σε Πρωτόκολλα'},
 {page:'ui-tools/anatomy-3d/index.html',expected:'ΖΩΝΤΑΝΗ ΠΡΟΒΟΛΗ 3D'},
 {page:'mentor-live.html',expected:'ΚΛΙΝΙΚΟΣ ΠΡΟΣΟΜΟΙΩΤΗΣ'},
 {page:'mentor-lab.html',expected:'Εργαστήριο ΗΚΓ'},
 {page:'theory.html',expected:'Εκπαιδευτικές υπενθυμίσεις SOS'},
 {page:'ui-tools/anatomy-full-atlas.html',expected:'Τρισδιάστατη Ανατομία'},
 {page:'ui-tools/atla-resource-preview.html',expected:'Κίνηση'},
];
const environments=[
 {label:'Chromium κινητού',engine:chromium,width:390,height:844,mobile:true},
 {label:'WebKit κινητού',engine:webkit,width:390,height:844,mobile:true},
 {label:'Chromium υπολογιστή',engine:chromium,width:1440,height:900,mobile:false},
];
let browser;
try {
 let ready=false;
 for(let i=0;i<65;i++){
  try{if((await fetch(BASE+'/index.html')).ok){ready=true;break;}}catch{}
  await new Promise(ok=>setTimeout(ok,200));
 }
 assert.equal(ready,true,'local static server');
 for(const env of environments){
  browser=await env.engine.launch({headless:true});
  const context=await browser.newContext({viewport:{width:env.width,height:env.height},isMobile:env.mobile,hasTouch:env.mobile,serviceWorkers:'block'});
  try {
   const page=await context.newPage();
   for(const target of targets){
    const response=await page.goto(BASE+'/'+target.page,{waitUntil:'domcontentloaded',timeout:30000});
    assert.equal(response?.ok(),true,env.label+' '+target.page+' HTTP error');
    // The EOPPEP reader is intentionally hidden until a question is selected.
    // Confirm the translated label exists in its actual reader DOM, rather than
    // falsely requiring an unopened reader panel to be visible.
    const actual=target.page==='theory.html'
      ? await page.locator('.catalog-ready-sos').textContent({timeout:25000})
      : await page.locator('body').innerText({timeout:25000});
    assert.ok(actual.includes(target.expected),env.label+' '+target.page+' missing '+target.expected);
    assert.equal(await page.locator('html').getAttribute('lang'),'el',target.page+' locale');
   }
   console.log('PASS',env.label,targets.length,'Greek-labelled educational pages');
  }finally{await context.close();await browser.close();browser=undefined;}
 }
}finally{await browser?.close();server.kill();}
