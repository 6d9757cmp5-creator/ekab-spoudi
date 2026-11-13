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

/** Τα συνθετικά περιστατικά βρίσκονται στο cases.json· φορτώνονται μία φορά με loadCases(). */
export let CASES=Object.freeze([]);
const deepFreeze=o=>{if(o&&typeof o==='object'){Object.values(o).forEach(deepFreeze);Object.freeze(o);}return o;};
export function loadCases(list){
 if(!Array.isArray(list)||!list.length||list.some(c=>!c?.id||!Array.isArray(c.narrative)||!Array.isArray(c.statements)))throw Error('invalid-cases');
 CASES=deepFreeze(structuredClone(list));
 return CASES;
}

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
