/**
 * Shared training taxonomy for EKAB Spoudi and MENTOR.
 * These are educational TOPICS, not verified operational EKAB protocols.
 * Do not add clinical interventions, medication doses or inferred approvals here.
 */
export const CATEGORIES=[
  {id:'cardiac',label:'Καρδιολογικά επείγοντα',icon:'♡'},
  {id:'respiratory',label:'Αναπνευστικά επείγοντα',icon:'◉'},
  {id:'trauma',label:'Τραύμα και αιμορραγίες',icon:'✚'},
  {id:'neuro',label:'Νευρολογικά επείγοντα',icon:'◈'},
  {id:'child',label:'Παιδιατρικά και μαιευτικά',icon:'♧'},
  {id:'operations',label:'Περιστατικά και διακομιδές',icon:'▤'}
];
export const TOPICS=[
  {id:'chest',category:'cardiac',name:'Οξύ θωρακικό άλγος',scenario:'Ενήλικος με αιφνίδιο θωρακικό άλγος',focus:'λήψη ιστορικού, καταγραφή παρατηρήσεων και ασφαλής παράδοση πληροφοριών'},
  {id:'palpitations',category:'cardiac',name:'Αίσθημα παλμών',scenario:'Ενήλικος που αναφέρει αίσθημα παλμών',focus:'συστηματική συλλογή δεδομένων και όρια επαγγελματικού ρόλου'},
  {id:'dyspnea',category:'respiratory',name:'Δύσπνοια',scenario:'Άτομο με αναπνευστική δυσχέρεια',focus:'παρατήρηση και οργανωμένη επικοινωνία με την ομάδα'},
  {id:'airway',category:'respiratory',name:'Προβλήματα αεραγωγού',scenario:'Κλήση για πιθανό πρόβλημα αεραγωγού',focus:'ασφάλεια σκηνής, αναγνώριση περιορισμών και εκπαίδευση υπό επίβλεψη'},
  {id:'trauma',category:'trauma',name:'Αρχική εκτίμηση τραύματος',scenario:'Τροχαίο σε δημόσιο δρόμο',focus:'ασφάλεια σκηνής, συντονισμός και τεκμηριωμένη αναφορά'},
  {id:'bleeding',category:'trauma',name:'Τραύμα και αιμορραγία',scenario:'Τραυματίας με αναφερόμενη αιμορραγία',focus:'συλλογή στοιχείων και ασφαλής επικοινωνία πληρώματος'},
  {id:'stroke',category:'neuro',name:'Αιφνίδια νευρολογικά συμπτώματα',scenario:'Άτομο με αιφνίδια αλλαγή ομιλίας',focus:'αναγνώριση της ανάγκης έγκαιρης ενημέρωσης της ομάδας'},
  {id:'consciousness',category:'neuro',name:'Μεταβολή επιπέδου συνείδησης',scenario:'Κλήση για μειωμένη ανταπόκριση',focus:'καταγραφή στοιχείων και αποφυγή αυθαίρετης διάγνωσης'},
  {id:'pediatric',category:'child',name:'Παιδιατρικό επείγον',scenario:'Παιδί με συμπτώματα που ανησυχούν τον συνοδό',focus:'επικοινωνία με συνοδό και διακριτοί παιδιατρικοί περιορισμοί'},
  {id:'obstetric',category:'child',name:'Μαιευτικό επείγον',scenario:'Κλήση για έγκυο με οξέα συμπτώματα',focus:'ασφαλής συλλογή ιστορικού και έγκαιρη κλιμάκωση'},
  {id:'mci',category:'operations',name:'Συμβάν πολλαπλών ασθενών',scenario:'Εκπαιδευτικό συμβάν με πολλαπλές αναφορές',focus:'επικοινωνία, καταγραφή και συνεργασία χωρίς κλινική διαλογή'},
  {id:'transport',category:'operations',name:'Ασφάλεια διακομιδής και παράδοση',scenario:'Παράδοση περιστατικού στην επόμενη ομάδα',focus:'συστηματική παράδοση χωρίς πραγματικά προσωπικά δεδομένα'}
];
export const OTHER_TOPICS=[
  {id:'pharmacy',name:'Φαρμακολογία',scenario:'Εκπαιδευτική αναφορά σε φαρμακευτική αγωγή',focus:'έλεγχος πηγής, αντενδείξεων και αρμοδιοτήτων χωρίς οδηγίες δοσολογίας'},
  {id:'anatomy',name:'3D Ανατομία',scenario:'Εντοπισμός ανατομικής δομής στο μοντέλο',focus:'αναγνώριση ορολογίας και περιορισμών ανατομικής απεικόνισης'},
  {id:'seminars',name:'Προετοιμασία σεμιναρίων',scenario:'Προετοιμασία για πρακτικό εκπαιδευτικό σταθμό',focus:'επίσημη ύλη, εκπαιδευτικές δεξιότητες και αξιολόγηση'},
  {id:'ecg',name:'ECG Lab',scenario:'Μελέτη συνθετικού ηλεκτροκαρδιογραφικού σχήματος',focus:'τεκμηρίωση και όρια ερμηνείας συνθετικών κυματομορφών'},
  {id:'saek',name:'Κατάρτιση ΣΑΕΚ',scenario:'Μελέτη κεφαλαίου επείγουσας προνοσοκομειακής φροντίδας',focus:'διασταύρωση πηγών και ενεργή ανάκληση'},
  {id:'eoppep',name:'Πιστοποίηση ΕΟΠΠΕΠ',scenario:'Επανάληψη θεωρητικής ερώτησης',focus:'έλεγχος ορθότητας απάντησης και αιτιολόγηση'}
];
export const ALL_TOPICS=[...TOPICS,...OTHER_TOPICS];
export const getTopic=id=>ALL_TOPICS.find(topic=>topic.id===id)||TOPICS[0];
export const isOfficiallyValidated=()=>false; // Pending protocol-by-protocol independent clinical review.
