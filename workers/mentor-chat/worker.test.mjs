// Needs the corpus: node tools/atla-ai/build-worker-corpus.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {validate,verifiedPassages,answer,buildMessages,freeProviders,cheapPaidProviders,citeRepair,limited,_resetLimits,bookPassages,failureReason,pickModel,REASONING_MODEL} from './src/index.js';
import {tokens,shardOf} from '../../tools/atla-ai/books/text.mjs';
import {verifiedSseResponse} from '../../atla/ai/safe-stream.mjs';
import {parseSseLine,bookSources} from '../../atla/ai/client.mjs';
import {auditAssistantReply} from '../../atla/ai/teaching-policy.mjs';
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
 assert.deepEqual(result.trace,['first:missing-or-unknown-citation','second:error']);
});

test('a free model that forgot the [Τ1] markers gets one chance to add them; the paid model never does',async()=>{
 const body=validate({question:'Τι είναι αυτό;',passages:[{id:'T1',ref:key,term:record.title,definition:record.body.slice(0,300)}]});
 body.passages=verifiedPassages(body.passages);
 const calls=[];
 const result=await answer(null,{},body,{askers:[
  {name:'free',ask:async()=>{calls.push('ask');return 'Η ουσία είναι αυτή.'},repair:async draft=>{calls.push('repair:'+draft);return 'Η ουσία είναι αυτή [Τ1]. Τι θα έλεγχες πρώτα;'}},
  {name:'paid',ask:async()=>{calls.push('paid');return 'x [Τ1]'}}
 ]});
 assert.deepEqual(calls,['ask','repair:Η ουσία είναι αυτή.']);
 assert.equal(result.provider,'free+cite');
 const once=[];
 const failed=await answer(null,{},body,{askers:[
  {name:'a',ask:async()=>'Χωρίς πηγή.',repair:async()=>{once.push('a');return 'Πάλι χωρίς πηγή.'}},
  {name:'b',ask:async()=>'Χωρίς πηγή.',repair:async()=>{once.push('b');return 'x [Τ1]'}}
 ]});
 assert.deepEqual(once,['a'],'only one repair per question');
 assert.equal(failed.text,'');
 const m=citeRepair([{role:'user',content:'q'}],'draft');
 assert.deepEqual(m.slice(1,2),[{role:'assistant',content:'draft'}]);
});

test('a value copied from a lesson passage is allowed; the same value from the drug catalog is not',()=>{
 const lesson=[{id:'T1',ref:'saek-search-B.json#x',term:'Γλυκόζη',definition:'Υπογλυκαιμία όταν η γλυκόζη είναι κάτω από 70 mg/dl.'}];
 assert.equal(auditAssistantReply('Μιλάμε για υπογλυκαιμία κάτω από 70 mg/dl [Τ1].',lesson).ok,true);
 assert.equal(auditAssistantReply('Δίνεις 70 mg [Τ1].',[{...lesson[0],ref:'farmaka-catalog.js#x'}]).reason,'unsafe-dose-output');
 assert.equal(auditAssistantReply('Δίνεις 70 mg [Τ1].',[{...lesson[0],ref:undefined}]).reason,'unsafe-dose-output');
 assert.equal(auditAssistantReply('Δίνεις 50 ml [Τ1].',lesson).reason,'unsafe-dose-output','not in the passage');
});

test('the weekly check skips the per-IP limit but never the daily cap',()=>{
 _resetLimits();
 for(let i=0;i<30;i++)assert.equal(limited('1.2.3.4',{}),false);
 assert.equal(limited('1.2.3.4',{}),true,'31st question in an hour');
 assert.equal(limited('1.2.3.4',{},Date.now(),{trusted:true}),false);
 _resetLimits();
 for(let i=0;i<5;i++)limited('1.2.3.4',{DAILY_CAP:'5'},Date.now(),{trusted:true});
 assert.equal(limited('1.2.3.4',{DAILY_CAP:'5'},Date.now(),{trusted:true}),true,'daily cap still applies');
 _resetLimits();
});

// A tiny stand-in for the textbook assets, built with the same word functions as the real index.
function fakeBooks(chunks,weight=12){
 const index={};
 chunks.forEach((c,i)=>{for(const t of new Set(tokens(c.text))){const s=shardOf(t);((index[s]??={})[t]??=[]).push([i,weight]);}});
 const files={'books.json':{chunks:chunks.length,group:64,books:{emr:{title:'Emergency Medical Responder',origin:'https://example.org/emr',licence:'CC BY 4.0',publisher:'WisTech'}},glossary:{}},'chunks/0.json':chunks};
 for(const [s,terms] of Object.entries(index))files[`index/${s}.json`]=terms;
 return {fetch:async req=>{const path=new URL(req.url).pathname.slice(1);return files[path]?new Response(JSON.stringify(files[path])):new Response('',{status:404});}};
}

test('textbook passages: numbered after the Greek ones, need enough weight, carry the book', async()=>{
 const BOOKS=fakeBooks([
  {book:'emr',page:null,text:'Hypoxia means low oxygen in the tissues. Signs of hypoxia include restlessness and cyanosis of the lips.'},
  {book:'emr',page:12,text:'Oxygen cylinders must be stored upright and secured in the ambulance.'}
 ]);
 const found=await bookPassages({BOOKS},'Τι είναι η υποξία;',3,{keywords:async()=>['hypoxia','cyanosis']});
 assert.equal(found.length,1);
 assert.equal(found[0].id,'T3');
 assert.match(found[0].ref,/^book:emr#0$/);
 assert.equal(found[0].book.licence,'CC BY 4.0');
 assert.deepEqual(await bookPassages({BOOKS},'x',2,{keywords:async()=>['fracture']}),[],'word not in any book');
 assert.deepEqual(await bookPassages({BOOKS:fakeBooks([{book:'emr',page:null,text:'Hypoxia means low oxygen.'}],3)},'x',2,{keywords:async()=>['hypoxia']}),[],'too weak a match');
 assert.deepEqual(await bookPassages({},'x',1),[],'no assets: no textbook passages');
});

test('a dose copied from a textbook passage is still blocked',()=>{
 const book=[{id:'T5',ref:'book:openrn-pharm#10',term:'Nursing Pharmacology',definition:'Give 500 mg every six hours.'}];
 assert.equal(auditAssistantReply('Δίνεις 500 mg [Τ5].',book).reason,'unsafe-dose-output');
});

test('the browser receives the textbook passages before the answer and checks their shape',()=>{
 const src=[{id:'T5',ref:'book:emr#0',term:'Emergency Medical Responder',definition:'text',book:{title:'Emergency Medical Responder',origin:'https://example.org/emr',licence:'CC BY 4.0'}}];
 const body=verifiedSseResponse('Απάντηση [Τ5].',{},src);
 return body.text().then(t=>{
  const first=parseSseLine(t.split('\n')[0]);
  assert.equal(first.sources.length,1);
  assert.deepEqual(bookSources([{...src[0],ref:'evil'},{...src[0],book:{...src[0].book,origin:'javascript:alert(1)'}}]),[],'malformed sources dropped');
 });
});

test('free providers are used only when their key is configured',()=>{
 assert.deepEqual(freeProviders({}),[]);
 assert.deepEqual(freeProviders({GROQ_API_KEY:'k',OPENROUTER_API_KEY:'k'}).map(p=>p.name),['groq','openrouter']);
 assert.deepEqual(freeProviders({DEEPSEEK_API_KEY:'k'}),[],'DeepSeek is paid, not in the free list');
 assert.deepEqual(cheapPaidProviders({}),[]);
 assert.deepEqual(cheapPaidProviders({DEEPSEEK_API_KEY:'k'}).map(p=>p.name),['deepseek']);
});

test('the tutor prompt asks for an explanation, an example and a check question',()=>{
 const m=buildMessages({question:'q',passages:[{id:'T1',term:'t',definition:'d'}],history:[],level:'student'});
 assert.match(m[0].content,/ερώτηση ελέγχου/);
 assert.match(m.at(-1).content,/\[T1\] t: d/);
});

test('when a provider retires a model, the best current chat model is chosen from its list',()=>{
 assert.equal(pickModel('gemini',['models/gemini-3.8-flash','models/gemini-4-hydrogen','models/gemini-3.8-flash-lite','models/gemini-embedding-2','models/gemini-3.9-flash','models/gemini-3.9-flash-tts']),'gemini-3.9-flash');
 assert.equal(pickModel('groq',['whisper-large-v3','openai/gpt-oss-120b','llama-3.1-8b-instant','meta-llama/llama-prompt-guard-2-86m']),'openai/gpt-oss-120b');
 assert.equal(pickModel('openrouter',['openai/gpt-9','qwen/qwen4-32b:free','perplexity/pplx-decider-flash-v1.3:free']),'qwen/qwen4-32b:free');
 assert.equal(pickModel('openrouter',['openai/gpt-9']),'','never a paid OpenRouter model');
});

test('a failed model call is explained by a short reason, never by its text',()=>{
 assert.equal(failureReason(Error('http-401')),'http-401');
 assert.equal(failureReason(Error('4006: you have used up your daily free allocation of 10,000 neurons')),'daily-limit');
 assert.equal(failureReason(Object.assign(Error('The operation was aborted due to timeout'),{name:'TimeoutError'})),'timeout');
 assert.equal(failureReason(Error('secret sk-abc leaked')),'error');
});

test('reasoning models are recognised; the chain stops at the deadline',async()=>{
 for(const m of ['gemini-3.8-flash','openai/gpt-oss-120b','qwen/qwen3.8-27b'])assert.match(m,REASONING_MODEL);
 assert.doesNotMatch('llama-3.3-70b-versatile',REASONING_MODEL);
 const body=validate({question:'Τι είναι αυτό;',passages:[{id:'T1',ref:key,term:record.title,definition:record.body.slice(0,300)}]});
 body.passages=verifiedPassages(body.passages);
 const calls=[];
 const result=await answer(null,{},body,{deadlineMs:5,askers:[
  {name:'slow',ask:async()=>{calls.push('slow');await new Promise(r=>setTimeout(r,20));return '';}},
  {name:'never',ask:async()=>{calls.push('never');return 'x [Τ1]';}}
 ]});
 assert.deepEqual(calls,['slow']);
 assert.deepEqual(result.trace,['slow:no-answer','deadline']);
});
