import assert from 'node:assert/strict';
import test from 'node:test';
import {validateViewerUrl,nativeAtlasUrl,ATLA_TOPICS,HUMAN_COMMANDS} from './biodigital-bridge-core.mjs';

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
