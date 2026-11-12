/** ΕΚΑΒ Σπουδή — εργαστήριο Ζωτικών Σημείων: μόνο συνθετικά εκπαιδευτικά φύλλα.
 * Δεν μετρά πραγματικό ασθενή, δεν παράγει διάγνωση ή οδηγία θεραπείας.
 * Χωρίς αποθήκευση ή δεύτερο μηχανισμό προόδου.
 */
const freezeRows=rows=>Object.freeze(rows.map(row=>Object.freeze({...row})));
export const TOPICS=freezeRows([
 {id:'pulse',name:'Σφυγμός',hint:'Μέτρηση και καταγραφή καρδιακής συχνότητας',chapter:'saek-course-05.html#lesson-11'},
 {id:'bp',name:'Αρτηριακή πίεση',hint:'Σωστή τεχνική και σφάλματα μέτρησης',chapter:'saek-course-05.html#lesson-11'},
 {id:'resp',name:'Αναπνοές',hint:'Καταμέτρηση αναπνευστικής συχνότητας',chapter:'saek-course-05.html#lesson-8'},
 {id:'spo2',name:'Παλμική οξυμετρία',hint:'Τιμή και αξιοπιστία σήματος',chapter:'saek-course-10.html#lesson-9'},
 {id:'temp',name:'Θερμοκρασία',hint:'Μονάδες και μέθοδος μέτρησης',chapter:'saek-course-05.html#lesson-11'},
 {id:'conscious',name:'Επίπεδο συνείδησης',hint:'Καταγραφή ανταπόκρισης με AVPU',chapter:'saek-course-05.html#lesson-10'},
 {id:'trend',name:'Επανεκτίμηση & παράδοση',hint:'Σύγκριση τιμών με ακριβή χρόνο',chapter:'saek-course-19.html#lesson-8'}
]);
export const SOURCES=freezeRows([
 {name:'American Heart Association — σωστή μέτρηση αρτηριακής πίεσης',url:'https://www.heart.org/en/health-topics/high-blood-pressure/understanding-blood-pressure-readings/monitoring-your-blood-pressure-at-home'},
 {name:'FDA — περιορισμοί παλμικής οξυμετρίας',url:'https://www.fda.gov/medical-devices/products-and-medical-procedures/pulse-oximeters'},
 {name:'MedlinePlus — ζωτικά σημεία',url:'https://medlineplus.gov/ency/article/002341.htm'}
]);
// Αριθμοί επινοημένοι αποκλειστικά για εξάσκηση καταγραφής, χωρίς κλινικό συμπέρασμα.
export const EXAMPLES=Object.freeze([
 {id:'stable',label:'Φύλλο Α · δύο μετρήσεις',note:'Συνθετικά δεδομένα με ελεγχόμενη ποιότητα σήματος',
  records:freezeRows([
   {time:'09:00',pulse:78,bp:'118/76',resp:16,spo2:98,temp:'36,8',conscious:'A',spo2Reliable:true},
   {time:'09:10',pulse:82,bp:'120/78',resp:18,spo2:98,temp:'36,8',conscious:'A',spo2Reliable:true}
  ])},
 {id:'artefact',label:'Φύλλο Β · αμφίβολο σήμα',note:'Δηλωμένο τεχνικό πρόβλημα με τον αισθητήρα SpO₂',
  records:freezeRows([
   {time:'11:20',pulse:88,bp:'126/80',resp:18,spo2:97,temp:'36,9',conscious:'A',spo2Reliable:true},
   {time:'11:25',pulse:90,bp:'124/80',resp:19,spo2:86,temp:'36,9',conscious:'A',spo2Reliable:false}
  ])},
 {id:'change',label:'Φύλλο Γ · μεταβολή τιμών',note:'Συνθετική μεταβολή που χρειάζεται ακριβή, αντικειμενική αναφορά',
  records:freezeRows([
   {time:'14:00',pulse:96,bp:'110/72',resp:20,spo2:96,temp:'37,1',conscious:'A',spo2Reliable:true},
   {time:'14:12',pulse:112,bp:'100/68',resp:26,spo2:94,temp:'37,1',conscious:'V',spo2Reliable:true}
  ])}
]);
export const STRIPS=Object.freeze({
 pulse:freezeRows([{id:'p1',beats:19,seconds:15},{id:'p2',beats:22,seconds:15},{id:'p3',beats:16,seconds:15}]),
 resp:freezeRows([{id:'r1',beats:8,seconds:30},{id:'r2',beats:11,seconds:30},{id:'r3',beats:7,seconds:30}])
});
export function ratePerMinute(beats,seconds){
 if(!Number.isInteger(beats)||beats<0||beats>150||!Number.isInteger(seconds)||seconds<1||seconds>60)throw RangeError('invalid-count');
 return Math.round(beats*60/seconds);
}
export function getExample(id){return EXAMPLES.find(x=>x.id===id)||null}
export function getTopic(id){return TOPICS.find(x=>x.id===id)||null}
export function changesFor(example){
 if(!example||!Array.isArray(example.records)||example.records.length<2)throw TypeError('invalid-records');
 const [a,b]=[example.records[0],example.records.at(-1)];
 return Object.freeze({
  pulse:b.pulse-a.pulse,resp:b.resp-a.resp,
  bp:a.bp+' → '+b.bp,
  spo2:(a.spo2Reliable&&b.spo2Reliable)?b.spo2-a.spo2:null,
  times:[a.time,b.time],
  needSignalCheck:!b.spo2Reliable
 });
}
export function handoverText(example){
 const rows=example.records;
 return [
  'ΕΚΠΑΙΔΕΥΤΙΚΟ ΠΑΡΑΔΕΙΓΜΑ — όχι πραγματική παράδοση ασθενούς',
  'Καταγραφή παρατηρήσεων χωρίς διάγνωση:',
  ...rows.map(r=>r.time+': σφυγμός '+r.pulse+'/min, ΑΠ '+r.bp+' mmHg, αναπνοές '+r.resp+'/min, SpO₂ '+r.spo2+'%'+(!r.spo2Reliable?' (σήμα μη αξιόπιστο)':'')+', θερμοκρασία '+r.temp+' °C, ανταπόκριση AVPU '+r.conscious+'.'),
  'Επικοινωνία: επιβεβαίωση των πραγματικών ευρημάτων και επανεκτίμηση σύμφωνα με την εκπαίδευση/ισχύοντα πρωτόκολλα.'
 ].join('\n');
}
// Ερωτήσεις τεχνικής και τεκμηρίωσης, όχι κλινικής διαλογής ή θεραπείας.
export const QUESTIONS=freezeRows([
 {id:'bp-cuff',topic:'bp',question:'Ποιο στοιχείο μειώνει τον κίνδυνο σφάλματος ΑΠ;',choices:['Περιχειρίδα πάνω από ρούχα','Κατάλληλο μέγεθος περιχειρίδας','Βραχίονας χωρίς στήριξη'],correct:1,explain:'Επιλογή κατάλληλου μεγέθους και στήριξη βραχίονα στο ύψος καρδιάς.'},
 {id:'bp-position',topic:'bp',question:'Κατά τη μέτρηση ΑΠ σε καθιστό άτομο, τι είναι σωστό;',choices:['Βραχίονας στο ύψος της καρδιάς','Ομιλία κατά τη μέτρηση','Σταυρωμένα πόδια'],correct:0,explain:'Σωστή θέση, υποστήριξη και απουσία ομιλίας συμβάλλουν στην αξιοπιστία.'},
 {id:'spo2-artefact',topic:'spo2',question:'Το οξύμετρο δείχνει 86% με δηλωμένο κακό σήμα. Τι τεκμηριώνουμε;',choices:['Βέβαιη υποξαιμία μόνο από το νούμερο','Την ένδειξη και ότι το σήμα είναι αμφίβολο','Ότι η συσκευή πάντα έχει δίκιο'],correct:1,explain:'Το SpO₂ είναι εκτίμηση. Κακή αιμάτωση, κίνηση, χρώμα/πάχος δέρματος και άλλοι παράγοντες επηρεάζουν την αξιοπιστία. Δεν βασιζόμαστε μόνο στην ένδειξη.'},
 {id:'spo2-data',topic:'spo2',question:'Τι πρέπει να συνοδεύει μια αμφίβολη ένδειξη οξυμέτρου;',choices:['Απόκρυψη ένδειξης','Καταγραφή περιορισμού και έλεγχος ποιότητας','Αυτόματη κλινική διάγνωση'],correct:1,explain:'Καταγράφουμε την ποιότητα σήματος και ερμηνεύουμε στο συνολικό πλαίσιο.'},
 {id:'temp-method',topic:'temp',question:'Ποιο στοιχείο είναι χρήσιμο όταν αναφέρουμε θερμοκρασία;',choices:['Μόνο ένας αριθμός','Μονάδα και θέση/μέθοδος μέτρησης','Μόνο η ώρα'],correct:1,explain:'Η μέθοδος, η μονάδα και ο χρόνος είναι χρήσιμες πληροφορίες.'},
 {id:'temp-unit',topic:'temp',question:'Πώς γράφεται πληρέστερα μια εκπαιδευτική θερμομέτρηση;',choices:['37','37 °C, με αναφορά μεθόδου και ώρας','Φυσιολογικό χωρίς αριθμό'],correct:1,explain:'Ακριβείς μονάδες και μεταδεδομένα προλαμβάνουν ασάφειες.'},
 {id:'avpu-a',topic:'conscious',question:'Το A της AVPU συμβολίζει:',choices:['Εγρήγορση/ανταπόκριση χωρίς διέγερση (Alert)','Ανταπόκριση μόνο σε πόνο','Καμία ανταπόκριση'],correct:0,explain:'Το A είναι Alert. Το AVPU περιγράφει επίπεδο ανταπόκρισης, όχι διάγνωση.'},
 {id:'avpu-v',topic:'conscious',question:'Το V της AVPU συμβολίζει:',choices:['Οπτική οξύτητα','Ανταπόκριση σε φωνητικό ερέθισμα','Αρτηριακή πίεση'],correct:1,explain:'Το V είναι ανταπόκριση σε φωνητικό ερέθισμα.'},
 {id:'trend-time',topic:'trend',question:'Ποια παρουσίαση είναι καταλληλότερη για επανεκτίμηση;',choices:['Μόνο η τελευταία τιμή','Τιμές με τις ώρες μέτρησης','Αυθαίρετη διάγνωση'],correct:1,explain:'Η καταγραφή χρόνου επιτρέπει σωστή σύγκριση μεταβολών.'},
 {id:'trend-artefact',topic:'trend',question:'Τι γίνεται με την αμφίβολη ένδειξη SpO₂ σε μία παράδοση;',choices:['Αναφέρεται με σαφή σημείωση αξιοπιστίας','Παρουσιάζεται ως βέβαιο εύρημα','Διορθώνεται αυθαίρετα'],correct:0,explain:'Δεν αποκρύπτουμε αβεβαιότητα ούτε δημιουργούμε ψευδή βεβαιότητα.'},
 {id:'pulse-calc',topic:'pulse',question:'Μέτρησες 20 παλμούς σε 15 δευτερόλεπτα. Πόσοι παλμοί/min υπολογίζονται;',choices:['60','80','100'],correct:1,explain:'20 × (60/15) = 80/min. Η αριθμητική άσκηση δεν υποκαθιστά πραγματική μέτρηση.'},
 {id:'resp-calc',topic:'resp',question:'Μετρήθηκαν 8 αναπνοές σε 30 δευτερόλεπτα. Ποια είναι η συχνότητα;',choices:['8/min','16/min','30/min'],correct:1,explain:'8 × (60/30) = 16/min. Πρόκειται για εκπαιδευτικό παράδειγμα.'}
]);
export function grade(questionId,index){
 const item=QUESTIONS.find(q=>q.id===questionId);
 if(!item||!Number.isInteger(index)||index<0||index>=item.choices.length)throw RangeError('invalid-answer');
 return Object.freeze({correct:index===item.correct,explain:item.explain});
}
export function topicQuestions(topic){return QUESTIONS.filter(q=>q.topic===topic)}


/** Observational classification only — no instructions to apply painful stimuli. */
export const AVPU_EXERCISES=freezeRows([
 {id:'alert',observation:'Το άτομο έχει τα μάτια ανοιχτά και ανταποκρίνεται αυθόρμητα, χωρίς πρόσθετο ερέθισμα.',correct:'A',explain:'A = Alert: αυθόρμητη εγρήγορση και ανταπόκριση.'},
 {id:'voice',observation:'Δεν παρατηρείται αυθόρμητη ανταπόκριση αλλά υπάρχει απόκριση όταν του απευθύνουν τον λόγο.',correct:'V',explain:'V = Voice: ανταπόκριση σε φωνητικό ερέθισμα.'},
 {id:'pain',observation:'Η ήδη τεκμηριωμένη κλινική παρατήρηση αναφέρει ανταπόκριση μόνο σε επώδυνο ερέθισμα.',correct:'P',explain:'P = Pain: η κατηγορία περιγράφει καταγεγραμμένη ανταπόκριση. Η ψηφιακή άσκηση δεν διδάσκει εφαρμογή επώδυνων ερεθισμάτων.'},
 {id:'unresponsive',observation:'Η ήδη τεκμηριωμένη εκτίμηση δεν κατέγραψε ανταπόκριση σε κανένα από τα εξετασθέντα ερεθίσματα.',correct:'U',explain:'U = Unresponsive: δεν έχει διαπιστωθεί ανταπόκριση. Το AVPU είναι περιγραφική κλίμακα, όχι διάγνωση.'}
]);
export function gradeAvpu(id,answer){
 const item=AVPU_EXERCISES.find(x=>x.id===id);
 if(!item||!['A','V','P','U'].includes(answer))throw RangeError('invalid-avpu-answer');
 return Object.freeze({correct:item.correct===answer,explain:item.explain});
}
/** Grade a comparison strictly on timestamped synthetic facts, not clinical severity. */
export function gradeTrend(example,pulseDelta,respDelta,qualityFlag){
 if(typeof qualityFlag!=='boolean'||!Number.isInteger(pulseDelta)||!Number.isInteger(respDelta))throw TypeError('invalid-trend-answer');
 const changes=changesFor(example);
 const correct=pulseDelta===changes.pulse&&respDelta===changes.resp&&qualityFlag===changes.needSignalCheck;
 return Object.freeze({correct,expectedPulse:changes.pulse,expectedResp:changes.resp,needSignalCheck:changes.needSignalCheck});
}
/** A missing device method is an unknown fact: never invent it from a reading. */
export function annotateTemperature(example,method){
 if(!example||!Array.isArray(example.records)||!example.records.length||!['unknown','axillary','tympanic','oral'].includes(method))throw RangeError('invalid-temperature-method');
 const row=example.records[0];
 return Object.freeze({correct:method==='unknown',text:row.time+' · '+row.temp+' °C · μέθοδος: '+(method==='unknown'?'δεν έχει καταγραφεί':'ΔΕΝ ΕΠΙΒΕΒΑΙΩΘΗΚΕ'),explain:'Η συνθετική καταγραφή περιέχει αριθμό και ώρα, αλλά όχι μέθοδο. Δεν επιτρέπεται να συμπληρώσουμε μη τεκμηριωμένη πληροφορία.'});
}
