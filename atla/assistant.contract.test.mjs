import {nameCoverage,focusSnippet} from './knowledge/retrieve.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {eligibleAiPassages} from './ai/client.mjs';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const rootPages=[
 'index.html','paramedic.html','saek.html','eoppep.html','theory.html','practical_exam.html',
 'saek-exams.html','farmaka.html','seminar-prep.html','protocols.html',
 'search.html','profession-law.html','mentor-ecg.html','mentor-next.html',
 ...Array.from({length:20},(_,i)=>'saek-course-'+String(i+1).padStart(2,'0')+'.html')
];
test('fake AI replies are never the default for learners',()=>{
 const source=read('atla/assistant.mjs');
 assert.ok(source.includes("get('atla-demo')==='1'"),'Demo replies need an explicit test parameter');
 assert.ok(!/demoToggle\.checked=!ATLA_AI\.endpoint/.test(source),'A closed AI endpoint must not switch learners to fake replies');
});
test('one ATLA companion on migrated desktop/mobile entrypoints',()=>{
 for(const page of rootPages){
  const html=read(page);
  if(page==='index.html'){
   assert.match(html,/href="paramedic\.html"/,'Home must link to the ATLA Paramedic hub');
   assert.match(html,/src="atla\/assistant\.mjs"/,'ATLA must be the sole home assistant');
   assert.doesNotMatch(html,/src="mentor-home\.js"|id="mentor-home-presence-frame"/);
   continue;
  }
  assert.ok(html.includes('src="atla/assistant.mjs"'),page+' should load ATLA');
  assert.ok(!html.includes('src="mentor/presence/presence.mjs"'),page+' should not load legacy 3D companion');
  assert.ok(!html.includes('src="mentor-study-bridge.mjs"'),page+' should not open separate MENTOR Lab and DEBRIEF');
 }
 const anatomy=read('ui-tools/anatomy-3d/index.html');
 assert.ok(anatomy.includes('src="../../atla/assistant.mjs"'));
});
test('home removes heavyweight avatar and keeps core learning navigation',()=>{
 const home=read('index.html');
 // Retire the standalone Mentor home, preserving historical progress stores.
 assert.ok(home.includes('src="atla/assistant.mjs"'));
 assert.ok(!home.includes('src="mentor-home.js"'));
 assert.ok(!home.includes('id="mentor-home-presence-frame"'));
 assert.ok(home.includes('href="paramedic.html"'),'Paramedic should be the central learner entry');
 const paramedic=read('paramedic.html');
 for(const target of ['saek.html','eoppep.html','mentor-ecg.html','ui-tools/anatomy-3d/index.html','farmaka.html','seminar-prep.html'])assert.ok(paramedic.includes('href="'+target+'"'),target);
 const eop=read('eoppep.html');assert.ok(eop.includes('href="practical_exam.html"'));
});
test('ATLA reuses one existing AI path, retains no-write behavior and exam guard',()=>{
 const app=read('atla/assistant.mjs');
 assert.ok(app.includes("from './ai/client.mjs'"));
 assert.ok(read('mentor/ai/client.mjs').includes("export * from '../../atla/ai/client.mjs'"));
 assert.match(app,/examMode\(location\.pathname\)/);
 assert.match(app,/riskGuard\(q\)/);
 assert.match(app,/transformSource\(x,await fetchJSON\(x\.file\)\)/);
 assert.ok(!/\.setItem\('ekab\.saek|\.setItem\('ekab-eoppep/.test(app),'ATLA may not write existing grades');
 const config=read('atla/ai/config.mjs');
 assert.ok(config.includes('endpoint:"'+"https://ekab-spoudi-mentor-chat.6d9757cmp5.workers.dev/"+'"'),'ATLA uses only the deployed chat Worker');
});


test('learning recommendation renders ATLA-only branding',()=>{
 const recommendation=read('learning-surface.mjs');
 assert.doesNotMatch(recommendation,/στον MENTOR AI/i,'Study guidance must not display the retired assistant');
 assert.match(recommendation,/δεν αποστέλλει στοιχεία στον ATLA/);
});

test('ATLA-only visible entrypoints and in-place protocol tutor keep legacy state untouched',()=>{
 const assistant=read('atla/assistant.mjs');
 const learning=read('learning-surface.mjs');
 assert.match(assistant,/data-atla-context/,'Topic study should open the same ATLA assistant');
 assert.doesNotMatch(assistant,/['"]ATLAS(?:[\s'"]|$)/);
 assert.doesNotMatch(learning,/στον MENTOR AI|ATLAS ·/);
 const protocol=read('protocols.html');
 const cards=read('protocols-page.mjs');
 assert.match(protocol,/data-atla-open/,'The protocol reference page should open ATLA, not the retired teacher');
 assert.doesNotMatch(protocol,/>MENTOR(?:\s|<)/);
 assert.match(cards,/appendAtlaStudyButton\(actions,t\.name\)/,'Study buttons should provide topic context');
 assert.doesNotMatch(cards,/Μελέτη με MENTOR/);
 // The protocol catalogue no longer links to the removed protocol simulator.
 assert.doesNotMatch(protocol+cards,/mentor-protocol-suite/);
 assert.match(read('atla/student/memory.mjs'),/ekab\.mentor\.chat\.v1/);
});

test('ATLA sends only exact section-verified citations, preserving canonical ranking IDs',()=>{
 const glossary=JSON.parse(read('medical-terms.json')).items;
 const cpr=glossary.find(x=>x.term==='Καρδιοπνευμονική αναζωογόνηση');
 const generic=glossary.find(x=>x.sourceType==='category');
 assert(cpr&&generic&&cpr.sourceType==='direct-section');
 const mixed=[
  {id:'T1',term:generic.term,definition:generic.definition},
  {id:'T2',term:cpr.term,definition:cpr.definition}
 ];
 const before=JSON.stringify(mixed);
 assert.deepEqual(eligibleAiPassages(mixed,glossary),[mixed[1]]);
 assert.equal(JSON.stringify(mixed),before);
 assert.deepEqual(eligibleAiPassages([mixed[0]],glossary),[]);
 assert.deepEqual(eligibleAiPassages([{...mixed[1],definition:'Forged'}],glossary),[]);
 assert.deepEqual(eligibleAiPassages([{...mixed[1],id:'T9'}],glossary),[]);
 assert.deepEqual(eligibleAiPassages([{id:'T1',term:'ΕΟΠΠΕΠ',definition:'Εξέταση'}],glossary),[]);
 assert.deepEqual(eligibleAiPassages(mixed,[]),[]);
 const shell=read('atla/assistant.mjs');
 assert.match(shell,/eligibleAiPassages\(found\.passages,terms\)/);
 assert.match(shell,/passages:verifiedForAi/);
});

test('a term naming only part of the question does not answer it',()=>{
 const bone={term:'Οστό',en:'Bone',definition:'Ιστός.'};
 assert(nameCoverage('Τι είναι το πυραμοειδές οστό του καρπού;',bone)<0.5);
 assert.equal(nameCoverage('Τι είναι το οστό;',bone),1);
 assert.equal(nameCoverage('Τι είναι η ΚΑΡΠΑ;',{term:'Καρδιοπνευμονική αναζωογόνηση',aliases:['ΚΑΡΠΑ']}),1);
});

test('long passages show the part about the question',()=>{
 const text='Αρχή κειμένου. '+'Άσχετη πρόταση. '.repeat(120)+'Ο θυρεοειδής αδένας παράγει θυροξίνη. '+'Τέλος. '.repeat(120);
 const snippet=focusSnippet(text,'θυρεοειδης αδενας',200);
 assert.match(snippet,/^…Ο θυρεοειδής αδένας παράγει θυροξίνη/);
 assert.equal(focusSnippet('Μικρό κείμενο.','οστό'),'Μικρό κείμενο.');
});
