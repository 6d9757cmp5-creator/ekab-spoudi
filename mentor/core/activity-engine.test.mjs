import test from 'node:test';
import assert from 'node:assert/strict';
import {MCI_ACTIVITIES,EQUIPMENT_ACTIVITIES} from './activities.mjs';
import {newActivitySession,currentActivityStage,performActivity,replayActivity,activityFeedback,summarizeActivities} from './activity-engine.mjs';
const T='2026-10-28T22:00:00.000Z',id='activity-001';
const at=n=>'2026-10-28T22:'+String(n).padStart(2,'0')+':00.000Z';
function run(activityId,actions){
 let s=newActivitySession(activityId,{sessionId:id,at:T});
 for(let i=0;i<actions.length;i++)s=performActivity(s,actions[i],{at:at(i+1)});
 return s;
}
test('two fictional incidents and three equipment models are explicitly unreviewed',()=>{
 assert.equal(MCI_ACTIVITIES.length,2);
 assert.equal(EQUIPMENT_ACTIVITIES.length,3);
 for(const c of [...MCI_ACTIVITIES,...EQUIPMENT_ACTIVITIES]){
  assert.equal(c.source_status,'clinical-review-pending');
  assert.equal(c.version,1);
  assert.ok(!c.stages.some(s=>s.id==='treatment'||s.id==='drug-administration'));
 }
 assert.equal(MCI_ACTIVITIES[0].people.length,3);
 assert.equal(MCI_ACTIVITIES[1].people.length,4);
});
test('multi-patient observation is incremental, requires each patient and rejects duplicates',()=>{
 let s=run('mci-road',['scene-secure','request-coordination']);
 assert.equal(s.stage_index,2);
 assert.equal(currentActivityStage(s).id,'observe');
 s=performActivity(s,'observe-a',{at:at(3)});
 assert.equal(s.stage_index,2);
 assert.deepEqual(s.marks,['a']);
 assert.throws(()=>performActivity(s,'observe-a',{at:at(4)}),/already-observed/);
 s=performActivity(s,'observe-b',{at:at(4)});
 assert.equal(s.stage_index,2);
 s=performActivity(s,'observe-c',{at:at(5)});
 assert.equal(s.stage_index,3);
 assert.deepEqual(s.marks,[]);
 s=performActivity(s,'report-verified',{at:at(6)});
 assert.equal(s.finished,true);
 assert.deepEqual(replayActivity(JSON.parse(JSON.stringify(s))),s);
 const summary=summarizeActivities([s]);
 assert.equal(summary.mci.completed,1);
 assert.equal(summary.observations,3);
});
test('wrong decisions trigger review without skipping and without creating official grades',()=>{
 let s=newActivitySession('mci-road',{sessionId:id,at:T});
 s=performActivity(s,'scene-rush',{at:at(1)});
 assert.equal(s.stage_index,0);
 assert.equal(activityFeedback(s).result,'review');
 assert.equal(summarizeActivities([s]).reviews,1);
 assert.equal(Object.hasOwn(s,'grade'),false);
 assert.throws(()=>performActivity(s,'unknown',{at:at(2)}),/invalid-action/);
});
test('equipment module uses the same deterministic engine and replay validates history',()=>{
 const actions=['device-identify','follow-training','document-observations'];
 for(const entry of EQUIPMENT_ACTIVITIES){
  const session=run(entry.id,actions);
  assert.equal(session.finished,true);
  assert.equal(session.stage_index,3);
  assert.deepEqual(replayActivity(session),session);
  assert.throws(()=>performActivity(session,'device-identify',{at:at(4)}),/activity-completed/);
 }
});
test('tampering, unknown activities, stale time and fabricated observations are refused',()=>{
 const s=run('mci-road',['scene-secure','request-coordination','observe-a']);
 assert.throws(()=>replayActivity({...s,marks:['b']}),/tampered-activity/);
 assert.throws(()=>replayActivity({...s,events:[{...s.events[0],result:'review'},...s.events.slice(1)]}),/tampered-event/);
 assert.throws(()=>performActivity(s,'observe-b',{at:T}),/backdated-action/);
 assert.throws(()=>newActivitySession('invalid',{sessionId:id,at:T}),/unknown-activity/);
});
