/* Regression coverage for the shared SAEK reader and blocked localStorage.
 * Runs locally in Node; no network, API keys, health content parsing or browser needed.
 */
'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const counts=[14,13,10,10,14,10,11,11,11,17,11,12,11,14,13,13,13,13,13,13];
const script=fs.readFileSync('saek-reader-safe.js','utf8');
new vm.Script(script,{filename:'saek-reader-safe.js'});
assert.equal(counts.reduce((a,b)=>a+b,0),247);
for(let i=1;i<=20;i++){
 const p='saek-course-'+String(i).padStart(2,'0')+'.html';
 const html=fs.readFileSync(p,'utf8');
 assert.equal((html.match(/<script src="saek-reader-safe\.js"><\/script>/g)||[]).length,1,p+' missing controller');
 assert(!html.includes("<script>(function(){const id='"),p+' still includes duplicated progress controller');
 assert.equal((html.match(/<details class="[^"]*reader-fold[^"]*"/g)||[]).length,counts[i-1],p+' changed chapter count');
 assert.equal((html.match(/class="[^"]*read-button[^"]*"[^>]*data-lesson="/g)||[]).length,counts[i-1],p+' changed read buttons');
}
assert(fs.readFileSync('sw.js','utf8').includes('"./saek-reader-safe.js"'));
const progress=fs.readFileSync('progress.js','utf8');
assert(progress.includes('function storageOK()'));
assert(progress.includes('function download(){if(!storageOK())'));
const hub=fs.readFileSync('saek-hub.js','utf8');
assert(hub.includes('reportStorageState()'));
function simulate(blocked=false){
 const handlers={},storageEvents={},store=new Map();
 if(!blocked)store.set('ekab.saek.read.v1.01.1','1');
 const storage={
  getItem:k=>{if(blocked)throw Error('Storage denied');return store.has(k)?store.get(k):null},
  setItem:(k,v)=>{if(blocked)throw Error('Storage denied');store.set(k,String(v))},
  removeItem:k=>{if(blocked)throw Error('Storage denied');store.delete(k)}
 };
 const elements={},notifications=[],buttons=[1,2].map(index=>{
  const button={dataset:{lesson:String(index)},disabled:false,classList:{toggle(){}},
   setAttribute(k,v){this[k]=v},addEventListener(k,fn){this[k]=fn}};
  elements['status-'+index]={textContent:''};
  return button;
 });
 for(const key of ['read-summary','read-percent','lesson-progress-bar'])elements[key]={style:{},textContent:'',parentElement:{after:n=>notifications.push(n)}};
 const doc={
  querySelectorAll:q=>q==='.read-button[data-lesson]'?buttons:q==='[data-export-all]'?[{disabled:false}]:[],
  getElementById:id=>elements[id]||null,
  querySelector:q=>q==='.lesson-progress'?{after:n=>notifications.push(n)}:null,
  createElement:()=>({setAttribute(){},textContent:'',id:'',className:''}),
  body:{append:n=>notifications.push(n)}
 };
 const window={addEventListener:(e,fn)=>{handlers[e]=fn},dispatchEvent:event=>{storageEvents[event.type]=(storageEvents[event.type]||0)+1}};
 vm.runInNewContext(script,{location:{pathname:'/saek-course-01.html'},document:doc,window,localStorage:storage,Event:class{constructor(type){this.type=type}}},{filename:'saek-reader-safe.js'});
 return {elements,handlers,store,storage,buttons,notifications,storageEvents};
}
const ok=simulate();
assert.equal(ok.elements['read-summary'].textContent,'1/2 κεφάλαια μελετημένα');
assert.equal(ok.elements['read-percent'].textContent,'50%');
ok.buttons[1].click();
assert.equal(ok.store.get('ekab.saek.read.v1.01.2'),'1');
assert.equal(ok.elements['read-summary'].textContent,'2/2 κεφάλαια μελετημένα');
assert.equal(ok.storageEvents['ekab:progress-changed'],1);
ok.store.delete('ekab.saek.read.v1.01.1');
ok.handlers.storage({key:'ekab.saek.read.v1.01.1'});
assert.equal(ok.elements['read-summary'].textContent,'1/2 κεφάλαια μελετημένα');
const denied=simulate(true);
assert(denied.buttons.every(x=>x.disabled));
assert(denied.notifications.length>0);
assert.match(denied.notifications[0].textContent,/δεν είναι διαθέσιμη/);
assert.equal(denied.elements['read-summary'].textContent,'0/2 κεφάλαια μελετημένα');
denied.buttons[0].click();
assert.equal(denied.storageEvents['ekab:progress-changed'],undefined);
console.log('PASS: all 20 SAEK chapters (247), blocked storage, toggle, cross-tab refresh and local backup guard');
