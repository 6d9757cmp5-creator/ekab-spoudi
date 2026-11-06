import assert from 'node:assert/strict';
import test from 'node:test';
import {validateViewerUrl,nativeAtlasUrl,ATLA_TOPICS,HUMAN_COMMANDS,isolatePickedObjectMap} from './biodigital-bridge-core.mjs';

test('accept only authentic, explicitly published BioDigital viewer URLs',()=>{
 assert.equal(validateViewerUrl('https://human.biodigital.com/viewer/?id=376F'),'https://human.biodigital.com/viewer/?id=376F');
 assert.equal(validateViewerUrl('https://human.biodigital.com/widget/?m=production/maleAdult/heart.json'),'https://human.biodigital.com/widget/?m=production/maleAdult/heart.json');
 assert.equal(validateViewerUrl('https://human.biodigital.com/viewer/?id=376F#evil'),'https://human.biodigital.com/viewer/?id=376F');
 for(const invalid of [
 '','javascript:alert(1)','http://human.biodigital.com/viewer/?id=A',
 'https://evil.test/viewer/?id=A','https://human.biodigital.com.evil.test/viewer/?id=A',
 'https://human.biodigital.com/login?id=A','https://human.biodigital.com/viewer/',
 'https://user:password@human.biodigital.com/viewer/?id=A',
 'https://human.biodigital.com:9443/viewer/?id=A'
 ])assert.equal(validateViewerUrl(invalid),null,invalid);
});
test('native ATLA learning routes are fixed allowlisted deep-links',()=>{
 assert.ok(ATLA_TOPICS.length>=5);
 const ids=new Set();
 for(const t of ATLA_TOPICS){
  assert.ok(!ids.has(t.id));ids.add(t.id);
  const route=nativeAtlasUrl(t.id);
  const url=new URL(route,'https://atla.local/tools/anatomy-3d/');
  assert.equal(url.pathname,'/tools/anatomy-3d/index.html');
  assert.equal(url.searchParams.get('focus'),t.focus);
  assert.equal(url.searchParams.get('system'),t.system);
 }
 assert.equal(nativeAtlasUrl('../../admin'),null);
});
test('3D actions are finite and do not include arbitrary user commands',()=>{
 assert.ok(Object.isFrozen(HUMAN_COMMANDS));
 for(const [name,args] of Object.entries(HUMAN_COMMANDS)){
  assert.equal(typeof name,'string');
  assert.equal(typeof args[0],'string');
  assert.ok(!args[0].includes('eval'));
 }
 assert.deepEqual(HUMAN_COMMANDS.xrayOn,['scene.enableXray',undefined]);
});

test('documented BioDigital messages replace unsupported V1 controls',()=>{
 assert.deepEqual(HUMAN_COMMANDS.labelsOn,['labels.show',undefined]);
 assert.deepEqual(HUMAN_COMMANDS.labelsOff,['labels.hide',undefined]);
 assert.deepEqual(HUMAN_COMMANDS.play,['timeline.play',{loop:false}]);
 assert.deepEqual(HUMAN_COMMANDS.quizEnter,['quiz.enter',undefined]);
 assert.ok(!Object.keys(HUMAN_COMMANDS).some(key=>/dissectOn|pickingMode|setEnabled/.test(key)));
 for(const pair of Object.values(HUMAN_COMMANDS))
  assert.ok(!/labels.setEnabled|scene.pickingMode/.test(pair[0]));
});
test('reversible 3D isolation is restricted to provider-selected object IDs',()=>{
 const selected=isolatePickedObjectMap('maleAdult_standard-Heart_ID');
 assert.equal(selected.replace,true);
 assert.equal(selected['maleAdult_standard-Heart_ID'],true);
 assert.equal(Object.getPrototypeOf(selected),null);
 for(const invalid of [null,'','replace','__proto__','a b','x'.repeat(241),'a?b'])
  assert.equal(isolatePickedObjectMap(invalid),null);
});
