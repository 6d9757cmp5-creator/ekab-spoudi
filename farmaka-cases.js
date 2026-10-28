/* EKAB Spoudi · educational level 4: one clinical-reasoning scenario at a time.
   Cases illustrate published sources; they are NOT treatment orders, authorization,
   individualized advice or independent clinical approval. No data is saved. */
(()=>{
'use strict';
const cases=[
 {
  id:'anaphylaxis',topic:'Αναφυλαξία',question:'Μετά από πιθανή έκθεση σε αλλεργιογόνο, ένας ενήλικος εμφανίζει αιφνίδια δυσκολία στην αναπνοή και αδυναμία. Ποια σκέψη είναι η ασφαλέστερη;',
  options:['Να αποκλειστεί η αναφυλαξία επειδή δεν αναφέρεται εξάνθημα.','Να αναγνωριστεί πιθανή αναφυλαξία, να κληθεί άμεσα βοήθεια και η IM αδρεναλίνη να χρησιμοποιηθεί μόνο από κατάλληλα εκπαιδευμένο πρόσωπο/μέσω προβλεπόμενου αυτοενιέμενου σκευάσματος.','Να θεωρηθεί ότι ένα αντιισταμινικό αρκεί για το πρόβλημα αεραγωγού.'],
  correct:1,why:'Η αναφυλαξία μπορεί να περιλαμβάνει πρόβλημα αεραγωγού, αναπνοής ή κυκλοφορίας ακόμη και χωρίς εμφανή δερματικά σημεία. Η άμεση κλήση βοήθειας και η κατάλληλη αντιμετώπιση από εκπαιδευμένα πρόσωπα είναι κρίσιμες. Τα αντιισταμινικά δεν αντικαθιστούν την αδρεναλίνη.',
  sourceTitle:'RCUK First Aid 2025 · Anaphylaxis',
  sourceUrl:'https://www.resus.org.uk/professional-library/2025-resuscitation-guidelines/first-aid-guidelines'
 },
 {
  id:'hypoglycaemia',topic:'Υπογλυκαιμία',question:'Άτομο με υποψία υπογλυκαιμίας δεν ανταποκρίνεται και δεν μπορεί να καταπιεί με ασφάλεια. Ποιο σφάλμα πρέπει να αποφευχθεί;',
  options:['Η χορήγηση χυμού ή ζάχαρης από το στόμα, λόγω κινδύνου εισρόφησης.','Η εκτίμηση αεραγωγού και αναπνοής.','Η άμεση κλήση επείγουσας βοήθειας.'],
  correct:0,why:'Η γλυκόζη από το στόμα προϋποθέτει ασθενή ξύπνιο που καταπίνει με ασφάλεια. Σε μη ανταποκρινόμενο άτομο δεν δίνουμε τροφή ή υγρά από το στόμα· προέχουν η εκτίμηση ABC και η επείγουσα βοήθεια.',
  sourceTitle:'RCUK First Aid 2025 · Hypoglycaemia',
  sourceUrl:'https://www.resus.org.uk/professional-library/2025-resuscitation-guidelines/first-aid-guidelines'
 },
 {
  id:'opioids',topic:'Οπιοειδή και αναπνοή',question:'Υπάρχει υποψία υπερδοσολογίας οπιοειδών και το άτομο αναπνέει πολύ αργά. Πού βρίσκεται ο άμεσος κίνδυνος;',
  options:['Στην απουσία όρεξης, επομένως προέχει η σίτιση.','Αποκλειστικά στο μέγεθος της κόρης, χωρίς να χρειάζεται έλεγχος αναπνοής.','Στην αναπνευστική καταστολή: έλεγχος ABC, κλήση βοήθειας, υποστήριξη αναπνοής ανά εκπαίδευση και ναλοξόνη μόνο από εκπαιδευμένο άτομο.'],
  correct:2,why:'Η επικίνδυνη αναπνευστική καταστολή είναι πρωτεύων κίνδυνος. Η ναλοξόνη δεν αντικαθιστά τον έλεγχο αεραγωγού, την αναζωογόνηση όπου ενδείκνυται ή την επανεκτίμηση.',
  sourceTitle:'RCUK First Aid 2025 · Opiate/Opioid poisoning',
  sourceUrl:'https://www.resus.org.uk/professional-library/2025-resuscitation-guidelines/first-aid-guidelines'
 },
 {
  id:'seizure',topic:'Παρατεταμένοι σπασμοί',question:'Γενικευμένη σπασμωδική κρίση διαρκεί ήδη πέντε λεπτά. Ποια κλινική αναγνώριση είναι σωστή;',
  options:['Πρόκειται για επείγουσα κατάσταση: χρειάζεται άμεση βοήθεια, ασφάλεια/ABC και εφαρμογή διαθέσιμου εξατομικευμένου σχεδίου μόνο από αρμόδιο προσωπικό.','Δεν υπάρχει λόγος επείγουσας ανταπόκρισης πριν περάσουν 30 λεπτά.','Κάθε άτομο μπορεί να επιλέξει μόνο του αντιεπιληπτικό και δόση.'],
  correct:0,why:'Το NICE NG217 αντιμετωπίζει γενικευμένους σπασμούς διάρκειας πέντε λεπτών ή περισσότερο ως status epilepticus που απαιτεί επείγουσα ανταπόκριση. Η φαρμακευτική επιλογή προϋποθέτει σχέδιο, εκπαίδευση και αρμοδιότητα.',
  sourceTitle:'NICE NG217 · Status epilepticus (ενημ. 2025)',
  sourceUrl:'https://www.nice.org.uk/guidance/ng217/chapter/7-Treating-status-epilepticus-repeated-or-cluster-seizures-and-prolonged-seizures'
 },
 {
  id:'als',topic:'Ανακοπή και ALS',question:'Σε ανακοπή ενηλίκου με απινιδώσιμο ρυθμό, η ομάδα ALS έχει δώσει τρεις απινιδώσεις. Ποια γνώση αφορά τον αλγόριθμο RCUK/ERC 2025;',
  options:['Η αδρεναλίνη της ανακοπής είναι το ίδιο σχήμα με τον αυτοενιέμενο μηχανισμό της αναφυλαξίας.','Η χορήγηση της πρώτης αδρεναλίνης προβλέπεται μετά την τρίτη απινίδωση, εντός πιστοποιημένης ομάδας ALS και χωρίς καθυστέρηση της ποιοτικής ΚΑΡΠΑ.','Η φαρμακευτική αγωγή αντικαθιστά τις συμπιέσεις και την απινίδωση.'],
  correct:1,why:'Οι οδηγίες ALS διαχωρίζουν ρητά την αντιμετώπιση απινιδώσιμων ρυθμών από μη απινιδώσιμους. Η ΚΑΡΠΑ και η απινίδωση παραμένουν θεμελιώδεις, ενώ η φαρμακευτική πράξη εκτελείται μόνο από κατάλληλα εκπαιδευμένη ομάδα.',
  sourceTitle:'RCUK Adult ALS 2025 · Shockable rhythms',
  sourceUrl:'https://www.resus.org.uk/professional-library/2025-resuscitation-guidelines/adult-advanced-life-support-guidelines'
 },
 {
  id:'trauma',topic:'Τραύμα και TXA',question:'Ασθενής με σοβαρή εξωτερική αιμορραγία μετά από τραύμα. Ποια δήλωση συνδυάζει σωστά τις προτεραιότητες;',
  options:['Η τρανεξαμική αγωγή (TXA) αντικαθιστά τον έλεγχο της αιμορραγίας.','Η διακομιδή μπορεί πάντα να αναβληθεί για να δοθούν περισσότερα φάρμακα.','Προέχει ο άμεσος έλεγχος της αιμορραγίας και η επείγουσα μεταφορά· το TXA, όπου ενδείκνυται, απαιτεί έγκαιρη χρήση σύμφωνα με εξουσιοδοτημένο πρωτόκολλο και δεν αντικαθιστά την αιμόσταση.'],
  correct:2,why:'Το NICE NG39 διακρίνει τον άμεσο μηχανικό έλεγχο αιμορραγίας από τη συμπληρωματική φαρμακευτική θεραπεία. Το TXA δεν υποκαθιστά πίεση, αιμοστατικά μέσα, ειδική φροντίδα ή διακομιδή.',
  sourceTitle:'NICE NG39 · Management of haemorrhage',
  sourceUrl:'https://www.nice.org.uk/guidance/ng39/chapter/Recommendations'
 },
 {
  id:'adrenaline-safety',topic:'Ασφάλεια φαρμάκων',question:'Σε εκπαιδευτική σύγκριση αδρεναλίνης στην αναφυλαξία και στην ανακοπή, τι πρέπει πάντα να διαχωρίζεται;',
  options:['Ένδειξη, οδός, σκεύασμα/συγκέντρωση, δόση και απαιτούμενη εξουσιοδότηση.','Μόνο η ελληνική ή αγγλική εμπορική ονομασία.','Τίποτα: κάθε αδρεναλίνη χρησιμοποιείται με τον ίδιο τρόπο.'],
  correct:0,why:'Η σύγχυση της IM αδρεναλίνης στην αναφυλαξία με την IV/IO χορήγηση στην ανακοπή αποτελεί σοβαρό δυνητικό φαρμακευτικό σφάλμα. Η αναγνώριση δεν αποτελεί άδεια χορήγησης.',
  sourceTitle:'RCUK Special Circumstances 2025 · Anaphylaxis / Adult ALS',
  sourceUrl:'https://www.resus.org.uk/professional-library/2025-resuscitation-guidelines/special-circumstances-guidelines'
 }
];
window.EKAB_PHARMA_CASES=cases;
if(typeof document==='undefined')return;
function init(){
 const root=document.getElementById('phCaseStage');
 if(!root)return;
 let index=0,correct=0,answered=false;
 const $=(tag,cls,text)=>{
  const x=document.createElement(tag);if(cls)x.className=cls;
  if(text!==undefined)x.textContent=text;
  return x;
 };
 function render(){
  root.replaceChildren();answered=false;
  const item=cases[index];
  root.append($('p','ph-case-progress','Περιστατικό '+(index+1)+' / '+cases.length+' · Σωστές απαντήσεις '+correct));
  root.append($('p','ph-case-topic',item.topic));
  const question=$('h3','ph-case-question',item.question);
  root.append(question);
  const options=$('div','ph-case-options');options.setAttribute('role','group');options.setAttribute('aria-label','Επιλογές περιστατικού');
  const feedback=$('div','ph-case-feedback');feedback.hidden=true;feedback.setAttribute('role','status');feedback.setAttribute('aria-live','polite');
  const actions=$('div','ph-case-actions');
  const next=$('button','ph-button','Επόμενο περιστατικό');next.type='button';next.hidden=true;
  const restart=$('button','ph-button secondary','Ξανά από την αρχή');restart.type='button';restart.hidden=true;
  item.options.forEach((answer,i)=>{
   const button=$('button','ph-case-option',(i+1)+'. '+answer);button.type='button';
   button.addEventListener('click',()=>{
    if(answered)return;answered=true;
    if(i===item.correct)correct++;
    Array.from(options.children).forEach((b,j)=>{
     b.disabled=true;if(j===item.correct)b.classList.add('correct');
     else if(j===i)b.classList.add('wrong');
    });
    feedback.replaceChildren();
    feedback.append($('strong','',i===item.correct?'Σωστή συλλογιστική.':'Σημείο για επανάληψη.'));
    feedback.append($('p','',item.why));
    const a=$('a','ph-case-source','Επιστημονική πηγή · '+item.sourceTitle+' ↗');
    a.href=item.sourceUrl;a.target='_blank';a.rel='noopener noreferrer';feedback.append(a);
    feedback.hidden=false;
    if(index===cases.length-1){restart.hidden=false;feedback.append($('p','ph-case-result','Τελική επίδοση: '+correct+' / '+cases.length+'.'));}
    else next.hidden=false;
   });
   options.append(button);
  });
  next.addEventListener('click',()=>{if(!answered)return;index++;render();});
  restart.addEventListener('click',()=>{index=0;correct=0;render();});
  root.append(options,feedback);actions.append(next,restart);root.append(actions);
 }
 render();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
else init();
})();
