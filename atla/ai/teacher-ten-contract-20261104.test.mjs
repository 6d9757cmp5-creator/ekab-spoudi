import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import worker,{buildMessages,verifiedPassages} from '../../workers/mentor-chat/src/index.js';
import medicalTerms from '../../medical-terms.json' with {type:'json'};
import {retrieve} from '../knowledge/retrieve.mjs';
import {ATLA_AI} from './config.mjs';
import {ATLA_RUNTIME_RULES,teachingApproach,auditAssistantReply} from './teaching-policy.mjs';
import {canonicalLearnerProfile,teachingLevelFor,localStudyInsight} from '../student/profile.mjs';

const storage=entries=>{
 const m=new Map(entries);
 return {getItem:key=>m.get(key)??null,key:i=>[...m.keys()][i]??null,get length(){return m.size;},
   setItem(){throw Error('grade mutation')},removeItem(){throw Error('grade deletion')}};
};
const p=()=>retrieve('Τι είναι η ΚΑΡΠΑ;',medicalTerms.items,{k:4,minScore:3});
const req=(body)=>new Request('https://test.invalid/',{method:'POST',headers:{origin:'https://6d9757cmp5-creator.github.io','content-type':'application/json'},body:JSON.stringify(body)});
test('01 Αυστηρός — no answer release in an active exam in the ATLA UI',()=>{
 const app=readFileSync(new URL('../assistant.mjs',import.meta.url),'utf8');
 assert.match(app,/if\(exam\(\)\)\{add\('mentor','Σε ενεργή εξέταση δεν παρέχω έτοιμες απαντήσεις/);
});
test('02 Απαιτητικός — clinical scenarios require justification without punitive tone',()=>{
 const x=teachingApproach({question:'Εκπαιδευτικό σενάριο ΚΑΡΠΑ'});
 assert.equal(x.severity,'critical');assert.match(x.style,/αιτιολόγηση/);assert.match(x.style,/ποτέ τιμωρητικός/);
});
test('03 Δίκαιος — stored historical assessment grades are never altered by the learner-view',()=>{
 const s=storage([['ekab-eoppep-official-v15',JSON.stringify({'EOP-A-001':{selfAttempts:3,selfCorrect:1}})]]);
 const before=s.getItem('ekab-eoppep-official-v15');
 const profile=canonicalLearnerProfile(s);
 assert.ok(profile.understanding.eopNeedsReview.includes('EOP-A-001'));
 assert.equal(s.getItem('ekab-eoppep-official-v15'),before);
});
test('04 Υπομονετικός — explicit confusion causes simpler explanation without grade punishment',()=>{
 const x=teachingApproach({question:'Δεν το κατάλαβα. Ξαναεξήγησέ μου',level:'advanced'});
 assert.equal(x.simplify,true);assert.match(x.depth,/πιο απλά/);assert.match(x.depth,/χωρίς καμία ποινή/);
});
test('05 Προσαρμοστικός — a repeatedly missed item receives beginner-level teaching',()=>{
 const s=storage([['ekab-eoppep-official-v15',JSON.stringify({'EOP-A-001':{selfAttempts:3,selfCorrect:1}})]]);
 const profile=canonicalLearnerProfile(s);assert.equal(teachingLevelFor(profile,'Εξήγησε EOP-A-001'),'beginner');
 assert.equal(teachingLevelFor(profile,'Άλλη ερώτηση'),'student');
});
test('06 Επιστημονικά τεκμηριωμένος — reject unsupported citations and tampered sources',()=>{
 const sources=p();assert.ok(sources.length);
 assert.equal(auditAssistantReply('Απάντηση χωρίς πηγή',sources).ok,false);
 assert.equal(auditAssistantReply('Εκπαιδευτική απάντηση [Τ9]',sources).ok,false);
 assert.deepEqual(verifiedPassages('Τι είναι η ΚΑΡΠΑ;',[{...sources[0],definition:'Πλαστός ορισμός'}]),[]);
});
test('07 Ειλικρινής — absent evidence yields local acknowledgement and ZERO AI calls',async()=>{
 let calls=0;const response=await worker.fetch(req({question:'Άσχετος όρος εξωγήινης τεχνολογίας',passages:[],level:'student',history:[]}),
 {MENTOR_PROVIDER:'workers-ai',MENTOR_FREE_PLAN_CONFIRMED:'true',AI:{run(){calls++;throw Error('unexpected model call')}}});
 assert.equal(response.status,200);assert.match(await response.text(),/Δεν έχω επαληθευμένη πηγή/);assert.equal(calls,0);
});
test('08 Σοβαρός — ordinary / serious / critical educational tone has distinct levels',()=>{
 assert.equal(teachingApproach({question:'Οργάνωση μαθήματος'}).severity,'ordinary');
 assert.equal(teachingApproach({question:'Σενάριο τραυματισμού'}).severity,'serious');
 assert.equal(teachingApproach({question:'ΚΑΡΠΑ'}).severity,'critical');
});
test('09 Παρατηρητικός — repeat errors drive an explicit, non-diagnostic review recommendation',()=>{
 const s=storage([['ekab-eoppep-official-v15',JSON.stringify({'EOP-A-001':{selfAttempts:3,selfCorrect:1}})]]);
 const profile=canonicalLearnerProfile(s);
 assert.equal(profile.understanding.repeatedAssessmentItems,1);
 const answer=localStudyInsight('Πού δυσκολεύομαι;',profile);assert.match(answer,/επαναλαμβανόμενες/);
 assert.equal(localStudyInsight('Πες μου για ΚΑΡΠΑ',profile),null);
});
test('10 Συνεπής — one ATLA identity, same policy in worker, shipped live UI remains OFF',()=>{
 assert.match(ATLA_RUNTIME_RULES,/μία ενιαία εκπαιδευτική ταυτότητα/);
 assert.match(buildMessages({question:'ΚΑΡΠΑ',passages:p(),history:[],level:'student'})[0].content,/Είσαι ο ATLA/);
 assert.equal(ATLA_AI.endpoint,'');
});
