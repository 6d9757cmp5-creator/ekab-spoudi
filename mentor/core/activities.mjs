/**
 * MENTOR OS: training-only MCI coordination and equipment identification.
 * No algorithmic acuity class, triage colour, patient treatment or dosage.
 * All cases and text are FICTIONAL / clinical-review-pending.
 */
const ACTION=(id,label,outcome,feedback,extra={})=>({id,label,outcome,feedback,...extra});
const GOOD=(id,label,feedback,extra)=>ACTION(id,label,'practice',feedback,extra);
const REVIEW=(id,label,feedback)=>ACTION(id,label,'review',feedback);
const commonScene={
 id:'scene', title:'Ασφάλεια χώρου',competency:'scene',
 prompt:'Πώς οργανώνεις την προσέγγιση σε συμβάν με περισσότερα άτομα;',
 actions:[
  GOOD('scene-secure','Εξετάζω την ασφάλεια του χώρου πριν προσεγγίσω τους εμπλεκομένους.','Καταγράφηκε η ανάγκη ασφάλειας σκηνής. Πρόκειται για εκπαιδευτική αρχή, όχι για αξιολόγηση πραγματικού συμβάντος.'),
  REVIEW('scene-rush','Ξεκινώ χωρίς έλεγχο κινδύνων.','Η παράκαμψη της ασφάλειας σκηνής χρειάζεται επανεξέταση.'),
 ]
};
const coordinate={
 id:'coordination',title:'Συντονισμός',competency:'coordination',
 prompt:'Στην αναφορά υπάρχουν πολλοί εμπλεκόμενοι. Ποια είναι η επόμενη οργανωτική ενέργεια;',
 actions:[
  GOOD('request-coordination','Δίνω σαφή αρχική αναφορά στον αρμόδιο συντονισμό και ζητώ υποστήριξη σύμφωνα με τα προβλεπόμενα.','Η επικοινωνία πολλών εμπλεκομένων προς τον συντονισμό καταγράφηκε.'),
  REVIEW('ignore-additional','Αντιμετωπίζω το συμβάν χωρίς να αναφέρω ότι υπάρχουν πολλά άτομα.','Επανεξέτασε την ανάγκη έγκαιρης κοινοποίησης των διαθέσιμων πληροφοριών.'),
 ]
};
const finish={
 id:'handover',title:'Συνοπτική αναφορά',competency:'handover',
 prompt:'Πώς ολοκληρώνεις το εκπαιδευτικό σενάριο;',
 actions:[
  GOOD('report-verified','Παραδίδω μόνο τις παρατηρήσεις που πράγματι έχω καταγράψει, τα άτομα που είδα και τις επικοινωνίες που έγιναν.','Η δομημένη καταγραφή βοηθά τη συνέχεια της επικοινωνίας χωρίς εικασίες.'),
  REVIEW('invent-diagnoses','Δίνω υποθετικές διαγνώσεις σαν να ήταν επιβεβαιωμένες.','Η μη τεκμηριωμένη διάγνωση δεν πρέπει να παρουσιάζεται ως γεγονός.'),
 ]
};
function observeStage(people){
 return {
  id:'observe',title:'Καταμέτρηση και παρατηρήσεις',competency:'observation',
  prompt:'Διάλεξε κάθε άτομο μία φορά και καταχώρισε ότι χρειάζεται οργανωμένη αρχική εκτίμηση. Δεν αποδίδεται κατηγορία διαλογής.',
  required_marks:people.map(p=>p.id),
  actions:[
   ...people.map(p=>GOOD('observe-'+p.id,'Καταγράφω την παρουσία του '+p.name+' και την ανάγκη αρχικής εκτίμησης.','Καταγράφηκε το '+p.name+'. Δεν προκύπτει διάγνωση ή προτεραιότητα διαλογής.',{mark:p.id})),
   REVIEW('observe-skip','Αγνοώ τους υπόλοιπους εμπλεκόμενους χωρίς καταγραφή.','Στην άσκηση χρειάζεται να καταγραφούν όλοι οι αναφερόμενοι εμπλεκόμενοι.'),
  ]
 };
}
const TRAFFIC_PEOPLE=[
 {id:'a',name:'Άτομο Α',observation:'Αναφέρεται ότι βρίσκεται δίπλα στο όχημα και ζητά βοήθεια.'},
 {id:'b',name:'Άτομο Β',observation:'Αναφέρεται ότι βρίσκεται σε κοντινή απόσταση. Δεν υπάρχουν επαρκή κλινικά δεδομένα.'},
 {id:'c',name:'Άτομο Γ',observation:'Αναφέρεται από μάρτυρα. Δεν έχει ακόμη καταγραφεί άμεση παρατήρηση.'},
];
const EVENT_PEOPLE=[
 {id:'a',name:'Άτομο Α',observation:'Ο διοργανωτής αναφέρει ένα άτομο που ζητά βοήθεια.'},
 {id:'b',name:'Άτομο Β',observation:'Παρευρισκόμενος αναφέρει δεύτερο εμπλεκόμενο.'},
 {id:'c',name:'Άτομο Γ',observation:'Υπάρχει αναφορά τρίτου ατόμου χωρίς περισσότερα στοιχεία.'},
 {id:'d',name:'Άτομο Δ',observation:'Υπάρχει αναφορά τέταρτου ατόμου από τον συντονισμό.'},
];
function incident(id,title,description,people){
 return {
  id,kind:'mci',version:1,icon:'🚨',title,description,
  source_status:'clinical-review-pending',people,
  stages:[commonScene,coordinate,observeStage(people),finish]
 };
}
function equipment(id,icon,title,description,functionLabel){
 return {
  id,kind:'equipment',version:1,icon,title,description,functionLabel,
  source_status:'clinical-review-pending',
  stages:[
   {id:'identify',title:'Αναγνώριση',competency:'device-identification',
    prompt:'Τι είναι η συγκεκριμένη συσκευή;',
    actions:[
     GOOD('device-identify',functionLabel,'Η βασική περιγραφή του εξοπλισμού καταγράφηκε. Δεν πρόκειται για εκπαίδευση χειρισμού συσκευής.'),
     REVIEW('device-guess','Μπορώ να τη χρησιμοποιήσω χωρίς να γνωρίζω τι είναι.','Η αναγνώριση του εξοπλισμού είναι ξεχωριστή δεξιότητα από την εκπαίδευση στον χειρισμό του.')
    ]},
   {id:'preflight',title:'Έλεγχος και εκπαίδευση',competency:'device-safety',
    prompt:'Πριν από χρήση πραγματικής συσκευής, πώς αντιμετωπίζεις τη διαδικασία εκπαίδευσης;',
    actions:[
     GOOD('follow-training','Ακολουθώ εγκεκριμένη εκπαίδευση, το τοπικό πρωτόκολλο και τις οδηγίες του συγκεκριμένου κατασκευαστή.','Ο χειρισμός πραγματικού εξοπλισμού απαιτεί την κατάλληλη εκπαίδευση και έλεγχο.'),
     REVIEW('ignore-manual','Θεωρώ ότι όλες οι συσκευές λειτουργούν το ίδιο και παραβλέπω τις οδηγίες.','Οι κατασκευαστές και τα μοντέλα διαφέρουν. Χρειάζεται εξειδικευμένη εκπαίδευση.')
    ]},
   {id:'documentation',title:'Επικοινωνία',competency:'device-documentation',
    prompt:'Τι περιλαμβάνει η εκπαιδευτική ανασκόπηση μετά από χειρισμό εξοπλισμού;',
    actions:[
     GOOD('document-observations','Διαχωρίζω τις μετρήσεις/παρατηρήσεις από τις υποθέσεις και κοινοποιώ τις σχετικές πληροφορίες στην ομάδα.','Η σαφής, αντικειμενική τεκμηρίωση είναι μέρος της σωστής επικοινωνίας.'),
     REVIEW('invent-readings','Αναφέρω τιμές που δεν παρατηρήθηκαν σαν να ήταν πραγματικές.','Στο πραγματικό περιβάλλον οι μετρήσεις πρέπει να καταγράφονται χωρίς επινόηση.')
    ]}
  ]
 };
}
export const MCI_ACTIVITIES=Object.freeze([
 incident('mci-road','Τροχαίο με τρεις εμπλεκομένους','Συνθετική αποστολή καταμέτρησης και συντονισμού. Χωρίς αυτόματη ιατρική διαλογή.',TRAFFIC_PEOPLE),
 incident('mci-event','Συμβάν σε δημόσια εκδήλωση','Συνθετική αναφορά τεσσάρων εμπλεκομένων με ελλιπή στοιχεία.',EVENT_PEOPLE),
]);
export const EQUIPMENT_ACTIVITIES=Object.freeze([
 equipment('device-aed','⚡','Αυτόματος εξωτερικός απινιδωτής','Σχηματική εκπαιδευτική κάρτα αναγνώρισης AED· όχι πραγματικό χειριστήριο.','Εκπαιδευτική αναγνώριση ενός αυτόματου εξωτερικού απινιδωτή (AED), που αναλύει καρδιακό ρυθμό και παρέχει καθοδήγηση για απινίδωση όταν ενδείκνυται.'),
 equipment('device-bvm','🫁','Ασκός αναζωογόνησης (BVM)','Σχηματική εκπαιδευτική κάρτα αναγνώρισης ασκού και μάσκας· όχι εκπαίδευση πρακτικού χειρισμού.','Εκπαιδευτική αναγνώριση συστήματος ασκού-βαλβίδας-μάσκας (BVM) για υποστήριξη αερισμού από εκπαιδευμένο προσωπικό.'),
 equipment('device-monitor','📟','Monitor / παλμικό οξύμετρο','Σχηματική κάρτα αναγνώρισης παρακολούθησης· όχι πραγματική συσκευή.','Εκπαιδευτική αναγνώριση οργάνων παρακολούθησης μετρήσεων, όπως η εκτίμηση περιφερικού κορεσμού οξυγόνου από παλμικό οξύμετρο.')
]);
export const ACTIVITIES=Object.freeze([...MCI_ACTIVITIES,...EQUIPMENT_ACTIVITIES]);
const map=new Map(ACTIVITIES.map(x=>[x.id,x]));
export function getActivity(id){return typeof id==='string'?map.get(id)||null:null;}
