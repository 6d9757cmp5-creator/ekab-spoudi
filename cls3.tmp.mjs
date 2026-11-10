import {chromium} from 'playwright';
const b=await chromium.launch();
for(const path of process.argv.slice(2)){
 const ctx=await b.newContext({viewport:{width:412,height:823},isMobile:true,hasTouch:true});const p=await ctx.newPage();
 const cdp=await ctx.newCDPSession(p);await cdp.send('Emulation.setCPUThrottlingRate',{rate:4});
 await cdp.send('Network.emulateNetworkConditions',{offline:false,latency:150,downloadThroughput:1.6*1024*1024/8,uploadThroughput:750*1024/8});
 await p.addInitScript(()=>{window.__shifts=[];new PerformanceObserver(l=>{for(const e of l.getEntries()){if(e.hadRecentInput)continue;window.__shifts.push({v:+e.value.toFixed(3),t:Math.round(e.startTime),src:e.sources.map(s=>{const n=s.node;return n?(n.tagName+'.'+(n.className||'').toString().split(' ')[0])+' '+Math.round(s.previousRect.y)+'→'+Math.round(s.currentRect.y)+' h'+Math.round(s.previousRect.height)+'→'+Math.round(s.currentRect.height):'?'}).slice(0,3)})}}).observe({type:'layout-shift',buffered:true});});
 await p.goto('http://127.0.0.1:8799/'+path,{waitUntil:'load',timeout:90000});await p.waitForTimeout(6000);
 const s=await p.evaluate(()=>window.__shifts);
 console.log('== '+path+' CLS '+s.reduce((a,x)=>a+x.v,0).toFixed(3));for(const x of s.filter(x=>x.v>0.005))console.log('   ',x.v,'@'+x.t,x.src.join(' ; '));
 await ctx.close();
}
await b.close();
