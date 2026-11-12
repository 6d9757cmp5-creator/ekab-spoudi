import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {searchItems} from './build-search.mjs';

test('the app-wide search lists every drug card, built from the current catalog',()=>{
 const built=JSON.parse(readFileSync(new URL('../../farmaka-search.json',import.meta.url),'utf8')).items;
 assert.deepEqual(built,searchItems(),'run: node tools/pharmacology/build-search.mjs');
 assert.ok(built.length>=60);
 assert.ok(built.some(x=>/Αδρεναλίνη/.test(x.title)&&/^farmaka\.html#drug-\d+$/.test(x.href)));
 assert.ok(built.every(x=>!/\d\s*(mg|mcg|μg|ml)\b/i.test(x.title+' '+x.preview)),'no doses in search results');
});
