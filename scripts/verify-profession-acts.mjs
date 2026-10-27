// Standalone zero-dependency smoke tests of the published rescuer-act lookup.
import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const page=fs.readFileSync('profession-law.html','utf8');
const js=fs.readFileSync('profession-acts.js','utf8');
const sw=fs.readFileSync('sw.js','utf8');
const version=JSON.parse(fs.readFileSync('version.json','utf8')).version;
new vm.Script(js,{filename:'profession-acts.js'}); // JavaScript syntax

assert.match(page,/id="actLookup"/);
assert.match(page,/id="actQuery"/);
assert.match(page,/id="actResults"/);
assert.match(page,/src="profession-acts\.js"/);
assert.match(page,/Δεν αποτελεί διδακτέα ή εξεταστέα ύλη/);
assert.match(sw,/["']\.\/profession-law\.html["']/);
assert.match(sw,/["']\.\/profession-acts\.js["']/);
assert.ok(sw.includes('ekab-spoudi-v'+version),'PWA cache and version mismatch');

const match=js.match(/const data=(\[[^;]+\]);\s*const sourcePdf=/);
assert.ok(match,'Static legal registry not found');
const entries=JSON.parse(match[1]);
assert.ok(entries.length>=20,'Expected substantial legal coverage');
assert.equal(new Set(entries.map(x=>x.id)).size,entries.length,'Duplicate act keys');
for(const e of entries){
 assert.ok(e.title&&e.status&&e.article&&e.summary&&e.limit, 'Incomplete legal record: '+e.id);
 assert.match(e.article,/^(?:4, σημείο \d+[α-γ]?|4, σημεία \d+–\d+|5)$/,'Invalid FEK article: '+e.id);
}
const byId=Object.fromEntries(entries.map(x=>[x.id,x]));
assert.equal(byId.ecg.article,'4, σημείο 19');
assert.equal(byId.ecg.status,'Με εντολή ιατρού');
assert.equal(byId.oxygen.article,'4, σημείο 3α');
assert.equal(byId.cpr.article,'4, σημείο 9');
assert.equal(byId.aed.article,'4, σημείο 10');
assert.equal(byId.drugs.status,'Βοήθεια σε ιατρό');
assert.equal(byId.intubation.status,'Βοήθεια σε ιατρό');
assert.equal(byId.other.article,'5');

assert.equal((page.match(/type="search"/g)||[]).length,1,'Exactly one search field');
assert.match(page,/id="lawArchive"/);
assert.match(page,/id="actShowAll"/);
assert.equal((page.match(/<details class="law-item"/g)||[]).length,12,'Original 12 topics retained');

class El{
 constructor(tag='div'){this.tagName=tag;this.children=[];this.listeners={};this.attributes={};this.dataset={};this.textContent='';this.value='';this.className='';this.open=false;this.hidden=false;}
 appendChild(e){this.children.push(e);return e;}
 append(...items){items.forEach(e=>this.children.push(e));}
 replaceChildren(...items){this.children=items;}
 addEventListener(name,fn){this.listeners[name]=fn;}
 setAttribute(name,value){this.attributes[name]=value;}
 focus(){}
}
const search=new El('input'),results=new El('div'),count=new El('p'),examples=new El('div'),showAll=new El('button'),archive=new El('details'),archiveCount=new El('p');
const labels=['ΗΚΓ','οξυγόνο','ΚΑΡΠΑ','φλέβα','φάρμακα','διασωλήνωση'];
const buttons=labels.map(term=>{const x=new El('button');x.dataset.act=term;return x;});
examples.querySelectorAll=()=>buttons;
const oldItems=Array.from({length:12},(_,i)=>{const e=new El('details');e.textContent=i===0?'Βεβαίωση επαγγέλματος ΦΕΚ 1242/2024':'Νομοθεσία γενικό θέμα '+i;return e;});
archive.querySelectorAll=selector=>selector==='.law-item'?oldItems:[];
const group=new El('section');
group.querySelector=()=>oldItems.find(x=>!x.hidden)||null;
archive.querySelectorAll=selector=>selector==='.law-item'?oldItems:selector==='.law-group'?[group]:[];
const panel=new El('section');
panel.querySelector=selector=>({'#actQuery':search,'#actResults':results,'#actCount':count,'.act-examples':examples,'#actShowAll':showAll}[selector]);
const document={
 getElementById:id=>({'actLookup':panel,'lawArchive':archive,'lawCount':archiveCount}[id]||null),
 createElement:tag=>new El(tag),
 createTextNode:value=>({textContent:value})
};
vm.runInNewContext(js,{document,console},{timeout:2000,filename:'profession-acts.js'});
assert.equal(results.children.length,0,'No cards should be open or rendered on initial load');
assert.equal(archive.open,false,'Other legal topics collapsed initially');
assert.equal(showAll.attributes['aria-expanded'],'false');
function ask(value){search.value=value;search.listeners.input();return results.children;}
let cards=ask('ΗΚΓ');assert.equal(cards.length,1,'ECG search results');
assert.equal(cards[0].tagName,'details','Results should be collapsed accordions');
assert.equal(cards[0].open,false);
assert.equal(cards[0].children[0].children[0].children[0].textContent,'Λήψη ηλεκτροκαρδιογραφήματος');
assert.ok(cards[0].children[1].children.some(e=>e.className==='act-references'),'FEK references not rendered');
cards=ask('οξυγόνο');assert.equal(cards.length,1);
cards=ask('φαρμακα');assert.equal(cards.length,1,'Unaccented search should work');
cards=ask('διασωλήνωση');assert.equal(cards.length,1);
cards=ask('1242/2024');assert.equal(cards.length,0,'Other legal topic search should not invent act match');
assert.equal(archive.open,true,'Archive should open for a matching legal topic');
assert.equal(oldItems.filter(x=>!x.hidden).length,1,'Archive must filter to matching topic');
cards=ask('ανύπαρκτη ιατρική πράξη');assert.equal(cards.length,1);
assert.equal(cards[0].className,'act-empty');
assert.equal(archive.open,false,'Archive should close for unmatched query');
assert.match(cards[0].textContent,/δεν αποδεικνύει ούτε άδεια ούτε απαγόρευση/);
examples.listeners.click({target:{closest:()=>buttons[0]}});
assert.equal(search.value,'ΗΚΓ','Example button should populate input');
assert.equal(results.children.length,1);
assert.equal(buttons[0].attributes['aria-pressed'],'true');
search.value='';search.listeners.input();
assert.equal(results.children.length,0);
showAll.listeners.click();
assert.equal(results.children.length,entries.length,'All 27 acts should be available on demand');
assert.equal(showAll.attributes['aria-expanded'],'true');
assert.ok(results.children.every(x=>x.tagName==='details'&&!x.open),'All act details start closed');
showAll.listeners.click();
assert.equal(results.children.length,0,'Toggle hides catalog');
assert.equal(showAll.attributes['aria-expanded'],'false');
console.log('OK: '+entries.length+' legal acts, one search, closed cards, on-demand full catalog, filtered 12-topic archive, FEK, accents and offline precache');
