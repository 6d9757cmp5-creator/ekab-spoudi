import test from 'node:test';
import assert from 'node:assert/strict';
import {QUESTIONS,getOralQuestion,checklistSummary} from './oral-practice.mjs';
test('oral-rehearsal question set has distinct IDs, Greek prompts and review cues',()=>{
 assert.equal(QUESTIONS.length,6);
 assert.equal(new Set(QUESTIONS.map(q=>q.id)).size,6);
 assert.ok(QUESTIONS.every(q=>q.prompt.length>45&&q.checks.length===3));
 assert.throws(()=>getOralQuestion(-1),/invalid-oral/);
 assert.throws(()=>getOralQuestion(6),/invalid-oral/);
});
test('checklist reports manual inspection only, no official or clinical grade',()=>{
 const out=checklistSummary(0,[0,2]);
 assert.deepEqual(out,{checked:2,total:3,note:'Αυτοέλεγχος 2 από 3 σημείων. Δεν υπάρχει αυτόματη βαθμολόγηση ή έλεγχος ακρίβειας απάντησης.'});
 assert.throws(()=>checklistSummary(0,[0,0]),/invalid-oral-checklist/);
 assert.throws(()=>checklistSummary(0,[4]),/invalid-oral-checklist/);
 assert.equal(QUESTIONS.every(q=>!('answer' in q)&&!('grade' in q)&&!('diagnosis' in q)),true);
});

test('oral page cannot silently capture voice, send data or mutate grades',async()=>{
 const {readFile}=await import('node:fs/promises');
 const js=await readFile(new URL('../app/oral.js',import.meta.url),'utf8');
 const html=await readFile(new URL('../../mentor-oral.html',import.meta.url),'utf8');
 const hub=await readFile(new URL('../../mentor-lab.html',import.meta.url),'utf8');
 assert.ok(html.includes('δεν λειτουργεί μικρόφωνο'));
 assert.ok(hub.includes('href="mentor-oral.html"'));
 assert.ok(hub.includes('href="ui-tools/anatomy-3d/index.html"'));
 assert.doesNotMatch(js,/SpeechRecognition|webkitSpeechRecognition|mediaDevices|localStorage|sessionStorage|indexedDB|fetch\(|XMLHttpRequest|innerHTML|appwrite/i);
 // Optional written AI review: only through the shared EkabAIGrade service,
 // only after an explicit click, never in active-exam mode, never writing grades.
 assert.match(js,/\$\('oral-grade-ai'\)\.addEventListener\('click'/,'AI review must be user-initiated');
 assert.match(js,/if\(busy\|\|examBox\.checked\|\|answers\[index\]\.revealed\)return;/,'AI review must be blocked in exam mode');
 assert.match(js,/window\.EkabAIGrade/,'AI review must use the shared grading service');
 assert.doesNotMatch(js,/ai\.(save|submit|record|sync)|setItem|\.grade\s*=/i,'oral page must not persist or mutate grades');
 assert.ok(js.includes('speechSynthesis'),'only optional device text-to-speech is supported');
});
