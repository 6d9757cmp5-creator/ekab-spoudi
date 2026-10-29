'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const storage=new Map();
const localStorage={
 getItem:key=>storage.has(key)?storage.get(key):null,
 setItem:(key,value)=>storage.set(key,String(value)),
 removeItem:key=>storage.delete(key)
};
const helperCode=fs.readFileSync('seminar-sync.js','utf8').replace(/^export /gm,'');
const sem=new Function('localStorage',helperCode+';return {SEMINAR_KEY,SEMINAR_COURSES,validSeminarCourse,readSeminarValues,applySeminarValues,mergeSeminarCourse};')(localStorage);
const modelCode=fs.readFileSync('sync-model.js','utf8').replace(/^import .+\n/gm,'').replace(/^export /gm,'');
const model=new Function('validSeminarCourse','mergeSeminarCourse','SEMINAR_COURSES',modelCode+';return {validValue,captureEdits,mergeEntries,visibleEntries,validateManifest};')(sem.validSeminarCourse,sem.mergeSeminarCourse,sem.SEMINAR_COURSES);
const mk=(studied=[],other={})=>({
 studied,right:[],needs:[],oral:[],qNotes:{},oralNotes:{},scenarioFeedback:{},scenarioGrades:{},
 mcAnswers:{},mcRight:[],mcNeeds:[],scenarioHistory:[],retryIndices:[],mixedRun:null,...other
});
const A='a'.repeat(32),B='b'.repeat(32),userId='test-user';
const mobile={bls:mk([0]),pbls:mk([0,1]),ils:mk([0,1,2]),als:mk([0,1]),phtls:mk([])};
storage.set(sem.SEMINAR_KEY,JSON.stringify(mobile));
const captured=sem.readSeminarValues();
assert.deepEqual(Object.keys(captured).sort(),['s:als','s:bls','s:ils','s:pbls']);
const mobileOut=model.captureEdits({}, {}, captured,A,100);
model.validateManifest({schema:'ekab-sync-v1',userId,device:A,entries:mobileOut},userId);
const cloud=model.visibleEntries(mobileOut);
storage.clear();
sem.applySeminarValues(cloud);
const restored=JSON.parse(storage.get(sem.SEMINAR_KEY));
assert.equal(restored.ils.studied.length,3);
assert.equal(restored.pbls.studied.length,2);
assert.equal(restored.bls.studied.length,1);
assert.equal(restored.als.studied.length,2);
// Concurrent progress from two offline devices must not discard the other device's work.
const ca=mk([0],{qNotes:{1:'Προσωπικές σημειώσεις Α'},scenarioGrades:{0:{verdict:'correct',criticalError:false}}});
const cb=mk([1],{qNotes:{2:'Προσωπικές σημειώσεις Β'},scenarioGrades:{1:{verdict:'partial',criticalError:false}}});
const aa=model.captureEdits({}, {}, {'s:bls':ca},A,200);
const bb=model.captureEdits({}, {}, {'s:bls':cb},B,210);
const merged=model.mergeEntries(aa,bb);
const both=model.visibleEntries(merged)['s:bls'];
assert.deepEqual(both.studied,[0,1]);
assert.equal(both.qNotes[1],'Προσωπικές σημειώσεις Α');
assert.equal(both.qNotes[2],'Προσωπικές σημειώσεις Β');
assert.equal(both.scenarioGrades[0].verdict,'correct');
assert.equal(both.scenarioGrades[1].verdict,'partial');
// A reset made after seeing the latest merge must remain a deletion (tombstone).
const reset=model.captureEdits(merged,model.visibleEntries(merged),{},A,300);
const afterReset=model.mergeEntries(merged,reset);
assert.equal(afterReset['s:bls'].v,null);
assert.equal(model.visibleEntries(afterReset)['s:bls'],undefined);
// Even a later, smaller record from the PC must not erase richer mobile work.
const rich=mk([0,1,2],{qNotes:{0:'Σημειώσεις κινητού'},scenarioGrades:{0:{verdict:'correct',criticalError:false}}});
const fewer=mk([0]);
const richOnMobile=model.captureEdits({}, {}, {'s:bls':rich},A,400);
const reducedOnPc=model.captureEdits(richOnMobile,model.visibleEntries(richOnMobile),{'s:bls':fewer},B,500);
const preserveRich=model.mergeEntries(richOnMobile,reducedOnPc);
assert.deepEqual(model.visibleEntries(preserveRich)['s:bls'].studied,[0,1,2]);
assert.equal(model.visibleEntries(preserveRich)['s:bls'].qNotes[0],'Σημειώσεις κινητού');
assert.equal(model.visibleEntries(preserveRich)['s:bls'].scenarioGrades[0].verdict,'correct');
// Explicit full-course reset after the merge is still respected.
const confirmedReset=model.captureEdits(preserveRich,model.visibleEntries(preserveRich),{},A,600);
assert.equal(model.mergeEntries(preserveRich,confirmedReset)['s:bls'].v,null);
// Invalid or unexpectedly large entries must be rejected before cloud application.
assert.equal(model.validValue('s:bls',{studied:[24]}),false);
assert.equal(model.validValue('s:other',mk([0])),false);
assert.equal(model.validValue('s:bls',mk([2])),true);
assert.throws(()=>{storage.set(sem.SEMINAR_KEY,'{broken');sem.readSeminarValues()},/invalid-local-seminar-data/);
console.log('Seminar cross-device capture, merge, recovery, and validation tests passed');
