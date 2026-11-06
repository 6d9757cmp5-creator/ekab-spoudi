import test from 'node:test';
import assert from 'node:assert/strict';
import {collectAndAuditAiStream,verifiedSseResponse} from './safe-stream.mjs';

const passages=[{id:'T1',term:'ΚΑΡΠΑ',definition:'Εκπαιδευτικός ορισμός.'}];
function streamOf(parts){
 const encoder=new TextEncoder();
 return new ReadableStream({start(controller){
  for(const part of parts)controller.enqueue(typeof part==='string'?encoder.encode(part):part);
  controller.close();
 }});
}
const event=value=>'data: '+JSON.stringify(value)+'\n\n';

test('buffers split UTF-8 SSE and releases only verified cited text',async()=>{
 const bytes=new TextEncoder().encode(event({response:'Εκπαιδευτικός ορισμός. [T1]'})+'data: [DONE]\n\n');
 const result=await collectAndAuditAiStream(streamOf([bytes.slice(0,18),bytes.slice(18,31),bytes.slice(31)]),passages);
 assert.deepEqual(result,{ok:true,text:'Εκπαιδευτικός ορισμός. [T1]'});
 const response=verifiedSseResponse(result.text,{'access-control-allow-origin':'https://example.org'});
 assert.equal(response.status,200);
 const emitted=await response.text();
 assert.match(emitted,/^\s*data: /);
 assert.ok(emitted.includes('data: [DONE]'));
 assert.equal(response.headers.get('access-control-allow-origin'),'https://example.org');
});

test('rejects uncited and invented-citation outputs before any response can be constructed',async()=>{
 for(const text of ['Ατεκμηρίωτος ισχυρισμός.','Μη σχετική πηγή [T9]']){
  const got=await collectAndAuditAiStream(streamOf([event({response:text})]),passages);
  assert.equal(got.ok,false,text);
 }
});

test('blocks numeric drug-dose content and unsafe emotional inference',async()=>{
 for(const text of ['Χορήγησε 12 mg [T1]','Ξέρω ότι νιώθεις άγχος [T1]']){
  const got=await collectAndAuditAiStream(streamOf([event({token:text})]),passages);
  assert.equal(got.ok,false,text);
 }
});

test('rejects malformed JSON, model errors, and tokens following DONE',async()=>{
 for(const raw of ['data: {broken}\n\n',event({error:'secret'}) , 'data: [DONE]\n\n'+event({token:'Απάντηση [T1]'})]){
  const got=await collectAndAuditAiStream(streamOf([raw]),passages);
  assert.equal(got.ok,false);
 }
});

test('limits stream bytes, output length and unsafe UTF-8',async()=>{
 let got=await collectAndAuditAiStream(streamOf([event({token:'A'.repeat(6001)+' [T1]'})]),passages);
 assert.equal(got.ok,false);
 got=await collectAndAuditAiStream(streamOf([event({token:'Απάντηση [T1]'})]),passages,{maxBytes:5});
 assert.equal(got.ok,false);
 got=await collectAndAuditAiStream(streamOf([Uint8Array.from([0xff,0xff])]),passages);
 assert.equal(got.ok,false);
});

test('ignores SSE comments and safely combines token events without speculative forwarding',async()=>{
 const payload=': keepalive\n\n'+event({token:'Εκπαιδευτικό '})+event({token:'περιεχόμενο. [T1]'})+'data: [DONE]\n\n';
 const got=await collectAndAuditAiStream(streamOf([payload]),passages);
 assert.deepEqual(got,{ok:true,text:'Εκπαιδευτικό περιεχόμενο. [T1]'});
});

test('rejects truncated cited output and duplicate or post-terminal events',async()=>{
 const cited=event({token:'Ορισμός από τη βιβλιοθήκη. [T1]'});
 const cases=[
  cited, // upstream ended before its terminal marker
  cited+'data: [DONE]\n\n'+event({token:'Επιπλέον κείμενο [T1]'}),
  cited+'data: [DONE]\n\n'+'data: [DONE]\n\n',
  cited+'data: [DONE]\n\n'+event({error:'late-upstream-failure'})
 ];
 for(const raw of cases){
  const checked=await collectAndAuditAiStream(streamOf([raw]),passages);
  assert.equal(checked.ok,false,'truncated/late SSE must fail closed');
 }
 const valid=await collectAndAuditAiStream(streamOf([cited+'data: [DONE]\n\n']),passages);
 assert.equal(valid.ok,true);
});

test('reads OpenAI-style Workers AI chunks and their usage-only final event',async()=>{
 const chunk=content=>event({id:'x',choices:[{index:0,delta:{content}}],usage:{neurons:1},response:''});
 const result=await collectAndAuditAiStream(streamOf([chunk('Η ΚΑΡΠΑ '),chunk('είναι εκπαιδευτικός ορισμός [T1].'),event({choices:[],usage:{total_tokens:9}}),'data: [DONE]\n\n']),passages);
 assert.equal(result.ok,true);
 assert.equal(result.text,'Η ΚΑΡΠΑ είναι εκπαιδευτικός ορισμός [T1].');
});

test('still rejects an event of unknown shape',async()=>{
 const result=await collectAndAuditAiStream(streamOf([event({something:'else'}),'data: [DONE]\n\n']),passages);
 assert.equal(result.ok,false);
});
