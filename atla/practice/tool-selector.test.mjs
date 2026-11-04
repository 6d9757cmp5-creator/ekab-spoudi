import test from 'node:test';
import assert from 'node:assert/strict';
import {chooseTeachingTool,chooseTeachingModel} from './tool-selector.mjs';

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
const delivery={path:'tools/atla-ai/resources/nih3d-library/models/3DPX-000170.glb',bytes:1000,sha256:'a'.repeat(64)};
const library={vocabulary:{structures:{patella:{match:['επιγονατιδ']},humerus:{match:['βραχιον']}},findings:{fracture:{match:['καταγμ']}},exclude:{}},models:[
 {source:'nih3d',accession:'3DPX-000170',entryId:170,label:'Επιγονατίδα',kind:'anatomy',structures:['patella'],clinicalUseApproved:false,delivery,surfaces:['library','lesson','anatomy','exam','cockpit','atla']},
 {source:'nih3d',accession:'3DPX-000802',entryId:802,label:'Κάταγμα βραχιονίου',kind:'pathology',structures:['humerus'],finding:'fracture',clinicalUseApproved:false,delivery,surfaces:['library','lesson','exam','cockpit','atla']}]};
const model=args=>{
 let loads=0;
 const run=chooseTeachingModel({rootUrl:'https://example.org/app/',load:async()=>{loads++;return library},...args});
 return run.then(result=>({result,loads}));
};
test('text is enough: the 3D registry is not even downloaded',async()=>{
 for(const question of ['Τι είναι η επιγονατίδα;','Εξήγησε την επιγονατίδα','']){
  const {result,loads}=await model({question});
  assert.equal(result,null,question);
  assert.equal(loads,0,question);
 }
});
test('asked or struggling learners get the exact model, with a way back',async()=>{
 const asked=(await model({question:'Δείξε μου την επιγονατίδα σε 3D',from:'/app/saek-course-01.html#lesson-2'})).result;
 assert.equal(asked.accession,'3DPX-000170');
 assert.match(asked.href,/dataset=nih&model=3DPX-000170&from=%2Fapp%2Fsaek-course-01\.html%23lesson-2$/);
 assert.equal((await model({question:'Δεν κατάλαβα την επιγονατίδα'})).result.accession,'3DPX-000170');
 assert.equal((await model({question:'Πες το πιο απλά για την επιγονατίδα'})).result.accession,'3DPX-000170');
});
test('no matching structure or no finding means no invented model',async()=>{
 assert.equal((await model({question:'Δείξε 3D φάρμακο'})).result,null);
 assert.equal((await model({question:'Δείξε μου το βραχιόνιο σε 3D'})).result,null,'A bone name never opens a fracture');
 assert.equal((await model({question:'Δείξε μου κάταγμα βραχιονίου σε 3D'})).result.accession,'3DPX-000802');
});
test('exam and simulation gates hold even when asked directly',async()=>{
 assert.equal((await model({question:'Δείξε μου την επιγονατίδα σε 3D',mode:'exam',revealed:false})).result,null);
 assert.equal((await model({question:'Δείξε μου την επιγονατίδα σε 3D',mode:'simulation'})).result,null);
 assert.match((await model({question:'Δείξε μου την επιγονατίδα σε 3D',mode:'simulation',confirmedAnatomy:true})).result.href,/tool=cockpit/);
});
test('a registry failure leaves ATLA working',async()=>{
 const result=await chooseTeachingModel({question:'Δείξε μου την επιγονατίδα σε 3D',rootUrl:'https://example.org/',load:async()=>{throw Error('offline')}});
 assert.equal(result,null);
});
test('video never offered before specific, approved, published, reviewed match',()=>{
 const video={url:'https://example.org/approved',chapterIds:['lesson-2'],approved:true,reviewed:true,published:true};
 assert.equal(chooseTeachingTool({question:'Δείξε βίντεο',chapterId:'lesson-2'}),null);
 assert.equal(chooseTeachingTool({question:'Δείξε βίντεο',chapterId:'lesson-3',videos:[video]}),null);
 assert.equal(chooseTeachingTool({question:'Δείξε βίντεο',chapterId:'lesson-2',videos:[{...video,approved:false}]}),null);
 assert.equal(chooseTeachingTool({question:'Δείξε βίντεο',chapterId:'lesson-2',videos:[video]}).href,video.url);
});
