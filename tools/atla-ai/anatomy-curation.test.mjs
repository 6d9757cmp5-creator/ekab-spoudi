import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {atlasRole,atlasModels,detailKeysForStructure,modelShowsStructures} from './anatomy-curation.mjs';
const library=JSON.parse(readFileSync(new URL('./resources/model-library.json',import.meta.url),'utf8'));
const byId=id=>library.models.find(m=>m.id===id);

test('the atlas shows human anatomy and labelled pathology, never unrelated objects',()=>{
 const shown=atlasModels(library.models);
 assert.ok(shown.length>250,'the curated atlas keeps the real anatomy collection');
 for(const {model,role} of shown){
  assert.ok(['anatomy','pathology'].includes(role));
  assert.ok(model.delivery?.path,'only models with a stored file');
  assert.ok(!['quaternius','patients','makehuman','makehuman-rigged'].includes(model.source),'no simulator characters');
  assert.ok(!['Βιομακρομόριο','Κύτταρα και οργανίδια','Προσθετική','Συσκευή','Ιός','Μικρό μόριο'].includes(model.category),model.id);
 }
 assert.equal(atlasRole(byId('3DPX-017775')).role,null,'pollen grain is not anatomy');
 assert.equal(atlasRole(byId('3DPX-022753')).role,null,'animal skulls are hidden');
 assert.equal(atlasRole(byId('3DPX-011384')).role,'anatomy','pinna is human anatomy');
 assert.equal(atlasRole(byId('3DPX-009507')).role,'pathology','craniosynostosis is a labelled example');
});

test('every NIH anatomy record without a classification has an explicit decision',()=>{
 const pending=library.models.filter(m=>m.source==='nih3d'&&m.category==='Ανατομία'&&!m.kind&&m.delivery?.path)
  .filter(m=>atlasRole(m).reason==='Δεν έχει ελεγχθεί για τον άτλαντα');
 assert.deepEqual(pending.map(m=>m.id),[],'new NIH imports must be reviewed before they reach students');
});

test('detail exploration uses whole anatomical terms, not word fragments',()=>{
 assert.deepEqual(detailKeysForStructure('Left ventricle'),['heart']);
 assert.deepEqual(detailKeysForStructure('Left lateral ventricle'),['brain-ventricles','brain']);
 assert.deepEqual(detailKeysForStructure('Medial meniscus of left knee'),['knee']);
 assert.ok(detailKeysForStructure('Fifth lumbar vertebra').includes('lumbar-spine'));
 assert.deepEqual(detailKeysForStructure('Gluteus maximus'),[],'no arbitrary link when no rule exists');
 const vocabulary=library.vocabulary.structures;
 const heart=library.models.filter(m=>atlasRole(m).role&&modelShowsStructures(m,['heart'],vocabulary));
 assert.ok(heart.length>=5);
 assert.ok(heart.every(m=>!/εγκέφαλ|κοιλιακ/i.test(m.greekTitle||m.label)),'heart models only');
});
