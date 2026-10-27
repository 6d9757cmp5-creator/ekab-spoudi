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

class El{
 constructor(tag='div'){this.tagName=tag;this.children=[];this.listeners={};this.attributes={};this.dataset={};this.textContent='';this.value='';this.className='';}
 appendChild(e){this.children.push(e);return e;}
 append(...items){items.forEach(e=>this.children.push(e));}
 replaceChildren(...items){this.children=items;}
 addEventListener(name,fn){this.listeners[name]=fn;}
 setAttribute(name,value){this.attributes[name]=value;}
 focus(){}
}
const search=new El('input'),results=new El('div'),count=new El('p'),examples=new El('div');
const labels=['ΗΚΓ','οξυγόνο','ΚΑΡΠΑ','φλέβα','φάρμακα','διασωλήνωση'];
const buttons=labels.map(term=>{const x=new El('button');x.dataset.act=term;return x;});
examples.querySelectorAll=()=>buttons;
const panel=new El('section');
panel.querySelector=selector=>({'#actQuery':search,'#actResults':results,'#actCount':count,'.act-examples':examples}[selector]);
const document={
 getElementById:id=>id==='actLookup'?panel:null,
 createElement:tag=>new El(tag),
 createTextNode:value=>({textContent:value})
};
vm.runInNewContext(js,{document,console},{timeout:2000,filename:'profession-acts.js'});
assert.ok(results.children.length>0,'Example cards not rendered');
function ask(value){search.value=value;search.listeners.input();return results.children;}
let cards=ask('ΗΚΓ');assert.equal(cards.length,1,'ECG search results');
assert.equal(cards[0].children[0].children[0].textContent,'Λήψη ηλεκτροκαρδιογραφήματος');
assert.ok(cards[0].children.some(e=>e.className==='act-references'),'FEK references not rendered');
cards=ask('οξυγόνο');assert.equal(cards.length,1);
cards=ask('φαρμακα');assert.equal(cards.length,1,'Unaccented search should work');
cards=ask('διασωλήνωση');assert.equal(cards.length,1);
cards=ask('ανύπαρκτη ιατρική πράξη');assert.equal(cards.length,1);
assert.equal(cards[0].className,'act-empty');
assert.match(cards[0].textContent,/δεν αποδεικνύει ούτε άδεια ούτε απαγόρευση/);
examples.listeners.click({target:{closest:()=>buttons[0]}});
assert.equal(search.value,'ΗΚΓ','Example button should populate input');
assert.equal(results.children.length,1);
assert.equal(buttons[0].attributes['aria-pressed'],'true');
console.log('OK: '+entries.length+' legal acts, linked FEK, accents, ECG/O2/medications/intubation, safe misses, example chips and offline precache');
