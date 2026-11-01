import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {collectToolsHubEvidence} from './tools-hub-source-evidence.mjs';
const r=f=>readFileSync(f,'utf8');
const home=r('index.html'),tools=r('tools.html');
test('stage 1 keeps existing home study, MENTOR and progress entrypoints',()=>{
  for(const s of ['href="saek.html"','href="eoppep.html"','href="protocols.html"','href="farmaka.html"','href="seminar-prep.html"','id="studyResume"','id="mentor-home-presence-frame"']){
    assert.ok(home.includes(s),'existing home feature missing: '+s);
  }
  assert.ok(home.includes('href="tools.html"'),'missing new tools entry');
  assert.ok(!home.includes('MENTOR PROTOCOL LAB'),'protocols are independent of educator');
  assert.ok(home.includes('<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3"'),'tools icon matches existing SVG design');
});
test('tools hub has existing links and clear ownership labels',()=>{
  for(const name of ['MENTOR OS','Προσομοιωτής Ασθενών','Εργαστήριο ΗΚΓ','Εκπαιδευτικές ασκήσεις πρωτοκόλλων']){
    assert.ok(tools.includes(name),'missing tool label: '+name);
  }
  assert.ok(tools.includes('όχι επίσημες επιχειρησιακές οδηγίες ΕΚΑΒ'));
  assert.ok(tools.includes('όχι πιστοποίηση'));
  assert.equal((tools.match(/<h1(?:\s|>)/g)||[]).length,1,'one primary heading for accessibility');
  for(const path of ['protocols.html','mentor-protocol-suite.html']){
    const html=r(path),notice=html.indexOf('protocol-release-notice'),hero=html.indexOf('<header class="hero">');
    assert.ok(notice>0&&notice<hero,path+' should show independent safety disclaimer before long hero');
    assert.ok(html.includes('όχι επίσημο επιχειρησιακό πρωτόκολλο ΕΚΑΒ'));
  }
  assert.ok(tools.includes('MENTOR OS · Δοκιμαστική έκδοση'));
  const protocols=r('protocols.html');
  assert.ok(protocols.includes('mentor-protocol-suite.html?topic=trauma&amp;view=lab'),'Protocol Lab link preserved');
  assert.ok(protocols.includes('mentor-protocol-suite.html?topic=trauma&amp;view=debrief'),'Protocol Debrief link preserved');
  assert.doesNotMatch(tools,/localStorage\.(?:setItem|removeItem|clear)\s*\(/);
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
test('evidence records exact local sources without claiming clinical certification',()=>{
 const report=collectToolsHubEvidence();
 assert.ok(report.linked_targets.length>=14,'every linked target is inventoried');
 assert.equal(report.source_checks.every(c=>c.verified),true,'each source claim inspected');
 assert.ok(report.unverified_domains.length>=4,'clinical and formal approval remain out of scope');
 assert.ok(report.linked_targets.every(e=>e.sha256.length===64));
});
