import test from 'node:test';
import assert from 'node:assert/strict';
import {completedChapters,chooseChapter,canInterrupt,safeRoute,suitableRecall,nextSchedule,
 DAILY_LIMIT,STUDY_KEY,FEEDBACK_KEY} from './selector.mjs';

test('reads ONLY completed existing SAEK chapters; no arbitrary or unseen cards',()=>{
 const entries=[
  ['ekab.saek.read.v1.01.1','1'],['ekab.saek.read.v1.01.1','1'],
  ['ekab.saek.read.v1.01.2','0'],['ekab.saek.read.v1.02.3','1'],
  ['ekab.saek.read.v1.00.1','1'],['ekab.saek.read.v1.20.99','1'],
  ['ekab-eoppep-official-v15','{}']
 ];
 assert.deepEqual(completedChapters(entries),[
  {course:'01',chapter:1,id:'01:1'}, {course:'02',chapter:3,id:'02:3'}
 ]);
 assert.deepEqual(completedChapters([]),[]);
});
test('review scheduling prioritizes remembered mistakes, never invents learned chapters',()=>{
 const candidates=[{id:'01:1'},{id:'02:3'}];
 const now=Date.parse('2026-11-02T00:00:00Z');
 assert.deepEqual(chooseChapter(candidates,{'01:1':{answer:'again'},'02:3':{answer:'remembered'}},now,()=>0),candidates[0]);
 assert.deepEqual(chooseChapter(candidates,{'01:1':{seenAt:now-3600000},'02:3':{seenAt:now-8*3600000}},now,()=>0),candidates[1]);
 assert.equal(chooseChapter([],{},now),null);
});
test('prompts remain opt-in, nonintrusive, capped, and suppress exams',()=>{
 const now=Date.parse('2026-11-02T12:00:00Z'),day='2026-11-02';
 const settings={enabled:true,now,nextAt:now-1,shownToday:0,day,visible:true,idleMs:30000,blocked:false};
 assert.equal(canInterrupt(settings),true);
 assert.equal(canInterrupt({...settings,enabled:false}),false);
 assert.equal(canInterrupt({...settings,shownToday:DAILY_LIMIT}),false);
 assert.equal(canInterrupt({...settings,visible:false}),false);
 assert.equal(canInterrupt({...settings,blocked:true}),false);
 assert.equal(canInterrupt({...settings,idleMs:0}),false);
 assert.equal(canInterrupt({...settings,day:'2026-11-01'}),false);
 assert.equal(canInterrupt({...settings,nextAt:now+10}),false);
 for(const page of ['theory.html','practical_exam.html','saek-exams.html'])assert.equal(safeRoute('/'+page),false);
 for(const page of ['index.html','saek.html','saek-course-01.html','farmaka.html','mentor-next.html'])assert.equal(safeRoute('/'+page),true);
 assert.equal(safeRoute('/index.html','?mode=exam'),false);
 assert.ok(nextSchedule(now,()=>0)>=now+120000);
 assert.ok(nextSchedule(now,()=>.99)<now+5*60000);
});
test('only safe educational recall snippets appear in ambient cards',()=>{
 assert.equal(suitableRecall('Ποια δύο οστά αποτελούν το αντιβράχιο;','Κερκίδα και ωλένη.'),true);
 assert.equal(suitableRecall('Πόσα mg να χορηγήσω;','Δώσε 1 mg αδρεναλίνη.'),false);
 assert.equal(suitableRecall('Τι είναι η ενδοφλέβια χορήγηση;','Αναφορά σε ενδοφλέβια πράξη.'),false);
 assert.equal(suitableRecall('Α','Β'),false);
});
test('separate keys do not overwrite canonical grades, lesson or notes',()=>{
 assert.match(STUDY_KEY,/^ekab\.atlas\.recall\./);
 assert.match(FEEDBACK_KEY,/^ekab\.atlas\.recall\./);
 assert.notEqual(STUDY_KEY,FEEDBACK_KEY);
});
