import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const root=new URL('../',import.meta.url);
const read=path=>readFile(new URL(path,root),'utf8');
test('Mentor registry tracks 25 unique capabilities and truthful no-AI constraints',async()=>{
 const src=await read('ui-tools/mentor-roadmap.js');
 const ids=[...src.matchAll(/\{id:"(\d+)",phase:(\d+),title:/g)].map(m=>m[1]);
 assert.equal(ids.length,25,'the registry has all 25 distinct items');
 assert.equal(new Set(ids).size,25,'no duplicate capability IDs');
 for(const id of ['24','25']){
  assert.match(src,new RegExp('id:"'+id+'"[^\\n]+status:"available"'));
 }
 assert.match(src,/title:"ECG Intelligence Lab — πραγματική κλινική ερμηνεία",status:"pending"/);
 assert.match(src,/title:"Πλήρης AI καθηγητής με φυσική συνομιλία",status:"unavailable"/);
 assert.match(src,/href:"..\/mentor-live.html"/);
 assert.match(src,/href:"..\/mentor-oral.html"/);
 assert.match(src,/href:"..\/mentor-ecg.html"/);
});
test('all three educational labs and the master roadmap are present',async()=>{
 const html=await read('ui-tools/mentor-roadmap.html');
 assert.match(html,/AI τελευταίο/);
 for(const path of ['mentor-live.html','mentor-oral.html','mentor-ecg.html','mentor-lab.html']){
  const content=await read(path);
  assert.ok(content.includes('<!doctype html>'),path);
 }
});
