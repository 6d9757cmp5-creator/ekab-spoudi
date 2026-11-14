import {ensureBrowser,openBrowser} from '@remotion/renderer';
import {assertLocked} from './worker.mjs';
assertLocked();
const result=await ensureBrowser();
console.log('ensureBrowser:',JSON.stringify(result));
const browser=await openBrowser('chrome',{logLevel:'error'});
try { console.log('PASS Remotion Chromium launch/close; no compositions or frames rendered'); }
finally { await browser.close({silent:true}); }
