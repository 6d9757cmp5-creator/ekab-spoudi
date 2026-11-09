import test from 'node:test';
import assert from 'node:assert/strict';
import {PRACTICAL_CASES,PRACTICAL_SKILLS} from './eoppep-practical-cases.mjs';
import {CASES,getCase,CASE,newSession,patientVitals,execute,askPatient,validSession,saveSession,loadSession,loadCaseSession,caseProgress,reportText,summarize,actionsFor,setFocus} from './next-sim.mjs';
import {missionEvidence,vitalTrend} from './next-review.mjs';
const store=()=>{const m=new Map();return{getItem:k=>m.get(k)||null,setItem:(k,v)=>m.set(k,v),read:()=>m};};
test('the simulator offers only the six EOPPEP practical scenarios',()=>{
 assert.deepEqual(CASES.map(c=>c.id),PRACTICAL_CASES.map(c=>c.id));
 assert(CASES.every(c=>c.group),'No general clinical case remains');
 for(const removed of ['crete-two-persons-next-v1','home-welfare-next-v1','public-square-next-v1'])assert.equal(getCase(removed),null);
 assert(CASES.every(c=>c.patients.length===2&&c.patients.every(p=>p.dialogue.feeling&&p.dialogue.event)));
 assert.equal(CASE.id,CASES[0].id);
 assert.equal(getCase('invalid'),null);
 assert.notDeepEqual(patientVitals(newSession(CASES[0].id),'a'),patientVitals(newSession(CASES[1].id),'a'));
 assert.throws(()=>newSession('unknown'));
});
test('six EOPPEP scenarios keep the official wording, synthetic labels and no reactive vitals',()=>{
 assert.equal(PRACTICAL_CASES.length,6);
 assert.equal(PRACTICAL_SKILLS.length,12);
 const pdf=['νεαρό άνδρα σε καφενείο','άνδρα 55 ετών','23η εβδομάδα κύησης','ανοιχτό πνευμοθώρακα','θέλει να φύγει','αδυναμία κίνησης αριστερού κάτω άκρου'];
 PRACTICAL_CASES.forEach((c,i)=>{
  assert.ok(c.briefing.includes(pdf[i]),c.id);
  assert.ok(c.vitalsNote.includes('συνθετικές'));
  for(const p of c.patients)assert.deepEqual(p.slope,{hr:0,rr:0,spo2:0},'The source gives no trajectory');
  assert.ok(c.steps.every(step=>step.label.length<=160),'Event labels stay within the session limit');
 });
 for(const skill of PRACTICAL_SKILLS)assert.ok(PRACTICAL_CASES.some(c=>c.steps.some(s=>s.skills.includes(skill))),skill);
 assert.equal(new Set(PRACTICAL_CASES.flatMap(c=>c.steps.map(s=>s.id))).size,PRACTICAL_CASES.flatMap(c=>c.steps).length);
 assert.ok(!JSON.stringify(PRACTICAL_CASES).replaceAll('166/112','').match(/\b\d{2,3}\/\d{2,3}\b/),'No invented blood pressure');
});
test('scenario steps act only inside their scenario, never change vitals and are not graded',()=>{
 const [first,second]=PRACTICAL_CASES;
 let s=newSession(first.id);
 const before=patientVitals(s,'a');
 const stepId=first.steps[0].id;
 s=execute(s,'interventions',stepId);
 assert.ok(s.events.at(-1).detail.includes('Δεν εκτελείται κλινική πράξη'));
 assert.ok(validSession(s));
 const after=patientVitals({...s,minute:30},'a');
 assert.deepEqual(after,before,'Vitals never react to actions or time');
 assert.throws(()=>execute(newSession(second.id),'interventions',stepId));
 assert.throws(()=>execute(newSession(PRACTICAL_CASES[3].id),'interventions',stepId));
 const summary=summarize(s);
 assert.deepEqual(summary.practiceSteps.filter(x=>x.done).map(x=>x.label),[first.steps[0].label]);
 assert.equal('score' in summary,false);
 assert.equal(summarize(newSession(second.id)).practiceSteps.filter(x=>x.done).length,0);
 assert.match(reportText(s),/χωρίς βαθμολόγηση/);
 const listed=actionsFor(s,'interventions').slice(0,first.steps.length).map(a=>a.label);
 assert.deepEqual(listed,[...listed].sort((a,b)=>a.localeCompare(b,'el')),'The list does not reveal the order');
 assert.match(execute(newSession(PRACTICAL_CASES[2].id),'monitor','bp').events.at(-1).detail,/δεν δίνει τιμή/);
 const witness=setFocus(newSession(PRACTICAL_CASES[2].id),'b','scene');
 assert.doesNotMatch(execute(witness,'monitor','bp').events.at(-1).detail,/Υπέρταση/,'Findings belong to the patient');
});
test('scenario-specific dialogue and briefing never leak between cases',()=>{
 const a=askPatient(newSession(CASES[0].id),'Τι συνέβη;');
 const b=askPatient(newSession(CASES[1].id),'Τι συνέβη;');
 const c=askPatient(newSession(CASES[2].id),'Τι συνέβη;');
 assert.notEqual(a.events[0].detail,b.events[0].detail);
 assert.notEqual(b.events[0].detail,c.events[0].detail);
 assert.match(reportText(b),/Δύσπνοια/);
 assert(!reportText(b).includes(CASES[0].title));
});
test('all cases have independent process evidence and 30-minute bounded trends',()=>{
 for(const c of CASES){
  let s=newSession(c.id);
  s=execute(s,'exam','scene');s=execute(s,'dialogue','symptoms');
  assert.equal(s.caseId,c.id);
  assert.equal(missionEvidence(s).people.length,2);
  assert.equal(vitalTrend(s,'a','hr').length,s.minute+1);
  assert(validSession(s));
 }
});
test('save and resume individually, preserve existing v1 active session key',()=>{
 const memory=store(),road=CASE.id,home=CASES[1].id,square=CASES[2].id;
 const roadWork=execute(newSession(road),'exam','scene');
 const homeWork=execute(newSession(home),'dialogue','symptoms');
 assert(saveSession(memory,roadWork));assert(saveSession(memory,homeWork));
 assert.equal(loadSession(memory).caseId,home);
 assert.equal(loadCaseSession(memory,road).events[0].tool,'exam');
 assert.equal(loadCaseSession(memory,home).events[0].tool,'dialogue');
 assert.equal(loadCaseSession(memory,square).events.length,0);
 const progress=caseProgress(memory);
 assert.equal(progress[0].events,1);assert.equal(progress[1].events,1);assert.equal(progress[2].events,0);
 assert.throws(()=>loadCaseSession(memory,'invalid-id'));
});
test('old active-only v1 storage remains readable when no library exists',()=>{
 const old=store();old.setItem('ekab.mentor.next-v1',JSON.stringify(execute(newSession(),'call','coordination')));
 assert.equal(loadCaseSession(old,CASE.id).events.length,1);
 assert.equal(caseProgress(old)[0].events,1);
 assert.equal(caseProgress(old)[1].events,0);
});
test('invalid or tampered per-case storage is safely rejected',()=>{
 const memory=store();
 memory.setItem('ekab.mentor.next-library-v1',JSON.stringify({[CASES[1].id]:{...newSession(CASES[0].id),minute:-9}}));
 const home=loadCaseSession(memory,CASES[1].id);assert.equal(home.caseId,CASES[1].id);assert.equal(home.minute,0);
 memory.setItem('ekab.mentor.next-library-v1','invalid-json');
 assert.equal(caseProgress(memory).every(x=>x.events===0),true);
});
