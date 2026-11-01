# ΕΚΑΒ Σπουδή — ATLA Master Plan 2026: Anatomy Lab + Clinical Cockpit

**Κατάσταση:** εγκεκριμένη κατεύθυνση προϊόντος από τον ιδιοκτήτη, με έργο υλοποίησης σε φάσεις. **Όχι** δήλωση ότι οι φάσεις έχουν ολοκληρωθεί.
**Αναφορά απαιτήσεων:** Συζήτηση 01/11/2026: ο χρήστης ανέβασε δύο οπτικά παραδείγματα 3D ανατομίας (πλήρες σώμα/αγγεία/νεύρα/λεπτομερής τομή κεφαλής) και ζήτησε ομοίως υψηλής ποιότητας **3D Anatomy Lab**, ξεχωριστά από **Simulation Cockpit** με στοχοθεσία επιπέδου Body Interact. Ο χρήστης ζητά να διατηρηθεί **ολόκληρο το πλάνο με όλες τις φάσεις** για τις επόμενες εργασίες, χωρίς να χαθεί ή να συγχέεται.

## Αμετάβλητες αποφάσεις
1. **Ενιαίο ΕΚΑΒ Σπουδή, δύο ανεξάρτητα εργαλεία.** Το «ATLA Anatomy Lab» είναι ανατομικός άτλας/οπτική μάθηση. Το «ATLA Clinical Cockpit» είναι κλινικός προσομοιωτής εικονικού ασθενούς. Δεν συγχωνεύουμε μοντέλα, οθόνες ή engines. Διατηρούμε διακριτούς φακέλους και κοινές υπηρεσίες/συνδέσμους.
2. Ο **ATLA/Mentor** επιτρέπεται να συνδέει τα εργαλεία, την ύλη ΣΑΕΚ, την εξάσκηση ΕΟΠΠΕΠ και το debrief, με ασφαλή μεταφορά context. Δεν αποτελεί δικαιολογία να χρησιμοποιούμε μη επικυρωμένη κλινική τεχνητή νοημοσύνη ή να αντιγράφουμε δικαιώματα τρίτων.
3. **Οπτική απαίτηση 3D Ανατομίας:** να προσεγγίσει επαγγελματικούς, πολυστρωματικούς άτλαντες όπως οι εικόνες αναφοράς του χρήστη (νεύρα, αρτηρίες, φλέβες, μυς, σύνδεσμοι, λεμφαγγεία, όργανα, οστά και τομές κεφαλής/κορμού), όχι απλώς «σκελετός και όργανα».
4. **Οπτική και λειτουργική απαίτηση Cockpit:** σύγκριση με το δημόσια τεκμηριωμένο Body Interact ως benchmark, με **δικό μας κώδικα, μοντέλα με νόμιμη άδεια και ανεξάρτητη επιστημονική αξιολόγηση**, όχι αντιγραφή προστατευμένων assets/interface.
5. **Προτεραιότητα δωρεάν αδειοδοτημένων assets.** Πριν από οποιαδήποτε αγορά αξιολογούμε ανοικτές/επιστημονικές βιβλιοθήκες με επιβεβαιωμένη προέλευση και άδεια. Αν η δωρεάν βάση δεν επαρκεί μορφολογικά, εξετάζουμε στοχευμένη αδειοδότηση με τεκμηρίωση ελλείματος.
6. Η προσωπική/μη εμπορική πρόθεση **δεν καταργεί τους όρους τρίτων**. Η GitHub Pages εγκατάσταση είναι δημόσια προσβάσιμη. Κανένα asset χωρίς σαφή δικαιώματα δεν ενσωματώνεται. Διατηρείται ξεχωριστό asset-level manifest, πηγή, δημιουργός, hash, έκδοση, άδεια, attribution, derivatives/share-alike, όροι NC, επιστημονική κατάσταση.
7. Μη δηλώνουμε «αντάξιο του Body Interact» ή «επίπεδο των φωτογραφιών» χωρίς ανεξάρτητη side-by-side οπτική και λειτουργική τεκμηρίωση. Ομοίως το 3D δεν υποκαθιστά CT/ανατομική ακρίβεια αν δεν υπάρχουν τα πραγματικά δεδομένα.

## Τρέχουσα βάση (01/11/2026)
- **3D Ανατομία:** `ui-tools/anatomy-3d/index.html` με canonical engine `tools/anatomy-3d/hires-anatomy.js`. Υπάρχουν ανδρικά/γυναικεία σύνθετα πλέγματα, ομαδική εστίαση, σκελετός/όργανα, όψεις, επιλογή, ελληνικές ετικέτες, quiz, υποσύστημα συνδέσεων ΣΑΕΚ.
- Ελέγχθηκαν 72 links, ενημερώθηκαν 62 σε ομάδες (στον πηγαίο κώδικα). Δείτε `docs/SAEK-3D-LINK-AUDIT-2026-11-01.md` και `docs/SAEK-3D-LINK-REMEDIATION-2026-11-01.md`. Δεν έχει ολοκληρωθεί ανεξάρτητη μορφολογική, licensing και physical-device QA.
- **Cockpit:** `mentor-next.html`, κώδικας/σκηνές `tools/patient-simulator/`, με συνθετική προσομοίωση, αρχικό GLB/WebGL. Υστερεί ακόμη αισθητά σε φωτορεαλιστικά rigs, φυσιολογία, διεπαφή και ανεξάρτητα ελεγμένη κλινική αξία. Δείτε `docs/MENTOR_BODY_INTERACT_BENCHMARK.md`.

## Φάσεις υλοποίησης: ATLA Anatomy Lab

### A0 — Inventory, αδειοδότηση και επιστημονικό όριο [προϋπόθεση]
- Εξαγωγή πλήρους καταλόγου πραγματικών 3D μοντέλων και αστοχιών, επιβεβαίωση αδειών *ανά αρχείο* και version pinning. Αποκλεισμός NC περιεχομένου όταν οι όροι δεν είναι συμβατοί με το μοντέλο διανομής.
- Δωρεάν υποψήφιες πηγές, με κάθε asset να περνά μεμονωμένο licensing gate:
  - **BodyParts3D (DBCLS)**: επίσημη νεότερη σελίδα άδειας (27/02/2025) δηλώνει CC BY 4.0 για τη βάση· παλιότερα αντίγραφα αναφέρουν CC BY-SA 2.1 Japan — ελέγχουμε ποια έκδοση/διανομή χρησιμοποιούμε. https://dbarchive.biosciencedbc.jp/en/bodyparts3d/lic.html και https://dbarchive.biosciencedbc.jp/en/bodyparts3d/download.html
  - **Z-Anatomy**, παράγωγα του BodyParts3D: CC BY-SA 4.0 για κύρια συλλογή, **μικτή** προέλευση επιμέρους στοιχείων (inner ear CC BY-NC-SA, kidney CC BY-NC). Μη γενικεύουμε την άδεια του repository σε όλα τα meshes. https://github.com/Z-Anatomy/Models-of-human-anatomy
  - **Human Reference Atlas/HuBMAP 3D Reference Objects**: CC BY 4.0 με απόδοση πηγών/DOI, ελεγμένες επιστημονικές δομές, ιδιαίτερα χρήσιμη σε όργανα. https://humanatlas.io/3d-reference-library
  - **Open Anatomy Atlas (Cognition Lab)**: κώδικας MIT, ανατομικές πηγές με ξεχωριστούς όρους. Έρευνα clipping/sections/region explorer. https://github.com/CognitionLabSNUC/open-anatomy-atlas
  - **NIH 3D**: ανοικτός κατάλογος, **διαφορετική άδεια ανά μοντέλο**. Επιλογή μόνο συγκεκριμένων, καθαρών αδειών. https://3d.nih.gov/terms
- Δικαιώματα λογισμικού Three.js, textures και λοιπών βιβλιοθηκών ελέγχονται χωριστά.

### A1 — Αξιόπιστη ανατομική βιβλιοθήκη
- Πηγές υψηλότερης ανάλυσης (όχι low-poly μόνο), λογική σε FMA/UBERON ID, ιεραρχία συστήματος/περιοχής, πλευρικότητα, ελληνικά/λατινικά/αγγλικά ονόματα, provenance/citations.
- Μετατροπή/βελτιστοποίηση σε GLB/glTF με LOD, streaming, compression (Draco/meshopt όπου επιτρέπεται), lazy-load και fail-safe fallback *χωρίς ψευδή όργανα*.
- Ανδρικό/γυναικείο μοντέλο: ανατομικά ελεγμένες επιλογές, ανοιχτά labels για ελλείψεις και συνθετικές προσαρμογές.

### A2 — Premium Anatomy Viewer & αισθητική
- Επαγγελματικό 3-column workspace: **αριστερά** searchable system/region tree, **κέντρο** 3D viewport, **δεξιά** inspector/atlas notes; αφιερωμένη mobile εφαρμογή με bottom-sheet, ευδιάκριτη κάμερα/χειριστήρια αφής και πλήρη οθόνη.
- Render PBR, υλικά με σωστή κλινική χρωματική κωδικοποίηση, υψηλής ποιότητας φωτισμός, shadow/ambient occlusion με δυναμική υποβάθμιση σε κινητά, σωστές μονάδες/συντεταγμένες, smooth rotation.
- Multi-layer toggle, transparency ανά σύστημα/δομή, hide/show/isolate, exploded, adjacent-structure reveal, focus, anatomical presets, αξιόπιστη επιλογή λεπτών νεύρων/αγγείων.

### A3 — Regional anatomy, cuts, learning
- Κεφάλι/λαιμός (κρανίο, εγκέφαλος, νεύρα, αγγεία, τομές), θώρακας, κοιλιά, πύελος, άνω/κάτω άκρα. Πραγματικά clipping planes και τομές ΜΟΝΟ από επαρκή 3D δεδομένα.
- Labels με επαληθευμένη ελληνική ορολογία, annotations, bookmarks, screenshot / citation, ανατομικά quizzes, Guided Study, σύνδεση με συγκεκριμένο κεφάλαιο ΣΑΕΚ και αμφίδρομη επιστροφή.

### A4 — Quality Gate Anatomy Lab
- Benchmark πλάι στις οπτικές αναφορές του χρήστη ανά περιοχή και σύστημα, expert review μορφολογίας, 72/72 deep-link journeys και τα δύο μοντέλα, iPhone Safari/Android/desktop QA, touch accuracy, FPS, μνήμη, offline όρια και μηδέν αναπάντεχα JS/WebGL errors.
- Μόνο τότε αναφέρεται το επίπεδο ποιότητας με τεκμηρίωση· όχι αυθαίρετα ποσοστά ολοκλήρωσης.

## Φάσεις υλοποίησης: ATLA Clinical Cockpit (ξεχωριστό project)

### C0 — Προδιαγραφή και αποτύπωση Body Interact
- Ανεξάρτητο σύνολο χαρακτηριστικών και οπτικών reference screenshots: ρεαλιστικός ασθενής και σκηνή, navigation, vital monitor, examination, communication, tests, procedures, interventions, response, debrief. **Όχι αντιγραφή proprietary assets.**
- Ξεχωριστό directory, tests, issues, CI και clinical approval.

### C1 — Οπτικός ανασχεδιασμός και ασθενείς
- Πιο πιστά rigged 3D human models, LOD, PBR skin/eyes/clothes, patient bed/ambulance/home/road environments, camera framing, animation breathing/blinking/movement/expression, voice and synchronized symptoms.
- Δωρεάν **για πρωτότυπα**: MakeHuman exported core CC0 models (εξωτερικά community downloads μπορεί να έχουν άλλους όρους), Quaternius Universal Base Characters/Animation Library CC0 (στιλιζαρισμένα, όχι φωτορεαλιστική κλινική πιστότητα), επιπλέον CC0 props/textures.
- Κλινικά σημεία/συμπτώματα χρειάζονται κατάλληλα ανατομικά assets και επιστημονική αποδοχή.

### C2 — Clinical simulation engine
- Patient state + deterministic/sandboxed physiology, ABCDE/BLS/τραύμα/αναπνευστικά/καρδιαγγειακά κατά ΣΑΕΚ, monitoring HR/RR/SpO₂/BP/ECG όταν επιστημονικά μοντελοποιημένα, branching choices, time progression, differentiated outcomes.
- Patient dialogue, history, tests, exams, interventions, documented guardrails. Χωρίς «κλινικά έγκυρο» χαρακτηρισμό μέχρι επαλήθευση.

### C3 — Scenario library, debrief, mobile
- Πολλαπλά επιστημονικά εγκεκριμένα περιστατικά σε διαφορετικά περιβάλλοντα, score εξηγημένο, safety-critical mistake analysis, adaptation to skill level.
- Εξαιρετική διεπαφή κινητού/desktop, πολυεπίπεδες οθόνες, accessibility, full screenshot regression και clinical validation.

### C4 — Benchmark Gate Cockpit
- 1:1 δημόσιων λειτουργιών Body Interact, όχι αντιγραφή UI. Ανεξάρτητη δοκιμή από διασώστες/εκπαιδευτές/κλινικούς, πλήθος διαφορετικών περιστατικών, reliability/performance. **Δεν** ανακοινώνεται «ισάξιο» χωρίς επαρκή ανεξάρτητη απόδειξη.

## Φάσεις σύνδεσης μέσω ATLA — μετά από επαρκή σταθερότητα των δύο
- **I1**: από θεωρία → ακριβής 3D ομάδα → επιστροφή στο κεφάλαιο.
- **I2**: από προσομοίωση → «Δες την ανατομική δομή» σε *ξεχωριστό* Anatomy Lab, με ασφαλή επιστροφή στο ίδιο case/state.
- **I3**: ATLA εξηγεί τα λάθη με επιστημονική τεκμηρίωση και προτείνει κεφάλαιο, 3D μάθημα, flashcards ή επανάληψη case.
- **I4**: κοινά metrics προόδου/διαχείρισης χρόνου χωρίς διπλές λειτουργίες, χωρίς αυθαίρετη πρόσβαση σε ευαίσθητα δεδομένα, διακριτά modules και ανεξάρτητη αναβαθμισιμότητα.

## Πρώτη εκτελέσιμη επόμενη εργασία
1. Δημιουργία `assets-license-manifest` με source, version, mesh ID, rights, exact attribution & caveats.
2. Σύγκριση 3 πραγματικών ανοικτών datasets (DBCLS BP3D high resolution, Z-Anatomy selected, HRA GLBs) για 4 demo regions: κεφάλι, θώρακας, χέρι, κοιλιά.
3. Πειραματικό side-by-side viewer **χωρίς** αλλαγή του υπάρχοντος δημοσιευμένου 3D μέχρι να περάσει QA.
4. Μετά το ισχυρό demo, διεύρυνση σε όλα τα συστήματα/regions και τις τομές· αργότερα ανεξάρτητο Cockpit visual pass.

## Κανόνες προόδου και επικοινωνίας
- Για κάθε παράδοση δήλωνε ξεχωριστά: **κώδικας στο GitHub / unit tests / browser tests / Pages deployment / visual expert approval / scientific validation / real-device QA**.
- Μη θεωρείς ότι αποθηκευμένο roadmap σημαίνει αυτόματη ή παρασκηνιακή υλοποίηση.
- Οι πρόσφατες εικόνες του χρήστη είναι **στόχος ποιότητας**, όχι άδεια χρήσης 3D μοντέλων/εφαρμογών που τυχόν απεικονίζονται.

## Υλοποίηση εισαγωγής πόρων — 01/11/2026

Εκτελέστηκε η πρώτη πραγματική εισαγωγή από επαληθευμένα ανοικτά/CC0 μοντέλα και πηγαίο κώδικα, **σε χωριστούς φακέλους**: 15 HRA/HuBMAP CC BY 4.0 ανατομικά GLBs, 5 Z-Anatomy GLBs μόνο για απομονωμένη NC-SA ερευνητική χρήση, 2 MakeHuman core CC0 αρχεία, 2 Quaternius free-CC0 επεξεργασμένα GLBs, και 17 αρχεία/άδειες MIT Open Anatomy Atlas code στη 3D Ανατομία. Σύνολο 24 νέα αρχεία μοντέλων/γεωμετρίας, 66.1 MB περίπου, συν 17 αρχεία κώδικα/τεκμηρίωσης. Διατηρήθηκε ο ήδη υπάρχων CC0 ασθενής UMRAM.

**Τεκμήρια/θέσεις/άδειες:** [Πραγματικά εισαγμένοι πόροι](ATLA_FREE_3D_RESOURCE_IMPORT_RESULTS_2026-11-01.md). Τα νέα μοντέλα **δεν έχουν ενεργοποιηθεί ακόμη στο production viewer/cockpit** ούτε έχουν επιβεβαιωθεί επιστημονικά. NIH 3D μοντέλα απαιτούν per-file rights, το BodyParts3D 4.3 πλήρες dataset χωριστή εισαγωγή, και ορισμένα Z-Anatomy GLBs αποκλείστηκαν λόγω περιοριστικών/αβέβαιων δικαιωμάτων.
