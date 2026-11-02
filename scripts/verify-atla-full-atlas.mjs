#!/usr/bin/env node
import {readFile,stat} from 'node:fs/promises';
import {createReadStream} from 'node:fs';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const base='tools/anatomy-3d/resources/';
const idx40=JSON.parse(await readFile(base+'bp3d40/atlases/bp3d40/build/index.json','utf8'));
const idx43=JSON.parse(await readFile(base+'bp3d43/compiled-shards/index.json','utf8'));
const manifest=JSON.parse(await readFile(base+'bp3d43/compiled-shards/manifest.json','utf8'));
assert.equal(idx40.counts.elements,1259);
assert.equal(idx43.counts.elements,3210);
assert.equal(idx43.counts.concepts,3954);
assert.equal(manifest.anatomyElements,3210);
assert.equal(manifest.partCount,4);
assert.equal(manifest.parts.length,4);
assert.equal(idx43.format,'open-anatomy-atlas/1');
const hash=createHash('sha256');let total=0;
for(const part of manifest.parts){
 assert.match(part.file,/^mesh-part-\d{2}\.bin$/);
 const file=base+'bp3d43/compiled-shards/'+part.file;
 const st=await stat(file);
 assert.equal(st.size,part.bytes);
 const fragment=createHash('sha256');
 for await(const data of createReadStream(file)){
  fragment.update(data);hash.update(data);total+=data.length;
 }
 assert.equal(fragment.digest('hex'),part.sha256);
}
assert.equal(total,manifest.totalBytes);
assert.equal(hash.digest('hex'),manifest.sha256);
assert.equal(idx43.buffers.indices[0]+idx43.buffers.indices[1],total);
const index40bytes=(await stat(base+'bp3d40/atlases/bp3d40/build/meshes.bin')).size;
assert.equal(idx40.buffers.indices[0]+idx40.buffers.indices[1],index40bytes);
const adapted=await readFile('tools/anatomy-3d/vendor/open-anatomy-atlas/src/renderer/app.js','utf8');
const wrapper=await readFile('ui-tools/anatomy-full-atlas.html','utf8');
assert.match(adapted,/atlaDataBase/);
assert.match(adapted,/manifest\.parts\.map/);
assert.match(adapted,/if \(atlaDataBase\) return fetchAtlas\(atlaDataBase\)/);
assert.match(wrapper,/iframe id="viewer"/);
assert.match(wrapper,/value="bp3d43"/);
assert.match(wrapper,/value="bp3d40"/);
assert.match(wrapper,/confirm\(/);
console.log('PASS Full BodyParts3D 4.0/4.3 stored atlas data, exact SHA256 of all 4 shards, opt-in viewer');
console.log(JSON.stringify({bodyParts40:idx40.counts,bodyParts43:idx43.counts,bytes43:total,shards:manifest.partCount}));
