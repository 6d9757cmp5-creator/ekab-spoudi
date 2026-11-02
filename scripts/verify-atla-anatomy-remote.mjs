/**
 * Bounded probe of actual licensed 3D vendor data.
 * Checks remote manifests and one real geometry chunk per sex; it does NOT claim
 * full WebGL rendering, clinical accuracy or physical-iPhone Safari testing.
 */
import assert from 'node:assert/strict';
import {gunzipSync} from 'node:zlib';
import {readFileSync} from 'node:fs';
import {matchesFocusGroup} from '../tools/anatomy-3d/focus-groups.mjs';
const source=readFileSync(new URL('../tools/anatomy-3d/hires-anatomy.js',import.meta.url),'utf8');
const providers=[
 {name:'BodyParts3D male',root:'https://cdn.jsdelivr.net/gh/slorksmo/Human-Atlas@5bb5713aab18d7fe9380c3339eb09f173491ea06/public/models/',count:2234},
 {name:'HuBMAP/BodyParts3D female',root:'https://cdn.jsdelivr.net/gh/HiMahendraBeniwal/female-atlas@b0a20fa3a009ca5f6bfa07b7479312e04c862af2/public/models/',count:3004}
];
async function checkedFetch(url){
 const response=await fetch(url,{signal:AbortSignal.timeout(40000),headers:{'Accept':'application/json,application/octet-stream'}});
 if(!response.ok)throw Error('HTTP '+response.status+' for '+url);
 return response;
}
for(const provider of providers){
 assert.ok(source.includes(provider.root),'3D viewer source changed without probe update');
 const manifest=await (await checkedFetch(provider.root+'atlas.json')).json();
 assert.equal(manifest.parts?.length,provider.count,provider.name+' manifest part count changed');
 assert.ok(Array.isArray(manifest.chunks)&&manifest.chunks.length>0,'Missing geometry chunks');
 const heart=manifest.parts.filter(p=>matchesFocusGroup(p,'heart'));
 assert.ok(heart.length>0,provider.name+' has no anatomical heart structures');
 // One real compressed geometry file validates that model data is accessible and complete.
 const chunk=manifest.chunks[0];
 const filename=String(chunk.gzip||chunk.url+'.gz').split('/').pop();
 assert.ok(/^[\w.-]+$/.test(filename),'Unexpected vendor chunk name');
 const compressed=new Uint8Array(await (await checkedFetch(provider.root+filename)).arrayBuffer());
 const raw=compressed[0]===0x1f&&compressed[1]===0x8b?gunzipSync(compressed):compressed;
 assert.equal(raw.byteLength,chunk.bytes,provider.name+' first chunk geometry length mismatch');
 console.log('PASS '+provider.name+': '+manifest.parts.length+' parts, '+heart.length+' cardiac matches, '+manifest.chunks.length+' chunks; first chunk '+raw.byteLength+' decoded bytes');
}
console.log('PASS remote 3D data manifest and one actual chunk for each model. Full WebGL / physical iPhone remains unverified.');
