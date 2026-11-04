import test from 'node:test';
import assert from 'node:assert/strict';
import {ACTIVITIES,getActivity} from './mission-activities.mjs';
import {newActivitySession,performActivity,replayActivity,activityFeedback} from './mission-activity-engine.mjs';
import {getActivity as legacyGet} from '../../../mentor/core/activities.mjs';
import {newActivitySession as legacyNew} from '../../../mentor/core/activity-engine.mjs';

test('Clinical Cockpit owns the two MCI exercises and three equipment cards',()=>{
 assert.equal(ACTIVITIES.filter(x=>x.kind==='mci').length,2);
 assert.equal(ACTIVITIES.filter(x=>x.kind==='equipment').length,3);
 assert.ok(getActivity('mci-road'));
 assert.strictEqual(getActivity,legacyGet,'legacy path must re-export the SAME implementation');
 assert.strictEqual(newActivitySession,legacyNew,'legacy engine must re-export without duplication');
 for(const exercise of ACTIVITIES)assert.equal(exercise.source_status,'clinical-review-pending');
});
test('historic MCI sessions remain replayable after migration',()=>{
 const at='2026-11-01T10:00:00.000Z';
 const session=newActivitySession('mci-road',{sessionId:'migration-test-1',at});
 const next=performActivity(session,'scene-secure',{at:'2026-11-01T10:01:00.000Z'});
 assert.equal(next.stage_index,1);
 assert.equal(replayActivity(next).events.length,1);
 assert.equal(activityFeedback(next).result,'practice');
});
