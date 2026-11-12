/**
 * Exam calendar: a day-by-day study plan up to an exam date, built only from two sources.
 *
 * 1. What to study: the official material only. EOPPEP theory: the 314 official questions.
 *    EOPPEP practical: the 6 official scenarios and 12 skills. SAEK: the chapters of the chosen courses.
 * 2. How to study, from peer-reviewed research:
 *    - Dunlosky, Rawson, Marsh, Nathan & Willingham (2013), Psychological Science in the Public
 *      Interest 14(1):4–58. Of ten techniques, only practice testing (self-testing) and
 *      distributed practice were rated high utility; rereading and highlighting were rated low.
 *    - Cepeda, Vul, Rohrer, Wixted & Pashler (2008), Psychological Science 19(11):1095–1102,
 *      PMID 19076480. Over 1,350 learners: the best gap between study and review is about
 *      10–20% of the time left until the test. For a test in one month, that is every 3–6 days.
 *
 * Pure functions, no storage or network: the page and the schedulers read and write the plan.
 */
export const STORAGE_KEY='ekab.study.exams.v1';
export const GAP_SHARE={min:.10,use:.15,max:.20};
export const SOURCES=Object.freeze([
 {id:'cepeda2008',short:'Cepeda κ.ά., 2008',text:'Cepeda, Vul, Rohrer, Wixted & Pashler (2008). Spacing effects in learning: a temporal ridgeline of optimal retention. Psychological Science, 19(11), 1095–1102.',url:'https://pubmed.ncbi.nlm.nih.gov/19076480/'},
 {id:'dunlosky2013',short:'Dunlosky κ.ά., 2013',text:'Dunlosky, Rawson, Marsh, Nathan & Willingham (2013). Improving students’ learning with effective learning techniques. Psychological Science in the Public Interest, 14(1), 4–58.',url:'https://www.psychologicalscience.org/news/releases/which-study-strategies-make-the-grade.html'}
]);
const DAY=86400000;

export const SAEK_COURSES=Object.freeze([
 ['01','Ανατομία','Α',14],['02','Φυσιολογία','Α',13],['03','Ο Διασώστης – Επαγγελματίας Υγείας','Α',10],
 ['04','Βασικές Αρχές Δημόσιας Υγείας','Α',10],['05','Εισαγωγή στην Προνοσοκομειακή Εκτίμηση και Υποστήριξη του Ασθενούς','Α',14],
 ['06','Βασική Αγγλική Ορολογία Προνοσοκομειακής Φροντίδας','Α',10],['07','Τεχνικές Επικοινωνίας Επείγουσας Κλήσης','Β',11],
 ['08','Τεχνολογίες Πληροφορικής και Επικοινωνιών Προνοσοκομειακά','Β',11],['09','Ασφαλής Χειρισμός – Οδήγηση Ασθενοφόρου','Β',11],
 ['10','Επείγουσες Παθολογικές Καταστάσεις Προνοσοκομειακά','Β',17],['11','Αγγλική Ορολογία Προνοσοκομειακών Πρακτικών','Β',11],
 ['12','Προνοσοκομειακή Χρήση Φαρμάκων','Β',12],['13','Τεχνικές Λήψης Επείγουσας Κλήσης','Γ',11],
 ['14','Προνοσοκομειακή Αντιμετώπιση Τραύματος','Γ',14],['15','Διαχείριση Μαζικού Συμβάντος','Γ',13],
 ['16','Πρωτόκολλα Διαχείρισης στα Συνήθη Επείγοντα Προνοσοκομειακά Περιστατικά','Γ',13],
 ['17','Πρακτική Εφαρμογή σε Τεχνικές και Δεξιότητες Επειγόντων Παθολογικών','Δ',13],
 ['18','Πρακτική Εφαρμογή σε Τεχνικές και Δεξιότητες Αντιμετώπισης Τραύματος','Δ',13],
 ['19','Διακομιδές Ασθενών','Δ',13],['20','Ο Διασώστης/ρια στα ΤΕΠ','Δ',13]
].map(([id,title,semester,chapters])=>({id,title,semester,chapters})));

export const PRACTICAL_ITEMS=Object.freeze([
 'Σενάριο 1 — Αιφνίδια απώλεια συνείδησης','Σενάριο 2 — Δύσπνοια, κυάνωση, ορθόπνοια','Σενάριο 3 — Έγκυος 23 εβδομάδων',
 'Σενάριο 4 — Ανοικτό τραύμα θώρακα','Σενάριο 5 — Πιθανή καταπληξία και σύγχυση','Σενάριο 6 — Αδυναμία κίνησης κάτω άκρου',
 'Περιορισμός κίνησης αυχενικής μοίρας (ΑΜΣΣ)','Απελευθέρωση αεραγωγού με τα χέρια και με μέσα','Εκτίμηση και υποστήριξη αναπνοής',
 'Εκτίμηση κυκλοφορίας και αιμορραγίας','Εκτίμηση νευρολογικής κατάστασης','Έκθεση και περιβαλλοντικοί παράγοντες',
 'Ασθενής σε ειδικές καταστάσεις','Καρδιοαναπνευστική ανακοπή','Σανίδα, φορείο και στρώμα πολυτραυματία',
 'Νάρθηκες και έλξη άκρων','Προετοιμασία ενδοφλέβιας / ενδοοστικής έγχυσης ορών','Μεταφορά τραυματία'
].map((title,i)=>({id:'P'+String(i+1).padStart(2,'0'),title,href:'practical_exam.html'})));

export const EXAM_TYPES=Object.freeze({
 'eoppep-theory':'ΕΟΠΠΕΠ · Θεωρία','eoppep-practical':'ΕΟΠΠΕΠ · Πρακτικό','saek':'Εξετάσεις ΣΑΕΚ'
});

/** Calendar days from `today` until the exam day (the exam day itself not counted). */
export function daysUntil(examDate,today=new Date()){
 const a=new Date(today);a.setHours(0,0,0,0);
 const b=new Date(examDate+'T00:00:00');
 return Number.isFinite(b.getTime())?Math.round((b-a)/DAY):NaN;
}
/** Review gap (days) for the time left, after Cepeda et al. (2008): about 10–20% of it. */
export function reviewGap(daysLeft){
 const d=Math.max(1,Number(daysLeft)||1);
 const r=share=>Math.max(1,Math.round(d*share));
 return {min:r(GAP_SHARE.min),use:r(GAP_SHARE.use),max:r(GAP_SHARE.max)};
}

/** Items of an exam, in the order of the official material. `bank` is the official question list. */
export function examItems(exam,bank=[]){
 if(exam.type==='eoppep-theory')return bank.map(q=>({id:q.id,title:'Ερώτηση '+(q.group==='B'?'Β':'Α')+'-'+String(q.number).padStart(3,'0'),href:'theory.html?question='+q.id}));
 if(exam.type==='eoppep-practical')return PRACTICAL_ITEMS.slice();
 const chosen=new Set(exam.courses||[]);
 return SAEK_COURSES.filter(c=>chosen.has(c.id)).flatMap(c=>Array.from({length:c.chapters},(_,i)=>({
  id:c.id+':'+(i+1),title:'Μάθημα '+c.id+' · κεφάλαιο '+(i+1),course:c.title,href:'saek-course-'+c.id+'.html#lesson-'+(i+1)})));
}

/**
 * Day-by-day plan. New material is spread over the days before a final review period of one gap;
 * every item comes back for self-testing every `gap` days, and the final period reviews everything.
 * `done` holds ids the learner has already studied: they are not new, only reviewed.
 */
export function buildPlan({items,done=new Set(),daysLeft}){
 const left=Math.floor(Number(daysLeft));
 if(!Number.isFinite(left)||left<1)return {days:[],gap:reviewGap(1),perDay:0,finalDays:0};
 const gap=reviewGap(left);
 const finalDays=left>2?Math.min(gap.use,left-1):0;
 const learnDays=left-finalDays;
 const fresh=items.filter(x=>!done.has(x.id)),known=items.filter(x=>done.has(x.id));
 const perDay=fresh.length?Math.ceil(fresh.length/learnDays):0;
 const introduced=new Map();
 fresh.forEach((x,i)=>introduced.set(x.id,Math.floor(i/perDay)));
 // Already-studied items are spread over the first gap, so each comes back once per gap.
 known.forEach((x,i)=>introduced.set(x.id,-1-(i%gap.use)));
 const days=[];
 for(let d=0;d<left;d++){
  const final=d>=learnDays;
  const add=final?[]:fresh.slice(d*perDay,(d+1)*perDay);
  let review;
  if(final){
   const k=d-learnDays,chunk=Math.ceil(items.length/finalDays);
   review=items.slice(k*chunk,(k+1)*chunk);
  }else review=items.filter(x=>{const s=introduced.get(x.id);if(s===undefined||s>=d)return false;const since=d-(s<0?s+gap.use:s);return since>0&&since%gap.use===0;});
  days.push({index:d,final,add,review});
 }
 return {days,gap,perDay,finalDays,learnDays};
}

/** Saved exams (validated). */
export function parseExams(raw){
 let list=[];try{list=JSON.parse(raw||'[]')}catch{list=[]}
 return Array.isArray(list)?list.filter(e=>e&&EXAM_TYPES[e.type]&&/^\d{4}-\d{2}-\d{2}$/.test(e.date)&&typeof e.id==='string')
  .map(e=>({id:e.id,type:e.type,date:e.date,courses:Array.isArray(e.courses)?e.courses.filter(c=>SAEK_COURSES.some(x=>x.id===c)):[]})):[];
}
/** Nearest upcoming exam of the given types (used by the review schedulers). */
export function nextExam(exams,types,today=new Date()){
 return exams.filter(e=>types.includes(e.type)&&daysUntil(e.date,today)>=1).sort((a,b)=>a.date.localeCompare(b.date))[0]||null;
}

/** ATLA's answer when a learner asks how to study or how often to review (same two sources). */
export const STUDY_METHOD_ANSWER='Δύο τεχνικές μελέτης έχουν την ισχυρότερη τεκμηρίωση: η αυτοεξέταση (απαντάς πρώτα και μετά βλέπεις τη λύση) και η κατανεμημένη επανάληψη σε αραιά διαστήματα. Το ξαναδιάβασμα και η υπογράμμιση βοηθούν λίγο (Dunlosky κ.ά., 2013). '+
 'Το καλύτερο διάστημα ανάμεσα στις επαναλήψεις είναι περίπου 10–20% του χρόνου που μένει ως την εξέταση: για εξέταση σε έναν μήνα, κάθε 3–6 ημέρες (Cepeda κ.ά., 2008, πάνω από 1.350 συμμετέχοντες). '+
 'Στο Ημερολόγιο εξετάσεων βάζεις την ημερομηνία και βλέπεις τι μελετάς και τι επαναλαμβάνεις κάθε μέρα.';
export function isStudyMethodQuestion(text){
 const n=String(text||'').normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/ς/g,'σ').toLocaleLowerCase('el');
 return /(πωσ|ποτε|ποσο συχνα|καθε ποσ|με ποιο τροπο|ποια μεθοδο).{0,40}(διαβασ|μελετ|επαναλ|προετοιμ)|(πλανο|προγραμμα|ημερολογιο|σχεδιο) (μελετ|διαβασματ|εξετασ)|επαναληψ.{0,25}(διαστημ|συχνοτ)|spaced repetition|κατανεμημεν.{0,6} (μελετ|επαναλ)/.test(n);
}
