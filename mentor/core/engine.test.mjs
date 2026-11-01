import test from 'node:test';
import assert from 'node:assert/strict';
import {CASES} from './scenarios.mjs';
import {newSession,perform,replay,currentPhase,feedbackFor,summarize} from './engine.mjs';

const ID='case-test-01',T0='2026-10-28T20:00:00.000Z';
const tick=i=>'2026-10-28T20:'+String(i).padStart(2,'0')+':00.000Z';
test('two clearly synthetic, non-approved cases exist',()=>{
  assert.equal(CASES.length,2);
  for(const c of CASES){
    assert.equal(c.review_status,'clinical-review-pending');
    assert.equal(c.phases.length,4);
    assert.ok(c.phases.every(p=>p.actions.length>=2));
  }
});
test('wrong action remains in current stage and records review event',()=>{
  let s=newSession('breathing-home',{id:ID,at:T0});
  s=perform(s,'scene-skip',{at:tick(1)});
  assert.equal(s.stage_index,0);
  assert.equal(s.events[0].result,'review');
  assert.match(feedbackFor(s).text,/ασφάλεια/i);
  assert.equal(currentPhase(s).id,'scene');
  assert.deepEqual(replay(JSON.parse(JSON.stringify(s))),s);
});
test('four evidence-free educational steps run deterministically with no generated vitals',()=>{
  const actions=['scene-check','assess-abcde','escalate-communicate','handover-structured'];
  function run(){
    let s=newSession('collision-road',{id:ID,at:T0});
    for(let i=0;i<actions.length;i++)s=perform(s,actions[i],{at:tick(i+1)});
    return s;
  }
  const x=run(),y=run();
  assert.deepEqual(x,y);
  assert.equal(x.finished,true);
  assert.equal(x.stage_index,4);
  assert.equal(x.events.length,4);
  assert.deepEqual(replay(x),x);
  assert.throws(()=>perform(x,'scene-check',{at:tick(5)}),/case-completed/);
  assert.ok(!JSON.stringify(x).includes('blood_pressure'));
  assert.equal(summarize([x]).completed_sessions,1);
});
test('event replay rejects tampering and out-of-order actions',()=>{
  const s=perform(newSession('breathing-home',{id:ID,at:T0}),'scene-check',{at:tick(1)});
  assert.throws(()=>perform(s,'handover-structured',{at:tick(2)}),/invalid-action/);
  assert.throws(()=>perform(s,'assess-abcde',{at:T0}),/backdated-action/);
  assert.throws(()=>replay({...s,stage_index:3}),/tampered-session/);
  assert.throws(()=>replay({...s,events:[{...s.events[0],result:'review'}]}),/tampered-event/);
  assert.throws(()=>newSession('unknown',{id:ID,at:T0}),/unknown-case/);
});
test('review attempts remain separate from official grades',()=>{
  let s=newSession('breathing-home',{id:ID,at:T0});
  s=perform(s,'scene-skip',{at:tick(1)});
  s=perform(s,'scene-check',{at:tick(2)});
  let stats=summarize([s]);
  assert.equal(stats.competencies.scene.needs_review,1);
  assert.equal(stats.competencies.scene.practiced,1);
  assert.equal(stats.suggested_focus,'scene');
  assert.equal(Object.hasOwn(stats,'official_grade'),false);
});
