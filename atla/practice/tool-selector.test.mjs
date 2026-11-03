import test from 'node:test';
import assert from 'node:assert/strict';
import {chooseTeachingTool} from './tool-selector.mjs';

test('ordinary medical theory and unrelated content do not trigger heavy tools',()=>{
 for(const q of ['Τι είναι η καρδιά;','Εξήγησε μου την ΚΑΡΠΑ.','3D φάρμακο','Καρδιά','Δεν το κατάλαβα']){
  assert.equal(chooseTeachingTool({question:q}),null,q);
 }
});
test('explicit relevant requests choose the existing minimal resource',()=>{
 assert.equal(chooseTeachingTool({question:'Δείξε 3D ανατομία καρδιάς'}).kind,'anatomy');
 assert.equal(chooseTeachingTool({question:'Θέλω άσκηση ECG'}).kind,'ecg');
 assert.equal(chooseTeachingTool({question:'Δείξε μου το πρωτόκολλο'}).kind,'protocol');
 assert.equal(chooseTeachingTool({question:'Προσομοίωση τραυματισμένου ασθενή'}).kind,'simulation');
});
test('video never offered before specific, approved, published, reviewed match',()=>{
 const video={url:'https://example.org/approved',chapterIds:['lesson-2'],approved:true,reviewed:true,published:true};
 assert.equal(chooseTeachingTool({question:'Δείξε βίντεο',chapterId:'lesson-2'}),null);
 assert.equal(chooseTeachingTool({question:'Δείξε βίντεο',chapterId:'lesson-3',videos:[video]}),null);
 assert.equal(chooseTeachingTool({question:'Δείξε βίντεο',chapterId:'lesson-2',videos:[{...video,approved:false}]}),null);
 assert.equal(chooseTeachingTool({question:'Δείξε βίντεο',chapterId:'lesson-2',videos:[video]}).href,video.url);
});
