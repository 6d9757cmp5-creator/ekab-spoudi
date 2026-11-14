# MENTOR OS — Αρχιτεκτονική υλοποίησης των 8 λειτουργιών
**Κατάσταση:** ΣΧΕΔΙΟ ΑΝΑΠΤΥΞΗΣ — όχι λειτουργική έκδοση · 2026-10-28

## 0. Πραγματική βάση του repository

Η κανονική εφαρμογή είναι στατικό vanilla HTML/CSS/JS σε GitHub Pages, με Appwrite account/storage + client-side localStorage/IndexedDB, service worker, 20 μαθήματα ΣΑΕΚ / 247 κεφάλαια και 314 ερωτήσεις ΕΟΠΠΕΠ. Ανεξάρτητο AI feedback στο \`ai-grading-client.js\`, \`functions/answer-grader/main.js\`, \`workers/answer-grader/src/index.js\`, \`ai-grading-config.js\`. Προσωπικές σημειώσεις: \`notes-store.js\`, \`notes-panel.js\`. Πρόοδος και συγχρονισμός: \`progress.js\`, \`sync-local.js\`, \`sync-model.js\`, \`cloud-sync.js\`. Offline cache \`sw.js\`.

- **PR #22** (draft): \`mentor.html\`, \`mentor-os.js\` παρέχουν μόνο *read-only* μετρικές/πρόταση μελέτης· χωρίς AI ή τις 8 λειτουργίες. Δεν συγχωνεύεται αυτόματα.
- **PR #83** (draft): \`mentor/library/catalog.json\` καταχωρεί 15 πηγές και \`mentor/library/corpus/*.json\` περιέχει εξαγωγή κειμένου 7 συγγραμμάτων. Ιατρική επιμέλεια: **pending**. Δεν έχει εκπαιδευθεί μοντέλο ούτε ενεργοποιηθεί RAG σε παραγωγή. Ορισμένα πεδία PDF (σελίδα) είναι διαθέσιμα, ενώ οι Pressbooks XHTML εξαγωγές δεν έχουν ακόμη αξιόπιστη αντιστοίχιση κεφαλαίων/σελίδων. Εικόνες δεν έχουν εισαχθεί/εγκριθεί.
- Υπάρχουν στατικές σελίδες ανατομίας και πρακτικών εξετάσεων, **όχι επιβεβαιωμένη λειτουργική 3D πλατφόρμα**, ECG lab, πολύ-ασθενικός simulator, ή φωνητική εξέταση.
- Τα αυτοματοποιημένα tests δεν συνιστούν ιατρική πιστοποίηση ή πραγματική κλινική εμπειρία.

## 1. Μη διαπραγματεύσιμα όρια

1. **Μηδενική επέμβαση στον grader**: αμετάβλητα \`ai-grading-client.js\`, \`ai-grading-config.js\`, \`functions/answer-grader/**\`, \`workers/answer-grader/**\`, \`saek-exam-engine.js\`, \`study-scheduler.js\`, \`official_questions.json\`, επίσημα rubrics, και semantics βαθμών.
2. **Μηδενική καταστροφική μετανάστευση** σε \`sync-model.js\`, \`sync-local.js\`, \`cloud-sync.js\`, \`progress.js\`. Τα υπάρχοντα keys/backup/export δεν αλλάζουν. Το \`applyValues\` ανασυνθέτει τη λίστα γνωστών πεδίων: **μην** προσθέσετε απλώς \`mentor:\` keys στο παλιό sync schema.
3. **Ξεχωριστή ονοματοδοσία/αποθήκευση**: \`ekab.mentor.v1.*\` και IndexedDB \`ekab-mentor-v1\`, stores \`sessions\`, \`attempts\`, \`mastery\`, \`preferences\`, \`events\`. Αν απαιτείται multi-device sync, ξεχωριστό ιδιωτικό Appwrite namespace/bucket/collection με ACL ανά χρήστη και διακριτό protocol version.
4. **Τα υπάρχοντα δεδομένα μόνο για ανάγνωση**, μετά από ρητή συγκατάθεση σύνδεσης μαθησιακού προφίλ. Mentor mastery **δεν** είναι επίσημη βαθμολογία/πιστοποίηση. Κανένα αποτέλεσμα Mentor δεν γράφει στα EOPPEP/SAEK keys.
5. **Εκπαιδευτική χρήση, όχι ιατρική πράξη**. Role scope \`learner|responder|physician-theory\`. Ο AI καθηγητής μπορεί να διδάσκει βαθιά ιατρική, αλλά δεν είναι ιατρός, δεν κάνει διάγνωση πραγματικού ασθενούς, δεν δίνει αυτόνομα εξατομικευμένα κλινικά πρωτόκολλα. Όρια ΕΚΑΒ/Ελλάδας και τρέχουσες εγκεκριμένες οδηγίες ορίζονται ξεχωριστά.
6. **Προέλευση και άδεια ανά απόσπασμα, εικόνα/ΗΚΓ/3D**. Απαραίτητος ανεξάρτητος επιστημονικός έλεγχος πριν χαρακτηριστεί περιεχόμενο ως εγκεκριμένο. Μη χρησιμοποιείται το δημόσιο GitHub Pages branch ως αποθήκη απόρρητων πληροφοριών ή μη-ελεγμένων μεγάλων AI assets.

## 2. Προτεινόμενη αρχιτεκτονική: ξεχωριστό MENTOR OS

\`\`\`text
existing GitHub Pages (unchanged: SAEK / EOPPEP / Grader)
    │
    └── mentor.html → mentor UI router (νέο, ξεχωριστό namespace)
          ├── Mission Console (ΕΚΑΒ Live / περιστατικά)
          ├── Anatomy Studio (3D/2D)
          ├── ECG Lab
          ├── Clinical Faculty (πολλαπλοί AI ρόλοι)
          ├── Mass Casualty (διαλογή)
          ├── Equipment Lab
          ├── Oral Examination (φωνή/κείμενο)
          └── Academy (μνήμη / στόχοι / διαδρομή)
                   │
          mentor-client (separate auth + API adapter)
                   │ HTTPS, authenticated, quota, abuse limits
          mentor backend / orchestration (χωριστό service/Function)
                   ├── evidence retrieval gateway → reviewed clinical index
                   ├── scenario state engine (deterministic transitions)
                   ├── simulation rule validator + clinical safety gate
                   ├── text generation / structured output / role advisors
                   ├── speech adapter (opt-in)
                   └── mentor-only learning service
                          └── per-user private Mentor data
\`\`\`

Το υπάρχον JS frontend παραμένει vanilla ES modules· οι 3D βιβλιοθήκες φορτώνονται δυναμικά μόνο στην Ανατομία. Το backend είναι απαραίτητο για κλειδιά AI, server-side κλινική ανάκτηση, authentication, κόστος και έλεγχο πρόσβασης. Διαχωρίστε το endpoint από το υπάρχον answer-grader. Οι εξωτερικές υπηρεσίες και τα πραγματικά quota/pricing καθορίζονται στην υλοποίηση, όχι ως δεδομένα που δήθεν υπάρχουν τώρα.

### Δομή αρχείων-στόχος (μη υλοποιημένη)

\`\`\`text
mentor/
  app/                 # UI shell, router, learner consent + feature flags
  modules/
    live/              # mission UI, case player
    anatomy/           # 3D renderer, SVG fallback, Greek atlas labels
    ecg/               # calibrated samples, reading practice
    faculty/           # multi-role consultation UI
    triage/            # incident map and multi-patient state machine
    equipment/         # approved device replicas and virtual actions
    oral/              # microphone/speech interface + text alternative
    academy/           # learning path, memory, spaced practice
  domain/
    scenario-schema.json
    learning-event-schema.json
    safety-scope.json
  storage/             # versioned IndexedDB; optional separate cloud sync
  library/             # existing candidate catalog and unreviewed text
  tests/               # fixtures, schema, migration, browser/medical QA
functions/mentor-api/  # NEW backend; never modify answer-grader as dependency
\`\`\`

## 3. Ενιαία μηχανή εκπαιδευτικού περιστατικού

Ο μηχανισμός πρέπει να είναι **deterministic state machine**, όχι ελεύθερη αφήγηση AI που επινοεί ζωτικά σημεία.

- \`case_id\`, \`version\`, \`source_refs\`, \`language: el\`, \`scope\`, \`difficulty\`, \`learning_objectives\`, \`clinical_review\`.
- \`patient\`: αναγνωριστικό μόνο *συνθετικού* ασθενούς, ιστορικό, συμπτώματα, ζωτικά, διαθέσιμα στοιχεία· ποτέ πραγματικά στοιχεία ασθενούς.
- \`states[]\`: άφιξη, ABCDE/εκτίμηση, αποφάσεις, εξέλιξη, μεταφορά/παράδοση, απολογισμός.
- \`actions[]\`: κωδικός, ρόλος που επιτρέπεται να εκτελέσει, προϋποθέσεις, διάρκεια, συνέπειες, \`safety_flags\`, επαληθευμένο \`rationale_source\`.
- \`transitions[]\`: επόμενη κατάσταση, αλλαγή ζωτικών, νέες ενδείξεις και προκαθορισμένη βαθμίδα κινδύνου.
- \`scoring\`: ΜΟΝΟ εκπαιδευτικός δείκτης Mentor (π.χ. αναγνώριση κινδύνου, κατάλληλη κλήση βοήθειας, αιτιολόγηση), **όχι υπάρχων βαθμός**.
- \`seed\`: αναπαραγωγή ίδιας περίπτωσης για tests και δίκαιο debrief.
- Μοντέλο AI: παράγει μόνο φυσική γλώσσα, ερωτήσεις και εξηγήσεις **εντός** των εγκεκριμένων κανόνων· ο deterministic engine αποφασίζει φυσιολογία/έγκυρες μεταβάσεις.
- Μεταβολή ζωτικών και κλινικές συνέπειες απαιτούν επίβλεψη κλινικού ελεγκτή· ποτέ ad hoc φανταστικοί αριθμοί ως κλινική αλήθεια.

## 4. Οκτώ modules — τεχνικός σχεδιασμός και κριτήρια ολοκλήρωσης

### Α. ΕΚΑΒ Live / Mission Console — ΠΡΩΤΗ υλοποίηση
- **UI**: «Κλήση → Προσέγγιση → Ασφάλεια → ABCDE → Επικοινωνία → Παράδοση → Debrief», με πίνακα ζωτικών και χρονική γραμμή.
- **Engine**: φορτώνει \`case.json\` schema, επιβάλλει προϋποθέσεις, καταγράφει append-only \`mentor:action\` events, εκδίδει επεξηγήσεις με πηγές.
- **MVP**: 3–5 πλήρως επιμελημένα *συνθετικά* σενάρια (π.χ. θωρακικός πόνος, αναπνευστική δυσχέρεια, τροχαίο). Διαβαθμισμένη δυσκολία.
- **Acceptance**: deterministic replay, καμία απαγορευμένη ενέργεια ανά ρόλο, σταθερό debrief με τεκμηρίωση, ίδιο σενάριο χωρίς AI όταν offline.

### Β. Living Anatomy — 3D/2D
- **Rendering**: προαιρετικό lazy-loaded Three.js / GLTF (GLB), orbit controls, hit-testing, per-structure IDs, ελληνικές ετικέτες, text-to-structure lookup· 2D SVG/εικόνες όταν WebGL απουσιάζει.
- **Assets**: curated glTF 2.0 anatomy models με ελληνικό anatomical ontology, laterality, alt-text, provenance/license and review; όχι αμφίβολες εικόνες αυτοπαραγόμενες από AI.
- **Κλινική σύνδεση**: ελεγχόμενο overlay για στεφανιαία κυκλοφορία, τραύμα, αεραγωγό, αιμορραγία· όχι προσομοίωση που ισχυρίζεται ακριβή παθοφυσιολογία χωρίς validation.
- **Acceptance**: δυνατότητα «δείξε/ονομάτισε/αναζήτησε» για δομές σε κινητό, όρια μνήμης, λειτουργικό 2D fallback, επιστημονικά ακριβείς ονομασίες/πλευρικότητα.

### Γ. ECG Intelligence Lab
- **Source bank**: εγκεκριμένα ανωνυμοποιημένα πραγματικά ΗΚΓ ή επιστημονικά ελεγμένα συνθετικά, με source + label + clinical reviewer + license; όχι τυχαία ζωγραφισμένα κύματα που παρουσιάζονται ως πραγματικά.
- **Viewer**: pan/zoom, μετρήσεις συχνότητας, RR, PR, QRS, QT/QTc, κλίμακα πλέγματος, ταχύτητα χαρτιού και βαθμονόμηση όπου όντως τεκμηριώνεται.
- **Learning**: βήματα συστηματικής ανάγνωσης, επιλογή ευρημάτων, αιτιολόγηση, σύγκριση με επιμελημένο interpretation, confidence flag.
- **Acceptance**: golden ECG fixture suite ανά ρυθμό/εύρημα και έλεγχος απεικόνισης/μονάδων, διαχωρισμός «ανάγνωσης ΗΚΓ» από θεραπευτικές οδηγίες.

### Δ. Ιατρική Ομάδα AI / Faculty Council
- **Roles**: κλινικός συντονιστής, επείγουσα ιατρική, αναισθησιολογία, καρδιολογία, παιδιατρικά/τραύμα όπου απαιτείται, και ξεχωριστός verifier.
- **Orchestration**: οργάνωση επιμέρους *δομημένων απόψεων* \`{observations, hypotheses, missing_data, evidence, uncertainty, scope}\`; reconciliation από συντονιστή, με εμφανείς διαφωνίες.
- **Safety**: οι «πολλοί ρόλοι» δεν είναι από μόνοι τους ανεξάρτητη ιατρική πιστοποίηση, ιδιαίτερα αν τρέχουν στο ίδιο μοντέλο. Εξωτερικός evidence checker, rule validator και κλινική επιμέλεια είναι υποχρεωτικά.
- **Acceptance**: τεκμηριωμένες πηγές ανά γνώμη, δυνατότητα «δεν γνωρίζω», αποτροπή επινοημένων citations, τεστ σε αντικρουόμενα σενάρια.

### Ε. Πολλαπλοί Τραυματίες / Mass Casualty
- **UI**: ταμπλό συμβάντος με ασθενείς/διαθέσιμα μέσα, οπτικά διακριτές κατηγορίες διαλογής, χρονογραμμή και καταγραφή αποφάσεων.
- **Engine**: incident JSON με ασθενείς, συνθετικές παρατηρήσεις, διαθέσιμα πληρώματα/πόρους, επιμελημένο triage protocol/version/jurisdiction· ποτέ hardcoded γενικό σύστημα ως «επίσημο ελληνικό».
- **MVP**: ένα μικρό περιστατικό 3–5 ασθενών, στη συνέχεια μεγαλύτερα, με υποχρεωτική αναθεώρηση προτεραιοτήτων.
- **Acceptance**: επιστημονικός έλεγχος ανά patient fixture, nachvollσιμότητα αποφάσεων, ακριβής περιγραφή γιατί ένα περιστατικό επαναταξινομείται.

### ΣΤ. Διαδραστικός Εξοπλισμός
- **UI/Assets**: 2D interactive first, αργότερα 3D για AED, BVM, monitor/οξύμετρο, απλή οξυγονοθεραπεία· κάθε control έχει semantic label και ελληνικό tooltip.
- **Domain**: device profiles με μοντέλο/οδηγίες κατασκευαστή, training mode, state guards, indications/contraindications as approved for student scope.
- **Acceptance**: όλες οι εκπαιδευτικές ενέργειες ελέγχονται από ειδικό, προσβάσιμη χρήση πληκτρολογίου, σαφής προσομοίωση (όχι πραγματική απομακρυσμένη χρήση συσκευής).

### Ζ. Προφορικές Εξετάσεις
- **UI**: μικρόφωνο μόνο κατόπιν συναίνεσης, live transcript, ορατά κουμπιά \`Έναρξη/Παύση/Διαγραφή\`, ισοδύναμη εξέταση μόνο με πληκτρολόγιο, optional TTS.
- **Backend**: κατάλληλος speech-to-text provider/API μέσω αυθεντικοποιημένου backend, strict limits, no patient-identifying information, clear retention/deletion policy. STT transcript shown for correction before any assessment.
- **Teaching**: διαδραστικές διαδοχικές ερωτήσεις, \`needs_more_detail\` followups, σωστό/μερικό/αβέβαιο ως **ξεχωριστό formative Mentor feedback**.
- **Acceptance**: χειρισμός σφαλμάτων STT, ελληνικών ιατρικών όρων, αργής σύνδεσης, βραχέων/διακοπτόμενων απαντήσεων, ποτέ αποθήκευση ήχου χωρίς ρητή συναίνεση.

### Η. Προσωπική Ιατρική Ακαδημία
- **UI**: «Αποστολή / Μνήμη / Διαδρομή», μητρώο ικανοτήτων ανά γνώση (π.χ. ABCDE, αεραγωγός, ΗΚΓ), θεματικές διαδρομές ΣΑΕΚ→ΕΟΠΠΕΠ→Advanced theory.
- **Mastery**: εκτιμήσεις από *Mentor-only* response events, πολλαπλά ανεξάρτητα τεκμήρια, recency, confidence, spaced retrieval; **διάβασα κεφάλαιο ≠ γνωρίζω**.
- **Legacy adapter**: read-only view των \`ekab.saek.read.v1.*\`, \`ekab.saek.exams.v1\`, \`ekab-eoppep-official-v15\` και events, με ρητά provenance flags. Όχι αντιγραφή/επανερμηνεία ως επίσημη βαθμολογία.
- **Acceptance**: μαθητής μπορεί να δει γιατί έγινε μια σύσταση, να διορθώσει στόχους, να εξάγει ή να διαγράψει ξεχωριστά δεδομένα Mentor· cloud/device merge tests χωρίς διαγραφή παλιών δεδομένων.

## 5. Γνώση βιβλίων: έλεγχος → RAG → απάντηση

- 7 εξαγμένα κείμενα = **draft corpus**, όχι approved knowledge base. Χρειάζεται έλεγχος OCR/extraction, editions, third-party figure rights, περιεχομένου, ISBN/DOI/URL, ακριβών chapter boundaries και κλινικών αλλαγών.
- Ευρετηρίαση ανά πραγματικό κεφάλαιο/σελίδα, source hash + version + language + reviewer. Πρώτα λεξική/hybrid αναζήτηση και μετά semantic reranking αν δικαιολογείται από αξιολόγηση.
- \`medical_claim\` → retrieval evidence → explicit source quote/locator (bounded) → evidence coverage check → response synthesis in Greek → verify unsafe content → final user-visible citations.
- **Default deny**: unreviewed passages never enter production evidence index. Separate reviewer-only CLI currently exists; \`searchApprovedBooks\` appropriately returns no passages until actual approval.
- Επιστημονική ιεραρχία: ισχύοντα τεκμηριωμένα ελληνικά πρωτόκολλα/επιτρεπόμενες αρμοδιότητες → επικαιροποιημένες consensus guidelines → εκπαιδευτικά εγχειρίδια. Conflict detection + \`last_reviewed_at\`; όταν η τεκμηρίωση λείπει, η AI δηλώνει αβεβαιότητα.
- Μοντέλο AI δεν «εκπαιδεύεται» αυτομάτως από τη μεταφόρτωση αρχείων: χρησιμοποιείται RAG με αναφορές, ενώ τυχόν model fine-tuning χρειάζεται άλλο σχεδιασμό, δεδομένα και άδεια.

## 6. API / διαχείριση κλήσεων

Προτεινόμενα νέα endpoints (σε **ανεξάρτητη** υπηρεσία, όχι στον grader):
- \`GET /mentor/v1/content/status\` — αριθμός approved sources + versions.
- \`POST /mentor/v1/consult\` — ερώτηση μαθητή + περιορισμένο provenance context, επιστρέφει structured \`answer, citations, uncertainty, scope\`.
- \`POST /mentor/v1/cases/{caseId}/action\` — \`sessionId, version, actionId, idempotencyKey\`; deterministic next-state.
- \`POST /mentor/v1/faculty\` — evidence-linked multidisciplinary analysis.
- \`POST /mentor/v1/oral/transcribe\` — opt-in audio-to-text, strict size limits.
- \`GET/PUT /mentor/v1/profile\` — separate learner goals/mastery records, explicit auth.
- Επιστροφή ασφαλούς \`429\`/budget fallback· server-only secrets; TLS, JWT/session validation, origin policy, rate limiting, cost cap, audit without clinical/user-sensitive text.

## 7. Σχήματα δεδομένων και προστασία προόδου

\`\`\`json
{
  "schema_version": 1,
  "event_id": "uuid",
  "course": "mentor",
  "user_scope": "private",
  "event_type": "scenario_action",
  "activity_id": "case-001",
  "activity_version": "1.0.0",
  "timestamp": "ISO-8601",
  "competency_ids": ["primary-survey"],
  "mentor_feedback": {
    "result": "needs_review",
    "source_ids": ["who-bec"],
    "confidence": "review-pending"
  }
}
\`\`\`

Διαχωρισμός \`mentor_progress_v1\` από \`EOPPEP/SAEK\` καθώς και versioned migrations **μόνο μέσα στο Mentor**. Άνοιγμα νέου χρήστη/λογαριασμού δεν διαρρέει παλιό profile. Export/delete Mentor independently. Ελέγχουμε real mobile Safari, offline states, account switch, duplicate actions, multiple tabs και rollback.

### Ρητές αρνήσεις μεταβολών

- Ο Mentor δεν καλεί \`EkabSaekExamEngine.recordGrade\` ούτε \`EkabStudyScheduler.record\` για δικές του δραστηριότητες.
- Δεν γράφει \`ekab-eoppep-official-v15\`, \`ekab.saek.exams.v1\` ή \`ekab.personal-notes.v1\` χωρίς ξεχωριστή ενέργεια χρήστη που αφορά την υπάρχουσα εφαρμογή.
- Δεν επεκτείνει στα τυφλά το \`ekab-sync-v1\`. Ξεχωριστό sync + reconciliation schema και tests.
- Τα ήδη καταχωρισμένα αποτελέσματα παραμένουν byte-identical μετά από Mentor sessions, και συγκρίνονται με πριν/μετά fixture hashes.

## 8. Στάδια παράδοσης και quality gates

### Stage 0 — ασφάλεια / βιβλιοθήκη
- Snapshot/backup test fixtures για ΣΑΕΚ/ΕΟΠΠΕΠ/σημειώσεις/συγχρονισμό, έλεγχος κλινικής ακρίβειας και αδειών, chapter-indexed reviewed corpus, Greek terminology glossary.
- **Gate:** δεν εμφανίζεται «AI grounded in books» όσο δεν υπάρχουν πραγματικά reviewed passages.

### Stage 1 — Mentor foundations / Academy
- Ξεχωριστό Mentor page/router, event store, read-only legacy data adapter, study plan/reasons, source retrieval gateway; versioned schema.
- **Gate:** existing grading files unchanged + no progress mutations after 100+ sample sessions; account isolation and UI mobile audit.

### Stage 2 — EKAB Live + equipment + structured triage
- Implement shared deterministic scenario engine + 3–5 vetted cases, 2–3 equipment modules, 1 mass-casualty case.
- **Gate:** exact replay, clinician-reviewed transition matrix, failed dangerous-action tests, saved debrief/restart.

### Stage 3 — ECG + 3D anatomy
- Reviewed ECG examples, calibrated measuring viewer, 3D asset licensing/scientific QA; 2D accessible fallback.
- **Gate:** benchmark ECG fixtures; labels/laterality; performance on mobile Safari, low-memory devices and no-WebGL mode.

### Stage 4 — Medical Faculty + Oral Examination
- Independent Mentor API, structured role outputs with verification and physician-review gates, opt-in STT/TTS, text equivalent.
- **Gate:** hallucinated citation red-team, token/cost budget, authorization bypass, prompt injection from book content, private audio handling.

### Stage 5 — final integration
- Canary/feature flags, actual-device UI tests, complete backups and sync replay, medical reviewers' sign-off, release notes, rollback instructions and source/version audit.
- **Gate:** only after above, safe merge to \`main\` and production exposure. No arbitrary % completion without evidence.

## 9. Test suites / acceptance matrix

| Test | Requirement |
| --- | --- |
| Existing grader regression | All historical tests pass; grader code untouched |
| Legacy data integrity | Existing progress, exams, notes and backups equal before/after Mentor usage |
| Account isolation | Mentor data never leaks between two Appwrite users |
| Offline and Safari | Read-only/2D/text fallback; no silent data loss |
| Scenario replay | Identical state transitions for fixed seed and input |
| Simulation medical QA | Clinical reviewer approval for all treatment consequences |
| ECG clinical QA | Human-verified rhythm/measurement labels for each released sample |
| 3D anatomical QA | Correct Greek labels, arrow placement, laterality |
| Faculty RAG | No unreviewed excerpts, false citations or overconfident medical certainty |
| Voice privacy | Explicit opt-in; stop, cancel, delete, no raw audio in logs |
| Massive event/sync load | Bounded history, idempotent event processing, race tests |
| Rollback | Revert Mentor deployment without touching legacy local or cloud data |

## 10. Current status — 28 October 2026

| Deliverable | Status |
| --- | --- |
| Source catalog | Implemented in draft PR #83 |
| Seven full-text extracted books | Implemented in draft PR #83; review pending |
| Deterministic reviewed-corpus retrieval primitives | Initial code exists; production returns no unreviewed content |
| Mentor basic read-only planner | Prototype exists in separate draft PR #22 |
| Production-connected AI Mentor | NOT IMPLEMENTED |
| Eight advanced modules | NOT IMPLEMENTED |
| Scientific certification | NOT COMPLETED |
| Production release | NOT COMPLETED |

This is the proposed engineering blueprint, **not** a claim that the described features are working. No production code, grade storage, sync semantics or medical review status is changed by this document.
