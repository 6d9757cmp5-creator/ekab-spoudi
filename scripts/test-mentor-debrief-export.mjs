import test from 'node:test';
import assert from 'node:assert/strict';
import {buildDebriefReport} from '../mentor-debrief-export.mjs';
import {createStages,roleFor} from '../mentor-scenario-paths.mjs';

const topic={id:'stroke',name:'Αιφνίδια νευρολογικά συμπτώματα'};
const stages=createStages(topic,'firstaid');
const session={version:2,topic:'stroke',role:'firstaid',completed:false,answers:[
 {stage:0,choice:'verify',pass:true},
 {stage:1,choice:'label',pass:false}
]};
test('MIT-based export includes the student track, selected options and synthetic-study disclaimer',()=>{
 const text=buildDebriefReport({topic,role:roleFor('firstaid'),session,stages});
 assert.match(text,/MENTOR DEBRIEF/);
 assert.match(text,/Πρώτες βοήθειες/);
 assert.match(text,/ΑΝΑΣΚΟΠΗΣΗ ΑΠΟΦΑΣΕΩΝ/);
 assert.match(text,/Για επανάληψη/);
 assert.match(text,/όχι πραγματικός ασθενής/);
 assert.match(text,/δεν είναι επίσημο πρωτόκολλο ΕΚΑΒ/);
 assert.match(text,/Αιφνίδια νευρολογικά συμπτώματα/);
});
test('report has no external request or clinical interpretation',()=>{
 const text=buildDebriefReport({topic,role:roleFor('firstaid'),session,stages});
 assert.doesNotMatch(text,/\bhttps?:\/\//);
 assert.equal((text.match(/Επιλογή:/g)||[]).length,2);
 assert.doesNotMatch(text,/διάγνωση:|δοσολογία:/i);
});
test('empty or corrupted attempts are not exported',()=>{
 assert.throws(()=>buildDebriefReport({topic,role:roleFor('firstaid'),session:{answers:[]},stages}),/empty-study-report/);
 assert.throws(()=>buildDebriefReport({topic,role:roleFor('firstaid'),session:{answers:[{stage:0,choice:'fake'}]},stages}),/empty-study-report/);
});

test('single Mentor debrief includes scripted conversation, even without other lab attempts',()=>{
 const interviewTurns=[{stage:0,ok:true,reply:'Συνθετικός συνομιλητής: ενημερώθηκε η ομάδα.',feedback:'Εκπαιδευτική παρατήρηση χωρίς κλινική θεραπεία.'}];
 const report=buildDebriefReport({topic,role:roleFor('firstaid'),session:{answers:[],completed:false},stages,interviewTurns});
 assert.match(report,/ΣΥΝΘΕΤΙΚΗ ΕΚΠΑΙΔΕΥΤΙΚΗ ΣΥΝΟΜΙΛΙΑ/);
 assert.match(report,/Συνθετικός συνομιλητής/);
 assert.match(report,/δεν είναι επίσημο πρωτόκολλο ΕΚΑΒ/);
});
