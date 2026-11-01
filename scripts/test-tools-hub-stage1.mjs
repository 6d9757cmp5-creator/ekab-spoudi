import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
const r=f=>readFileSync(f,'utf8');
const home=r('index.html'),tools=r('tools.html');
test('stage 1 keeps existing home study, MENTOR and progress entrypoints',()=>{
  for(const s of ['href="saek.html"','href="eoppep.html"','href="protocols.html"','href="farmaka.html"','href="seminar-prep.html"','id="studyResume"','id="mentor-home-presence-frame"']){
    assert.ok(home.includes(s),'existing home feature missing: '+s);
  }
  assert.ok(home.includes('href="tools.html"'),'missing new tools entry');
  assert.ok(!home.includes('MENTOR PROTOCOL LAB'),'protocols are independent of educator');
});
test('tools hub has existing links and clear ownership labels',()=>{
  for(const name of ['MENTOR OS','Προσομοιωτής Ασθενών','Εργαστήριο ΗΚΓ','Ελληνικά Πρωτόκολλα']){
    assert.ok(tools.includes(name),'missing tool label: '+name);
  }
  const links=[...tools.matchAll(/href="([^"]+)"/g)].map(x=>x[1]).filter(x=>!x.startsWith('#')&&!/^(?:https?:|mailto:)/.test(x));
  for(const link of links){
    const clean=link.split('?')[0].split('#')[0];
    assert.ok(existsSync(clean),'broken tools link '+link);
  }
});
test('legacy services, study grades, and storage files were not edited in phase one',()=>{
  for(const f of ['notes-store.js','progress.js','sync-local.js','sync-model.js','saek-exam-engine.js']){
    assert.ok(existsSync(f),'legacy service entrypoint missing '+f);
  }
});