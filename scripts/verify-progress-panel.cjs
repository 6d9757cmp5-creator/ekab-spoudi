/* Regression test: compact home progress, modal detail, data preservation. */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const read=name=>fs.readFileSync(name,'utf8');
const html=read('index.html'),css=read('home-progress-panel.css');
assert.match(html,/home-progress-panel\.js/);
assert.match(html,/home-progress-panel\.css/);
assert.doesNotMatch(html,/src="home-tracker-v2\.js/);
assert.match(css,/progress-panel-compact-summary/);
assert.match(css,/progress-detail-dialog/);
assert.doesNotMatch(read('account-ui.js'),/data-reset-scope="all"/);
assert.doesNotMatch(read('account-ui.js'),/data-reset-scope="seminars"/);
for(const file of ['home-progress-panel.js','activity-time.js','saek-exams.js','updates.js']){
 new vm.Script(read(file),{filename:file});
}
const saved=new Map([
 ['ekab.saek.read.v1.01.1','1'],
 ['ekab.saek.exams.v1',JSON.stringify({history:{'saek-01-1':{correct:2,partial:0,incorrect:1,lastAt:Date.now()}}})],
 ['ekab-eoppep-official-v15',JSON.stringify({'EOP-A-001':{selfAttempts:3,selfCorrect:2,readCompletedAt:new Date().toISOString()}})],
 ['ekab.seminar-prep.local.v1',JSON.stringify({bls:{studied:[],mcRight:[1],mcNeeds:[],right:[],needs:[],scenarioGrades:{}}})]
]);
const storage={
 get length(){return saved.size},
 key:i=>[...saved.keys()][i]??null,
 getItem:k=>saved.get(k)??null,
 setItem:(k,v)=>saved.set(k,String(v)),
 removeItem:k=>saved.delete(k)
};
class Node{
 constructor(tag){this.tag=tag;this.children=[];this.handlers={};this.style={};this.textContent='';this.className='';this.open=false;}
 append(...nodes){this.children.push(...nodes)}
 replaceChildren(...nodes){this.children=nodes}
 setAttribute(key,value){this[key]=value}
 removeAttribute(key){delete this[key]}
 addEventListener(name,handler){this.handlers[name]=handler}
 showModal(){this.open=true}
 close(){this.open=false;this.handlers.close?.()}
}
const root=new Node('div'),body=new Node('body');
const document={getElementById:id=>id==='homeMultiTracker'?root:null,createElement:tag=>new Node(tag),body};
const window={addEventListener(){},dispatchEvent(){},EkabStudyScheduler:{isDue:()=>true},EkabProgress:{checkpoint:async()=>true}};
vm.runInNewContext(read('home-progress-panel.js'),{document,window,localStorage:storage,Event:class Event{}},{filename:'home-progress-panel.js'});
const walk=node=>[node,...node.children.filter(x=>x instanceof Node).flatMap(walk)];
const labels=node=>walk(node).map(x=>x.textContent).filter(Boolean);
assert.equal(root.children.length,1,'one compact dashboard on home');
assert.equal(body.children.length,1,'one reusable details dialog');
assert.ok(labels(root).includes('ΣΑΕΚ'));
assert.ok(labels(root).includes('ΕΟΠΠΕΠ'));
assert.ok(!labels(root).includes('BLS / AED'),'seminars not expanding home');
assert.equal(walk(root).filter(x=>x.className==='progress-panel-mini-dual').length,2);
const dialog=body.children[0];assert.equal(dialog.open,false);
const open=walk(root).find(x=>x.tag==='button'&&x.textContent==='Αναλυτικά ›');
assert.ok(open,'details action visible');open.handlers.click();
assert.equal(dialog.open,true);
assert.ok(labels(dialog).includes('BLS / AED'),'practice-only seminar shown in detail');
assert.ok(labels(dialog).includes('Αναλυτική πρόοδος'));
const reset=walk(dialog).find(x=>x.tag==='button'&&x.textContent.includes('Μηδενισμός'));
assert.ok(reset);reset.handlers.click();
assert.ok(labels(dialog).includes('Επιβεβαίωση 1 από 2'));
walk(dialog).find(x=>x.textContent==='Συνέχεια').handlers.click();
assert.ok(labels(dialog).includes('Τελική επιβεβαίωση 2 από 2'));
(async()=>{
 await walk(dialog).find(x=>x.textContent==='Οριστικός μηδενισμός').handlers.click();
 assert.equal(saved.has('ekab.saek.read.v1.01.1'),false);
 assert.equal(saved.has('ekab.saek.exams.v1'),false);
 assert.equal(saved.has('ekab-eoppep-official-v15'),true);
 assert.equal(saved.has('ekab.seminar-prep.local.v1'),true);
 dialog.close();
 assert.equal(dialog.open,false);
 assert.equal(root.children.length,1,'home remains compact after closing details');
 console.log('Progress panel OK: compact home, separate modal, independent meters, seminar details and scoped double-confirmed reset.');
})().catch(e=>{console.error(e);process.exitCode=1});
