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
 assert.equal(auditAssistantReply('Χορήγησε 10 IU [Τ1]',p).ok,false);
 assert.equal(auditAssistantReply('Χορήγησε 0,5 mg/kg [Τ1]',p).ok,false);
 assert.equal(auditAssistantReply('Δώσε 2 μονάδες [Τ1]',p).ok,false);
 assert.equal(auditAssistantReply('Χορήγησε 12 μg [Τ1]',p).ok,false);
 assert.equal(auditAssistantReply('Η κλίμακα GCS έχει 15 βαθμούς. [Τ1]',p).ok,false);
 assert.equal(auditAssistantReply('Ξέρω ότι νιώθεις θλίψη [Τ1]',p).ok,false);
});

test('high-stakes mechanistic assertions need source support even when a citation exists',()=>{
 const minimal=[{id:'T1',definition:'Καρδιοπνευμονική αναζωογόνηση: θωρακικές συμπιέσεις, όπου ενδείκνυται αερισμοί, για υποστήριξη κυκλοφορίας.'}];
 assert.equal(auditAssistantReply('Η ενδοθωρακική πίεση στηρίζει την κυκλοφορία [Τ1]',minimal).ok,false);
 assert.equal(auditAssistantReply('Συμπιέσεις για υποστήριξη κυκλοφορίας [Τ1]',minimal).ok,true);
 const detailed=[{id:'T1',definition:'Οι αλλαγές της ενδοθωρακικής πίεσης μπορεί να επηρεάζουν τη ροή.'}];
 assert.equal(auditAssistantReply('Η ενδοθωρακική πίεση αλλάζει [Τ1]',detailed).ok,true);
});
test('video is future-gated on publication, review and chapter match',()=>{
 const video={url:'https://example.com/lesson',chapterIds:['lesson-2'],approved:true,reviewed:true,published:true};
 assert.equal(approvedTeachingVideo('lesson-2',[]),null);
 assert.equal(approvedTeachingVideo('lesson-1',[video]),null);
 assert.equal(approvedTeachingVideo('lesson-2',[{...video,reviewed:false}]),null);
 assert.equal(approvedTeachingVideo('lesson-2',[video]),video);
});

test('learner request for justification asks a question instead of giving the worked solution',()=>{
 const approach=teachingApproach({question:'Σε άσκηση ΚΑΡΠΑ, ζήτησε να αιτιολογήσω την απάντησή μου.'});
 assert.match(approach.depth,/Ζήτησε από τον μαθητή μία αιτιολόγηση/);
 assert.match(approach.depth,/Μην απαντήσεις την ερώτηση/);
 assert.match(approach.depth,/Ρώτησε μόνο για όσα περιγράφονται ρητά/);
});
test('source fidelity is required beyond citation syntax',()=>{
 assert.match(ATLA_RUNTIME_RULES,/ισχυρισμός πρέπει να στηρίζεται ρητά/);
 assert.match(ATLA_RUNTIME_RULES,/μη τεκμηριωμένους μηχανισμούς/);
});

test('source ID does not launder unsupported numerical medical assertions',()=>{
 const p=[{id:'T1',term:'ΚΑΡΠΑ',definition:'Θωρακικές συμπιέσεις και, όπου ενδείκνυται, αερισμοί.'}];
 assert.deepEqual(auditAssistantReply('ΚΑΡΠΑ: 30 συμπιέσεις και 2 αερισμοί [Τ1]',p),
   {ok:false,reason:'unsupported-numeric-claim'});
 assert.equal(auditAssistantReply('Σε επείγον κάλεσε το 166 ή το 112 [Τ1]',p).ok,true);
 assert.equal(auditAssistantReply('Συμπιέσεις και, όπου ενδείκνυται, αερισμοί [Τ1]',p).ok,true);
 const supported=[{...p[0],definition:p[0].definition+' Δοκιμαστικό αναγνωριστικό: 30:2.'}];
 assert.equal(auditAssistantReply('Ο λόγος είναι 30:2 [Τ1]',supported).ok,true);
});
test('source-cited CPR cannot require complete cessation of breathing',()=>{
 const p=[{id:'T1',term:'Καρδιοπνευμονική αναζωογόνηση',definition:'Θωρακικές συμπιέσεις και, όπου ενδείκνυται, αερισμοί σε ανακοπή.'}];
 assert.deepEqual(
  auditAssistantReply('Η ΚΑΡΠΑ είναι η διαδικασία που κάνουμε όταν η καρδιά και η αναπνοή κάποιου σταματήσουν [Τ1]',p),
  {ok:false,reason:'arrest-breathing-oversimplification'}
 );
 assert.equal(auditAssistantReply('Στην ανακοπή μπορεί να υπάρχει μη φυσιολογική αναπνοή [Τ1]',p).ok,true);
});

test('reject mixed Cyrillic and Hangul artifacts in Greek ATLA medical output',()=>{
 const p=[{id:'T1',definition:'Θωρακικές συμπιέσεις και, όπου ενδείκνυται, αερισμοί.'}];
 assert.deepEqual(auditAssistantReply('ΚΑΡΠΑ με 실시ση θωρακικών συμπιέσεων [T1]',p),{ok:false,reason:'unexpected-non-greek-script'});
 assert.deepEqual(auditAssistantReply('Σε επείγον επικοινώνйся με το 166 [T1]',p),{ok:false,reason:'unexpected-non-greek-script'});
 assert.equal(auditAssistantReply('ΚΑΡΠΑ με θωρακικές συμπιέσεις [T1]',p).ok,true);
 assert.match(ATLA_RUNTIME_RULES,/Απάντησε σε φυσικά ελληνικά/);
});
