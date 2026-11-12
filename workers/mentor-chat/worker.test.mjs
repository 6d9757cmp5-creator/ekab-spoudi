// Needs the corpus: node tools/atla-ai/build-worker-corpus.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {validate,verifiedPassages,answer,buildMessages,freeProviders} from './src/index.js';
const corpus=JSON.parse(readFileSync(new URL('./corpus.json',import.meta.url),'utf8'));
const key=Object.keys(corpus.records).find(k=>k.startsWith('saek-search-B.json#')&&corpus.records[k].body.length>600);
const record=corpus.records[key];

test('the copy of the published material covers every kind of study source',()=>{
 const files=new Set(Object.keys(corpus.records).map(k=>k.split('#')[0]));
 for(const f of ['saek-search-A.json','saek-search-D.json','official_questions.json','eoppep-sos.json','anatomy-books.json','farmaka-catalog.js','medical-terms.json'])assert.ok(files.has(f),f);
 assert.ok(corpus.count>1500);
});

test('a passage is accepted only if it is word for word in the published material',()=>{
 const part=record.body.slice(100,500);
 const ok=verifiedPassages([{id:'T1',ref:key,term:record.title,definition:'…'+part}]);
 assert.equal(ok.length,1);
 assert.equal(ok[0].definition,part);
 assert.equal(verifiedPassages([{id:'T1',ref:key,term:record.title,definition:part.replace(/α/,'ε')}]).length,0,'altered text');
 assert.equal(verifiedPassages([{id:'T1',ref:key,term:'Άλλος τίτλος',definition:part}]).length,0,'wrong title');
 assert.equal(verifiedPassages([{id:'T1',ref:'invented.json#1',term:record.title,definition:part}]).length,0,'unknown source');
 assert.equal(verifiedPassages([{id:'T9',ref:key,term:record.title,definition:part}]).length,0,'bad id');
});

test('free models first; an answer that fails the safety audit moves on to the next model',async()=>{
 const body=validate({question:'Τι είναι αυτό;',passages:[{id:'T1',ref:key,term:record.title,definition:record.body.slice(0,300)}]});
 body.passages=verifiedPassages(body.passages);
 const calls=[];
 const result=await answer(null,{},body,{askers:[
  {name:'first',ask:async()=>{calls.push('first');return 'Απάντηση χωρίς πηγή.'}},
  {name:'second',ask:async()=>{calls.push('second');throw Error('down')}},
  {name:'third',ask:async()=>{calls.push('third');return 'Η ουσία είναι αυτή [Τ1]. Τι θα έλεγχες πρώτα;'}},
  {name:'paid',ask:async()=>{calls.push('paid');return 'x [Τ1]'}}
 ]});
 assert.deepEqual(calls,['first','second','third'],'the paid model is not called when a free one answered');
 assert.equal(result.provider,'third');
 assert.deepEqual(result.trace,['first:missing-or-unknown-citation','second:no-answer']);
});

test('free providers are used only when their key is configured',()=>{
 assert.deepEqual(freeProviders({}),[]);
 assert.deepEqual(freeProviders({GROQ_API_KEY:'k',OPENROUTER_API_KEY:'k'}).map(p=>p.name),['groq','openrouter']);
});

test('the tutor prompt asks for an explanation, an example and a check question',()=>{
 const m=buildMessages({question:'q',passages:[{id:'T1',term:'t',definition:'d'}],history:[],level:'student'});
 assert.match(m[0].content,/ερώτηση ελέγχου/);
 assert.match(m.at(-1).content,/\[T1\] t: d/);
});
