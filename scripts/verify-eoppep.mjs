// Στατικός έλεγχος δομής και βιβλιογραφικών στοιχείων ΕΟΠΠΕΠ.
// Δεν πιστοποιεί την επιστημονική/ιατρική ορθότητα ή την ισχύ των εξωτερικών πηγών.
import {readFileSync} from 'node:fs';

const text=readFileSync(new URL('../official_questions.json',import.meta.url),'utf8');
const questions=JSON.parse(text);
const errors=[],warnings=[];
if(!Array.isArray(questions)||questions.length!==314)errors.push('Απαιτούνται 314 θέματα.');
const seen=new Set();
const totals={A:0,B:0};
let withReference=0,reviewNotes=0,withAnswers=0;
for(const [i,q] of questions.entries()){
 if(!q||typeof q!=='object'){errors.push('Μη έγκυρο αντικείμενο στην εγγραφή '+i);continue;}
 if(!['A','B'].includes(q.group)){errors.push('Μη έγκυρη ομάδα: '+q.id);continue;}
 totals[q.group]++;
 const expected='EOP-'+q.group+'-'+String(q.number).padStart(3,'0');
 if(q.id!==expected)errors.push('Ασυμφωνία αρίθμησης: '+q.id+' / '+expected);
 if(seen.has(q.id))errors.push('Διπλό ID: '+q.id);seen.add(q.id);
 if(typeof q.question!=='string'||!q.question.trim())errors.push('Κενή εκφώνηση: '+q.id);
 if(typeof q.answer==='string'&&q.answer.trim())withAnswers++;
 else errors.push('Κενή εκπαιδευτική απάντηση: '+q.id);
 if(q.sourceUrl&&q.sourceLocation){
   try{const u=new URL(q.sourceUrl);if(u.protocol!=='https:')throw new Error('not HTTPS');withReference++;}
   catch {errors.push('Πηγή μη έγκυρου URL: '+q.id);}
 }else errors.push('Χωρίς στοιχειώδη βιβλιογραφική αναφορά: '+q.id);
 if(typeof q.sourceChecked==='string'&&q.sourceChecked.trim())reviewNotes++;
}
if(totals.A!==105||totals.B!==209)errors.push('Ασυμφωνία ομάδων: '+JSON.stringify(totals));
for(const [g,n] of [['A',105],['B',209]])for(let i=1;i<=n;i++){
 if(!seen.has('EOP-'+g+'-'+String(i).padStart(3,'0')))errors.push('Λείπει '+g+'-'+i);
}
const app=readFileSync(new URL('../app.js',import.meta.url),'utf8');
const index=readFileSync(new URL('../index.html',import.meta.url),'utf8');
if(!app.includes('Καταγεγραμμένος έλεγχος πηγής'))errors.push('Απαιτείται ακριβής σήμανση πηγών στον αναγνώστη.');
if(/70 θέματα διατηρούν/.test(index)||/Άμεση διασταύρωση \(8\)/.test(index))errors.push('Παρωχημένο πλήθος στην αρχική σελίδα.');
if(!index.includes('ιδιο') && !index.includes('επίσημο λυσάρι'))warnings.push('Ελέγξτε την αποποίηση ευθύνης στην αρχική.');
console.log('ΕΟΠΠΕΠ: '+questions.length+' ερωτήσεις · '+totals.A+' γενικές · '+totals.B+' ειδικές.');
console.log('Απαντήσεις: '+withAnswers+' · δηλωμένες βιβλιογραφικές παραπομπές: '+withReference+' · σημειώσεις ελέγχου πηγής: '+reviewNotes+'.');
console.log('Προσοχή: οι '+(withReference-reviewNotes)+' υπόλοιπες βιβλιογραφικές αναφορές δεν έχουν ξεχωριστή καταγραφή αντιπαραβολής με συγκεκριμένο σημείο πηγής. Ούτε οι '+reviewNotes+' σημειώσεις αποτελούν αυτομάτως ανεξάρτητη επιστημονική πιστοποίηση.');
if(warnings.length)console.warn(warnings.join('\n'));
if(errors.length){console.error(errors.join('\n'));process.exitCode=1;}
else console.log('✅ Στατικός έλεγχος ΕΟΠΠΕΠ ολοκληρώθηκε. Δεν αποτελεί κλινική/επιστημονική πιστοποίηση.');
