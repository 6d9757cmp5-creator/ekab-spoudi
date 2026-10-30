import test from 'node:test';
import assert from 'node:assert/strict';
import {interviewStages,newInterview,applyInterviewChoice,restoreInterview} from '../mentor-patient-interview.mjs';
import {TOPICS,OTHER_TOPICS} from '../protocols-data.mjs';

test('all eighteen educational topics can mount safe four-step scripted interviews',()=>{
 for(const topic of [...TOPICS,...OTHER_TOPICS]){
  for(const role of ['firstaid','responder','doctor']){
   const stages=interviewStages(topic,role);
   assert.equal(stages.length,4);
   assert.ok(stages.every(step=>step.choices.length===2));
   assert.ok(stages.every(step=>step.choices.filter(choice=>choice.ok).length===1));
   assert.ok(stages.every(step=>step.choices.every(choice=>choice.reply&&choice.feedback)));
  }
 }
});
test('interview choices are deterministic; retry after an unsafe guess',()=>{
 const topic=TOPICS.find(t=>t.id==='stroke');
 let s=newInterview(topic,'firstaid');
 s=applyInterviewChoice(s,'assume',topic);
 assert.equal(s.index,0);
 assert.equal(s.turns[0].ok,false);
 s=applyInterviewChoice(s,'ask',topic);
 assert.equal(s.index,1);
 s=applyInterviewChoice(s,'verify',topic);
 s=applyInterviewChoice(s,'coordinate',topic);
 s=applyInterviewChoice(s,'handover',topic);
 assert.equal(s.completed,true);
 assert.equal(s.index,4);
 assert.equal(s.turns.length,5);
 assert.deepEqual(restoreInterview(s,topic,'firstaid'),s);
 assert.throws(()=>applyInterviewChoice(s,'ask',topic),/invalid-interview-state/);
});
test('invalid or different-role stored transcript never leaks between learner profiles',()=>{
 const topic=TOPICS[0];
 const s=newInterview(topic,'doctor');
 assert.equal(restoreInterview(s,topic,'firstaid').role,'firstaid');
 assert.equal(restoreInterview({schema:1,topic:topic.id,role:'doctor',index:99,turns:[{stage:0,choice:'ask',ok:true}],completed:true},topic,'doctor').index,0);
});
