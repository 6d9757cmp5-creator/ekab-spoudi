import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {FOCUS_GROUPS,FOCUS_FLAGS,focusMasks,matchesFocusGroup,focusMembers} from './focus-groups.mjs';

const part=(name,system='skeletal')=>({name,system,bounds:[[0,0,0],[1,1,1]],_loaded:true});
test('each focus group has unique signed flags and visible Greek explanation',()=>{
 const keys=Object.keys(FOCUS_GROUPS);
 assert.equal(keys.length,25);
 for(const key of keys){
  assert.ok(FOCUS_GROUPS[key].name.length>2&&FOCUS_GROUPS[key].description.length>15,key);
  const f=FOCUS_FLAGS[key];assert.ok(f&&(f.lo>0)!==(f.hi>0),key);
  assert.ok(f.lo<=32768&&f.hi<=32768,key);
 }
});
test('every group bit remains independently addressable across two uint16 GPU attributes',()=>{
 for(const key of Object.keys(FOCUS_GROUPS)){
  const {lo,hi}=FOCUS_FLAGS[key];
  const [a,b]=focusMasks(part('Right femur'));
  const wanted=matchesFocusGroup(part('Right femur'),key);
  const active=(lo>0?Math.floor(a/lo)%2===1:Math.floor(b/hi)%2===1);
  assert.equal(active,wanted,key);
 }
});
test('lung view uses existing bronchial meshes, never random hepatic lobes',()=>{
 assert.equal(matchesFocusGroup(part('Left main bronchus','respiratory'),'lungs'),true);
 assert.equal(matchesFocusGroup(part('Right Apical Bronchopulmonary Segment','respiratory'),'lungs'),true);
 assert.equal(matchesFocusGroup(part('Left lobe of liver','digestive'),'lungs'),false);
 assert.equal(matchesFocusGroup(part('Bronchial artery','arterial'),'lungs'),false);
});
test('bilateral kidneys and femurs require both sides',()=>{
 const kidneys=[part('Left kidney','urinary'),part('Right kidney','urinary')];
 assert.equal(focusMembers(kidneys,'kidneys').valid,true);
 assert.equal(focusMembers([kidneys[0]],'kidneys').valid,false);
 const femora=[part('Left femur'),part('Right femur')];
 assert.equal(focusMembers(femora,'femora').valid,true);
 assert.equal(focusMembers([femora[0]],'femora').valid,false);
});
test('system labels never secretly target one organ',()=>{
 assert.equal(matchesFocusGroup(part('Left kidney','urinary'),'digestive'),false);
 assert.equal(matchesFocusGroup(part('Stomach','digestive'),'digestive'),true);
 assert.equal(matchesFocusGroup(part('Right anterior cerebral artery','arterial'),'arteries'),true);
 assert.equal(matchesFocusGroup(part('Corpus callosum','nervous'),'nervous'),true);
 assert.equal(matchesFocusGroup(part('Pancreas','digestive'),'pancreas'),true);
 assert.equal(matchesFocusGroup(part('Thyroid gland','endocrine'),'pancreas'),false);
});
test('absent male spinal cord mesh does not masquerade as central canal',()=>{
 assert.equal(matchesFocusGroup(part('Central canal of spinal cord','nervous'),'cord'),false);
 assert.equal(focusMembers([part('Central canal of spinal cord','nervous')],'cord').valid,false);
 assert.equal(matchesFocusGroup(part('first thoracic spinal cord segment','nervous'),'cord'),true);
});
test('all 72 SAEK links target supported group or declared general system',()=>{
 const code=readFileSync(new URL('../../ui-tools/anatomy-3d/saek-jumps.js',import.meta.url),'utf8');
 const literal=code.match(/const R=([\s\S]*?);\nconst rows=R\[course\]/)?.[1];
 assert.ok(literal,'link registry missing');
 const registry=Function('return ('+literal+')')();
 const rows=Object.values(registry).flatMap(chapters=>Object.values(chapters).flat());
 assert.equal(rows.length,72);
 for(const [label,mode,system,focus] of rows){
  assert.ok(label&&['skeleton','organs','both'].includes(mode)&&system);
  assert.ok(!focus||FOCUS_GROUPS[focus],label+' -> unknown focus: '+focus);
 }
 const glucose=registry['02'][13][0];
 assert.equal(glucose[3],'pancreas');
 assert.equal(glucose[0],'Πάγκρεας — ανατομική αναφορά');
});
