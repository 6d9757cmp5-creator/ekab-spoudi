/* MENTOR OS capability registry. UI only: never writes study scores, sessions or sync state.
 * Statuses are capability-level and conservative: "available" can mean a limited prototype.
 * Update only after technical evidence and required human/clinical review.
 */
const ITEMS = [
  {id:"01",phase:1,title:"Ελληνικός εκπαιδευτικός διάλογος",status:"available",
   note:"Περιορισμένες προκαθορισμένες απαντήσεις με προσαρμογή από τις δοκιμές ATLA — όχι γενικό AI.",
   next:"Εμπλουτισμός μόνο με εγκεκριμένη βιβλιοθήκη και σαφή προέλευση απαντήσεων.",href:"../mentor-lab.html",action:"Άνοιγμα «Μελέτη και ασκήσεις»",evidence:"PR #108 · στο main"},
  {id:"02",phase:1,title:"Ελληνική ανάγνωση απάντησης",status:"available",
   note:"Προαιρετική φωνή εξόδου από τον browser, εφόσον υποστηρίζεται. Δεν υπάρχει χρήση μικροφώνου.",
   next:"Έλεγχος φυσικής ελληνικής φωνής και προσβασιμότητας στο πραγματικό iPhone.",href:"../mentor-lab.html",action:"Άνοιγμα εκπαιδευτή",evidence:"PR #108 · στο main"},
  {id:"03",phase:1,title:"Προσωπικό πλάνο μελέτης",status:"available",
   note:"Στόχοι ΣΑΕΚ, ΕΟΠΠΕΠ, σεμινάρια και συνεδρίες 10/15/25/30 λεπτών. Τοπικές προτιμήσεις.",
   next:"Σύνδεση με εγκεκριμένα μαθησιακά μονοπάτια, χωρίς αλλαγές σε βαθμούς.",href:"../mentor-lab.html",action:"Άνοιγμα πλάνου",evidence:"PR #107 · στο main"},
  {id:"04",phase:1,title:"Μνήμη και βασικές δεξιότητες ATLA",status:"available",
   note:"Ξεχωριστές δοκιμαστικές καταγραφές, επανάληψη δεξιοτήτων και εξαγωγή. Όχι απόδειξη κλινικής επάρκειας.",
   next:"Ενιαία χαρτογράφηση Skills με νέα ασφαλή αποθήκευση και δυνατότητα διαγραφής.",href:"../mentor-lab.html",action:"Άνοιγμα μνήμης",evidence:"PR #85 · στο main"},




  {id:"09",phase:1,title:"3D Ανατομία στην αρχική οθόνη",status:"available",
   note:"Υπάρχει ξεχωριστή ενότητα Ανατομίας. Δεν αποτελεί ακόμη ενσωματωμένο 3D εργαλείο του ATLA.",
   next:"Επαναχρησιμοποίηση της υπάρχουσας ενότητας, όχι κατασκευή δεύτερης.",href:"../anatomia.html",action:"Άνοιγμα 3D Ανατομίας",evidence:"Υπάρχουσα διαδρομή εφαρμογής"},
  {id:"24",phase:1,title:"Εργαστήριο ΗΚΓ — διαδραστικό συνθετικό σχήμα",status:"available",
   note:"Μαθηματική καμπύλη P–QRS–T με αλλαγή συχνότητας και ελληνικές εκπαιδευτικές εξηγήσεις. Δεν διαβάζει πραγματικό ΗΚΓ και δεν ερμηνεύει αρρυθμίες.",
   next:"Πραγματικό ECG Intelligence μόνο με κλινικά εγκεκριμένο υλικό, τεκμήρια, έλεγχο ερμηνειών και τη ρητή έγκρισή σου για AI.",href:"../mentor-ecg.html",action:"Άνοιγμα συνθετικού Εργαστηρίου ΗΚΓ",evidence:"PR #114 · στο main"},
  {id:"25",phase:1,title:"Προφορική εξάσκηση — χωρίς AI",status:"available",
   note:"Έξι ελληνικές οργανωτικές ερωτήσεις, χειροκίνητος αυτοέλεγχος και προαιρετική ανάγνωση ερώτησης. Δεν υπάρχει μικρόφωνο ούτε επίσημη βαθμολόγηση.",
   next:"Πραγματικές προφορικές εξετάσεις με συναίνεση, ελεγμένες ερωτήσεις και δικλείδες απορρήτου μόνο μετά από έλεγχο.",href:"../mentor-oral.html",action:"Άνοιγμα προφορικής εξάσκησης",evidence:"PR #110 · στο main"},




  {id:"14",phase:3,title:"Σύνδεση υπάρχουσας 3D Ανατομίας με ATLA",status:"pending",
   note:"Άνοιγμα συγκεκριμένου οργάνου ή οστού από μάθημα/περιστατικό, με ελληνική ορολογία.",
   next:"Ενιαίοι σύνδεσμοι/αναγνωριστικά από ATLA προς την υπάρχουσα ενότητα.",evidence:"Προδιαγραφή"},
  {id:"15",phase:3,title:"Βιβλιοθήκη 15 πηγών και παραπομπές",status:"pending",
   note:"Σε απομονωμένο PR #83: 15 καταχωρισμένες πηγές, 7 με εξαγμένο κείμενο, 0 εγκεκριμένα αποσπάσματα. Δεν είναι παραγωγική βάση AI.",
   next:"Άδειες, πλήρης εισαγωγή, ανθρώπινος κλινικός έλεγχος, ελληνική επιμέλεια και citations.",evidence:"PR #83 · draft"},
  {id:"16",phase:3,title:"ECG Intelligence Lab — πραγματική κλινική ερμηνεία",status:"pending",
   note:"Εκπαιδευτική αναγνώριση ρυθμών, διαδραστικά ίχνη, εξήγηση από καθηγητή.",
   next:"Αδειοδοτημένα δείγματα και κλινικά εγκεκριμένες ερμηνείες πριν ενεργοποιηθεί.",evidence:"Προδιαγραφή"},

  {id:"18",phase:3,title:"Προσωπική ιατρική ακαδημία",status:"pending",
   note:"Ενοποιημένη εκπαίδευση ΣΑΕΚ/ΕΟΠΠΕΠ/σεμιναρίων, επαναλήψεις και προσωποποιημένες προτάσεις.",
   next:"Σύνδεση ελεγμένης ύλης και μαθησιακού πλάνου με ξεχωριστά ATLA δεδομένα.",evidence:"Προδιαγραφή"},
  {id:"19",phase:4,title:"Ιατρική ομάδα AI",status:"pending",
   note:"Εικονικός συνάδελφος, συντονιστής και εκπαιδευτής με ρόλους, ομιλία και αντιδράσεις.",
   next:"Απαιτεί ελεγμένους ρόλους, έλεγχο εκφράσεων και ρητή έγκριση σύνδεσης AI.",evidence:"Δεν έχει συνδεθεί AI"},
  {id:"20",phase:4,title:"Προφορικές εξετάσεις ΕΟΠΠΕΠ",status:"pending",
   note:"Ερωτήσεις με φυσική φωνή, αναγνώριση προφορικών απαντήσεων και εκπαιδευτική αξιολόγηση.",
   next:"Χρειάζεται συναίνεση μικροφώνου, τεκμηριωμένες ερωτήσεις, ελληνικό speech recognition, privacy review.",evidence:"Δεν έχει ενεργοποιηθεί μικρόφωνο"},
  {id:"21",phase:4,title:"Πλήρης AI καθηγητής με φυσική συνομιλία",status:"unavailable",
   note:"Η υπάρχουσα λειτουργία είναι περιορισμένος οδηγός. Δεν υπάρχει ελεύθερη συνομιλία με συνδεδεμένο γλωσσικό μοντέλο.",
   next:"Η ενεργοποίηση AI θα γίνει μόνο όταν έχει ολοκληρωθεί ο σχεδιασμός και την εγκρίνεις εσύ.",evidence:"Δεν υπάρχει ενεργή σύνδεση AI"},

  {id:"23",phase:4,title:"Χρήση για πραγματικά περιστατικά / ιατρικές οδηγίες",status:"unavailable",
   note:"Ο ATLA είναι αποκλειστικά εκπαιδευτικό βοήθημα. Δεν διαχειρίζεται πραγματικές κλήσεις ή ασθενείς και δεν παρέχει πραγματική κλινική καθοδήγηση.",
   next:"Εκτός πεδίου της εκπαιδευτικής εφαρμογής. Δεν θα εμφανιστεί ως ενεργό εργαλείο πραγματικού ΕΚΑΒ.",evidence:"Σταθερός περιορισμός ασφάλειας"}
];
const TITLES={1:"01 · Υπάρχουσες λειτουργίες",2:"02 · Εργαλεία εκπαίδευσης",3:"03 · Βιβλιοθήκη, δεξιότητες και εργαλεία",4:"04 · Προχωρημένη AI και έλεγχοι"};
const LABELS={available:"Διαθέσιμο · δοκιμαστικό",pending:"Εκκρεμεί",unavailable:"Μη διαθέσιμο"};
const root=document.querySelector("#capability-groups");
const create=(tag,cls,value)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(value!==undefined)n.textContent=value;return n};
for(const p of [1,2,3,4]){
 const group=create("section","capability-phase");
 group.dataset.phase=String(p);
 const h=create("h2",null,TITLES[p]);group.append(h);
 const grid=create("div","capability-grid");
 for(const entry of ITEMS.filter(i=>i.phase===p)){
  const card=create("article","capability-card");card.dataset.status=entry.status;
  const details=create("details");
  const summary=create("summary");
  const top=create("span","capability-heading");top.append(create("span","capability-number","#"+entry.id),create("strong",null,entry.title));
  summary.append(top,create("span","capability-status status-"+entry.status,LABELS[entry.status]));
  const content=create("div","capability-body");
  content.append(create("p",null,entry.note),create("p","capability-next","Επόμενο βήμα: "+entry.next),create("p","capability-evidence","Τεκμηρίωση: "+entry.evidence));
  if(entry.href){
    const a=create("a","capability-action",entry.action);a.href=entry.href;
    content.append(a);
  }else content.append(create("p","capability-disabled","Η πλήρης λειτουργία δεν ανοίγει ακόμη."));
  details.append(summary,content);card.append(details);grid.append(card);
 }
 group.append(grid);root.append(group);
}
const counts={available:ITEMS.filter(x=>x.status==="available").length,pending:ITEMS.filter(x=>x.status==="pending").length,unavailable:ITEMS.filter(x=>x.status==="unavailable").length};
for(const [key,count] of Object.entries(counts))document.querySelector("[data-count="+key+"]").textContent=String(count);
const report=document.querySelector("#filter-report");
document.querySelectorAll("[data-filter]").forEach(btn=>btn.addEventListener("click",()=>{
 const filter=btn.dataset.filter;
 for(const button of document.querySelectorAll("[data-filter]"))button.setAttribute("aria-pressed",String(button===btn));
 let visible=0;
 for(const card of document.querySelectorAll(".capability-card")){
  card.hidden=filter!=="all"&&card.dataset.status!==filter;
  if(!card.hidden)visible++;
 }
 for(const phase of document.querySelectorAll(".capability-phase"))
  phase.hidden=![...phase.querySelectorAll(".capability-card")].some(x=>!x.hidden);
 report.textContent="Εμφανίζονται "+visible+" από "+ITEMS.length+" λειτουργίες.";
}));
report.textContent="Εμφανίζονται όλες οι "+ITEMS.length+" λειτουργίες.";
