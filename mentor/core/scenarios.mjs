/**
 * MENTOR OS — synthetic educational scenario fixtures.
 * NOT medically approved, not validated clinical guidance, not real patients.
 * No treatment, drug dosage, physiological prediction or official grade.
 */
export const COMPETENCIES = Object.freeze({
  scene: 'Ασφάλεια σκηνής',
  assessment: 'Οργανωμένη αρχική εκτίμηση',
  escalation: 'Έγκαιρη επικοινωνία',
  handover: 'Δομημένη παράδοση'
});
const PHASES = [
  {
    id:'scene',title:'1 · Ασφάλεια σκηνής',
    prompt:'Ποια είναι η πρώτη οργανωτική σου ενέργεια πριν πλησιάσεις;',
    actions:[
      {id:'scene-check',label:'Ελέγχω πρώτα την ασφάλεια σκηνής και τους πιθανούς κινδύνους.',outcome:'practice',feedback:'Η αναγνώριση κινδύνων και η ασφάλεια προσωπικού και ασθενούς είναι κρίσιμη πρώτη προτεραιότητα.'},
      {id:'scene-skip',label:'Πλησιάζω αμέσως, χωρίς να ελέγξω τον χώρο.',outcome:'review',feedback:'Πιθανός κίνδυνος: επανεξέτασε πρώτα την ασφάλεια σκηνής. Η άσκηση δεν συνεχίζει έως ότου επιλέξεις ασφαλή προσέγγιση.'}
    ]
  },
  {
    id:'assessment',title:'2 · Αρχική εκτίμηση',
    prompt:'Πώς οργανώνεις την αρχική αξιολόγηση του ασθενούς;',
    actions:[
      {id:'assess-abcde',label:'Ακολουθώ δομημένη αρχική εκτίμηση ABCDE, σύμφωνα με την εκπαίδευση και τα καθήκοντά μου.',outcome:'practice',feedback:'Η συστηματική αρχική εκτίμηση σε βοηθά να οργανώνεις τις παρατηρήσεις σου και να αναγνωρίζεις άμεσες προτεραιότητες.'},
      {id:'assess-guess',label:'Υποθέτω αμέσως συγκεκριμένη διάγνωση χωρίς αρχική εκτίμηση.',outcome:'review',feedback:'Η πρόωρη διάγνωση χωρίς συστηματική εκτίμηση μπορεί να οδηγήσει σε παράβλεψη κρίσιμων προβλημάτων.'}
    ]
  },
  {
    id:'escalation',title:'3 · Επικοινωνία και υποστήριξη',
    prompt:'Πώς διαχειρίζεσαι μια αβέβαιη, ενδεχομένως επείγουσα εικόνα;',
    actions:[
      {id:'escalate-communicate',label:'Ενημερώνω εγκαίρως τον αρμόδιο συντονισμό και ζητώ την υποστήριξη που προβλέπουν τα πρωτόκολλα.',outcome:'practice',feedback:'Η έγκαιρη, σαφής επικοινωνία και η ενεργοποίηση της κατάλληλης υποστήριξης είναι μέρος της ασφαλούς διαχείρισης.'},
      {id:'escalate-silent',label:'Δεν αναφέρω τις ανησυχητικές παρατηρήσεις μου σε κανέναν.',outcome:'review',feedback:'Η μη κοινοποίηση σημαντικών παρατηρήσεων δημιουργεί κενά στην ασφάλεια και στον συντονισμό.'}
    ]
  },
  {
    id:'handover',title:'4 · Παράδοση περιστατικού',
    prompt:'Τι θα μεταφέρεις στην ομάδα παραλαβής;',
    actions:[
      {id:'handover-structured',label:'Δίνω σαφή, δομημένη αναφορά με το συμβάν, την εκτίμηση, τις αλλαγές και όσα έγιναν.',outcome:'practice',feedback:'Η οργανωμένη παράδοση βοηθά τη συνέχεια της φροντίδας και επιτρέπει στην ομάδα να γνωρίζει τι έχει παρατηρηθεί.'},
      {id:'handover-guess',label:'Δίνω μόνο την προσωπική μου υποψία για διάγνωση, χωρίς άλλες πληροφορίες.',outcome:'review',feedback:'Η παράδοση χρειάζεται αντικειμενικές παρατηρήσεις και σαφές ιστορικό ενεργειών, όχι μόνο μία υποψία.'}
    ]
  }
];
function safe(text){return String(text??'');}
export const CASES = Object.freeze([
  {
    id:'breathing-home',version:1,
    title:'Δύσπνοια σε οικία',
    icon:'🫁',
    subtitle:'Προνοσοκομειακή αποστολή · εκπαιδευτικό παράδειγμα',
    description:'Κλήση σε οικία για ενήλικα που αναφέρει δυσκολία στην αναπνοή. Δεν είναι γνωστή η διάγνωση. Στόχος είναι η ασφαλής, οργανωμένη προσέγγιση — όχι η απόφαση θεραπείας.',
    review_status:'clinical-review-pending',
    phases:PHASES
  },
  {
    id:'collision-road',version:1,
    title:'Τροχαίο σε οδικό δίκτυο',
    icon:'🚑',
    subtitle:'Οργάνωση σκηνής · εκπαιδευτικό παράδειγμα',
    description:'Κλήση για τροχαίο σε δρόμο με διερχόμενα οχήματα. Οι πληροφορίες είναι περιορισμένες. Στόχος είναι η ασφάλεια, η οργανωμένη εκτίμηση και η επικοινωνία.',
    review_status:'clinical-review-pending',
    phases:PHASES
  }
]);
export const CASE_MAP = new Map(CASES.map(c=>[c.id,c]));
export const PHASE_IDS = PHASES.map(p=>p.id);
export function getCase(id) {return CASE_MAP.get(safe(id))||null;}
