import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const root=new URL('../',import.meta.url);
const text=async(path)=>readFile(new URL(path,root),'utf8');
test('Mentor is accessible from home without replacing existing sections',async()=>{
 const html=await text('index.html');
 assert.match(html,/href="mentor-lab\.html"/);
 assert.match(html,/MENTOR OS/);
 assert.match(html,/ΔΟΚΙΜΑΣΤΙΚΟ/);
 for(const href of ['saek.html','eoppep.html','seminar-prep.html','ui-tools/anatomy-3d/index.html'])assert.ok(html.includes('href="'+href+'"'),href);
 assert.ok(html.indexOf('MENTOR OS')<html.indexOf('home-bottom-row'));
});
test('Official AED poster is linked and embedded with 2025 guidelines warning',async()=>{
 const html=await text('contacts.html');
 assert.match(html,/href="https:\/\/apinidotes\.crete\.gov\.gr\/files\/afisaBLS\.pdf"/);
 assert.match(html,/src="https:\/\/apinidotes\.crete\.gov\.gr\/files\/afisaBLS\.pdf#toolbar=0"/);
 assert.match(html,/Προβολή της επίσημης αφίσας εδώ/);
 assert.match(html,/2021/);
 assert.match(html,/https:\/\/www\.erc\.edu\/science-research\/guidelines\/guidelines-2025/);
 assert.match(html,/href="tel:112"/);assert.match(html,/href="tel:166"/);
 assert.ok(html.includes('id="aedNearbyMap"'));
 assert.ok(!html.includes('aed-first-aid-poster.webp'),'unreviewed locally hosted poster cannot be published');
});
test('No protected student scoring/sync or new media files',async()=>{
 const css=await text('home.css'),contactsCss=await text('contacts-aed.css');
 assert.match(css,/home-mentor-wrap/); assert.match(contactsCss,/aed-poster-frame iframe/);
 const html=await text('index.html');
 assert.ok(!html.includes('onclick='));
});
