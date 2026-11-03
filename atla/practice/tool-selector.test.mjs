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
test('video never offered outside the exact approved, published, reviewed course + chapter',()=>{
 const video={url:'https://example.org/approved',courseId:'saek-course-01.html',
  chapterIds:['lesson-2'],approved:true,reviewed:true,published:true};
 const call=(courseId,chapterId,videos)=>chooseTeachingTool({question:'Δείξε βίντεο',courseId,chapterId,videos});
 assert.equal(call('saek-course-01.html','lesson-2',[]),null);
 assert.equal(call('saek-course-01.html','lesson-3',[video]),null);
 assert.equal(call('saek-course-02.html','lesson-2',[video]),null,
  'identical chapter number from another course cannot show the video');
 assert.equal(call('','lesson-2',[video]),null);
 assert.equal(call('saek-course-01.html','lesson-2',[{...video,approved:false}]),null);
 assert.equal(call('saek-course-01.html','lesson-2',[{...video,courseId:undefined}]),null);
 assert.equal(call('saek-course-01.html','lesson-2',[video]).href,video.url);
});
