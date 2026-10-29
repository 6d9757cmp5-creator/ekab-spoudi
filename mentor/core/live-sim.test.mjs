import test from 'node:test';
import assert from 'node:assert/strict';
import {CASE,STAGES,KEY,newLiveSession,stepLive,replayLive,liveSnapshot,saveLive,loadLive,clearLive} from './live-sim.mjs';

const good=['check-safety','report-two','record-both','verified-handover'];
const wrong=['rush','omit-second','guess-diagnosis','invent'];
test('two people, four educational phases, independent bounded synthetic vital trajectories',()=>{
 const s=newLiveSession(),initial=liveSnapshot(s);
 assert.equal(CASE.people.length,2);
 assert.equal(STAGES.length,4);
 assert.equal(initial.minute,0);
 assert.equal(initial.people.length,2);
 assert.deepEqual(initial.people.map(p=>p.hr),[106,88]);
 let current=s;
 for(let i=0;i<4;i++){
   current=stepLive(current,good[i]);
   assert.equal(current.stage,i+1);
   assert.equal(liveSnapshot(current).minute,2*(i+1));
 }
 assert.equal(current.completed,true);
 assert.deepEqual(liveSnapshot(current).people.map(p=>p.hr),[122,97]);
 assert.equal(liveSnapshot(current).review,0);
 assert.equal(liveSnapshot(current).practice,4);
 assert.throws(()=>stepLive(current,good[0]),/invalid-live-session/);
});
test('wrong choices are recorded without advancing and use a predefined time sequence',()=>{
 let s=newLiveSession();
 for(let i=0;i<4;i++){
  s=stepLive(s,wrong[i]);
  assert.equal(s.stage,i);
  assert.equal(s.events.at(-1).outcome,'review');
  s=stepLive(s,good[i]);
 }
 const info=liveSnapshot(s);
 assert.equal(info.review,4);
 assert.equal(info.practice,4);
 assert.equal(info.minute,16);
 assert.deepEqual(info.people.map(p=>p.spo2),[92,96]);
 assert.equal(info.timeline.length,8);
 assert.ok(!('priority' in info.people[0]),'no triage or diagnosis is generated');
});
test('replay rejects tampered observations, invented stage and invalid choices',()=>{
 let s=newLiveSession();s=stepLive(s,'check-safety');
 assert.deepEqual(replayLive(s),s);
 assert.throws(()=>replayLive({...s,stage:3}),/tampered-live-session/);
 assert.throws(()=>replayLive({...s,events:[{...s.events[0],outcome:'review'}]}),/tampered-live-event/);
 assert.throws(()=>stepLive(s,'administer-drug'),/invalid-live-choice/);
});
test('storage is isolated to one Mentor namespace and works if storage is blocked',()=>{
 const map=new Map([['ekab-eoppep-official-v15','{"examHistory":[1,2,3]}'],['ekab.saek.exams.v1','{"score":8}']]);
 const writes=[];
 const store={getItem:k=>map.get(k)||null,setItem:(k,v)=>{writes.push(k);map.set(k,v);},removeItem:k=>{writes.push(k);map.delete(k);}};
 const session=stepLive(newLiveSession(),'check-safety');
 assert.equal(saveLive(store,session),true);
 assert.deepEqual(loadLive(store),session);
 assert.equal(clearLive(store),true);
 assert.deepEqual(loadLive(store),newLiveSession());
 assert.ok(writes.every(k=>k===KEY));
 assert.equal(map.get('ekab.saek.exams.v1'),'{"score":8}');
 assert.equal(map.get('ekab-eoppep-official-v15'),'{"examHistory":[1,2,3]}');
 const blocked={getItem:()=>{throw Error('unavailable')},setItem:()=>{throw Error('unavailable')},removeItem:()=>{throw Error('unavailable')}};
 assert.deepEqual(loadLive(blocked),newLiveSession());
 assert.equal(saveLive(blocked,session),false);
 assert.equal(clearLive(blocked),false);
});
