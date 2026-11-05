/**
 * Greek-first static UI regression tests. UI routes, DOM IDs and technical medical
 * abbreviations remain stable; branding and cited source titles remain unchanged.
 * This is a targeted test, NOT proof that every dynamic UI string is translated.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const expectations=[
 {file:'index.html',good:['ΖΩΝΤΑΝΗ 3D ΠΡΟΒΟΛΗ'],bad:['>3D LIVE<']},
 {file:'protocols.html',good:['MENTOR | ΕΡΓΑΣΤΗΡΙΟ ΠΡΩΤΟΚΟΛΛΩΝ','ΑΝΑΣΚΟΠΗΣΗ MENTOR'],bad:['MENTOR | PROTOCOL LAB','MENTOR DEBRIEF']},
 {file:'ui-tools/anatomy-3d/index.html',good:['ΑΝΑΤΟΜΙΑ <span>ΕΡΓΑΣΤΗΡΙΟ 3D</span>','ΖΩΝΤΑΝΗ ΠΡΟΒΟΛΗ 3D','Εργαστήριο 3D Ανατομίας'],bad:['>3D LAB<','>3D LIVE<','3D Anatomy Lab']},
 {file:'mentor-live.html',good:['ΚΛΙΝΙΚΟΣ ΠΡΟΣΟΜΟΙΩΤΗΣ','ΑΝΑΣΚΟΠΗΣΗ ΑΠΟΣΤΟΛΗΣ'],bad:['SIMULATION COCKPIT','MENTOR DEBRIEF']},
 {file:'mentor-lab.html',good:['Εργαστήριο Πρωτοκόλλων','Εργαστήριο ΗΚΓ','Ανασκόπηση MENTOR'],bad:['>PROTOCOL LAB<','>MENTOR DEBRIEF<','ECG Lab']},
 {file:'theory.html',good:['Εκπαιδευτικές υπενθυμίσεις SOS'],bad:['AI Hint SOS']},
 {file:'ui-tools/anatomy-full-atlas.html',good:['← Εργαστήριο 3D Ανατομίας'],bad:['← Anatomy Lab']},
 {file:'ui-tools/atla-resource-preview.html',good:['>Κίνηση<'],bad:['>Animation<']},
];

test('Greek-first headings are present and historic English-only labels are absent',()=>{
 for(const entry of expectations){
  const html=readFileSync(entry.file,'utf8');
  assert.match(html,/<html lang="el">/i,entry.file+' requires Greek language metadata');
  for(const label of entry.good)assert.ok(html.includes(label),entry.file+' is missing '+label);
  for(const label of entry.bad)assert.ok(!html.includes(label),entry.file+' still contains '+label);
 }
});

test('public learning routes and controls are preserved',()=>{
 const home=readFileSync('index.html','utf8');
 for(const route of ['saek.html','eoppep.html','farmaka.html','mentor-lab.html','ui-tools/anatomy-3d/index.html']){
  assert.ok(home.includes(route),'homepage must preserve '+route);
 }
 const mentor=readFileSync('mentor-lab.html','utf8');
 for(const route of ['mentor-ecg.html','mentor-next.html','mentor-protocol-suite.html']){
  assert.ok(mentor.includes(route),'mentor must preserve '+route);
 }
 const theory=readFileSync('theory.html','utf8');
 assert.ok(theory.includes('catalog-ready-sos'),'existing SOS element remains available');
 const anatomy=readFileSync('ui-tools/anatomy-3d/index.html','utf8');
 assert.ok(anatomy.includes('id="modelTag"'),'3D anatomical model descriptor stable');
});

test('medical abbreviations and original source attribution remain available',()=>{
 const anatomy=readFileSync('ui-tools/anatomy-3d/index.html','utf8');
 assert.match(anatomy,/BodyParts3D/);
 assert.match(anatomy,/HuBMAP/);
 const home=readFileSync('index.html','utf8');
 assert.match(home,/BLS\/AED/);
 const theory=readFileSync('theory.html','utf8');
 assert.match(theory,/SOS/);
});
