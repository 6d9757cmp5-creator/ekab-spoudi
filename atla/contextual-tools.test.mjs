import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {saekTool,eoppepTool,nextContextualAction,scenarioForChapter,scenarioReviewPolicy} from './learning/contextual-tools.mjs';
import {returnDestination} from './practice/ecg-return.mjs';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('1 ECG: only the actual SAEK cardiac conduction chapter offers basic waveform practice',()=>{
 const link=saekTool('saek-course-02.html','lesson-7');
 assert.equal(link.kind,'ecg');
 assert.match(link.href,/^mentor-ecg\.html\?from=02&chapter=7#ecg-practice$/);
 assert.match(read('saek-course-02.html'),/Καρδιακός κύκλος και ηλεκτρική αγωγή/);
 for(const chapter of ['lesson-1','lesson-6','lesson-8','lesson-13'])assert.equal(saekTool('saek-course-02.html',chapter),null);
 assert.equal(saekTool('saek-course-10.html','lesson-7'),null,'ACS must not get a basic synthetic ECG mistaken for clinical interpretation');
 assert.match(read('mentor-ecg.html'),/δεν είναι πιστό κλινικό ΗΚΓ/);
});

test('2 anatomy: chapter link opens existing viewer with safe focused heart and return route',()=>{
 const link=saekTool('saek-course-01.html','lesson-10');
 assert.equal(link.kind,'anatomy');
 const url=new URL(link.href,'https://example.test/');
 assert.equal(url.searchParams.get('focus'),'heart');
 assert.equal(url.searchParams.get('mode'),'organs');
 assert.equal(url.searchParams.get('from'),'01');
 assert.equal(url.searchParams.get('chapter'),'10');
 assert.match(read('saek-course-01.html'),/Καρδιά, μεγάλα αγγεία και βαλβίδες/);
 assert.match(read('tools/anatomy-3d/hires-anatomy.js'),/function focusRequestedStructure\(/);
 assert.match(read('tools/anatomy-3d/hires-anatomy.js'),/configureLessonReturn\(/);
 assert.equal(saekTool('saek-course-01.html','lesson-1'),null);
});

test('3 EOPPEP: only sourced EOP-A-070 in the reader, never examination, offers ECG',()=>{
 assert.match(read('eoppep-sos.json'),/"id": "EOP-A-070"/);
 assert.equal(eoppepTool('EOP-A-070',{readerVisible:true,activeExam:false}).kind,'ecg');
 assert.equal(eoppepTool('EOP-A-070',{readerVisible:false,activeExam:false}),null);
 assert.equal(eoppepTool('EOP-A-070',{readerVisible:true,activeExam:true}),null);
 for(const id of ['EOP-A-069','EOP-A-071','EOP-B-070','EOP-A-999'])assert.equal(eoppepTool(id,{readerVisible:true}),null);
 const app=read('app.js');
 const reader=app.slice(app.indexOf('function renderCatalogReader(q)'),app.indexOf('function openCatalogQuestion'));
 assert.match(reader,/catalogReaderNumber/);
 assert.match(read('atla/practice/eoppep-context.mjs'),/MutationObserver/);
 assert.doesNotMatch(app,/ekab:eoppep-reader/,'Protected exam code must remain unchanged');
 assert.match(read('atla/practice/eoppep-context.mjs'),/examView/);
});

test('4 next-step logic: learner explicitly asks for explanation or practice; no fake mastery',()=>{
 assert.equal(nextContextualAction({file:'saek-course-02.html',chapter:'lesson-7',feedback:'need_explanation'}).kind,'explanation');
 assert.equal(nextContextualAction({file:'saek-course-02.html',chapter:'lesson-7',feedback:'ready_to_practice'}).kind,'ecg');
 assert.equal(nextContextualAction({file:'saek-course-01.html',chapter:'lesson-10',feedback:'ready_to_practice'}).kind,'anatomy');
 assert.equal(nextContextualAction({file:'saek-course-02.html',chapter:'lesson-7',feedback:'incorrect'}),null);
 assert.equal(nextContextualAction({file:'saek-course-14.html',chapter:'lesson-5',feedback:'ready_to_practice'}),null);
 const practice=read('atla/practice/saek-practice.mjs');
 assert.match(practice,/saekTool\(file,chapter\.id\)/);
 assert.match(practice,/feedback:'need_explanation'/);
 assert.match(practice,/feedback:'ready_to_practice'/);
 assert.doesNotMatch(practice,/localStorage|sessionStorage|indexedDB|\.setItem/);
});

test('5 case safety: no arbitrary synthetic cases pass missing educational/clinical review gates',()=>{
 assert.equal(scenarioReviewPolicy.approved.length,0);
 assert.ok(scenarioReviewPolicy.required.includes('independent_clinical_review'));
 assert.equal(scenarioForChapter('saek-course-10.html','lesson-12'),null);
 assert.equal(scenarioForChapter('saek-course-02.html','lesson-7'),null);
 assert.match(read('tools/patient-simulator/core/next-cases.mjs'),/NOT clinical cases vetted by experts/);
 const practice=read('atla/practice/saek-practice.mjs');
 assert.match(practice,/scenarioForChapter\(file,chapter\.id\)/);
 assert.doesNotMatch(practice,/cockpit\.href=/);
});

test('existing resource returns are narrowed to verified educational entrypoints',()=>{
 assert.equal(returnDestination('?from=02&chapter=7').href,'saek-course-02.html#lesson-7');
 assert.equal(returnDestination('?from=eoppep&question=EOP-A-070').href,'theory.html?question=EOP-A-070');
 assert.equal(returnDestination('?from=02&chapter=10').href,'paramedic.html#skills');
 assert.equal(returnDestination('?from=https://evil.test/').href,'paramedic.html#skills');
 assert.match(read('atla/assistant.mjs'),/import\('\.\/practice\/eoppep-context\.mjs'\)/);
});
