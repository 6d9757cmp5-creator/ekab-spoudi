import test from 'node:test';
import assert from 'node:assert/strict';
import {practiceSummary,practiceLines} from './practice.mjs';
import {canonicalLearnerProfile,localStudyInsight} from './profile.mjs';
import {buildPayload} from '../ai/client.mjs';

function readonlyMap(entries){
 const values=new Map(entries),original=[...values.entries()];
 return {
  original,
  values,
  store:{
   get length(){return values.size;},
   key(i){return [...values.keys()][i]??null;},
   getItem(key){return values.get(key)??null;},
   setItem(){throw Error('must never write practice records');},
   removeItem(){throw Error('must never erase practice records');}
  }
 };
}
const flags=(on)=>Object.fromEntries(['safety','communication','assessment','monitoring','coordination','reassessment','handover'].map(k=>[k,on.includes(k)]));
const sim=(caseId,finished,on)=>({v:1,caseId,minute:12,person:'a',view:'scene',flags:flags(on),playing:false,finished,events:[{minute:1}]});

test('ATLA sees simulator, mission, protocol lab, ECG and note count, read-only',()=>{
 const s=readonlyMap([
  ['ekab.mentor.next-library-v1',JSON.stringify({c1:sim('c1',true,['safety','communication','assessment','monitoring','coordination']),c2:sim('c2',false,['safety'])})],
  ['ekab.mentor.live-two-patients.v1',JSON.stringify({schema_version:1,events:[{outcome:'practice'},{outcome:'review'},{outcome:'practice'}],completed:false})],
  ['ekab:mentor:protocol-foundation:v2:trauma:emt',JSON.stringify({version:2,answers:[{stage:0,choice:'a'}],completed:true})],
  ['ekab:mentor:protocol-foundation:v2:airway:emt',JSON.stringify({version:2,answers:[],completed:false})],
  ['ekab.mentor.ecg-practice.v1',JSON.stringify({schema_version:1,answers:[{correct:true},{correct:false},{correct:true}],completed:false})],
  ['ekab.personal-notes.v1',JSON.stringify({n1:{title:'Αεραγωγός',body:'ιδιωτικό κείμενο',section:'saek'},n2:{title:'BLS',body:'x',section:'seminar'}})]
 ]);
 const p=practiceSummary(s.store);
 assert.deepEqual(p.simulator,{cases:2,finished:1,toRepeat:['Επανεκτίμηση','Παράδοση']});
 assert.deepEqual(p.mission,{started:true,completed:false,reviewChoices:1});
 assert.deepEqual(p.protocols,{started:1,completed:1});
 assert.deepEqual(p.ecg,{answered:3,right:2,completed:false});
 assert.deepEqual(p.notes,{count:1},'seminar notes are not counted');
 const text=practiceLines(p).join(' ');
 assert.match(text,/Προσομοιωτής: 2 περιστατικά \(1 ολοκληρωμένα\), για επανάληψη: Επανεκτίμηση, Παράδοση\./);
 assert.match(text,/Αποστολή δύο τραυματιών: σε εξέλιξη, 1 επιλογές/);
 assert.match(text,/ΗΚΓ: 2\/3/);
 assert.doesNotMatch(JSON.stringify(p)+text,/ιδιωτικό|Αεραγωγός/,'note titles and text stay private');
 const insight=localStudyInsight('πώς πάει η πρόοδός μου;',canonicalLearnerProfile(s.store));
 assert.match(insight,/^Από το τοπικό ιστορικό/);
 assert.match(insight,/Προσομοιωτής: 2 περιστατικά/);
 assert.deepEqual([...s.values.entries()],s.original);
});
test('no practice records means no practice lines, and nothing is invented',()=>{
 const s=readonlyMap([['ekab.saek.read.v1.01.1','1']]);
 assert.deepEqual(practiceLines(practiceSummary(s.store)),[]);
 const insight=localStudyInsight('πώς πάει η πρόοδός μου;',canonicalLearnerProfile(s.store));
 assert.doesNotMatch(insight,/Προσομοιωτής|ΗΚΓ|Αποστολή|Σημειώσεις/);
});
test('corrupt or denied storage is safe',()=>{
 const denied={getItem(){throw Error('denied');},key(){throw Error('denied');},get length(){throw Error('denied');}};
 assert.deepEqual(practiceLines(practiceSummary(denied)),[]);
 const s=readonlyMap([['ekab.mentor.next-library-v1','{not json'],['ekab.mentor.ecg-practice.v1','[]'],['ekab.mentor.live-two-patients.v1','null']]);
 assert.deepEqual(practiceLines(practiceSummary(s.store)),[]);
});
test('practice data never reaches the AI request',()=>{
 const payload=JSON.stringify(buildPayload({question:'Τι είναι ΚΑΡΠΑ;',passages:[],level:'student',history:[]}));
 assert.doesNotMatch(payload,/Προσομοιωτής|practice|ecg-practice|next-library/);
});
