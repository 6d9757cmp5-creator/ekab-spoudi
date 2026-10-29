import test from 'node:test';
import assert from 'node:assert/strict';
import {chooseFocus,coachResponse,interpretQuestion} from './guided-coach.mjs';

const base=()=>({competencies:{
 scene:{attempts:2,practiced:2,needs_review:0},
 assessment:{attempts:4,practiced:2,needs_review:2},
 escalation:{attempts:1,practiced:1,needs_review:0},
 handover:{attempts:0,practiced:0,needs_review:0}
}});
test('adapts to most-needed skill using Mentor records only',()=>{
 assert.equal(chooseFocus(base()),'assessment');
 assert.equal(chooseFocus(base(),'handover'),'handover');
 assert.equal(chooseFocus({}),'scene');
 assert.match(coachResponse({intent:'focus',overview:base()}),/Οργανωμένη αρχική εκτίμηση/);
 assert.match(coachResponse({intent:'focus',overview:base()}),/2 επιλογές/);
});
test('Greek typed questions are understood conservatively',()=>{
 assert.deepEqual(interpretQuestion('Πώς τα πάω στην παράδοση;'),{intent:'progress',topic:'handover'});
 assert.deepEqual(interpretQuestion('Δώσε μου άσκηση για ασφάλεια σκηνής'),{intent:'exercise',topic:'scene'});
 assert.deepEqual(interpretQuestion('Τι σημαίνει ABCDE;'),{intent:'explain',topic:'assessment'});
 assert.equal(interpretQuestion('Ποια θεραπεία να δώσω;').intent,'unknown');
});
test('the coach does not certify skills or grade free text',()=>{
 const o=base();
 assert.match(coachResponse({intent:'progress',overview:o,topic:'assessment'}),/Δεν είναι βαθμολογία/);
 assert.match(coachResponse({intent:'exercise',overview:o}),/δεν αξιολογώ αυτόματα/);
 assert.match(coachResponse({intent:'unknown',overview:o}),/Δεν αξιολογώ/);
 assert.deepEqual(o,base(),'reading the profile must not mutate educational progress');
});
