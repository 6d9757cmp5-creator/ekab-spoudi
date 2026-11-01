import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {guardHighRiskFullCredit,HIGH_RISK_REVIEW_IDS} from './safety-contrast-guard.mjs';
import {cautiouslyCheckGrade} from './semantic-grading-policy.mjs';
const grade={verdict:'correct',explanation:'Το μοντέλο επέστρεψε πλήρη βαθμολογία.',
 correctPoints:['Εντοπίστηκε ο σωστός όρος'],missingPoints:[],
 criticalError:false,safetyNote:'',modelAnswer:'',example:'',takeaway:''};
const contradictions=[
 ['saek-16-10','Σε επιληπτική κρίση βάζουμε κουτάλι στο στόμα του ασθενούς.','Δεν βάζουμε κουτάλι στο στόμα του ασθενούς σε κρίση.'],
 ['saek-04-2','Αν φοράμε γάντια δεν χρειάζεται υγιεινή χεριών.','Τα γάντια δεν αντικαθιστούν την υγιεινή χεριών.'],
 ['saek-05-9','Η φυσιολογική πίεση αποκλείει σοκ.','Η φυσιολογική πίεση δεν αποκλείει το σοκ.'],
 ['saek-17-8','Σε έγκυο με πνιγμονή κάνουμε κοιλιακές ωθήσεις.','Σε έγκυο με πνιγμονή δεν κάνουμε κοιλιακές ωθήσεις.'],
 ['EOP-A-018','Η πνευμονική αρτηρία ξεκινά από την αριστερή κοιλία.','Η πνευμονική αρτηρία ξεκινά από τη δεξιά κοιλία.']
];
test('all high-risk checks are tied to real source question IDs',()=>{
 assert.deepEqual([...HIGH_RISK_REVIEW_IDS].sort(),contradictions.map(x=>x[0]).sort());
});
for(const [id,unsafe,safe] of contradictions){
 test(id+': a model falsely claiming fully correct does NOT remain correct for the explicit contradictory answer',()=>{
  const got=guardHighRiskFullCredit({id},unsafe,grade);
  assert.equal(got.verdict,'uncertain');
  assert.equal(got.criticalError,false);
  assert.deepEqual(got.correctPoints,[]);
  assert.deepEqual(got.missingPoints,[]);
  assert.match(got.explanation,/εκπαιδευτή/);
  assert.match(got.safetyNote,/Εκκρεμεί/);
 });
 test(id+': the guard does not reject the correct/negated phrasing based on mere lexical overlap',()=>{
  const got=guardHighRiskFullCredit({id},safe,grade);
  assert.equal(got.verdict,'correct');
  assert.deepEqual(got,grade);
 });
 test(id+': guard cannot change a partial/incorrect/uncertain verdict, even on a concerning phrase',()=>{
  for(const verdict of ['partial','incorrect','uncertain']){
   const original={...grade,verdict};
   assert.equal(guardHighRiskFullCredit({id},unsafe,original),original);
  }
 });
}
test('the answer guard does not invent safety conclusions for unrelated questions',()=>{
 for(const [id,unsafe] of contradictions){
  assert.equal(guardHighRiskFullCredit({id:id+'-unknown'},unsafe,grade),grade);
 }
 assert.equal(guardHighRiskFullCredit({id:'EOP-A-001'},'δεν υγραίνει',grade),grade);
});
test('ambiguous negated strings do not become incorrect automatically',()=>{
 const raw={...grade,verdict:'correct'};
 const result=guardHighRiskFullCredit({id:'saek-16-10'},'Κάνω αυτό που δεν πρέπει: βάζουμε κουτάλι στο στόμα.',raw);
 // At most: original full-credit result or abstention. Never a falsely assertive incorrect.
 assert.ok(['correct','uncertain'].includes(result.verdict));
 assert.notEqual(result.verdict,'incorrect');
});
test('a substantive missing point remains partial despite a side note about spelling',()=>{
 const withClinicalEvidence={...grade,verdict:'partial',
  explanation:'Η απάντηση έχει ορθογραφικά, αλλά περιλαμβάνει μόνο θέρμανση και καθαρισμό.',
  correctPoints:['Καθαρισμός'],missingPoints:['Λείπει η αναφορά στην όσφρηση']};
 assert.equal(cautiouslyCheckGrade(withClinicalEvidence).verdict,'partial');
 const grammarOnly={...withClinicalEvidence,missingPoints:['Έχει λάθη ορθογραφίας']};
 assert.equal(cautiouslyCheckGrade(grammarOnly).verdict,'uncertain');
});

test('source-controlled exact references and 250 matching spelling variants never trigger an unsupported safety abstention',()=>{
 const corpus=JSON.parse(readFileSync(new URL('./greek-answer-fixtures.json',import.meta.url),'utf8'));
 const additions=corpus.cases.filter(x=>x.id.startsWith('milestone800-'));
 assert.equal(additions.length,500);
 for(const item of additions){
  assert.equal(guardHighRiskFullCredit({id:item.questionId},item.answer,grade).verdict,'correct',
   'False alert on original reference or equivalent accent-less form: '+item.id);
 }
});
