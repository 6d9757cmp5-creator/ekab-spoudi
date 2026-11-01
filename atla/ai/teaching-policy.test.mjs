import test from 'node:test';
import assert from 'node:assert/strict';
import {ATLA_PRINCIPLE,ATLA_RUNTIME_RULES,teachingApproach,auditAssistantReply,approvedTeachingVideo} from './teaching-policy.mjs';

test('constitutional principle is executable prompt policy',()=>{
 assert.match(ATLA_PRINCIPLE,/Δεν προσαρμόζεται ο μαθητής στον ATLA/);
 assert.ok(ATLA_RUNTIME_RULES.includes(ATLA_PRINCIPLE));
});
test('tone rises with educational clinical seriousness without emotion inference',()=>{
 assert.equal(teachingApproach({question:'Πώς θα οργανώσουμε το μάθημα;'}).severity,'ordinary');
 assert.equal(teachingApproach({question:'Εκπαιδευτικό σενάριο τραυματισμού'}).severity,'serious');
 assert.equal(teachingApproach({question:'Εκπαιδευτικό σενάριο καρδιακής ανακοπής'}).severity,'critical');
 assert.equal(teachingApproach({question:'δεν το κατάλαβα'}).simplify,true);
 assert.doesNotMatch(teachingApproach({question:'δεν το κατάλαβα'}).style,/άγχος|νιώθεις/);
});
test('surface gate rejects uncited, fabricated citations and unsafe doses',()=>{
 const p=[{id:'T1'}];
 assert.equal(auditAssistantReply('Η ΚΑΡΠΑ είναι τεχνική. [Τ1]',p).ok,true);
 assert.equal(auditAssistantReply('Έτσι είναι.',p).ok,false);
 assert.equal(auditAssistantReply('Απάντηση [Τ9]',p).ok,false);
 assert.equal(auditAssistantReply('Δώσε 12 mg [Τ1]',p).ok,false);
 assert.equal(auditAssistantReply('Ξέρω ότι νιώθεις θλίψη [Τ1]',p).ok,false);
});
test('video is future-gated on publication, review and chapter match',()=>{
 const video={url:'https://example.com/lesson',chapterIds:['lesson-2'],approved:true,reviewed:true,published:true};
 assert.equal(approvedTeachingVideo('lesson-2',[]),null);
 assert.equal(approvedTeachingVideo('lesson-1',[video]),null);
 assert.equal(approvedTeachingVideo('lesson-2',[{...video,reviewed:false}]),null);
 assert.equal(approvedTeachingVideo('lesson-2',[video]),video);
});
