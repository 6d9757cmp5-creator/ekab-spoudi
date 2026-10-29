import test from 'node:test';
import assert from 'node:assert/strict';
import {syntheticEcgValue,createSyntheticEcg,toSvgPoints} from './ecg-synthetic.mjs';

test('generates bounded deterministic P-QRS-T illustration, not clinical data',()=>{
 const s=createSyntheticEcg({bpm:75,seconds:4,samples:480});
 const same=createSyntheticEcg({bpm:75,seconds:4,samples:480});
 assert.deepEqual(s,same);
 assert.equal(s.points.length,480);
 assert.ok(s.points.every(p=>Number.isFinite(p.t)&&Number.isFinite(p.value)));
 assert.equal(s.beatsEstimated,5);
 assert.match(s.description,/χωρίς κλινική/);
 assert.equal(toSvgPoints(s,{width:960,height:250}).split(' ').length,480);
 assert.ok(syntheticEcgValue(.410)>syntheticEcgValue(.19),'schematic R peak');
});
test('higher rate produces more repeating illustrated cycles, without diagnosis',()=>{
 const slow=createSyntheticEcg({bpm:50});
 const fast=createSyntheticEcg({bpm:120});
 assert.ok(fast.beatsEstimated>slow.beatsEstimated);
 assert.throws(()=>createSyntheticEcg({bpm:180}),/invalid-ecg/);
 assert.throws(()=>createSyntheticEcg({bpm:0}),/invalid-ecg/);
 assert.throws(()=>createSyntheticEcg({samples:100000}),/invalid-ecg/);
 assert.throws(()=>syntheticEcgValue(Infinity),/invalid-phase/);
 assert.throws(()=>toSvgPoints({points:[{value:NaN}]}),/invalid-ecg-sample/);
});

test('no clinical interpretation, external APIs, voice capture, grading or legacy writes',async()=>{
 const {readFile}=await import('node:fs/promises');
 const js=await readFile(new URL('../../mentor-ecg.js',import.meta.url),'utf8');
 const html=await readFile(new URL('../../mentor-ecg.html',import.meta.url),'utf8');
 const mentor=await readFile(new URL('../../mentor-lab.html',import.meta.url),'utf8');
 assert.ok(mentor.includes('href="mentor-ecg.html"'));
 assert.match(html,/Δεν αναγνωρίζει αρρυθμίες/);
 assert.doesNotMatch(js,/fetch\(|localStorage|sessionStorage|indexedDB|XMLHttpRequest|innerHTML|SpeechRecognition|grading|diagnos/i);
 assert.match(js,/createSyntheticEcg/);
});
