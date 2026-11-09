import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const root=new URL('../',import.meta.url);
const read=path=>readFile(new URL(path,root),'utf8');
test('ATLA roadmap lists 15 distinct active/pending tools; retired patient simulations have no cards',async()=>{
 const src=await read('ui-tools/mentor-roadmap.js');
 const ids=[...src.matchAll(/\{id:"(\d+)",phase:(\d+),title:/g)].map(m=>m[1]);
 assert.equal(ids.length,15);
 assert.equal(new Set(ids).size,15);
 assert(!['05','06','07','08','10','11','12','13','17','22'].some(id=>ids.includes(id)));
 assert.doesNotMatch(src,/href:"\.\.\/mentor-(?:live|next|scenarios)\.html"/);
 for(const id of ['24','25'])assert.match(src,new RegExp('id:"'+id+'"[^\\n]+status:"available"'));
 assert.match(src,/title:"ECG Intelligence Lab — πραγματική κλινική ερμηνεία",status:"pending"/);
 assert.match(src,/title:"Πλήρης AI καθηγητής με φυσική συνομιλία",status:"unavailable"/);
 assert.match(src,/href:"\.\.\/mentor-oral\.html"/);
 assert.match(src,/href:"\.\.\/mentor-ecg\.html"/);
});
test('ECG and independent ATLA teaching tools survive; obsolete URLs cannot restart patient simulations',async()=>{
 const html=await read('ui-tools/mentor-roadmap.html');
 assert.match(html,/AI τελευταίο/);
 for(const path of ['mentor-oral.html','mentor-ecg.html','mentor-lab.html'])
  assert.match(await read(path),/<!doctype html>/i);
 for(const path of ['mentor-next.html','mentor-live.html','mentor-scenarios.html'])
  assert.match(await read(path),/http-equiv="refresh" content="0; url=mentor-ecg\.html"/);
});
