/**
 * Εργαστήριο Επικοινωνίας & Παράδοσης: δεδομένα και αξιολόγηση. Καθαρές συναρτήσεις, χωρίς DOM.
 * Τα περιστατικά είναι πλήρως επινοημένα (συνθετικά). Κάθε άσκηση έχει μία ελέγξιμη σωστή απάντηση
 * και αιτιολόγηση από την ύλη: ΣΑΕΚ 07 (κλειστός κύκλος, χρόνοι), 08 (τεκμηρίωση), 13 (ΤΕΠ πριν την άφιξη),
 * 18 (MIST, άγνωστα ως άγνωστα), 19–20 (παράδοση, μεταβίβαση ευθύνης), Οδηγός ΕΟΠΠΕΠ Ε6 (SBAR, ATMIST).
 * Δεν βαθμολογεί επίσημα, δεν αποθηκεύει και δεν πιστοποιεί πρακτική επάρκεια.
 */
const freeze=rows=>Object.freeze(rows.map(r=>Object.freeze(r)));

export const TOPICS=freeze([
 {id:'capture',title:'Λήψη στοιχείων',goal:'Ακριβής καταγραφή παρατηρήσεων και χρόνων από την αφήγηση.'},
 {id:'dispatch',title:'Επικοινωνία με Κέντρο',goal:'Κλειστός κύκλος: επανάληψη των κρίσιμων στοιχείων και επιβεβαίωση.'},
 {id:'prealert',title:'Ενημέρωση ΤΕΠ',goal:'Σύντομη προαναγγελία μόνο με ουσιαστικές, επιβεβαιωμένες πληροφορίες.'},
 {id:'structure',title:'SBAR / ATMIST / MIST',goal:'Κάθε πληροφορία στη σωστή θέση της δομής· οι εικασίες μένουν έξω.'},
 {id:'record',title:'Καταγραφή',goal:'Ζωτικά σημεία με ώρα και αντικειμενική περιγραφή της μεταβολής.'},
 {id:'transfer',title:'Μεταβίβαση ευθύνης',goal:'Σωστή σειρά παράδοσης και επιβεβαίωση παραλαβής.'}
]);

export const SOURCES=freeze([
 {topic:'capture',label:'ΣΑΕΚ 07 · Καταγραφή χρόνων και μεταβολών',href:'saek-course-07.html#lesson-10'},
 {topic:'capture',label:'ΣΑΕΚ 18 · Παράδοση πολυτραυματία (μάρτυρες ≠ επιβεβαιωμένα ευρήματα)',href:'saek-course-18.html#lesson-12'},
 {topic:'dispatch',label:'ΣΑΕΚ 07 · Κλειστός κύκλος επικοινωνίας',href:'saek-course-07.html#lesson-9'},
 {topic:'prealert',label:'ΣΑΕΚ 13 · Επικοινωνία με ΤΕΠ πριν την άφιξη',href:'saek-course-13.html#lesson-11'},
 {topic:'structure',label:'Οδηγός ΕΟΠΠΕΠ · Ε6 Ομάδα και συνεργασία (SBAR, ATMIST)',href:'diasostis.html#page-69'},
 {topic:'structure',label:'ΣΑΕΚ 18 · MIST στην παράδοση πολυτραυματία',href:'saek-course-18.html#lesson-12'},
 {topic:'record',label:'ΣΑΕΚ 08 · Καλή πρακτική τεκμηρίωσης',href:'saek-course-08.html#lesson-11'},
 {topic:'record',label:'ΣΑΕΚ 19 · Αναφορές και καταγραφή διακομιδής',href:'saek-course-19.html#lesson-13'},
 {topic:'transfer',label:'ΣΑΕΚ 19 · Ασφαλής παράδοση και μεταβίβαση ευθύνης',href:'saek-course-19.html#lesson-12'},
 {topic:'transfer',label:'ΣΑΕΚ 20 · Παράδοση από ασθενοφόρο σε ΤΕΠ',href:'saek-course-20.html#lesson-7'}
]);

/** Θέσεις της δομής ATMIST (Οδηγός ΕΟΠΠΕΠ Ε6) και η επιλογή «δεν μπαίνει». */
export const ATMIST=freeze([
 {id:'A',label:'A · Ηλικία (Age)'},
 {id:'Ti',label:'T · Χρόνος (Time)'},
 {id:'M',label:'M · Μηχανισμός / ενόχληση'},
 {id:'I',label:'I · Κακώσεις / πληροφορίες'},
 {id:'S',label:'S · Σημεία (ζωτικά, ευρήματα)'},
 {id:'Tr',label:'T · Θεραπεία / ενέργειες'},
 {id:'out',label:'Δεν μπαίνει στην παράδοση'}
]);

export const CASES=Object.freeze([
 Object.freeze({
  id:'fall',title:'Περιστατικό Α · Πτώση από σκάλα (συνθετικό)',
  narrative:freeze([
   {t:'09:40',text:'Σύμφωνα με τον γείτονα, ο άνδρας έπεσε από σκάλα περίπου 2 μέτρων στην αυλή.'},
   {t:'09:46',text:'Κλήση στο Κέντρο από τον γείτονα.'},
   {t:'10:01',text:'Άφιξη πληρώματος. Ο ασθενής, 67 ετών, μιλά και παραπονιέται για πόνο στο αριστερό ισχίο.'},
   {t:'10:04',text:'Πρώτη μέτρηση: σφυγμός 96/min, αναπνοές 20/min, ΑΠ 142/86 mmHg, SpO₂ 96%, AVPU: A.'},
   {t:'10:06',text:'Παραμόρφωση και βράχυνση αριστερού κάτω άκρου. Ο ασθενής δεν θυμάται αν χτύπησε το κεφάλι.'},
   {t:'10:12',text:'Ακινητοποίηση κάτω άκρου και τοποθέτηση σε φορείο.'},
   {t:'10:20',text:'Δεύτερη μέτρηση: σφυγμός 108/min, αναπνοές 22/min, ΑΠ 128/80 mmHg, SpO₂ 96%, AVPU: A.'},
   {t:'10:22',text:'Η σύζυγος λέει ότι «σίγουρα έσπασε το πόδι του, όπως και πέρσι ο αδερφός του».'}
  ]),
  capture:freeze([
   {id:'onset',label:'Ώρα συμβάντος (κατά τον μάρτυρα)',kind:'time',answer:'09:40'},
   {id:'call',label:'Ώρα κλήσης',kind:'time',answer:'09:46'},
   {id:'arrival',label:'Ώρα άφιξης πληρώματος',kind:'time',answer:'10:01'},
   {id:'age',label:'Ηλικία ασθενούς',kind:'number',answer:'67'},
   {id:'head',label:'Χτύπημα στο κεφάλι;',kind:'choice',options:['Ναι','Όχι','Άγνωστο'],answer:'Άγνωστο',
    why:'Ο ασθενής δεν θυμάται: καταγράφεται ως άγνωστο, όχι ως «όχι» (ΣΑΕΚ 18).'}
  ]),
  statements:freeze([
   {id:'s1',text:'Άνδρας 67 ετών.',slot:'A',prealert:true},
   {id:'s2',text:'Πτώση περίπου στις 09:40 (κατά τον μάρτυρα).',slot:'Ti',prealert:true},
   {id:'s3',text:'Πτώση από σκάλα περίπου 2 μέτρων.',slot:'M',prealert:true},
   {id:'s4',text:'Παραμόρφωση και βράχυνση αριστερού κάτω άκρου· άγνωστο αν χτύπησε το κεφάλι.',slot:'I',prealert:true},
   {id:'s5',text:'10:20: σφυγμός 108/min, ΑΠ 128/80 mmHg, SpO₂ 96%, AVPU A.',slot:'S',prealert:true},
   {id:'s6',text:'Ακινητοποίηση κάτω άκρου στις 10:12.',slot:'Tr',prealert:true},
   {id:'s7',text:'«Σίγουρα έσπασε το πόδι του» (σύζυγος).',slot:'out',prealert:false,why:'Εικασία συγγενούς, όχι εύρημα: δεν παρουσιάζεται ως διάγνωση.'},
   {id:'s8',text:'Πέρσι ο αδερφός του είχε κάταγμα.',slot:'out',prealert:false,why:'Άσχετο με τον ασθενή.'}
  ]),
  vitals:freeze([
   {time:'10:04',hr:96,rr:20,bp:'142/86',spo2:96,avpu:'A'},
   {time:'10:20',hr:108,rr:22,bp:'128/80',spo2:96,avpu:'A'}
  ]),
  // Ποια τιμή άλλαξε περισσότερο προς τα πάνω, ως αντικειμενική περιγραφή (όχι διάγνωση).
  trend:{question:'Ποια περιγραφή της μεταβολής 10:04 → 10:20 είναι ακριβής και αντικειμενική;',
   options:['Ο σφυγμός αυξήθηκε από 96 σε 108/min και η συστολική ΑΠ μειώθηκε από 142 σε 128 mmHg.',
    'Ο ασθενής έχει αιμορραγικό σοκ.','Όλα τα ζωτικά παρέμειναν ίδια.','Η SpO₂ έπεσε στο 90%.'],answer:0,
   why:'Περιγράφουμε τι μετρήθηκε και πότε. Η διάγνωση δεν προκύπτει από δύο εκπαιδευτικές τιμές (ΣΑΕΚ 19).'},
  dispatch:{message:'Ασθενοφόρο 12: νέα διεύθυνση Αγίου Νικολάου 18, Νέα Σμύρνη, πίσω αυλή, ένας τραυματίας.',
   critical:[{label:'Όχημα 12',any:['12']},{label:'Αγίου Νικολάου',any:['αγιου νικολαου']},{label:'Αριθμός 18',any:['18']},
    {label:'Νέα Σμύρνη',any:['νεα σμυρνη']},{label:'Πίσω αυλή',any:['αυλη']},{label:'Ένας τραυματίας',any:['ενασ','ενα','1']}],
   hint:'Επανάλαβε όλα τα κρίσιμα στοιχεία: όχημα, οδό, αριθμό, περιοχή, σημείο και αριθμό ασθενών.'}
 }),
 Object.freeze({
  id:'breath',title:'Περιστατικό Β · Δύσπνοια στο σπίτι (συνθετικό)',
  narrative:freeze([
   {t:'21:10',text:'Η ασθενής αναφέρει ότι η δύσπνοια ξεκίνησε σταδιακά μετά τις 20:30.'},
   {t:'21:15',text:'Κλήση στο Κέντρο από την κόρη της.'},
   {t:'21:31',text:'Άφιξη πληρώματος. Γυναίκα 74 ετών, κάθεται όρθια και μιλά με σύντομες φράσεις.'},
   {t:'21:34',text:'Πρώτη μέτρηση: σφυγμός 104/min, αναπνοές 26/min, ΑΠ 150/90 mmHg, SpO₂ 89%, AVPU: A.'},
   {t:'21:36',text:'Χορήγηση οξυγόνου σύμφωνα με το πρωτόκολλο της υπηρεσίας.'},
   {t:'21:50',text:'Δεύτερη μέτρηση: σφυγμός 98/min, αναπνοές 22/min, ΑΠ 146/88 mmHg, SpO₂ 93%, AVPU: A.'},
   {t:'21:52',text:'Η κόρη πιστεύει ότι «είναι πάλι η καρδιά της». Η ασθενής δεν γνωρίζει τι φάρμακα παίρνει.'}
  ]),
  capture:freeze([
   {id:'onset',label:'Έναρξη δύσπνοιας (κατά την ασθενή, μετά τις)',kind:'time',answer:'20:30'},
   {id:'call',label:'Ώρα κλήσης',kind:'time',answer:'21:15'},
   {id:'arrival',label:'Ώρα άφιξης πληρώματος',kind:'time',answer:'21:31'},
   {id:'age',label:'Ηλικία ασθενούς',kind:'number',answer:'74'},
   {id:'meds',label:'Φάρμακα που λαμβάνει',kind:'choice',options:['Καρδιολογικά','Κανένα','Άγνωστα'],answer:'Άγνωστα',
    why:'Η ασθενής δεν τα γνωρίζει: «άγνωστα», όχι «κανένα» (ΣΑΕΚ 18).'}
  ]),
  statements:freeze([
   {id:'b1',text:'Γυναίκα 74 ετών.',slot:'A',prealert:true},
   {id:'b2',text:'Δύσπνοια από τις 20:30 περίπου, σταδιακή έναρξη.',slot:'Ti',prealert:true},
   {id:'b3',text:'Κύρια ενόχληση: δύσπνοια, μιλά με σύντομες φράσεις.',slot:'M',prealert:true},
   {id:'b4',text:'Φάρμακα άγνωστα.',slot:'I',prealert:true},
   {id:'b5',text:'21:50: αναπνοές 22/min, SpO₂ 93% με οξυγόνο, ΑΠ 146/88 mmHg.',slot:'S',prealert:true},
   {id:'b6',text:'Οξυγόνο από τις 21:36, με βελτίωση της SpO₂ από 89% σε 93%.',slot:'Tr',prealert:true},
   {id:'b7',text:'«Είναι πάλι η καρδιά της» (κόρη).',slot:'out',prealert:false,why:'Εκτίμηση συγγενούς, όχι επιβεβαιωμένη πληροφορία.'},
   {id:'b8',text:'Η ασθενής έχει καρδιακή ανεπάρκεια.',slot:'out',prealert:false,why:'Διάγνωση που δεν τεκμηριώνεται από τα διαθέσιμα στοιχεία.'}
  ]),
  vitals:freeze([
   {time:'21:34',hr:104,rr:26,bp:'150/90',spo2:89,avpu:'A'},
   {time:'21:50',hr:98,rr:22,bp:'146/88',spo2:93,avpu:'A'}
  ]),
  trend:{question:'Ποια περιγραφή της μεταβολής 21:34 → 21:50 είναι ακριβής και αντικειμενική;',
   options:['Η SpO₂ αυξήθηκε από 89% σε 93% και οι αναπνοές μειώθηκαν από 26 σε 22/min μετά το οξυγόνο.',
    'Η ασθενής θεραπεύτηκε.','Ο σφυγμός αυξήθηκε σε 110/min.','Δεν υπήρξε καμία μεταβολή.'],answer:0,
   why:'Αναφέρουμε τιμές, ώρες και τη σχέση με την παρέμβαση, χωρίς να υπερβάλλουμε (ΣΑΕΚ 19).'},
  dispatch:{message:'Ασθενοφόρο 7: η ασθενής είναι στον 3ο όροφο, Λεωφόρος Συγγρού 205, χωρίς ανελκυστήρα.',
   critical:[{label:'Όχημα 7',any:['7']},{label:'3ος όροφος',any:['3','3οσ','3ο','τριτοσ','τριτο']},{label:'Λεωφόρος Συγγρού',any:['συγγρου']},
    {label:'Αριθμός 205',any:['205']},{label:'Χωρίς ανελκυστήρα',any:['ανελκυστηρα','ασανσερ']}],
   hint:'Επανάλαβε όχημα, όροφο, οδό, αριθμό και το στοιχείο πρόσβασης (ανελκυστήρας).'}
 })
]);

/** Η σωστή σειρά κλειστού κύκλου (ΣΑΕΚ 07). */
export const CLOSED_LOOP=freeze([
 {id:'send',text:'Ο αποστολέας δίνει το μήνυμα με σαφήνεια.'},
 {id:'readback',text:'Ο αποδέκτης επαναλαμβάνει τα κρίσιμα στοιχεία.'},
 {id:'confirm',text:'Ο αποστολέας επιβεβαιώνει ή διορθώνει.'}
]);

/** Η σωστή σειρά παράδοσης στο ΤΕΠ (ΣΑΕΚ 19–20). */
export const TRANSFER_STEPS=freeze([
 {id:'identify',text:'Ταυτοποίηση του αρμόδιου παραλήπτη και του ασθενούς.'},
 {id:'structured',text:'Δομημένη προφορική παράδοση (π.χ. ATMIST) χωρίς διακοπές.'},
 {id:'questions',text:'Ερωτήσεις του παραλήπτη και διευκρινίσεις.'},
 {id:'documents',text:'Παράδοση γραπτής καταγραφής και αντικειμένων του ασθενούς.'},
 {id:'acknowledge',text:'Ρητή επιβεβαίωση παραλαβής: η ευθύνη μεταβιβάζεται.'}
]);
export const TRANSFER_FLAW={
 transcript:['«Γεια σας, φέραμε τον κύριο από την πτώση.»','«Άνδρας 67 ετών, πτώση στις 09:40, παραμόρφωση αριστερού κάτω άκρου, τελευταία ζωτικά στις 10:20…»','«Ορίστε το φύλλο καταγραφής.»','Το πλήρωμα αποχωρεί ενώ ο νοσηλευτής απασχολείται με άλλον ασθενή.'],
 options:['Λείπει η ρητή επιβεβαίωση παραλαβής από αρμόδιο παραλήπτη.','Λείπει η ηλικία.','Λείπει η ώρα του συμβάντος.','Δεν λείπει τίποτα.'],answer:0,
 why:'Η ευθύνη μεταβιβάζεται μόνο όταν ο αρμόδιος παραλήπτης επιβεβαιώσει την παραλαβή (ΣΑΕΚ 19, κεφ. 12).'
};

export function getCase(id){return CASES.find(c=>c.id===id)||null}
export function getTopic(id){return TOPICS.find(t=>t.id===id)||null}
export function topicSources(topic){return SOURCES.filter(s=>s.topic===topic)}

/** Ελληνικό κείμενο χωρίς τόνους, πεζά, ενιαίο σίγμα: για σύγκριση απαντήσεων. */
export const norm=s=>String(s??'').normalize('NFD').replace(/[̀-ͯ]/g,'').toLocaleLowerCase('el').replace(/ς/g,'σ').replace(/\s+/g,' ').trim();
const timeOf=s=>{const m=String(s??'').trim().match(/^([01]?\d|2[0-3])[:.](\d{2})$/);return m?m[1].padStart(2,'0')+':'+m[2]:null;};

/** Λήψη στοιχείων: κάθε πεδίο σωστό ή λάθος, με τη σωστή τιμή για ανατροφοδότηση. */
export function gradeCapture(caseId,answers){
 const c=getCase(caseId);if(!c)throw Error('unknown-case');
 const rows=c.capture.map(f=>{
  const given=answers?.[f.id];
  const ok=f.kind==='time'?timeOf(given)===f.answer:f.kind==='number'?String(given??'').trim()===f.answer:given===f.answer;
  return {id:f.id,label:f.label,ok,expected:f.answer,why:f.why||''};
 });
 return {correct:rows.filter(r=>r.ok).length,total:rows.length,rows};
}

/** Κλειστός κύκλος: ποια κρίσιμα στοιχεία λείπουν από την επανάληψη του μαθητή. */
export function gradeReadback(caseId,text){
 const c=getCase(caseId);if(!c)throw Error('unknown-case');
 const said=' '+norm(text).replace(/[^\p{L}\p{N} ]/gu,' ')+' ';
 const words=new Set(said.split(' ').filter(Boolean));
 // A number must be a whole word; a word may carry an ending ("αυλή"→"αυλης"); a phrase must start at a word.
 const heard=k=>k.includes(' ')?said.includes(' '+k):words.has(k)||(!/^\d/.test(k)&&k.length>3&&[...words].some(w=>w.startsWith(k)));
 const missing=c.dispatch.critical.filter(item=>!item.any.some(heard)).map(item=>item.label);
 return {correct:c.dispatch.critical.length-missing.length,total:c.dispatch.critical.length,missing,complete:missing.length===0};
}

/** Σειρά βημάτων: πόσα είναι στη σωστή θέση. */
export function gradeOrder(correctIds,givenIds){
 if(!Array.isArray(givenIds)||givenIds.length!==correctIds.length||new Set(givenIds).size!==givenIds.length)throw Error('invalid-order');
 const rows=givenIds.map((id,i)=>({id,ok:id===correctIds[i]}));
 return {correct:rows.filter(r=>r.ok).length,total:rows.length,rows,complete:rows.every(r=>r.ok)};
}

/** Προαναγγελία ΤΕΠ: επιλογές που ανήκουν / δεν ανήκουν. */
export function gradePrealert(caseId,selectedIds){
 const c=getCase(caseId);if(!c)throw Error('unknown-case');
 const chosen=new Set(selectedIds||[]);
 const rows=c.statements.map(s=>({id:s.id,text:s.text,should:s.prealert,chosen:chosen.has(s.id),ok:chosen.has(s.id)===s.prealert,why:s.why||''}));
 return {correct:rows.filter(r=>r.ok).length,total:rows.length,rows};
}

/** ATMIST: κάθε δήλωση στη σωστή θέση ή εκτός παράδοσης. */
export function gradeStructure(caseId,slots){
 const c=getCase(caseId);if(!c)throw Error('unknown-case');
 const rows=c.statements.map(s=>({id:s.id,text:s.text,expected:s.slot,given:slots?.[s.id]||'',ok:slots?.[s.id]===s.slot,why:s.why||''}));
 return {correct:rows.filter(r=>r.ok).length,total:rows.length,rows};
}

/** Καταγραφή: τιμές δύο μετρήσεων από την αφήγηση, και αντικειμενική περιγραφή μεταβολής. */
export const RECORD_FIELDS=freeze([
 {id:'time',label:'Ώρα'},{id:'hr',label:'Σφυγμός /min'},{id:'rr',label:'Αναπνοές /min'},
 {id:'bp',label:'ΑΠ mmHg'},{id:'spo2',label:'SpO₂ %'},{id:'avpu',label:'AVPU'}
]);
export function gradeRecord(caseId,rows,trendIndex){
 const c=getCase(caseId);if(!c)throw Error('unknown-case');
 const cells=[];
 c.vitals.forEach((v,i)=>{for(const f of RECORD_FIELDS){
  const given=String(rows?.[i]?.[f.id]??'').trim().replace(/\s+/g,'').toUpperCase();
  const want=String(v[f.id]).toUpperCase();
  const ok=f.id==='time'?timeOf(given)===want:given===want;
  cells.push({row:i,field:f.id,ok,expected:String(v[f.id])});
 }});
 return {correct:cells.filter(x=>x.ok).length,total:cells.length,cells,trendOk:trendIndex===c.trend.answer,trendWhy:c.trend.why};
}

export function gradeTransferFlaw(index){
 return {ok:index===TRANSFER_FLAW.answer,why:TRANSFER_FLAW.why};
}

/** Εκπαιδευτική παράδοση ATMIST από τα σωστά στοιχεία ενός περιστατικού (πρότυπο σύγκρισης). */
export function modelHandover(caseId){
 const c=getCase(caseId);if(!c)throw Error('unknown-case');
 return ATMIST.filter(a=>a.id!=='out').map(a=>a.label+': '+c.statements.filter(s=>s.slot===a.id).map(s=>s.text).join(' ')).join('\n');
}
