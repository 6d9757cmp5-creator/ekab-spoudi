import test from 'node:test';
import assert from 'node:assert/strict';
import {validTopic,validSource,safeFocus,contextFromQuery,makeJourneyUrl,returnPage,topicForSource,sourceFromPath,journeyFromPage,safeChapter} from './journey.mjs';

test('valid topic IDs are taken from existing educational taxonomy',()=>{
 assert.equal(validTopic('saek'),'saek');
 assert.equal(validTopic('eoppep'),'eoppep');
 assert.equal(validTopic('anatomy'),'anatomy');
 assert.equal(validTopic('trauma'),'trauma');
 assert.equal(validTopic('unlisted'),'');
});
test('return page is strictly allowlisted including SAEK reader pages',()=>{
 assert.equal(validSource('saek-course-01.html'),'saek-course-01.html');
 assert.equal(validSource('saek-course-20.html'),'saek-course-20.html');
 assert.equal(validSource('ui-tools/anatomy-3d/index.html'),'ui-tools/anatomy-3d/index.html');
 for(const value of ['../index.html','https://evil.example/','javascript:alert(1)','saek-course-99.html','mentor-lab.html']){
  assert.equal(validSource(value),'');
 }
});
test('context URL carries only public focus, topic and whitelisted return page',()=>{
 const url=makeJourneyUrl('mentor-protocol-suite.html',{topic:'saek',from:'saek-course-05.html',focus:'Η καρδιά και τα αγγεία'},'lab');
 const query=contextFromQuery(new URL(url,'https://example.test/').search);
 assert.deepEqual(query,{topic:'saek',from:'saek-course-05.html',focus:'Η καρδιά και τα αγγεία'});
 assert.equal(returnPage(query),'saek-course-05.html');
 const debrief=makeJourneyUrl('mentor-protocol-suite.html',query,'debrief');
 assert.match(debrief,/view=debrief/);
 const mentor=makeJourneyUrl('mentor-lab.html',query);
 assert.match(mentor,/#mentor-presence$/);
 assert.ok(!mentor.includes('grade'));
});
test('unsafe URL data cannot create malicious return links or long labels',()=>{
 const q=contextFromQuery('?topic=saek&from=https%3A%2F%2Fevil.example%2F&focus='+encodeURIComponent('<script>'+'a'.repeat(180)));
 assert.equal(q.from,'');assert.ok(q.focus.length<=90);assert.ok(!q.focus.includes('<'));
 assert.equal(returnPage(q),'');
 assert.equal(contextFromQuery('?topic=not-a-topic'),null);
 assert.equal(makeJourneyUrl('https://evil.example/',{topic:'saek'}),'');
 assert.equal(safeFocus('  Ανατομία \n 01 '),'Ανατομία 01');
});

test('source-to-mentor route handles root and nested course pages without personal data',()=>{
 assert.equal(topicForSource('saek.html'),'saek');
 assert.equal(topicForSource('eoppep.html'),'eoppep');
 assert.equal(topicForSource('saek-course-11.html'),'saek');
 assert.equal(sourceFromPath('/ekab-spoudi/ui-tools/anatomy-3d/index.html'),'ui-tools/anatomy-3d/index.html');
 assert.deepEqual(journeyFromPage('/ekab-spoudi/saek-course-11.html','Αεραγωγός'),{topic:'saek',from:'saek-course-11.html',focus:'Αεραγωγός'});
 assert.equal(journeyFromPage('/ekab-spoudi/written_exam.html','Ερωτήσεις και απαντήσεις'),null);
});

test('active SAEK chapter anchor survives Lab, Debrief and return navigation',()=>{
 const origin=journeyFromPage('/ekab-spoudi/saek-course-01.html','Αεραγωγός','lesson-11');
 assert.equal(origin.chapter,'lesson-11');
 const href=makeJourneyUrl('mentor-protocol-suite.html',origin,'debrief');
 const result=contextFromQuery(new URL(href,'https://example.test').search);
 assert.equal(result.chapter,'lesson-11');
 assert.equal(returnPage(result),'saek-course-01.html#lesson-11');
 assert.equal(safeChapter('../evil'),'');
 assert.equal(safeChapter('lesson-200'),'');
 const malformed=contextFromQuery('?topic=saek&from=saek-course-01.html&chapter=javascript:alert(1)');
 assert.equal(returnPage(malformed),'saek-course-01.html');
});
