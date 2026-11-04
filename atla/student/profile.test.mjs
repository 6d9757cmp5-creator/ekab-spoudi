import test from 'node:test';
import assert from 'node:assert/strict';
import {canonicalLearnerProfile,teachingLevelFor,localStudyInsight} from './profile.mjs';

function readonlyMap(entries){
 const values=new Map(entries),original=[...values.entries()];
 return {
  original,
  values,
  store:{
   get length(){return values.size;},
   key(i){return [...values.keys()][i]??null;},
   getItem(key){return values.get(key)??null;},
   setItem(){throw Error('must never rewrite historical progress');},
   removeItem(){throw Error('must never erase historical progress');}
  }
 };
}
test('canonical ATLA view combines old sources without migrating, duplicating or changing any grades',()=>{
 const s=readonlyMap([
  ['ekab.saek.read.v1.01.1','1'],
  ['ekab.saek.exams.v1',JSON.stringify({history:{'saek-01-1':{correct:1,incorrect:2,partial:0}}})],
  ['ekab-eoppep-official-v15',JSON.stringify({'EOP-A-001':{selfAttempts:3,selfCorrect:1},'EOP-B-002':{selfAttempts:2,selfCorrect:2}})],
  ['ekab.study.resume.v1',JSON.stringify({kind:'saek',course:'01',chapter:1})],
  ['ekab.mentor.learning.v1',JSON.stringify({level:'student'})],
  ['ekab.personal-notes.v1',JSON.stringify({private:'do not touch'})]
 ]);
 const profile=canonicalLearnerProfile(s.store);
 assert.equal(profile.schema,1);
 assert.equal(profile.stats.saek.read,1);
 assert.equal(profile.stats.eoppep.attempted,2);
 assert.deepEqual(profile.understanding.eopNeedsReview,['EOP-A-001']);
 assert.deepEqual(profile.understanding.saekNeedsReview,['saek-01-1']);
 assert.equal(profile.understanding.repeatedAssessmentItems,2);
 assert.equal(profile.understanding.correctEvidenceItems,1);
 assert.equal(teachingLevelFor(profile,'Ξαναεξήγησέ μου την EOP-A-001'),'beginner');
 assert.equal(teachingLevelFor(profile,'Πες μου για την EOP-B-002'),'student');
 assert.equal(localStudyInsight('πώς πάει η πρόοδός μου;',profile)?.includes('1 αναγνωσμένα'),true);
 assert.deepEqual([...s.values.entries()],s.original);
 assert.equal(JSON.stringify(profile).includes('do not touch'),false);
});
test('one correct answer, single reading or no history cannot prove competence',()=>{
 const s=readonlyMap([
  ['ekab-eoppep-official-v15',JSON.stringify({'EOP-A-001':{selfAttempts:1,selfCorrect:1}})],
  ['ekab.saek.read.v1.01.1','1']
 ]);
 const p=canonicalLearnerProfile(s.store);
 assert.equal(p.understanding.status,'insufficient-evidence');
 assert.equal(p.understanding.correctEvidenceItems,0);
 assert.equal(p.understanding.eopNeedsReview.length,0);
 assert.equal(p.stats.saek.read,1);
 assert.equal(localStudyInsight('Πες μου για την ΚΑΡΠΑ',p),null);
 assert.deepEqual([...s.values.entries()],s.original);
});
test('corrupt or denied storage is safe and no progress is fabricated',()=>{
 const p=canonicalLearnerProfile({getItem(){throw Error('denied');},get length(){throw Error('denied');}});
 assert.equal(p.stats.saek.read,0);
 assert.equal(p.stats.eoppep.attempted,0);
 assert.equal(p.understanding.status,'insufficient-evidence');
});
test('explicitly selected learning level is honored without changing stored assessment records',()=>{
 const s=readonlyMap([
  ['ekab.mentor.learning.v1',JSON.stringify({level:'scientific'})],
  ['ekab-eoppep-official-v15',JSON.stringify({'EOP-A-001':{selfAttempts:3,selfCorrect:0}})]
 ]);
 const p=canonicalLearnerProfile(s.store);
 assert.equal(teachingLevelFor(p,'EOP-A-001'),'scientific');
 assert.deepEqual([...s.values.entries()],s.original);
});
