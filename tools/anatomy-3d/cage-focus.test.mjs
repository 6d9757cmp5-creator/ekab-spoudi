import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {cageKind,matchesCageGroup} from './cage-focus.mjs';
const bone=name=>({name,system:'skeletal'});
test('Thorax group covers all named cage structures',()=>{
 for(const name of ['Left 10th rib','Right first rib','Sternum','Manubrium','Costal cartilage','Thoracic vertebra T8','Vertebra thoracica VII'])
  assert.ok(matchesCageGroup(bone(name),'thorax'),name);
});
test('Ribs group excludes sternum and unrelated parts',()=>{
 assert.equal(cageKind(bone('Left 10th rib')),1);
 for(const name of ['Sternum','Femur','Thoracic vertebra T8'])
  assert.equal(matchesCageGroup(bone(name),'ribs'),false,name);
 assert.equal(cageKind({name:'rib intercostal muscle',system:'muscular'}),0);
 assert.equal(matchesCageGroup(bone('Left 10th rib'),'rib'),false);
});
test('SAEK deep links target group focus, not a single arbitrary rib',()=>{
 const s=readFileSync(new URL('../../ui-tools/anatomy-3d/saek-jumps.js',import.meta.url),'utf8');
 assert.match(s,/\['Θωρακικός κλωβός','skeleton','skeletal','thorax'\]/);
 assert.match(s,/\['Πλευρές','skeleton','skeletal','ribs'\]/);
 assert.doesNotMatch(s,/\['(?:Θωρακικός κλωβός|Πλευρές)','skeleton','skeletal','rib'\]/);
});
