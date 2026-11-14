/**
 * MENTOR OS spoken rehearsal prompts. Only organisational educational questions.
 * No speech-to-text, AI, medical diagnosis, automatic marking, official grades or persistence.
 */
export const QUESTIONS=Object.freeze([
 {id:'scene',title:'Ασφάλεια σκηνής',prompt:'Πώς θα περιέγραφες τη διαδικασία οργανωτικής αναγνώρισης κινδύνων πριν από προσέγγιση ενός συνθετικού τροχαίου;',
  checks:['Αναφέρθηκα σε πιθανούς κινδύνους','Ξεχώρισα όσα είναι γνωστά από όσα πρέπει να επιβεβαιωθούν','Εξήγησα γιατί προηγείται η ασφάλεια']},
 {id:'report',title:'Επικοινωνία με συντονισμό',prompt:'Δώσε προφορικά μια σύντομη, σαφή αρχική αναφορά για συνθετικό συμβάν με δύο εμπλεκόμενους.',
  checks:['Ανέφερα την τοποθεσία ως εκπαιδευτικό στοιχείο','Ανέφερα δύο αναφερόμενους εμπλεκόμενους','Ξεχώρισα επιβεβαιωμένες από μη επιβεβαιωμένες πληροφορίες']},
 {id:'handover',title:'Δομημένη παράδοση',prompt:'Πώς θα παρέδιδες τις διαθέσιμες παρατηρήσεις ενός συνθετικού περιστατικού, αποφεύγοντας μη τεκμηριωμένες διαγνώσεις;',
  checks:['Περιέγραψα το συμβάν','Ανέφερα μόνο παρατηρήσεις που καταγράφηκαν','Περιέγραψα μεταβολές και επικοινωνίες χωρίς εικασίες']},
 {id:'equipment',title:'Αναγνώριση εξοπλισμού',prompt:'Πώς εξηγείς τη διαφορά ανάμεσα στην αναγνώριση μιας εκπαιδευτικής κάρτας εξοπλισμού και την πραγματική εκπαίδευση χειρισμού;',
  checks:['Διευκρίνισα ότι η κάρτα δεν υποκαθιστά πρακτική εκπαίδευση','Αναφέρθηκα στη σημασία οδηγιών κατασκευαστή','Δεν ισχυρίστηκα ότι η θεωρία πιστοποιεί χειρισμό']},
 {id:'observations',title:'Αντικειμενική καταγραφή',prompt:'Πώς παρουσιάζεις δύο διαφορετικές σειρές συνθετικών παρατηρήσεων χωρίς να αποδίδεις αυτόματα διάγνωση ή προτεραιότητα;',
  checks:['Διαχώρισα τα δύο άτομα','Περιέγραψα τις μεταβολές με αναφορά στον χρόνο','Δεν παρήγαγα διάγνωση από τις εκπαιδευτικές τιμές']},
 {id:'reflection',title:'Αυτοαναστοχασμός',prompt:'Πώς μπορείς να χρησιμοποιήσεις μια λανθασμένη επιλογή σε εκπαιδευτική αποστολή για να βελτιώσεις την επόμενη προσπάθεια;',
  checks:['Περιέγραψα τι χρειάζεται επανάληψη','Συνέδεσα την επανάληψη με συγκεκριμένο εκπαιδευτικό στόχο','Δεν εξέλαβα την προσπάθεια ως επίσημη πιστοποίηση']}
]);
export function getOralQuestion(index){
 if(!Number.isInteger(index)||index<0||index>=QUESTIONS.length)throw Error('invalid-oral-index');
 return QUESTIONS[index];
}
export function checklistSummary(index,selected){
 const q=getOralQuestion(index);
 if(!Array.isArray(selected))throw Error('invalid-oral-checklist');
 const ids=new Set(selected);
 if(ids.size!==selected.length||selected.some(i=>!Number.isInteger(i)||i<0||i>=q.checks.length))throw Error('invalid-oral-checklist');
 return {checked:ids.size,total:q.checks.length,
  note:'Αυτοέλεγχος '+ids.size+' από '+q.checks.length+' σημείων. Δεν υπάρχει αυτόματη βαθμολόγηση ή έλεγχος ακρίβειας απάντησης.'};
}
