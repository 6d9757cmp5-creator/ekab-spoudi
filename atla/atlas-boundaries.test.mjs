import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {mockAtlasReply,MOCK_LABEL} from './ai/mock.mjs';
import {appendTurn,loadTurns,historyForAi} from './student/memory.mjs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const memory=()=>{const map=new Map();return {getItem:k=>map.get(k)||null,setItem:(k,v)=>map.set(k,v),removeItem:k=>map.delete(k)};};

test('demo replies always disclose that they are fake, not medical evidence',()=>{
 for(const question of ['Γεια','Εξήγησε την καρδιά','Πες μου για ένα περιστατικό','Μαθήματα ΣΑΕΚ','Πρότεινε επανάληψη','Τι κάνει το σύστημα;']){
  const out=mockAtlasReply({question,page:'ΣΑΕΚ - Καρδιά',level:'beginner'});
  assert.ok(out.startsWith(MOCK_LABEL),question);
  assert.match(out,/όχι πραγματικό μοντέλο/);
  assert.match(out,/Τρέχουσα οθόνη: ΣΑΕΚ - Καρδιά/);
 }
});
test('fake chat turns can be displayed but are not sent to future real model history',()=>{
 const store=memory();
 appendTurn(store,{role:'user',text:'ΣΑΕΚ',mode:'mock'});
 appendTurn(store,{role:'mentor',text:mockAtlasReply({question:'ΣΑΕΚ'}),mode:'mock'});
 const turns=loadTurns(store);
 assert.equal(turns.at(-1).mode,'mock');
 assert.deepEqual(historyForAi(turns),[], 'No fake turn can enter the future live AI context');
});
test('ATLAS mock is local and does not share the AI-grading evaluator',()=>{
 const assistant=read('atla/assistant.mjs');
 assert.match(assistant,/demoToggle\.checked/);
 assert.match(assistant,/mockAtlasReply\(/);
 assert.ok(assistant.includes("add('user',q,demoToggle.checked?'mock':'local')"));
 assert.match(assistant,/if\(exam\(\)\)/);
 assert.match(assistant,/riskGuard\(q\)/);
 assert.doesNotMatch(assistant,/fetchJSON\('functions\/answer-grader/);
 const mock=read('atla/ai/mock.mjs');
 assert.doesNotMatch(mock,/fetch\(|askAi\(|gradeAnswer\(|workerUrl|cloud-sync|ANTHROPIC_API_KEY/);
 const grader=read('ai-grading-config.js');
 assert.match(grader,/ekab-spoudi-answer-grader/);
 assert.doesNotMatch(assistant,/ai-grading-config\.js|ai-grading-client\.js/);
});
test('Clinical Cockpit owns the surviving mission entrypoints',()=>{
 const cockpit=read('mentor-next.html');
 assert.match(cockpit,/href="mentor-live\.html"/);
 assert.match(cockpit,/href="mentor-scenarios\.html"/);
 assert.match(cockpit,/Ανασκόπηση αποστολής/);
 for(const page of ['mentor-live.html','mentor-scenarios.html']){
  const code=read(page);
  assert.match(code,/src="atla\/assistant\.mjs"/);
  assert.doesNotMatch(code,/src="mentor\/presence\/presence\.mjs"/);
 }
});
