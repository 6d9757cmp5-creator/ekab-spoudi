'use strict';
const test=require('node:test'), assert=require('node:assert/strict'), fs=require('node:fs'),path=require('node:path');
const api=require('../mentor-adaptive.js');
const read=name=>fs.readFileSync(path.resolve(__dirname,'..',name),'utf8');
const now=new Date('2026-10-29T10:00:00.000Z');
test('V1 reuses the one MENTOR adaptive learning core',()=>{
 assert.equal(api.inferTopic('ανατομία οστά'),'anatomy');
 assert.equal(api.inferTopic('Προετοιμασία ΕΟΠΠΕΠ'),'certification');
 assert.equal(api.inferTopic('τραυματίας'),'trauma');
 assert.equal(api.inferTopic('φάρμακα'),'pharmacology');
 assert.equal(new Set(Object.keys(api.TOPICS)).size,10);
});
test('independent local review memory and adaptive tone',()=>{
 const start=api.newMemory(),visit=api.recordVisit(start,'anatomy'),reviewed=api.recordReview(visit,'anatomy','repeat',now);
 assert.equal(start.topics.anatomy,undefined);
 assert.equal(reviewed.topics.anatomy.due,'2026-10-30');
 assert.equal(api.effectiveStyle(reviewed,'anatomy'),'simple');
 assert.equal(api.recommend(reviewed,{},new Date('2026-10-31T10:00:00Z')).id,'anatomy');
});
test('V1 has one visible tutor and no faculty picker',()=>{
 const html=read('mentor-lab.html'),js=read('mentor-personal-v1.js');
 assert.match(html,/id="mentor-personal"/);
 assert.ok(html.includes('src="mentor/app/adaptive.js"'));
 assert.ok(html.includes('src="mentor/app/personal-v1.js"'));
 assert.match(html,/<title>MENTOR OS · Ψηφιακός εκπαιδευτής/);
 assert.equal((html.match(/id="mentor-personal"/g)||[]).length,1,'single MENTOR tutor panel');
 assert.doesNotMatch(html,/choose-faculty|Η ομάδα των 5/);
 assert.match(js,/ekab\.mentor\.unified\.v1/);
 assert.doesNotMatch(js,/ekab-eoppep-official-v15|ekab\.saek\.exams\.v1|cloud-sync/);
 assert.match(js,/saek\.html/);
});
