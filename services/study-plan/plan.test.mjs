import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {reviewGap,buildPlan,examItems,daysUntil,parseExams,nextExam,SAEK_COURSES,PRACTICAL_ITEMS} from './plan.mjs';
const bank=JSON.parse(readFileSync(new URL('../../official_questions.json',import.meta.url),'utf8'));

test('review gap follows Cepeda et al. 2008: about 10–20% of the time left',()=>{
 assert.deepEqual(reviewGap(30),{min:3,use:5,max:6},'exam in a month: review every 3–6 days');
 assert.equal(reviewGap(100).use,15);
 assert.equal(reviewGap(2).use,1,'never less than one day');
});

test('official material only: 314 questions, 18 practical items, 247 SAEK chapters',()=>{
 assert.equal(examItems({type:'eoppep-theory'},bank).length,314);
 assert.equal(examItems({type:'eoppep-theory'},bank)[0].href,'theory.html?question=EOP-A-001');
 assert.equal(PRACTICAL_ITEMS.length,18);
 assert.equal(SAEK_COURSES.reduce((a,c)=>a+c.chapters,0),247);
 assert.equal(examItems({type:'saek',courses:['01','02']}).length,27);
});

test('plan: every item is new once before the final review period, then reviewed at the gap',()=>{
 const items=examItems({type:'eoppep-theory'},bank);
 const plan=buildPlan({items,daysLeft:30});
 assert.equal(plan.gap.use,5);
 assert.equal(plan.finalDays,5);
 const added=plan.days.flatMap(d=>d.add.map(x=>x.id));
 assert.equal(added.length,314);
 assert.equal(new Set(added).size,314);
 assert.ok(plan.days.slice(-plan.finalDays).every(d=>d.final&&d.add.length===0),'last days: review only');
 const first=items[0].id,seen=plan.days.filter(d=>d.review.some(x=>x.id===first)).map(d=>d.index);
 assert.deepEqual(seen.filter(i=>i<plan.learnDays),[5,10,15,20],'first question returns every 5 days');
 assert.ok(plan.days.slice(-plan.finalDays).some(d=>d.review.some(x=>x.id===first)),'and once more in the final review');
});

test('already studied items are not new but still come back once per gap',()=>{
 const items=PRACTICAL_ITEMS.slice();
 const done=new Set(items.slice(0,6).map(x=>x.id));
 const plan=buildPlan({items,done,daysLeft:20});
 assert.equal(plan.days.flatMap(d=>d.add).length,12);
 for(const id of done){
  const days=plan.days.filter(d=>!d.final&&d.review.some(x=>x.id===id)).map(d=>d.index);
  assert.ok(days.length>=2,id+' reviewed');
  for(let k=1;k<days.length;k++)assert.equal(days[k]-days[k-1],plan.gap.use);
 }
});

test('saved exams are validated and the nearest upcoming one is used',()=>{
 const exams=parseExams(JSON.stringify([{id:'a',type:'saek',date:'2026-12-20',courses:['01','99']},{id:'b',type:'nope',date:'2026-12-01'},{id:'c',type:'saek',date:'2026-12-05',courses:[]}]));
 assert.equal(exams.length,2);
 assert.deepEqual(exams[0].courses,['01']);
 assert.equal(nextExam(exams,['saek'],new Date('2026-11-12T10:00:00')).id,'c');
 assert.equal(daysUntil('2026-11-15',new Date('2026-11-12T23:00:00')),3);
 assert.equal(nextExam(exams,['saek'],new Date('2026-12-21T10:00:00')),null,'past exams are ignored');
});
