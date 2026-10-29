/* ΕΚΑΒ Σπουδή — αναζήτηση διατάξεων, όχι αυτόματη νομική άδεια. */
(()=>{'use strict';
const container=document.getElementById('actLookup');
if(!container)return;
const data=[{"id":"vitals","title":"Ζωτικά σημεία","terms":"αναπνοές σφύξεις πίεση θερμοκρασία ζωτικά","article":"4, σημείο 1","status":"Στο Π.Δ.","summary":"Το κείμενο αναφέρει έλεγχο και μέτρηση ζωτικών σημείων.","limit":"Η πρακτική εκτέλεση προϋποθέτει κατάρτιση, κατάλληλο εξοπλισμό και ισχύουσες οδηγίες."},{"id":"airway","title":"Βασικοί χειρισμοί αεραγωγού","terms":"αεραγωγός oropharyngeal nasopharyngeal opa npa","article":"4, σημείο 2","status":"Στο Π.Δ.","summary":"Προβλέπονται χειροκίνητοι χειρισμοί και βασικοί αεραγωγοί.","limit":"Δεν περιλαμβάνεται στο σημείο αυτό εξουσιοδότηση για ανεξάρτητη ενδοτραχειακή διασωλήνωση."},{"id":"oxygen","title":"Χορήγηση οξυγόνου","terms":"οξυγόνο οξυγονοθεραπεία oxygen o2","article":"4, σημείο 3α","status":"Στο Π.Δ.","summary":"Το κείμενο αναφέρει τη χορήγηση οξυγόνου για αναπνευστική υποστήριξη.","limit":"Δεν καθορίζει από μόνο του δόση, στόχο κορεσμού ή πότε ενδείκνυται: ακολουθούνται οι τρέχουσες κλινικές οδηγίες."},{"id":"bvm","title":"Αυτοδιατεινόμενος ασκός","terms":"ambu ασκός bvm bag valve mask αναπνοή","article":"4, σημείο 3β","status":"Στο Π.Δ.","summary":"Προβλέπεται υποστήριξη αναπνοής με αυτοδιατεινόμενο ασκό.","limit":"Προϋποτίθεται κατάλληλη εκπαίδευση και αξιολόγηση της αναγκαιότητας."},{"id":"wounds","title":"Φροντίδα τραυμάτων","terms":"τραύμα ασηψία αντισηψία πληγή επίδεση","article":"4, σημείο 4","status":"Στο Π.Δ.","summary":"Περιλαμβάνονται φροντίδα τραυμάτων και μέτρα ασηψίας/αντισηψίας.","limit":"Δεν συνάγεται γενική δυνατότητα χειρουργικής συρραφής χωρίς ιατρό."},{"id":"bleeding","title":"Έλεγχος εξωτερικής αιμορραγίας","terms":"αιμορραγία πίεση ίσχαιμη περίδεση τουρνικέ","article":"4, σημείο 5","status":"Στο Π.Δ.","summary":"Το Π.Δ. αναφέρει την άμεση πίεση και την ίσχαιμη περίδεση.","limit":"Το ποια μέθοδος ενδείκνυται κλινικά εξαρτάται από σύγχρονες οδηγίες και εκπαίδευση."},{"id":"immobilization","title":"Ακινητοποίηση και ασφαλής μεταφορά","terms":"κολάρο σανίδα scoop φορείο ακινητοποίηση","article":"4, σημείο 6","status":"Στο Π.Δ.","summary":"Αναφέρονται συγκεκριμένα μέσα και διαδικασίες μεταφοράς τραυματία.","limit":"Η απαρίθμηση παλαιών μέσων δεν σημαίνει υποχρεωτική χρήση τους σε κάθε ασθενή σήμερα."},{"id":"iv","title":"Περιφερική φλεβική γραμμή και υγρά","terms":"φλέβα περιφερική γραμμή φλεβοκαθετήρας iv ορός ενδοφλέβια","article":"4, σημείο 7","status":"Στο Π.Δ.","summary":"Το Π.Δ. περιλαμβάνει τοποθέτηση περιφερικής φλεβικής γραμμής και χορήγηση υγρών όπου απαιτείται.","limit":"Η συγκεκριμένη ένδειξη, τα υγρά και οι όροι εφαρμογής πρέπει να ελέγχονται σύμφωνα με εκπαίδευση και ισχύοντα πρωτόκολλα· δεν αφορά γενική χορήγηση φαρμάκων."},{"id":"warming","title":"Διατήρηση θερμοκρασίας","terms":"θερμοκρασία υποθερμία ζέσταμα","article":"4, σημείο 8","status":"Στο Π.Δ.","summary":"Προβλέπεται διατήρηση της θερμοκρασίας σώματος του ασθενούς.","limit":"Η κλινική επιλογή μέσου βασίζεται στις ισχύουσες οδηγίες."},{"id":"cpr","title":"Καρδιοαναπνευστική Αναζωογόνηση","terms":"καρπα cpr bls αναζωογόνηση","article":"4, σημείο 9","status":"Στο Π.Δ.","summary":"Αναφέρεται η βασική υποστήριξη της ζωής (ΚΑΡΠΑ).","limit":"Τεχνικές, αλγόριθμοι και ρυθμοί πρέπει να ακολουθούν τις ενημερωμένες οδηγίες αναζωογόνησης."},{"id":"aed","title":"Αυτόματος εξωτερικός απινιδωτής","terms":"aed aed απινιδωτής απινίδωση","article":"4, σημείο 10","status":"Στο Π.Δ.","summary":"Αναφέρεται η εφαρμογή και χρήση αυτόματου εξωτερικού απινιδωτή (AED).","limit":"Δεν ταυτίζεται με γενική εξουσιοδότηση για χειροκίνητη απινίδωση ή όλες τις εξειδικευμένες τεχνικές."},{"id":"infusion","title":"Έλεγχος συσκευών έγχυσης και παροχετεύσεων","terms":"αντλία έγχυση συσκευές παροχετεύσεις","article":"4, σημείο 11","status":"Στο Π.Δ.","summary":"Αναφέρεται παρακολούθηση λειτουργίας συσκευών έγχυσης και παροχετεύσεων.","limit":"Η παρακολούθηση συσκευής δεν σημαίνει αυτομάτως εξουσία αλλαγής θεραπείας."},{"id":"safety","title":"Ασφάλεια ασθενούς και διασώστη","terms":"ασφάλεια σκηνή ασθενής πλήρωμα","article":"4, σημείο 12","status":"Στο Π.Δ.","summary":"Προβλέπονται μέτρα προστασίας ασθενούς και διασώστη.","limit":"Το σημείο δεν υποκαθιστά ειδικά πρωτόκολλα διαχείρισης επικίνδυνης σκηνής."},{"id":"hygiene","title":"Ασηψία μέσου διακομιδής","terms":"απολύμανση καθαρισμός αντισηψία όχημα","article":"4, σημείο 13","status":"Στο Π.Δ.","summary":"Αναφέρονται μέτρα ασηψίας και αντισηψίας εξαρτημάτων και χώρου διακομιδής.","limit":"Η μέθοδος και οι χρόνοι εφαρμογής ακολουθούν τις σημερινές οδηγίες ελέγχου λοιμώξεων."},{"id":"equipment","title":"Έλεγχος εξοπλισμού ασθενοφόρου","terms":"εξοπλισμός βλάβη συσκευές συντήρηση","article":"4, σημεία 14–15","status":"Στο Π.Δ.","summary":"Περιλαμβάνεται έλεγχος εξοπλισμού, αναφορά βλαβών και φροντίδα επάρκειας υλικών.","limit":"Η συντήρηση πέρα από την εκπαίδευση και αρμοδιότητα δεν τεκμηριώνεται από αυτά τα σημεία."},{"id":"transport","title":"Ασφαλής διακομιδή","terms":"διακομιδή ασθενής κόκκινος φάρος σειρήνα κοκ","article":"4, σημείο 16","status":"Στο Π.Δ.","summary":"Αναφέρεται η μεταφορά στον κατάλληλο υγειονομικό σχηματισμό, με την προβλεπόμενη οδική ασφάλεια.","limit":"Το Π.Δ. δεν επιτρέπει αδιακρίτως παραβίαση του ΚΟΚ ή μη ασφαλή οδήγηση."},{"id":"call","title":"Λήψη κλήσεων και οδηγίες πρώτων βοηθειών","terms":"166 κλήση τηλεφωνητής πρώτες βοήθειες","article":"4, σημείο 17","status":"Στο Π.Δ.","summary":"Προβλέπεται διαχείριση τηλεφωνικών κλήσεων και παροχή οδηγιών πρώτων βοηθειών.","limit":"Η τηλεφωνική καθοδήγηση βασίζεται στο εγκεκριμένο πρωτόκολλο του κέντρου."},{"id":"center","title":"Επικοινωνία με Συντονιστικό Κέντρο","terms":"συντονιστικό κέντρο επικοινωνία αναφορά","article":"4, σημείο 18","status":"Στο Π.Δ.","summary":"Η επικοινωνία με το Συντονιστικό Κέντρο περιλαμβάνεται στα καθήκοντα.","limit":"Ακολουθούνται οι ισχύουσες υπηρεσιακές διαδικασίες."},{"id":"ecg","title":"Λήψη ηλεκτροκαρδιογραφήματος","terms":"ηκγ ecg ekg ηλεκτροκαρδιογράφημα καρδιογράφημα","article":"4, σημείο 19","status":"Με εντολή ιατρού","summary":"Η λήψη ΗΚΓ αναφέρεται ρητά με εντολή ιατρού.","limit":"Μόνη η αναφορά του ΗΚΓ δεν σημαίνει ανεξάρτητη ιατρική διάγνωση ή ερμηνεία του."},{"id":"intubation","title":"Διασωλήνωση ή συρραφή: βοήθεια στον ιατρό","terms":"διασωλήνωση ενδοτραχειακή συρραφή ράμματα","article":"4, σημείο 20α","status":"Βοήθεια σε ιατρό","summary":"Το Π.Δ. αναφέρει βοήθεια στον ιατρό σε επείγουσες ενέργειες όπως η ενδοτραχειακή διασωλήνωση ή συρραφή.","limit":"Η «βοήθεια» δεν απονέμει γενική αυτοτελή αρμοδιότητα εκτέλεσης των πράξεων."},{"id":"drugs","title":"Φάρμακα: βοήθεια σε χορήγηση","terms":"φάρμακα φαρμακευτικά ένεση αδρεναλίνη ναλοξόνη","article":"4, σημείο 20β","status":"Βοήθεια σε ιατρό","summary":"Στο άρθρο 4 αναφέρεται η βοήθεια στον ιατρό κατά τη χορήγηση φαρμάκων.","limit":"Δεν προβλέπει γενική ανεξάρτητη χορήγηση οποιουδήποτε φαρμάκου· κάθε ειδική πράξη απαιτεί ξεχωριστή νομική και υπηρεσιακή τεκμηρίωση."},{"id":"advanced","title":"Εξειδικευμένη υποστήριξη ζωής: βοήθεια στον ιατρό","terms":"als acls εξειδικευμένη υποστήριξη","article":"4, σημείο 20γ","status":"Βοήθεια σε ιατρό","summary":"Αναφέρεται βοήθεια στον ιατρό σε εξειδικευμένη υποστήριξη ζωής.","limit":"Δεν ταυτίζεται με ανεξάρτητη άσκηση όλων των πράξεων ALS."},{"id":"mass","title":"Μαζικές απώλειες υγείας","terms":"μαζικές καταστροφές μαζικό συμβάν χβρπ","article":"4, σημείο 21","status":"Στο Π.Δ.","summary":"Περιλαμβάνεται συμμετοχή σε ομάδες διαχείρισης μαζικών απωλειών υγείας.","limit":"Ο ρόλος κάθε μέλους καθορίζεται από την αντίστοιχη εκπαίδευση και τον επιχειρησιακό σχεδιασμό."},{"id":"handover","title":"Έγγραφη παράδοση στο ΤΕΠ","terms":"τεπ παράδοση ασθενής καταγραφή αναφορά","article":"4, σημείο 22","status":"Στο Π.Δ.","summary":"Προβλέπεται έγγραφη ενημέρωση του προσωπικού ΤΕΠ κατά την παράδοση ασθενούς.","limit":"Η καταγραφή ακολουθεί τους κανόνες απορρήτου και τα υπηρεσιακά έντυπα."},{"id":"driving","title":"Οδήγηση ασθενοφόρου","terms":"οδήγηση δίπλωμα ασθενοφόρο μηχανή","article":"4, σημείο 23","status":"Στο Π.Δ.","summary":"Αναφέρεται η οδήγηση ασθενοφόρου και, προαιρετικά, μοτοσικλέτας άμεσης επέμβασης.","limit":"Το σημείο δεν αντικαθιστά τις απαιτήσεις άδειας οδήγησης και την υπηρεσιακή εκπαίδευση."},{"id":"birth","title":"Βοήθεια σε φυσιολογικό τοκετό","terms":"τοκετός επίτοκος έγκυος γέννα","article":"4, σημείο 24","status":"Στο Π.Δ.","summary":"Στο Π.Δ. αναφέρεται βοήθεια επιτόκου κατά φυσιολογικό τοκετό.","limit":"Η πράξη πρέπει να περιορίζεται στην εκπαίδευση και να ακολουθεί τις τρέχουσες οδηγίες αντιμετώπισης."},{"id":"other","title":"Επείγουσα πράξη που δεν αναφέρεται στο Π.Δ.","terms":"εκτός πδ άλλη ιατρική πράξη εντολή άρθρο 5","article":"5","status":"Ειδική προϋπόθεση","summary":"Το άρθρο 5 θέτει δυνατότητα για μη προβλεπόμενες επείγουσες πράξεις μόνο με απευθείας εντολή ιατρού Κινητής Ιατρικής Μονάδας ή Συντονιστικού Κέντρου ΕΚΑΒ και εντός του γνωστικού αντικειμένου.","limit":"Δεν αρκεί οποιαδήποτε γενική ή ανεπίσημη εντολή. Απαιτείται έλεγχος της ισχύουσας νομοθεσίας και των υπηρεσιακών διαδικασιών."}];
const sourcePdf='https://api.et.gr/apiFEK/1/2007/70/pdf';
const sourceText='https://lexio.gr/acts/pd-62-2007';
const search=container.querySelector('#actQuery');
const result=container.querySelector('#actResults');
const count=container.querySelector('#actCount');
const shortcut=container.querySelector('.act-examples');
const showAllButton=container.querySelector('#actShowAll');
const archive=document.getElementById('lawArchive');
const archiveCount=document.getElementById('lawCount');
const oldItems=Array.from(archive.querySelectorAll('.law-item'));
const oldGroups=Array.from(archive.querySelectorAll('.law-group'));
let showingAll=false;
const plain=x=>(x||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('el-GR');
function add(parent,tag,className,content){const el=document.createElement(tag);if(className)el.className=className;if(content!==undefined)el.textContent=content;parent.appendChild(el);return el;}
function link(parent,label,url){const a=add(parent,'a','act-link',label);a.href=url;a.target='_blank';a.rel='noopener noreferrer';return a;}
function renderCard(entry){
 const card=add(result,'details','act-card');
 const heading=add(card,'summary','');
 const titleRow=add(heading,'div','act-card-heading');
 add(titleRow,'span','act-card-title',entry.title);
 add(titleRow,'span','act-status',entry.status);
 const body=add(card,'div','act-card-body');
 add(body,'p','act-summary',entry.summary);
 const limit=add(body,'p','act-limits');
 add(limit,'strong',null,'Προϋποθέσεις / όρια: ');
 limit.append(document.createTextNode(entry.limit));
 const refs=add(body,'div','act-references');
 const location=entry.article==='5'?'άρθρο 5':'άρθρο '+entry.article;
 add(refs,'span','act-fek','ΦΕΚ Α΄ 70/2007 · Π.Δ. 62/2007 · '+location);
 const sources=add(refs,'div','act-source-links');
 link(sources,'Πρωτότυπο ΦΕΚ ↗',sourcePdf);
 link(sources,'Διάταξη σε αναγνώσιμη μορφή ↗',sourceText);
}
function filterArchive(q){
 let shown=0;
 oldItems.forEach(el=>{
  const match=!q||plain(el.textContent).includes(q);
  el.hidden=!match;
  if(q)el.open=false;
  if(match)shown++;
 });
 oldGroups.forEach(group=>{group.hidden=!group.querySelector('.law-item:not([hidden])');});
 archiveCount.textContent=q?shown+' σχετικά θέματα από 12 επιλεγμένα':'12 επιλεγμένα θέματα';
 return shown;
}
function run(query){
 const q=plain(query.trim());
 const primary=q?data.filter(e=>plain([e.title,e.terms,e.article].join(' ')).includes(q)):[];
 const matches=q?(primary.length?primary:data.filter(e=>plain([e.status,e.summary,e.limit].join(' ')).includes(q))):(showingAll?data:[]);
 result.replaceChildren();
 matches.forEach(renderCard);
 const older=filterArchive(q);
 if(q&&older>0)archive.open=true;
 else if(q)archive.open=false;
 if(q&&!matches.length&&!older)add(result,'p','act-empty','Δεν βρέθηκε σχετική καταχώριση. Η απουσία δεν αποδεικνύει ούτε άδεια ούτε απαγόρευση πράξης.');
 count.textContent=q?matches.length+' πράξεις · '+older+' άλλα θέματα':'27 καταχωρισμένες πράξεις · 12 επιλεγμένα νομοθετικά θέματα';
 showAllButton.textContent=showingAll&&!q?'Απόκρυψη καταλόγου':'Προβολή 27 πράξεων';
 showAllButton.setAttribute('aria-expanded',String(showingAll&&!q));
 shortcut.querySelectorAll('button[data-act]').forEach(b=>b.setAttribute('aria-pressed',String(q===plain(b.dataset.act))));
}
search.addEventListener('input',()=>{showingAll=false;run(search.value);});
shortcut.addEventListener('click',e=>{
 const b=e.target.closest('button[data-act]');if(!b)return;
 const term=b.dataset.act;
 search.value=plain(search.value)===plain(term)?'':term;
 showingAll=false;run(search.value);search.focus({preventScroll:true});
});
showAllButton.addEventListener('click',()=>{
 search.value='';showingAll=!showingAll;archive.open=false;run('');
});
run('');
})();