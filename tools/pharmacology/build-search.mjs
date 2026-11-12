#!/usr/bin/env node
/**
 * Builds farmaka-search.json (the pharmacology entries of the app-wide search) from the drug catalog.
 * Run after editing tools/pharmacology/farmaka-catalog.js: node tools/pharmacology/build-search.mjs
 * The search shows name, category and mechanism only; doses stay on the drug card itself.
 */
import {readFileSync,writeFileSync} from 'node:fs';
import vm from 'node:vm';
export function catalog(){
 const sandbox={window:{}};
 vm.runInNewContext(readFileSync(new URL('./farmaka-catalog.js',import.meta.url),'utf8'),sandbox);
 // Plain copy: objects from the sandbox realm would not compare equal to ordinary ones.
 return JSON.parse(JSON.stringify(sandbox.window.EKAB_PHARMA.medicines));
}
export function searchItems(medicines=catalog()){
 return medicines.map(m=>({kind:'page',title:m.name,subtitle:'Φαρμακολογία · '+m.category+' · '+m.english,
  preview:String(m.mechanism||'').slice(0,220),href:'farmaka.html#drug-'+m.id,
  searchText:[m.name,m.english,m.category,m.mechanism].join(' '),keywords:'φάρμακο φαρμακολογία '+m.english}));
}
if(import.meta.url===`file:///${process.argv[1]?.replace(/\\/g,'/').replace(/^\//,'')}`){
 const out=new URL('../../farmaka-search.json',import.meta.url);
 writeFileSync(out,JSON.stringify({items:searchItems()})+'\n');
 console.log('farmaka-search.json:',searchItems().length,'drugs');
}
