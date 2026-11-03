/**
 * ATLAS demo chat replies — intentionally synthetic and non-clinical.
 * No model, network, grading, learner assessment, or patient decision-making.
 * Every reply is prominently marked as a fake output.
 */
export const MOCK_LABEL="ΔΟΚΙΜΑΣΤΙΚΗ ΑΠΑΝΤΗΣΗ · Εικονικό AI, όχι πραγματικό μοντέλο";
const normalize=s=>String(s||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLocaleLowerCase("el").replace(/ς/g,"σ").trim();
export function mockAtlasReply({question="",page="",level="student"}={}){
 const q=normalize(question).slice(0,300);
 const title=String(page||"").trim().slice(0,95);
 let response;
 if(/(^|\s)(γεια|καλημερα|καλησπερα|hello)(\s|$)/.test(q)){
  response="Γεια σου! Το παράθυρο συνομιλίας λειτουργεί. Εδώ, όταν ενεργοποιηθεί το πραγματικό ATLAS, θα λαμβάνεις εξατομικευμένες απαντήσεις.";
 }else if(/(δυσκολ|δεν καταλαβ|απλα|εξηγησ)/.test(q)){
  response="Έλαβα το αίτημα για απλούστερη εξήγηση. Σε αυτή τη δοκιμή δείχνω πώς θα εμφανίζεται η προσαρμογή του ύφους, όχι κάποια πραγματική ιατρική απάντηση.";
 }else if(/(επαναληψ|προοδο|λαθ|διαβασ|μελετ)/.test(q)){
  response="Δοκιμή μαθησιακής καθοδήγησης: εδώ θα εμφανίζεται προσωποποιημένη επανάληψη όταν συνδεθεί με το ελεγμένο εκπαιδευτικό ιστορικό. Δεν διάβασα βαθμούς ή λάθη σου.";
 }else if(/(ασθεν|σενάρι|περιστατικ|αποστολ|προσομοιωτ)/.test(q)){
  response="Δοκιμή συνδέσμου Clinical Cockpit: στο πραγματικό σύστημα θα εμφανίζεται βοήθεια για ένα συνθετικό εκπαιδευτικό περιστατικό. Δεν έγινε ανάλυση ασθενούς ή κλινικής απόφασης.";
 }else if(/(εοππεπ|σαεκ|κεφαλαι|εξετασ)/.test(q)){
  response="Δοκιμή εκπαιδευτικής ροής: εδώ θα μπορούσα να προτείνω κατάλληλο κεφάλαιο και ερώτηση αυτοελέγχου, μετά από σύνδεση με το ενιαίο πρόγραμμα μελέτης.";
 }else{
  response="Έλαβα την ερώτησή σου: «"+String(question).trim().slice(0,150)+"». Η εμφάνιση, η καταγραφή της συνομιλίας και η ανταλλαγή μηνυμάτων δοκιμάζονται. Δεν παράγω πραγματική απάντηση από AI.";
 }
 const context=title?"\nΤρέχουσα οθόνη: "+title+".":"";
 const depth=level==="beginner"?"\nΕπίπεδο δοκιμής: αρχάριος.":level==="scientific"?"\nΕπίπεδο δοκιμής: επιστημονικό.":"";
 return MOCK_LABEL+"\n\n"+response+context+depth;
}
