/**
 * Greek-first static UI regression tests. UI routes, DOM IDs and technical medical
 * abbreviations remain stable; branding and cited source titles remain unchanged.
 * This is a targeted test, NOT proof that every dynamic UI string is translated.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const expectations=[
 {file:'index.html',good:['ATLAS · Εκπαιδευτικός βοηθός','Μαθήματα και εργαλεία Διασώστη'],bad:['>3D LIVE<','PROTOCOL LAB','DEBRIEF']},
 {file:'protocols.html',good:['ATLA · Πρακτική πρωτοκόλλων','Ανασκόπηση προσπάθειας','ATLA · Κέντρο Διασώστη'],bad:['PROTOCOL LAB','DEBRIEF','MENTOR']},
 {file:'ui-tools/anatomy-3d/index.html',good:['ΑΝΑΤΟΜΙΑ <span>ΕΡΓΑΣΤΗΡΙΟ 3D</span>','ΖΩΝΤΑΝΗ ΠΡΟΒΟΛΗ 3D','Εργαστήριο 3D Ανατομίας'],bad:['>3D LAB<','Zoom με']},
 {file:'mentor-live.html',good:['ΚΛΙΝΙΚΟΣ ΠΡΟΣΟΜΟΙΩΤΗΣ','ΕΚΠΑΙΔΕΥΤΙΚΗ ΑΝΑΣΚΟΠΗΣΗ'],bad:['SIMULATION COCKPIT','CLINICAL COCKPIT','DEBRIEF']},
 {file:'mentor-next.html',good:['ΠΡΟΣΟΜΟΙΩΤΗΣ','Εκπαιδευτική προσομοίωση περιστατικού','ΒΙΒΛΙΟΘΗΚΗ ΠΕΡΙΣΤΑΤΙΚΩΝ'],bad:['SIMULATOR','CASE LIBRARY','PREHOSPITAL','MULTIPARAMETER','MONITORING HISTORY']},
 {file:'mentor-lab.html',good:['Εργαστήριο ΗΚΓ','ΕΡΓΑΣΤΗΡΙΟ ΠΡΩΤΟΚΟΛΛΩΝ','ΑΝΑΣΚΟΠΗΣΗ'],bad:['>PROTOCOL LAB<','ECG Lab','>MENTOR']},
 {file:'theory.html',good:['Εκπαιδευτικές υπενθυμίσεις SOS'],bad:['AI Hint SOS']},
 {file:'ui-tools/anatomy-full-atlas.html',good:['← Τρισδιάστατη ανατομία'],bad:['← Anatomy Lab']},
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
 for(const route of ['saek.html','eoppep.html','paramedic.html']){
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


test('μία δημόσια διαδρομή ανά εργαλείο και κοινή μηχανή ανατομίας',()=>{
 const home=readFileSync('index.html','utf8');
 const hub=readFileSync('paramedic.html','utf8');
 const publicAtlas=readFileSync('ui-tools/anatomy-3d/index.html','utf8');
 const legacyAtlas=readFileSync('tools/anatomy-3d/index.html','utf8');
 const detailed=readFileSync('ui-tools/anatomy-full-atlas.html','utf8');
 const library=readFileSync('tools/atla-ai/nih3d-library.mjs','utf8');
 assert.equal((home.match(/class="home-anatomy-single"/g)||[]).length,1,'one home anatomy entry');
 assert.ok(home.includes('href="ui-tools/anatomy-3d/index.html"'),'home uses public anatomy');
 assert.ok(hub.includes('href="ui-tools/anatomy-3d/index.html"'),'hub uses public anatomy');
 assert.ok(publicAtlas.includes('src="../../tools/anatomy-3d/hires-anatomy.js?'),'public anatomy uses shared engine');
 assert.ok(legacyAtlas.includes('src="hires-anatomy.js?'),'legacy entry uses shared engine');
 assert.ok(detailed.includes('href="anatomy-3d/index.html"'),'detailed atlas returns to public viewer');
 assert.ok(library.includes("export const LIBRARY_PATH='tools/atla-ai/resources/model-library.json'"),'one 3D model registry');
 assert.equal((hub.match(/data-atla-open/g)||[]).length,1,'one assistant action in hub');
 assert.ok(hub.includes('href="mentor-next.html"'),'hub uses canonical patient simulator');
});
