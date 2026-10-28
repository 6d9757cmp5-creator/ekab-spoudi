import assert from 'node:assert/strict';
import {anatomicalGreek,anatomyName,eligibleQuizName} from './greek-names.js';
const samples={
 'Left sixth rib':'Αριστερή 6η πλευρά',
 'Right seventh rib':'Δεξιά 7η πλευρά',
 'Gingiva of upper jaw':'Ούλα άνω γνάθου',
 'Gingiva of lower jaw':'Ούλα κάτω γνάθου',
 'Left femur':'Αριστερό μηριαίο οστό',
 'Right tibia':'Δεξιά κνήμη',
 'Left lower first secondary molar tooth':'Αριστερός κάτω 1ος μόνιμος γομφίος',
 'Right upper first primary incisor tooth':'Δεξιός άνω 1ος νεογιλός τομέας',
 'Heart':'Καρδιά',
 'Right kidney':'Δεξιός νεφρός',
 'Left ovary':'Αριστερή ωοθήκη',
 'Trachea':'Τραχεία'
};
for(const [en,el] of Object.entries(samples))assert.equal(anatomicalGreek(en),el,en);
assert.equal(anatomicalGreek('Left sixth rib cartilage'),null,'Never drop anatomical qualifiers');
assert.equal(anatomicalGreek('Left lower first secondary molar tooth (test suffix)'),samples['Left lower first secondary molar tooth']);
assert.equal(anatomicalGreek('Unexpected highly specific structure'),null,'Unknown terms must not be invented');
assert.deepEqual(anatomyName('Untranslated source mesh','skeletal',{skeletal:'Σκελετικό'}),{
 el:null,english:'Untranslated source mesh',label:'Μη μεταφρασμένη δομή',systemName:'Σκελετικό'
});
assert.equal(anatomyName('Gingiva of upper jaw','skeletal',{skeletal:'Σκελετικό'}).systemName,'Στοματική ανατομία');
assert.equal(eligibleQuizName('Left sixth rib','skeletal'),false,'Tiny rib details are not good entry-level targets');
assert.equal(eligibleQuizName('Gingiva of upper jaw','skeletal'),false,'Gums are not a practical 3D target');
assert.equal(eligibleQuizName('Unexpected highly specific structure','skeletal'),false);
assert.equal(eligibleQuizName('Right kidney','urinary'),true);
assert.equal(eligibleQuizName('Left femur','skeletal'),true);
assert.equal(eligibleQuizName('Left ovary','integumentary'),false);
console.log('PASS Greek-first anatomy terms, precise side/number mapping and verified-only quiz pool');
