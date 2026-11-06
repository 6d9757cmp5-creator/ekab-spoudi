import test from 'node:test';
import assert from 'node:assert/strict';
import {buildMessages,SYSTEM_PROMPT} from './src/index.js';
import {ATLA_PRINCIPLE} from '../../atla/ai/teaching-policy.mjs';

const p=[{id:'T1',term:'ΚΑΡΠΑ',definition:'Εκπαιδευτικός ορισμός.'}];
const make=q=>buildMessages({question:q,passages:p,history:[],level:'student'});
test('AI worker directly embeds the invariant constitution',()=>{
 assert.ok(SYSTEM_PROMPT.includes(ATLA_PRINCIPLE));
 assert.match(SYSTEM_PROMPT,/πηγές|πηγη|πηγ/);
 assert.doesNotMatch(SYSTEM_PROMPT,/Είσαι ο MENTOR/);
});
test('automatic tone escalates in the one Worker request path',()=>{
 assert.match(make('Πώς ξεκινώ το μάθημα;')[0].content,/φιλικός/);
 assert.match(make('Εκπαιδευτικό σενάριο τραύματος')[0].content,/Σοβαρός/);
 assert.match(make('Εκπαιδευτικό σενάριο καρδιακής ανακοπής')[0].content,/Απαιτητικός/);
});
test('asking for clarification changes teaching method, never grades',()=>{
 assert.match(make('Δεν το κατάλαβα, μπορείς πιο απλά;')[0].content,/χωρίς καμία ποινή ή διαγραφή προόδου/);
});
