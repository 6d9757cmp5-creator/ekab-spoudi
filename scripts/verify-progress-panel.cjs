/* Regression test for the minimal home progress panel. */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const read=name=>fs.readFileSync(name,'utf8');
const home=read('index.html');
assert.match(home,/home-progress-panel\.js/);
assert.doesNotMatch(home,/src="home-tracker-v2\.js/);
assert.match(home,/home-progress-panel\.css/);
assert.doesNotMatch(read('account-ui.js'),/data-reset-scope="all"/);
assert.doesNotMatch(read('account-ui.js'),/data-reset-scope="seminars"/);
for(const file of ['home-progress-panel.js','activity-time.js','saek-exams.js','updates.js'])
 new vm.Script(read(file),{filename:file});
const values=new Map([
 ['ekab.saek.read.v1.01.1','1'],
 ['ekab.saek.exams.v1',JSON.stringify({history:{'saek-01-1':{correct:2,partial:0,incorrect:1,lastAt:Date.now()}}})],
 ['ekab-eoppep-official-v15',JSON.stringify({'EOP-A-001':{selfAttempts:3,selfCorrect:2,readCompletedAt:new Date().toISOString()}})],
 ['ekab.seminar-prep.local.v1',JSON.stringify({bls:{studied:[],mcRight:[1],mcNeeds:[],right:[],needs:[],scenarioGrades:{}}})]
]);
const store={get length(){return values.size},key:i=>[...values.keys()][i]??null,getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,String(v)),removeItem:k=>values.delete(k)};
class Node{constructor(tag){this.tag=tag;this.children=[];this.handlers={};this.style={};this.textContent='';this.className='';}
 append(...children){this.children.push(...children)}
 replaceChildren(...children){this.children=children}
 setAttribute(){}
 addEventListener(name,handler){this.handlers[name]=handler}
}
const root=new Node('root'),doc={getElementById:id=>id==='homeMultiTracker'?root:null,createElement:tag=>new Node(tag)};
const window={addEventListener(){},dispatchEvent(){},EkabStudyScheduler:{isDue:()=>true},EkabProgress:{checkpoint:async()=>true}};
vm.runInNewContext(read('home-progress-panel.js'),{document:doc,window,localStorage:store,Event:class Event{constructor(type){this.type=type}}},{filename:'home-progress-panel.js'});
const collect=node=>[node,...node.children.filter(x=>x instanceof Node).flatMap(collect)];
const texts=()=>collect(root).map(n=>n.textContent).filter(Boolean);
assert.ok(texts().includes('ΣΑΕΚ'));
assert.ok(texts().includes('ΕΟΠΠΕΠ'));
assert.ok(texts().includes('BLS / AED')); // seminar started by practice alone
assert.ok(texts().includes('1%')||texts().includes('2%')); // independent exam coverage
const btn=collect(root).find(n=>n.tag==='button'&&n.textContent.includes('Μηδενισμός'));
assert.ok(btn);
btn.handlers.click();
assert.ok(collect(root).some(n=>n.textContent==='Επιβεβαίωση 1 από 2'));
collect(root).find(n=>n.textContent==='Συνέχεια').handlers.click();
assert.ok(collect(root).some(n=>n.textContent==='Τελική επιβεβαίωση 2 από 2'));
(async()=>{
 await collect(root).find(n=>n.textContent==='Οριστικός μηδενισμός').handlers.click();
 assert.equal(values.has('ekab.saek.read.v1.01.1'),false);
 assert.equal(values.has('ekab.saek.exams.v1'),false);
 assert.equal(values.has('ekab-eoppep-official-v15'),true);
 assert.equal(values.has('ekab.seminar-prep.local.v1'),true);
 console.log('Minimal progress panel OK: source data, practice-only seminar, isolated double-confirmation reset.');
})().catch(e=>{console.error(e);process.exitCode=1});
