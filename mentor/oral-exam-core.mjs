/* MENTOR oral rehearsal: no AI, no clinical competence scoring. */
export const PROMPTS=Object.freeze([
{id:'a1',topic:'Ανατομία',prompt:'Περιέγραψε με δικά σου λόγια τη διαδρομή του αίματος από τη δεξιά κοιλία προς τους πνεύμονες.',checklist:['Δεξιά κοιλία','Πνευμονική αρτηρία','Πνεύμονες'],note:'Ανατομική περιγραφή, όχι οδηγία αντιμετώπισης.'},
{id:'a2',topic:'Ανατομία',prompt:'Ποια είναι η βασική διαφορά ανάμεσα σε αρτηρίες και φλέβες;',checklist:['Κατεύθυνση ροής ως προς την καρδιά','Εξαιρέσεις στην οξυγόνωση'],note:'Η οξυγόνωση δεν ορίζει από μόνη της αν ένα αγγείο είναι αρτηρία.'},
{id:'c1',topic:'Επικοινωνία',prompt:'Πώς θα οργανώσεις μια σαφή προφορική παράδοση εκπαιδευτικού περιστατικού χωρίς προσωπικά στοιχεία;',checklist:['Σαφής δομή','Βασικές παρατηρήσεις','Επιβεβαίωση κατανόησης'],note:'Μην καταχωρείς πραγματικά στοιχεία ασθενών.'},
{id:'c2',topic:'Επικοινωνία',prompt:'Τι θα κάνεις όταν δεν έχεις καταλάβει μια οδηγία στο πλαίσιο ομαδικής άσκησης;',checklist:['Διευκρινιστική ερώτηση','Επανάληψη οδηγιών','Επιβεβαίωση'],note:'Η σαφής επικοινωνία είναι εκπαιδευτικός στόχος.'},
{id:'s1',topic:'Μελέτη',prompt:'Εξήγησε πώς θα αναγνωρίσεις ένα γνωστικό κενό και θα οργανώσεις επανάληψη.',checklist:['Αναγνώριση δυσκολίας','Αξιόπιστη πηγή','Επανέλεγχος'],note:'Η αυτοαξιολόγηση δεν αποτελεί πιστοποίηση.'},
{id:'s2',topic:'Μελέτη',prompt:'Πώς θα εξηγήσεις μια δύσκολη έννοια σε συμφοιτητή σου;',checklist:['Απλή διατύπωση','Παράδειγμα','Έλεγχος κατανόησης'],note:'Η εξήγηση με δικά σου λόγια βοηθά την επανάληψη.'}
]);
export function createOralSession(topic='all'){const pool=PROMPTS.filter(x=>topic==='all'||x.topic===topic);return {topic,index:0,answers:[],total:pool.length};}
export function currentPrompt(session){return PROMPTS.filter(x=>session.topic==='all'||x.topic===session.topic)[session.index]||null;}
export function recordOralAnswer(session,answer,review){if(!currentPrompt(session))return session;const text=String(answer||'').trim().slice(0,2000);if(!text)return session;return {...session,index:session.index+1,answers:[...session.answers,{id:currentPrompt(session).id,text,review:review==='repeat'?'repeat':'done'}]};}
export function oralSummary(session){return {completed:session.answers.length,toRepeat:session.answers.filter(a=>a.review==='repeat').length,total:session.total};}
