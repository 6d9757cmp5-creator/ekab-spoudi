/* EKAB Spoudi pharmacology interactive reader. Local, offline-ready, no remote services. */
(function () {
  'use strict';
  var lib = window.EKAB_PHARMA;
  var byId = function (id) { return document.getElementById(id); };
  if (!lib || !Array.isArray(lib.medicines)) {
    byId('resultCount').textContent = 'Δεν φορτώθηκε ο κατάλογος. Δοκίμασε επανεκκίνηση / ανανέωση της εφαρμογής.';
    return;
  }
  var list = lib.medicines;
  var scopeNames = {
    basic: 'Βασική γνώση / πρώτες βοήθειες',
    protocol: 'Μόνο με εκπαίδευση και εξουσιοδότηση',
    advanced: 'Εξειδικευμένη ομάδα / ιατρική καθοδήγηση'
  };
  var normalize = function (value) { return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/ς/g, 'σ').toLowerCase(); };
  var el = function (tag, cls, value) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (value !== undefined) n.textContent = String(value);
    return n;
  };
  var groups = Array.from(new Set(list.map(function (m) { return m.category; })));
  byId('drugTotal').textContent = list.length;
  byId('groupTotal').textContent = groups.length;
  groups.forEach(function (g) { var o = el('option', '', g); o.value = g; byId('categoryFilter').append(o); });

  function addPoint(container, title, value, warn) {
    var p = el('p', warn ? 'ph-warning' : '');
    p.append(el('strong', '', title));
    p.append(document.createTextNode(value));
    container.append(p);
  }
  function createCard(m) {
    var card = el('details', 'ph-card');
    card.id = 'drug-' + m.id;
    var summary = el('summary');
    var heading = el('span');
    heading.append(el('span', 'ph-card-name', m.name));
    heading.append(el('div', 'ph-card-en', m.english));
    heading.append(el('span', 'ph-tag ' + m.scope, scopeNames[m.scope]));
    summary.append(heading);
    card.append(summary);
    var body = el('div', 'ph-card-body');
    addPoint(body, 'Πώς δρα', m.mechanism);
    addPoint(body, 'Πότε συναντάται / ένδειξη', m.indication);
    addPoint(body, 'Κίνδυνοι, αντενδείξεις και σφάλματα', m.caution, true);
    addPoint(body, 'Τι παρακολουθούμε', m.monitor);
    addPoint(body, 'Εκπαιδευτική σημείωση', m.notes);
    /* Expanded clinical fields are separate from the introductory study summary.
       No record is marked clinically approved until an authorized reviewer signs off. */
    if (m.clinical) {
      var info=m.clinical;
      var extended=el('details','ph-extended');
      var title=el('summary','','Κλινική επέκταση · Οδοί, δόσεις, ασφάλεια και τεκμηρίωση');
      extended.append(title);
      var detailBody=el('div','ph-extended-body');
      addPoint(detailBody,'Δοσολογική πληροφορία ενηλίκου — μόνο για μελέτη',info.adultDose);
      addPoint(detailBody,'Παιδιατρική αναφορά / ειδικός έλεγχος',info.paediatricDose);
      addPoint(detailBody,'Οδός χορήγησης / περιορισμοί',info.route);
      addPoint(detailBody,'Κρίσιμες αντενδείξεις και σφάλματα',info.contraindications,true);
      addPoint(detailBody,'Αλληλεπιδράσεις και συγχορηγήσεις',info.interactions);
      addPoint(detailBody,'Κύηση και γαλουχία',info.pregnancy);
      addPoint(detailBody,'Νεφρική / ηπατική λειτουργία',info.renalLiver);
      addPoint(detailBody,'Φύλαξη, συγκέντρωση και αραίωση',info.storage);
      addPoint(detailBody,'Ελληνικό πλαίσιο επαγγελματικής πράξης',info.governance,true);
      addPoint(detailBody,'Επίπεδο τεκμηρίωσης',info.evidenceLevel);
      addPoint(detailBody,'Απαραίτητη κλινική επικύρωση',info.clinicalApproval,true);
      if(info.extraNote) addPoint(detailBody,'Σημείωση επαλήθευσης',info.extraNote);
      var clinicalSources=el('details','compact-sources');
      clinicalSources.append(el('summary','','Πηγές κλινικής επέκτασης'));
      var clinicalSourceBody=el('div','compact-sources-body');
      [info.evidenceKey,info.extraEvidenceKey].filter(Boolean).forEach(function(key){
        var e=lib.sources[key];if(!e)return;
        var line=el('p');
        var link=el('a','',e.title+' ↗');
        link.href=e.url;link.target='_blank';link.rel='noopener noreferrer';
        line.append(link);clinicalSourceBody.append(line);
      });
      if(clinicalSourceBody.children.length){clinicalSources.append(clinicalSourceBody);detailBody.append(clinicalSources);}
      extended.append(detailBody);
      body.append(extended);
    }
    var source = lib.sources[m.source];
    if (source) {
      var references = el('details', 'compact-sources');
      references.append(el('summary', '', 'Πηγές και τεκμηρίωση'));
      var referenceBody = el('div', 'compact-sources-body');
      var p = el('p');
      var a = el('a', '', 'Πηγή / κατευθυντήρια αναφορά ↗');
      a.href = source.url; a.target = '_blank'; a.rel = 'noopener noreferrer';
      p.append(a); referenceBody.append(p);
      if (m.source === 'EMA') {
        referenceBody.append(el('p', 'ph-small', 'ΠΡΟΣ ΚΛΙΝΙΚΟ ΕΛΕΓΧΟ: Η παραπομπή στον EMA είναι γενική και δεν επαληθεύει ειδική ένδειξη ή δόση. Συμβουλεύσου την ΠΧΠ του συγκεκριμένου φαρμάκου.'));
      } else {
        referenceBody.append(el('p', 'ph-small', 'Η πηγή αφορά την κλινική ενότητα· έλεγξε την αντιστοιχία με την ισχύουσα έκδοση/το τοπικό πρωτόκολλο.'));
      }
    }
    if (source) { references.append(referenceBody); body.append(references); }
    card.append(body);
    return card;
  }
  function render() {
    var q = normalize(byId('drugSearch').value.trim());
    var category = byId('categoryFilter').value;
    var scope = byId('scopeFilter').value;
    var selected = list.filter(function (m) {
      return (category === 'all' || m.category === category) &&
        (scope === 'all' || m.scope === scope) &&
        (!q || normalize([m.name, m.english, m.category, m.mechanism, m.indication, m.caution, m.notes, m.clinical&&m.clinical.adultDose, m.clinical&&m.clinical.route, m.clinical&&m.clinical.contraindications].join(' ')).includes(q));
    });
    var root = byId('drugResults');
    root.replaceChildren();
    if (!selected.length) {
      root.append(el('p', 'ph-empty', 'Δεν βρέθηκαν φάρμακα με αυτά τα φίλτρα. Δοκίμασε διαφορετική ελληνική ή αγγλική λέξη.'));
    } else {
      groups.forEach(function (g) {
        var items = selected.filter(function (m) { return m.category === g; });
        if (!items.length) return;
        var wrapper = el('div', 'ph-section');
        var h = el('h2', '', g);
        wrapper.append(h); wrapper.append(el('small', '', items.length + ' καρτέλες'));
        var grid = el('div', 'ph-grid');
        items.forEach(function (m) { grid.append(createCard(m)); });
        root.append(wrapper, grid);
      });
    }
    byId('resultCount').textContent = 'Εμφανίζονται ' + selected.length + ' από ' + list.length + ' καρτέλες.';
  }
  byId('drugSearch').addEventListener('input', render);
  byId('categoryFilter').addEventListener('change', render);
  byId('scopeFilter').addEventListener('change', render);
  render();

  Object.keys(lib.sources).forEach(function (key) {
    var source = lib.sources[key];
    var article = el('article');
    var a = el('a', '', source.title + ' ↗');
    a.href = source.url; a.rel = 'noopener noreferrer'; a.target = '_blank';
    article.append(a, el('small', '', source.detail));
    byId('sourceList').append(article);
  });

  var quiz = [
    {q:'Σε αναφυλαξία ενηλίκου με πρόβλημα αεραγωγού, ποια είναι η θεραπεία πρώτης γραμμής;',a:['Αντιισταμινικό από το στόμα','Αδρεναλίνη ενδομυϊκά','Διττανθρακικό'],correct:1,why:'Η IM αδρεναλίνη είναι πρώτης γραμμής κατά ERC 2025. Τα αντιισταμινικά δεν αντιμετωπίζουν το επείγον πρόβλημα ABC.'},
    {q:'Ποια δήλωση για την αδρεναλίνη είναι σωστή;',a:['Ίδια οδός/δόση σε αναφυλαξία και ανακοπή','Η δόση ανακοπής μπορεί να χρησιμοποιηθεί σε κάθε δύσπνοια','Η οδός, η συγκέντρωση και η ένδειξη πρέπει να ελέγχονται ξεχωριστά'],correct:2,why:'Η σύγχυση IM αναφυλαξίας με IV/IO ανακοπής αποτελεί επικίνδυνο σφάλμα.'},
    {q:'Σε ανακοπή ενηλίκου με απινιδώσιμο ρυθμό, πότε δίνεται αδρεναλίνη στον ERC ALS 2025;',a:['Μετά το τρίτο shock','Πριν από την πρώτη απινίδωση','Μόνο μετά από ROSC'],correct:0,why:'ERC 2025: μετά το τρίτο shock. Προηγούνται ποιοτική ΚΑΡΠΑ και έγκαιρη απινίδωση.'},
    {q:'Στην υπογλυκαιμία, σε ποιον ΔΕΝ δίνουμε γλυκόζη από το στόμα;',a:['Σε ασθενή ξύπνιο και με ασφαλή κατάποση','Σε ασθενή μη ανταποκρινόμενο','Σε ασθενή που καταπίνει ασφαλώς'],correct:1,why:'Κίνδυνος εισρόφησης. Πρώτα ABC και κατάλληλος τρόπος θεραπείας σύμφωνα με εκπαίδευση.'},
    {q:'Ποιο είναι το κύριο πρόβλημα σε ύποπτη υπερδοσολογία οπιοειδών;',a:['Μόνο η μυδρίαση','Η αναπνευστική καταστολή','Μόνο ο πόνος'],correct:1,why:'Στήριξη αεραγωγού/αερισμού και ναλοξόνη όπου εκπαιδευμένος, με επιτήρηση για υποτροπή.'},
    {q:'Σε πολυτραυματία με βαριά αιμορραγία, το TXA:',a:['Αντικαθιστά την αιμόσταση','Συνδέεται με περιορισμένο χρονικό παράθυρο και σωστή επιλογή ασθενούς','Δίνεται ανεξαρτήτως χρονικού διαστήματος'],correct:1,why:'NICE: IV TXA έγκαιρα σε μείζον τραύμα με αιμορραγία· γενικά όχι μετά 3 ώρες χωρίς ειδική ένδειξη.'},
    {q:'Ποιο φάρμακο ΔΕΝ χρησιμοποιείται ρουτίνα σε καρδιακή ανακοπή;',a:['Διττανθρακικό νάτριο','Αδρεναλίνη με τον κατάλληλο αλγόριθμο','Αμιοδαρόνη σε ανθεκτική VF/pVT'],correct:0,why:'ERC 2025: όχι ασβέστιο, διττανθρακικά ή κορτικοστεροειδή ως ρουτίνα στην ανακοπή.'},
    {q:'Επίμονοι γενικευμένοι σπασμοί επί 5 λεπτά:',a:['Απαιτούν άμεση αντιμετώπιση ως status epilepticus','Παρακολουθούνται πάντα χωρίς θεραπεία για 30 λεπτά','Αντιμετωπίζονται πάντα με αντιβιοτικό'],correct:0,why:'NICE NG217: ≥5 λεπτά γενικευμένων σπασμών είναι επείγουσα επιληπτική κατάσταση.'},
    {q:'Η μιδαζολάμη και η φαιντανύλη μαζί μπορεί:',a:['Να βελτιώνουν πάντα τον αερισμό','Να αυξήσουν τον κίνδυνο αναπνευστικής καταστολής','Να μην έχουν αλληλεπιδράσεις'],correct:1,why:'Ο συνδυασμός κατασταλτικών χρειάζεται εξειδικευμένο πρωτόκολλο, αεραγωγό και παρακολούθηση.'},
    {q:'Σε άσθμα και σοβαρή επιδείνωση, το σωστό είναι:',a:['Μόνο ένα στεροειδές και καθυστέρηση μεταφοράς','Άμεση αναγνώριση βαρύτητας, εισπνεόμενη επείγουσα αγωγή και έγκαιρη μεταφορά','Να αγνοηθεί πιθανή αναφυλαξία'],correct:1,why:'GINA 2026: αρχική αντιμετώπιση και παραπομπή χωρίς καθυστέρηση. Αν συνυπάρχει αναφυλαξία προέχει αδρεναλίνη.'},
    {q:'Οι δόσεις των φαρμάκων στα παιδιά:',a:['Είναι ίδιες με των ενηλίκων','Προσαρμόζονται σε βάρος/ηλικία/συγκεκριμένο πρωτόκολλο','Υπολογίζονται πάντα διαιρώντας τη δόση ενηλίκου διά δύο'],correct:1,why:'Παιδιατρική επείγουσα φροντίδα απαιτεί ελεγμένο παιδιατρικό δοσολόγιο, μέγιστες δόσεις και επιβεβαίωση μονάδων.'},
    {q:'Η παρουσία διεθνούς οδηγίας για ένα φάρμακο:',a:['Δίνει αυτόματα άδεια στον Έλληνα διασώστη να το χορηγεί','Δεν υποκαθιστά επαγγελματική εξουσιοδότηση και εγκεκριμένο τοπικό πρωτόκολλο','Καταργεί την ανάγκη κλινικού ελέγχου'],correct:1,why:'Επαγγελματικά δικαιώματα, εκπαίδευση και πρωτόκολλα ελληνικής υπηρεσίας καθορίζουν την πράξη.'}
  ];
  var pos = 0, score = 0, answered = false;
  function showQuestion() {
    answered = false;
    byId('quizFeedback').hidden = true;
    byId('quizNext').hidden = true;
    byId('quizRestart').hidden = true;
    var item = quiz[pos];
    byId('quizProgress').textContent = 'Ερώτηση ' + (pos + 1) + ' / ' + quiz.length + ' · Σωστές ' + score;
    byId('quizQuestion').textContent = item.q;
    byId('quizOptions').replaceChildren();
    item.a.forEach(function (answer, i) {
      var button = el('button', '', String(i + 1) + '. ' + answer);
      button.type = 'button';
      button.addEventListener('click', function () {
        if (answered) return;
        answered = true;
        if (i === item.correct) score++;
        Array.from(byId('quizOptions').children).forEach(function (b, j) {
          b.disabled = true;
          if (j === item.correct) b.classList.add('correct');
          else if (j === i) b.classList.add('wrong');
        });
        byId('quizFeedback').textContent = (i === item.correct ? 'Σωστά! ' : 'Χρειάζεται επανάληψη. ') + item.why;
        byId('quizFeedback').hidden = false;
        byId('quizProgress').textContent = 'Ερώτηση ' + (pos + 1) + ' / ' + quiz.length + ' · Σωστές ' + score;
        if (pos === quiz.length - 1) {
          byId('quizRestart').hidden = false;
          byId('quizFeedback').textContent += ' Τελικό σκορ: ' + score + ' / ' + quiz.length + '.';
        } else byId('quizNext').hidden = false;
      });
      byId('quizOptions').append(button);
    });
  }
  byId('quizNext').addEventListener('click', function () { if (answered && pos < quiz.length - 1) { pos++; showQuestion(); } });
  byId('quizRestart').addEventListener('click', function () { pos = 0; score = 0; showQuestion(); });
  showQuestion();
})();
