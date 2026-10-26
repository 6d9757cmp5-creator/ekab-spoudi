import assert from 'node:assert/strict';
import { encodeState, decodeState, MAX_STATE_BYTES } from '../sync-codec.js';
import { SCHEMA, captureEdits, validateManifest, visibleEntries } from '../sync-model.js';
const device='a'.repeat(32),userId='codec-test-owner',view={theme:'dark'};
for(let i=1;i<=200;i++){
  const q='q:EOP-B-'+String(i).padStart(3,'0')+':';
  view[q+'seen']=i;view[q+'draft']='Προσωπικές σημειώσεις SOS: διατήρηση αεραγωγού, αναπνοής και κυκλοφορίας. '+i+' 🩺';
  view[q+'reviewHistory']=Array.from({length:30},(_,j)=>({at:new Date(Date.UTC(2026,9,j+1)).toISOString(),localDay:'2026-10-'+String(j+1).padStart(2,'0'),result:j%3?'correct':'incorrect'}));
}
const manifest={schema:SCHEMA,userId,device,entries:captureEdits({}, {}, view,device,1)};
validateManifest(manifest,userId);
const encoded=await encodeState(manifest),plain=JSON.stringify(manifest);
assert.ok(JSON.parse(encoded).format,'representative history should be compressed');
for(const raw of [encoded,JSON.parse(encoded),new TextEncoder().encode(encoded).buffer,new TextEncoder().encode(encoded)]){
  const restored=validateManifest(await decodeState(raw),userId);
  assert.deepEqual(restored,manifest,'fresh device restores every value and causal clock');
  assert.deepEqual(visibleEntries(restored.entries),view);
}
for(const raw of [plain,manifest,new TextEncoder().encode(plain).buffer])assert.deepEqual(await decodeState(raw),manifest,'legacy JSON stays readable');
assert.throws(()=>validateManifest(JSON.parse(encoded),userId),'old clients reject packed data rather than applying an empty state');
await assert.rejects(()=>decodeState({format:'unknown',data:'AAAA'}));
await assert.rejects(()=>decodeState({format:'ekab-sync-gzip-v1',data:'bad!'}));
await assert.rejects(()=>decodeState({format:'ekab-sync-gzip-v1',data:'AAAA'}));
const corrupt=JSON.parse(encoded);corrupt.data=corrupt.data.slice(0,-8)+'AAAAAAAA';await assert.rejects(()=>decodeState(corrupt));
await assert.rejects(()=>encodeState({note:'a'.repeat(MAX_STATE_BYTES)}),/state-too-large/);
const bomb=await new Response(new Blob(['a'.repeat(MAX_STATE_BYTES+1)]).stream().pipeThrough(new CompressionStream('gzip'))).arrayBuffer();
await assert.rejects(()=>decodeState({format:'ekab-sync-gzip-v1',data:Buffer.from(bomb).toString('base64')}),/state-too-large/);
const compress=globalThis.CompressionStream;globalThis.CompressionStream=undefined;
assert.deepEqual(await decodeState(await encodeState(manifest)),manifest);globalThis.CompressionStream=compress;
const decompress=globalThis.DecompressionStream;globalThis.DecompressionStream=undefined;
await assert.rejects(()=>decodeState(encoded),/compression-unavailable/);globalThis.DecompressionStream=decompress;
assert.equal(await encodeState({a:1}),'{"a":1}','small files stay plain if compression adds overhead');
const before=Buffer.byteLength(plain),after=Buffer.byteLength(encoded);
console.log(JSON.stringify({fixture:'Synthetic 200 questions, 30 dated reviews each, Greek notes',before,after,savingPercent:Math.round(100*(1-after/before)),checks:'roundtrip, new-device, legacy, corruption, owner/schema, expansion limit, unsupported browser: passed'}));

