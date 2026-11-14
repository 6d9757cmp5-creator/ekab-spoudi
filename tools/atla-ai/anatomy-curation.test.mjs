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
  assert.ok(!['Βιομακρομόριο','Κύτταρα και οργανίδια','Προσθετική','Συσκευή','Ιός','Μικρό μόριο'].includes(model.category),model.id);
 }
 assert.equal(atlasRole(byId('3DPX-022753')).role,null,'animal skulls are hidden');
 assert.equal(atlasRole(byId('3DPX-009507')).role,'pathology','craniosynostosis is a labelled example');
});

test('visual review hides animal specimens and broken models without leaving a structure empty',()=>{
 for(const id of ['3DPX-004803','3DPX-004655','3DPX-004926'])assert.equal(atlasRole(byId(id)).role,null,id+' is a Penn Vet animal specimen');
 assert.match(atlasRole(byId('3DPX-009210')).reason,/Οπτικός έλεγχος/);
 const vocabulary=library.vocabulary.structures;
 const human=library.models.filter(m=>m.source==='nih3d'&&(m.kind==='anatomy'||m.kind==='pathology'));
 for(const key of Object.keys(vocabulary)){
  if(!human.some(m=>modelShowsStructures(m,[key],vocabulary)))continue;
  assert.ok(library.models.some(m=>atlasRole(m).role&&modelShowsStructures(m,[key],vocabulary)),key+' keeps at least one detail model');
 }
});

test('detail exploration uses whole anatomical terms, not word fragments',()=>{
 assert.deepEqual(detailKeysForStructure('Left ventricle'),['heart']);
 assert.deepEqual(detailKeysForStructure('Left lateral ventricle'),['brain-ventricles','brain']);
 assert.deepEqual(detailKeysForStructure('Gluteus maximus'),[],'no arbitrary link when no rule exists');
});
