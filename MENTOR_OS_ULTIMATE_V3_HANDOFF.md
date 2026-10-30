# MENTOR OS ULTIMATE V3 — HANDOFF (για έλεγχο από GPT)

**ΚΑΤΑΣΤΑΣΗ: ΜΕΡΙΚΗ ΥΛΟΠΟΙΗΣΗ — ΟΧΙ «ολοκληρωμένο ULTIMATE V3», ΟΧΙ «έτοιμος καθηγητής».** Τα passing tests ελέγχουν λογική, γεωμετρία και αποθήκευση· **δεν** αποδεικνύουν φωνή ή εκπαιδευτική εμπειρία. Το avatar αντικαταστάθηκε με πιο ρεαλιστικό μοντέλο (Microsoft Rocketbox Medical_Female_03, MIT) και εγκρίθηκε οπτικά από τον ιδιοκτήτη, **αλλά** δεν είναι φωτορεαλιστικός «ιατρός–καθηγητής» με επίσημη στολή ΕΚΑΒ (είναι γενική στολή διασώστη), δεν δοκιμάστηκε πραγματική ελληνική φωνή (στον υπολογιστή δοκιμών δεν υπάρχει) και δεν έγινε δοκιμή σε iPhone/Safari.

## 0. Κατάσταση παράδοσης
- Repository: https://github.com/6d9757cmp5-creator/ekab-spoudi · Branch: `refactor/mentor-unified-folder-20261030`
- **Κώδικας που ελέγχθηκε (HEAD κατά την παραγωγή των evidence): `53e0b9b6`** = merge του `origin/main` (`95f01a65`, v27.1.126) στο branch εργασίας. Το commit που περιέχει αυτό το αρχείο έπεται και αλλάζει μόνο τεκμηρίωση/evidence. Κάθε evidence JSON αναφέρει το commit που ελέγχει· `COMMIT.txt` στο zip.
- **Δημοσίευση: ΟΧΙ.** Το `main` του remote είναι στο `95f01a65` (εργασία του ιδιοκτήτη: debrief, πρωτόκολλα, animation engine) και **δεν** έχει ενσωματώσει τη δική μου δουλειά. Το branch εργασίας περιέχει πλέον το `main` (merge `53e0b9b6`, μόνο μηχανικές συγκρούσεις σε script tags και `sw.js`), άρα το μελλοντικό merge στο main είναι καθαρό αν το main δεν προχωρήσει ξανά. Δεν δημιουργήθηκε PR. Το `AGENTS.md` ζητά αλλαγές απευθείας στο main χωρίς PR· θα εφαρμοστεί μόνο όταν ο ιδιοκτήτης το εγκρίνει μετά από αυτόν τον έλεγχο.
- AI: **απενεργοποιημένο** (`endpoint:""`). Η τοπική αναζήτηση σε 203 όρους **δεν** είναι AI συνομιλία και δεν παρουσιάζεται ως τέτοια.

### Τι τεστ είναι πραγματικό και τι προσομοιωμένο
| Είδος | Πραγματικό ή προσομοιωμένο |
| --- | --- |
| Unit tests (53 + 45) | Πραγματικά για τη λογική· το Worker/AI ελέγχεται με **mock** |
| Browser tests (85) | Πραγματικός Edge στον υπολογιστή δοκιμών· «κινητό» = **προσομοίωση viewport/αφής**, όχι iPhone· **ομιλία/μικρόφωνο = stubs** |
| Ελληνική φωνή/αναγνώριση | **Μερικώς πραγματικό:** στον υπολογιστή δοκιμών εγκαταστάθηκε η ελληνική φωνή των Windows (μόνο «Microsoft Stefanos», ανδρική). Πραγματική εκφώνηση μέσω Edge: ξεκινά ≈0,55 s μετά την κλήση, 55 γεγονότα στόματος σε ≈5,8 s, τέλος σε ηρεμία — **ο ήχος δεν ηχογραφήθηκε/δεν αξιολογήθηκε από ακροατή**. **Δεν υπάρχει γυναικεία ελληνική φωνή** στον υπολογιστή (το Edge δεν εμφανίζει την online «Athina»)· η αναγνώριση ομιλίας (μικρόφωνο) δεν δοκιμάστηκε πραγματικά |
| FPS/μνήμη | Μετρήθηκαν σε **πραγματική GPU** (Intel Iris 540, ενσωματωμένη, desktop Edge) **και** σε software WebGL — βλ. §Η. Όχι σε τηλέφωνο |
| iPhone/Safari, Android, screen reader | **Δεν έγιναν** |

## 0.1 Αντιπαραβολή με το αρχικό script (P0–P8)
Κατάσταση: ✅ ολοκληρώθηκε και δοκιμάστηκε · 🟡 μερικό/απλά προετοιμασμένο ή δοκιμασμένο μόνο με stubs · ❌ δεν έγινε.
| Φάση | Αρχική απαίτηση | Πραγματική υλοποίηση | Αρχεία | Αποδεικτικό | Εκκρεμότητα | |
| --- | --- | --- | --- | --- | --- | --- |
| P0 | Audit: αρχιτεκτονική, ένας MENTOR, κανόνες | Audit έγινε· ένας κώδικας στο `mentor/`, root shims | §Β | Αυτό το έγγραφο | — | ✅ |
| P1 | Παρουσία σε όλη την εφαρμογή: drag, pin, hide, minimize, resize, μνήμη θέσης | Πλωτός MENTOR σε 51 σελίδες + ενσωματωμένη μορφή στην αρχική με «Απόκρυψη μορφής» (υπήρχε, επιβεβαιώθηκε: φορτώνει, κρύβεται, μένει κρυμμένη μετά από refresh, δεν καλύπτει κουμπιά) | `mentor/presence/*`, `index.html`, `mentor-lab.html` (κουμπί επαναφοράς) | 85 browser checks· `home-*-shown/hidden.png`· έλεγχος αρχικής | Η αρχική χρησιμοποιεί **ενσωματωμένο πλαίσιο**, όχι το πλωτό widget (ίδιος κώδικας `mentor-presence.html`, αλλά δύο τρόποι εμφάνισης)· δεν δοκιμάστηκε σε πραγματικό κινητό | ✅/🟡 |
| P2 | Φωτορεαλιστικός ιατρός–καθηγητής με ενδυμασία ΕΚΑΒ, φυσικό πρόσωπο, βλέμμα, βλεφαρισμούς, εκφράσεις, χειρονομίες | **Μερικά.** Ενεργό μοντέλο = Microsoft Rocketbox Medical_Female_03 (MIT) στη θέση του παλιού (ένα μόνο μοντέλο, χωρίς εναλλακτικές). Πρόσωπο/υφές αισθητά ρεαλιστικότερα· 67 morph targets (15 visemes + 52 ARKit)· βλεφαρισμός, φρύδια, χαμόγελο, 8 εκφράσεις ανά δραστηριότητα· χειρονομίες χεριού (καλωσόρισμα/εξήγηση/επιφύλαξη)· στάση, αναπνοή, κίνηση κεφαλιού | `mentor/assets/mentor-real-3d.glb` (+ `assets/`), `mentor/real-avatar/entry.mjs`, `mentor/avatar/real3d.bundle.mjs`, `mentor/assets/AVATAR-PROVENANCE.md` | `app-gesture-*.png`, `app-widget-*.png`, `app-home-avatar.png`, audits, 95 browser checks | **Δεν είναι φωτορεαλιστικός ιατρός-καθηγητής:** γενική μπλε στολή διασώστη (όχι επίσημη ΕΚΑΒ, όχι ιατρική ποδιά), πλαστικότητα χαμηλής ανάλυσης, χωρίς κίνηση δαχτύλων/βλέμματος. Δεν υπάρχουν animation clips (μόνο procedural κίνηση). Ο ιδιοκτήτης ζήτησε στολή/έμβλημα: το επίσημο έμβλημα ΕΚΑΒ δεν μπήκε (δες §N). Δεν δοκιμάστηκε σε κινητό | 🟡 |
| P3 | Ελληνική εκφώνηση και αναγνώριση, διακοπή, μικρόφωνο, lip-sync, τόνος/εκφράσεις/χειρονομίες ανά δραστηριότητα | Web Speech el-GR, μικρόφωνο μόνο μετά από πάτημα, barge-in. **Νέο:** σχήματα στόματος ανά γράμμα/δίψηφο της λέξης (`mouth.mjs`), χρονισμένα από τα word boundaries· **έκφραση+χειρονομία ανά δραστηριότητα** (`expression.mjs`: εξήγηση→explanatory/explain, εξέταση→examiner/caution, ασφάλεια→caring/reassure, ακρόαση→patient/question, άνοιγμα→welcoming/greet) | `mentor/presence/voice.mjs`, `mouth.mjs`, `expression.mjs` | Unit tests (3)· browser checks ότι το avatar παίρνει την έκφραση (explanatory/examiner) — η ομιλία παραμένει **stub** | **Ακριβές lip-sync ΔΕΝ υπάρχει:** η φωνή της συσκευής δεν δίνει ήχο ούτε χρονισμούς φωνημάτων· απαιτείται TTS που επιστρέφει ήχο+χρονισμούς ή μοντέλο ήχου→blendshapes (ενότητα L). Οι εκφράσεις/χειρονομίες είναι αυτές που υποστηρίζει το υπάρχον μοντέλο (μικρές κινήσεις κεφαλιού/χεριού, χαμόγελο/φρύδια)· δεν είναι φωτορεαλιστική υποκριτική. Μία πραγματική δοκιμή εκφώνησης με τη φωνή των Windows «Stefanos» (ανδρική): γεγονότα ομιλίας και στόματος λειτουργούν· δεν δοκιμάστηκε γυναικεία φωνή ή μικρόφωνο | 🟡 |
| P4 | Πραγματικό δωρεάν AI μέσω ασφαλούς proxy | Κώδικας client + Cloudflare Worker, **απενεργοποιημένα**. Δεν αναπτύχθηκε | `mentor/ai/*`, `workers/mentor-chat/*` | 20 tests με mock | Αναμένεται δική σου έγκριση πριν από οποιαδήποτε ενεργοποίηση | 🟡 (σκόπιμα off) |
| P5 | Επίγνωση περιεχομένου (read-only, ελάχιστη, ορατή, απενεργοποιήσιμη) | Τίτλος/επικεφαλίδα/είδος σελίδας (από τη διεύθυνση)/επιλογή· ανακοίνωση βήματος από `mentor-live`, `mentor-oral` (εξάσκηση ↔ ενεργή εξέταση), `mentor-ecg` (άσκηση), 3D ανατομία (επιλεγμένη δομή, σιωπή κατά τον αυτοέλεγχο)· σιωπή σε σελίδες εξέτασης | `mentor/context/bridge.mjs`, `mentor/context/anatomy-announce.mjs`, `mentor/app/live.js`, `oral.js`, `ecg-practice.js` | Unit + 105 browser checks· χειροκίνητος έλεγχος ανατομίας (εξερεύνηση, σύνδεσμοι)· η ανίχνευση «τρέχων αυτοέλεγχος ανατομίας» ελέγχθηκε μόνο με unit test — το μοντέλο 3D δεν φόρτωσε στο περιβάλλον δοκιμής | Μαθήματα ΣΑΕΚ μόνο με τίτλο σελίδας· δεν ανακοινώνουν βήμα οι σελίδες του main (`mentor-protocol-suite`)· η λίστα σελίδων εξέτασης παραμένει εικασία | 🟡 |
| P6 | Επιστημονική γνώση/RAG με πηγές | Ανάκτηση σε 203 όρους με πηγή URL· risk guard (regex)· ορατή σήμανση «χωρίς κλινική επιμέλεια» σε κάθε απάντηση με πηγή | `mentor/knowledge/retrieve.mjs`, `medical-terms.json` | 7 unit tests (δεν είναι επιστημονική επικύρωση) | **Δεν** είναι ιατρική βιβλιοθήκη. Οι πηγές είναι κυρίως γενικές σελίδες (`sourceType:"category"`), χωρίς έλεγχο/έκδοση ανά όρο. Απαιτείται κλινική επιμέλεια, εκδόσεις πηγών, ελεγμένα βιβλία | 🟡 |
| P7 | Σενάρια, ECG, ανατομία, προφορική, προσαρμοσμένη μελέτη, ανατροφοδότηση, με έναρξη–ενέργειες–συνέπειες–ολοκλήρωση–debrief | **`mentor-live`:** έναρξη, 4 αποφάσεις, συνέπειες (κάθε λανθασμένη επιλογή επιταχύνει συνθετικά τις τιμές του ατόμου), debrief. **`mentor-oral`:** διακόπτης «Ενεργή εξέταση». **`mentor-ecg` (νέο):** άσκηση μέτρησης ρυθμού σε λωρίδα 6 s (5 λωρίδες): επιλογή αριθμού QRS → συνέπεια (σημάδεμα QRS + τύπος × 10 + εκτίμηση) → ολοκλήρωση → ανασκόπηση με κατεύθυνση λαθών και υπόδειξη, δική της αποθήκευση. Ο ιδιοκτήτης έχει επιπλέον στο `main` δικό του LAB/DEBRIEF πρωτοκόλλων (`mentor-protocol-suite`)· δεν έγινε ενοποίηση με το δικό μου | `mentor/core/live-sim.mjs`, `ecg-practice.mjs`, `mentor/app/*`, `mentor-ecg.html`, `mentor-oral.html` | 5+4 unit tests, 105 browser checks (ECG: λάθος→συνέπεια, επανεκκίνηση σελίδας, ανασκόπηση 4/5) | Συνέπειες/debrief σε **ανατομία, adaptive μελέτη, `mentor-scenarios`** (ο άτλας είναι μόνο ανάγνωση)· ενοποίηση με το debrief του `main`· κλινική επιμέλεια του περιεχομένου· μόνο 1 σενάριο προσομοίωσης | 🟡 |
| P8 | Βελτιστοποίηση, προσβασιμότητα, ασφάλεια, tests, πραγματικά benchmarks | Διόρθωση μνήμης GLB (795→~125 MB)· axe 0 παραβιάσεις· μετρήσεις σε πραγματική GPU του υπολογιστή· desk benchmark | `scripts/*`, `mentor/BENCHMARK.md`, evidence | `audit-hardware-gpu.json`, `audit-software-gl.json` | iPhone/Safari, Android, screen reader, χειροκίνητη αντίθεση, user testing, μέτρηση μπαταρίας, πραγματικό head-to-head benchmark | 🟡 |

## A. Repository & Version
- Repository: https://github.com/6d9757cmp5-creator/ekab-spoudi
- Branch εργασίας: `refactor/mentor-unified-folder-20261030`
- Αρχικό commit branch: `a163252` (7 μπροστά από main, 0 πίσω). main = `05faa30` (αμετάβλητο).
- Commits εργασίας (παλαιότερο → νεότερο): `d63afc6` floating companion · `d40263f` context bridge + Ask · `ed0daa8` διόρθωση γωνίας/μεγέθους · `b600a4a` πρώτο handoff · `354147f` φωνή, μνήμη, πλοήγηση, retrieval, AI adapter, Worker · `e353a1c` βελτιστοποίηση GLB, επικεφαλίδα πλαισίου, audit script · (+ commit με benchmark/τελικό handoff — δες `git log`).
- **Ενσωμάτωση στο main: ΟΧΙ.** Ο χρήστης επέλεξε εργασία σε branch. Το GitHub Pages δεν έχει αλλάξει. Το `AGENTS.md` προβλέπει απευθείας main, αλλά δεν εφαρμόστηκε ώστε να μην δημοσιευτεί ημιτελές έργο.

## B. Audit (P0)
- `AGENTS.md`: δύο κανόνες (φορτώνει η εφαρμογή· φορτώνει σε κινητό και υπολογιστή). Ο `mentor/` είναι ενιαίος· τα root `mentor-*` είναι shims.
- Αρχικά: ο MENTOR 3D υπήρχε μόνο σε αρχική και εργαστήριο· το μοντέλο `mentor-real-3d.glb` (23,5 MB) έφτανε ≈795 MB JS heap (βλ. Ε).
- Υπάρχον AI = μόνο grader βαθμολόγησης (`workers/answer-grader`). Κανένα chat AI. Το `mentor/README.md` έλεγε «χωρίς νέα σύνδεση AI» — ενημερώθηκε ότι ισχύει μέχρι ενεργοποίηση.
- Δεν εκτέθηκαν ούτε διαβάστηκαν μυστικά.

## C. Implementation — αρχεία
- `mentor/presence/`: `presence-state.mjs`, `presence.mjs`, `presence.css`, `voice.mjs`, `memory.mjs`, `navigate.mjs` (+ δοκιμές `presence-state.test.mjs`, `memory-navigate.test.mjs`)
- `mentor/context/bridge.mjs` (+ test) · `mentor/knowledge/retrieve.mjs` (+ test) · `mentor/ai/client.mjs`, `config.mjs` (+ test)
- `workers/mentor-chat/` (`src/index.js`, `wrangler.jsonc`, `README.md`, `worker.test.mjs`)
- `scripts/verify-mentor-presence-browser.mjs`, `scripts/audit-mentor-presence.mjs`, `scripts/optimize-mentor-glb.mjs`
- `mentor/BENCHMARK.md`
- Τροποποιήσεις: 51 σελίδες `*.html` (μία γραμμή script), `sw.js` (ASSETS), `.github/workflows/app-load.yml`, `mentor/README.md`, και **και τα δύο αντίγραφα** `mentor/assets/mentor-real-3d.glb` + `assets/mentor-real-3d.glb` (ίδια bytes, ο έλεγχος διάταξης το απαιτεί).
- Dependencies στο repo: καμία. Εργαλεία εκτός repo: Playwright 1.56.1, axe-core 4.10.2, @gltf-transform 4.5.1 (στο `C:\Users\Ppdks\ekab-tools`).

## D. Platform-Wide Mentor (P1) + Context (P5)
- **Παρουσία:** drag (ποντίκι/αφή/βέλη), resize, καρφίτσωμα σε 4 γωνίες, προσάρτηση (πάνελ/bottom sheet), ελαχιστοποίηση, απόκρυψη, επαναφορά (`Alt+Shift+M`, `window.EkabMentorPresence`, ή κουμπί «Εμφάνιση πλωτού MENTOR» στη σελίδα `mentor-lab.html`). Προτιμήσεις `ekab.mentor.presence.v1` χωριστά desktop/κινητό (όριο 720 px). Προεπιλογή: ελαχιστοποιημένο, κάτω αριστερά (το κάτω δεξιά το πιάνει το κουμπί σημειώσεων). Το 3D φορτώνει μόνο όταν ανοίξει και αποδεσμεύεται όταν κλείσει.
- **Πλοήγηση:** νέο έγγραφο σε κάθε σελίδα· ο WebGL renderer **δεν** επιβιώνει — αποκαθίσταται η κατάσταση και το 3D ξαναφορτώνει. Η συνομιλία διατηρείται στο `sessionStorage` (μόνο η καρτέλα, διαγράφεται με κουμπί).
- **Context Bridge:** μόνο τίτλος, πρώτη επικεφαλίδα που **δεν** είναι το όνομα της εφαρμογής, path, και ρητά επιλεγμένο κείμενο (μόνο με κλικ). Ανακοινώσεις `mentor:context` με whitelist. Ο χρήστης βλέπει και απενεργοποιεί το πλαίσιο. Σελίδες εξέτασης (`written_exam, practical_exam, exam_focus, saek-exams`) ή ανακοινωμένη ενεργή εξέταση ⇒ ο MENTOR **αρνείται** να απαντήσει.
- **Smart navigation:** πρόταση συνδέσμου από σταθερή λίστα 16 σελίδων· ο χρήστης πατά τον σύνδεσμο· ο MENTOR δεν πλοηγεί μόνος του. Test ελέγχει ότι κάθε route υπάρχει.
- **Study modes / focus / memory:** επίπεδο (αρχάριος…επιστημονικός), αυτόματη ανάγνωση, ελαχιστοποίηση σε εξετάσεις (`ekab.mentor.learning.v1`). Ισχύει μόνο το επίπεδο για το (απενεργοποιημένο) AI prompt.
- **Ανοιχτά:** καμία σελίδα μαθήματος/ανατομίας/σεναρίου δεν εκπέμπει `mentor:context` (π.χ. ποιο όργανο έχει επιλεγεί)· δεν υπάρχει καταχώριση στο κεντρικό μενού· δεν δοκιμάστηκαν σύγκρουση z-index με modals της εφαρμογής πέρα από το κουμπί σημειώσεων· το docked mode προσθέτει padding στο `body` και δεν δοκιμάστηκε σε όλες τις σελίδες.

## E. Digital Human (P2/P3)
- **P2 (μερικώς):** το μοντέλο αντικαταστάθηκε με Medical_Female_03 (Microsoft Rocketbox, MIT) — προέλευση/άδεια: `mentor/assets/AVATAR-PROVENANCE.md`. Η στολή είναι γενική στολή διασώστη, **όχι** επίσημη ΕΚΑΒ. Το προηγούμενο μοντέλο (Ara 3D Gen) αφαιρέθηκε από την εφαρμογή (μόνο στο ιστορικό git).
- **Απόδοση νέου μοντέλου:** 7.536 τρίγωνα, 80 οστά, αρχείο 4,6 MB (παλιό 23,5 MB). Μνήμη/ταχύτητα: βλ. πίνακα §Η. Για το νέο μοντέλο εφαρμόστηκε `compactPrimitive` + sparse morph targets ώστε τα 7 primitives να μη κρατούν αντίγραφα όλων των morphs. Το runtime (`entry.mjs`) ξαναχτίστηκε με esbuild· το widget φορτώνει προβολή `?view=bust`.
- **Φωνή:** `voice.mjs` — Web Speech el-GR, προτίμηση γνωστής **γυναικείας** ελληνικής φωνής (Αθηνά, Μελίνα, Ελένη, Google ελληνικά… αναγνώριση μόνο από το όνομα — δεν αποδεικνύει το φύλο του ήχου) αλλιώς όποια ελληνική φωνή έχει η συσκευή. Η πολιτική άλλαξε από «αυστηρά ανδρική» σε «γυναικεία» αφού ο MENTOR έγινε γυναίκα· ενημερώθηκαν `mentor/voice/speech.mjs`, `home.js`, `lab.js`, τα κείμενα στα `index.html`/`mentor-lab.html` και τα tests· μικρόφωνο **μόνο μετά από πάτημα** με ορατή ένδειξη· barge-in. Δοκιμάστηκε **μόνο με stubs**. Στον υπολογιστή δοκιμών (Windows 11, Edge) υπάρχουν 3 φωνές και **καμία ελληνική**, άρα δεν ακούστηκε/μετρήθηκε πραγματική ελληνική εκφώνηση ούτε αναγνώριση ομιλίας. Αν δεν υπάρχει ελληνική φωνή, η εφαρμογή δεν μπορεί να μιλήσει ελληνικά.
- **Lip-sync:** γράμμα-προς-γράμμα σχήματα στόματος (5 σχήματα) από το κείμενο κάθε λέξης, με χρονισμό από τα word boundaries της φωνής συσκευής. **Δεν είναι audio-aligned ούτε phoneme-accurate** και δεν παρουσιάζεται ως τέτοιο. Δεν επιλέχθηκε/δοκιμάστηκε cloud TTS με visemes (δεν επιβεβαιώθηκε υποστήριξη ελληνικών — βλ. BENCHMARK, §L).
- **Ολογραφική λειτουργία:** υπάρχει από πριν (`mentor/avatar/hologram.mjs`)· δεν επεκτάθηκε.

## F. AI (P4) — κατασκευασμένο, ΑΠΕΝΕΡΓΟΠΟΙΗΜΕΝΟ
- `mentor/ai/config.mjs`: `endpoint:""` ⇒ **καμία αποστολή δεδομένων**. Test το επιβεβαιώνει· browser test επιβεβαιώνει 0 εξωτερικά requests.
- `mentor/ai/client.mjs`: payload μόνο ερώτηση, ≤4 παραθέματα, επίπεδο, ≤4 σύντομα μηνύματα· SSE streaming· timeout· 429 ⇒ μήνυμα ορίου δωρεάν χρήσης· χωρίς παραθέματα δεν γίνεται κλήση.
- `workers/mentor-chat`: Cloudflare Workers AI binding, allowlist μοντέλων, origin allowlist (GitHub Pages), 20 αιτήματα/ώρα/IP και ημερήσιο cap (in-memory — best effort), μόνο τεκμηριωμένες απαντήσεις, απενεργοποιημένο μέχρι `MENTOR_FREE_PLAN_CONFIRMED=true`. 11 tests με mock. **Δεν αναπτύχθηκε, δεν δοκιμάστηκε σε πραγματικό Workers AI, δεν επαληθεύτηκαν όρια δωρεάν χρήσης ούτε ποιότητα ελληνικών.**
- Ανθρώπινες ενέργειες: Cloudflare Free λογαριασμός, `wrangler deploy`, ορισμός μεταβλητής, βαθμονόμηση απαντήσεων, αναθεώρηση κανόνα README, ορισμός `endpoint`. Οδηγίες στο `workers/mentor-chat/README.md`.
- Δεν συγκρίθηκαν Gemini/Groq/open-source για ελληνικά με πραγματικές δοκιμές· υπάρχουσες σημειώσεις στο `functions/answer-grader/FREE-SETUP.md` (μόνο OpenRouter live-tested για grading).

## G. Medical Knowledge (P6)
- `knowledge/retrieve.mjs`: ανάκτηση παραθεμάτων από `medical-terms.json` (203 όροι, με πηγές `https://` και `sourceType`)· ranking, όρια, καμία εφεύρεση πηγής. **Risk guard:** φράσσει δοσολογίες, πραγματικό περιστατικό και διάγνωση (μήνυμα με 166/112). 7 tests.
- **Δεν** προστέθηκε νέο ιατρικό περιεχόμενο, δεν υπάρχει ιστορικό εκδόσεων πηγών πέρα από τα πεδία `version/updated` του αρχείου όρων, δεν υπάρχει RAG πάνω σε βιβλία (το draft PR #83 περιέχει μη επιμελημένα βιβλία — δεν συνδέθηκε).
- Το risk guard βασίζεται σε regex ελληνικών· έχει false negatives. **Απαιτείται ανθρώπινη κλινική/ασφαλιστική αναθεώρηση** πριν από κάθε δημόσια χρήση.

## H. Test Results (κώδικας `5a7d77b`)
Περιβάλλον: Windows 11, Node 26.13.0, Microsoft Edge (`msedge`). Το Playwright Chromium δεν κατέβηκε.
- **Unit/Worker (mock):** `node --test mentor/presence/*.test.mjs mentor/context/*.test.mjs mentor/knowledge/*.test.mjs mentor/ai/*.test.mjs workers/mentor-chat/*.test.mjs mentor/core/live-sim.test.mjs mentor/core/ecg-practice.test.mjs` ⇒ **67/67** — `unit-tests.log`.
- **Όλα τα `*.test.mjs` του `mentor/` και του Worker + `test-mentor-source-index`:** ⇒ **112/112** — `legacy-tests.log`. Τα scripts `scripts/test-mentor-*.mjs` (3d, cinematic, debrief-export, layout, patient-interview, protocols, quick-answer, source-index, voice) περνούν όλα (`old-mentor-scripts.log`). Παλαιότερες αποτυχίες (έλεγχοι που διάβαζαν τα μονογραμμικά root shims) διορθώθηκαν αλλάζοντας τη διαδρομή ανάγνωσης στα tests, όχι τον κώδικα εφαρμογής.
- **Browser (πραγματικός Edge, αλλά ομιλία/μικρόφωνο ως stubs, «κινητό» = προσομοίωση):** `scripts/verify-mentor-presence-browser.mjs` ⇒ **105/105** — `browser-tests-STUBBED-speech.log`. Το ψεύτικο μικρόφωνο καθυστερεί 5 s (όχι 1,2 s) επειδή το software WebGL καθυστερεί το κύριο νήμα· σε πραγματική GPU δεν υπάρχει καθυστέρηση.. Καλύπτει drag/clamp, persistence, pin, resize, minimize/hide/restore, docked, Ask, context, σιωπή σε εξετάσεις, φραγή δοσολογίας, AI-off χωρίς εξωτερικά requests, 0 uncaught errors.
- **Απόδοση — ΑΠΟΚΛΙΣΗ ΕΞΗΓΗΘΗΚΕ:** το παλιό «≈3 fps» ήταν **αυτόνομη σελίδα σε software WebGL (SwiftShader)**, το «0,3 fps» ήταν το **widget μέσα σε σελίδα μαθήματος, επίσης software**. Δεν αντιπροσωπεύουν συσκευή. Μετρήσεις στο `audit-software-gl.json` και στο `audit-hardware-gpu.json` (και τα δύο φέρουν το commit):
| | Software WebGL | Πραγματική GPU (Intel Iris 540, ενσωματωμένη, desktop Edge) |
| --- | --- | --- |
| Άνοιγμα → έτοιμο 3D, desktop (προσομοίωση) | 4,2 s | 2,9 s |
| Άνοιγμα → έτοιμο 3D, «κινητό» (προσομοίωση viewport) | 1,1 s | 1,4 s |
| FPS με ανοιχτό widget, desktop | 9,7 (παλιό μοντέλο: 0,3) | 57 |
| FPS με ανοιχτό widget, «κινητό» | 9,7 (παλιό: 0,7) | 60 |
| FPS ελαχιστοποιημένο | ≈60 | ≈60 |
| JS heap με ανοιχτό widget | ≈67 MB (παλιό ≈125) | ≈57–58 MB (παλιό ≈125–129) |
 Η αυτόνομη σελίδα `mentor-presence.html` σε πραγματική GPU: ≈60 fps, ready ≈4,5 s, heap ≈84 MB. **Αυτά είναι desktop με ενσωματωμένη GPU· δεν είναι μετρήσεις τηλεφώνου και δεν περιλαμβάνουν μπαταρία/θερμική συμπεριφορά.**
- **Αρχική σελίδα:** έλεγχος (desktop 1440×900 και προσομοίωση κινητού 390×844): η μορφή φορτώνει (`real3d=ready`), το «Απόκρυψη μορφής» τη κρύβει, παραμένει κρυμμένη μετά από refresh, κανένα κουμπί/σύνδεσμος δεν καλύπτεται από το πλαίσιο — `home-*-shown.png`, `home-*-hidden.png`. Δεν ελέγχθηκε με modals/παράθυρα διαλόγου ανοιχτά.
- **Accessibility:** axe-core 4.10.2 στο widget: **0 παραβιάσεις**· `color-contrast` «incomplete» (χρειάζεται χειροκίνητος έλεγχος)· 3 στόχοι αφής <32 px (2 checkboxes 18 px μέσα σε label ≥32 px, λαβή resize 30 px). Όχι screen reader.
- **Ασφάλεια (στατικός έλεγχος):** χωρίς κλειδιά στον νέο κώδικα· `https://` συνδέσμοι πηγών, navigation μόνο allowlist, χωρίς `innerHTML` στο widget, `credentials:"omit"` στο AI client. Όχι εξωτερικό penetration test.
- **Δεν έγιναν:** πραγματικό iPhone/Safari, Android, screen reader, πραγματικός ήχος/μικρόφωνο, `scripts/app-load-smoke.mjs` και `verify-mentor-browser.mjs` (απαιτούν `python3`).
- Evidence: `MENTOR_OS_ULTIMATE_V3_EVIDENCE.zip`.

## I. Competitive Benchmark (P8)
`mentor/BENCHMARK.md`: desk review 17 κριτηρίων με πηγές. **Όχι** head-to-head μετρήσεις και όχι βαθμοί. Οι πηγές για avatars είναι κυρίως προμηθευτικές· δεν βρέθηκαν πηγές για Convai/Inworld· για ελληνικά visemes δεν βρέθηκε επιβεβαίωση. Συμπέρασμα: ισχυρός σε παρουσία/ιδιωτικότητα/κόστος/ασφάλεια χρήσης, αδύναμος σε ρεαλισμό avatar, lip-sync, φυσικότητα φωνής και βάθος απαντήσεων.

## J. Remaining Work
1. **P2:** αδειοδοτημένο φωτορεαλιστικό rigged μοντέλο ιατρού–καθηγητή με στολή ΕΚΑΒ, πρόσωπο/βλέμμα/βλεφαρισμοί/εκφράσεις/χειρονομίες, προέλευση και άδεια (απόφαση ιδιοκτήτη)· μετά, επανέλεγχος μνήμης/FPS σε πραγματικές συσκευές.
2. **P3:** ακριβές lip-sync (ήχος+χρονισμοί) και πραγματική δοκιμή σε συσκευή με ελληνική φωνή/μικρόφωνο (καθυστέρηση, διακοπή, ακρίβεια)· νευρωνική ελληνική φωνή· πλουσιότερες εκφράσεις/χειρονομίες (απαιτούν νέο μοντέλο, P2).
3. **P4:** ανάπτυξη Worker, επιβεβαίωση Free plan, δοκιμή ελληνικών, ενεργοποίηση `endpoint` **μόνο μετά από έγκριση του ιδιοκτήτη**.
4. **P5:** ανακοίνωση βήματος από ανατομία/ECG/μαθήματα· επιβεβαίωση λίστας σελίδων εξέτασης.
5. **P6:** κλινική επιμέλεια, εκδόσεις/έλεγχος πηγών ανά όρο, ελεγμένα βιβλία, αναθεώρηση risk guard.
6. **P7:** συνέπειες/debrief για ECG, ανατομία, adaptive μελέτη και `mentor-scenarios`· περισσότερα σενάρια με κλινική επιμέλεια· ενιαία ροή με τον MENTOR πέρα από το `mentor-live` και το `mentor-oral`.
7. **P8:** iPhone/Safari, Android, screen reader, χειροκίνητη αντίθεση, μπαταρία, user testing, πραγματικό head-to-head benchmark.
8. **Δημοσίευση:** merge στο main χωρίς PR **μόνο μετά από έγκριση** του ιδιοκτήτη.

## K. Οδηγίες για GPT-6
- `git clone https://github.com/6d9757cmp5-creator/ekab-spoudi.git && git checkout refactor/mentor-unified-folder-20261030`
- Διαφορά προς έλεγχο: `git diff a163252..HEAD --stat` (ο κώδικας είναι σε `mentor/presence`, `mentor/context`, `mentor/knowledge`, `mentor/ai`, `workers/mentor-chat`, `scripts/*presence*`, `scripts/optimize-mentor-glb.mjs`).
- Επανάληψη: `node --test` στα αρχεία της ενότητας Η, και `PLAYWRIGHT_MODULE=<path> BROWSER_CHANNEL=msedge node scripts/verify-mentor-presence-browser.mjs` (ή `npm i playwright@1.56.1` και χωρίς μεταβλητές). Audit: `AXE_PATH=<axe.min.js> node scripts/audit-mentor-presence.mjs out.json`.
- **Έλεγξε με προτεραιότητα:** (α) το `EXAM_PAGES` regex στο `mentor/context/bridge.mjs` — λείπουν πιθανώς σελίδες αξιολόγησης (seminar-prep, σενάρια με βαθμολόγηση)· (β) τα regex του `riskGuard` για false negatives· (γ) ότι η μείωση vertices στο GLB δεν επηρεάζει morph targets/visemes σε όλες τις εκφράσεις (έγινε οπτικός έλεγχος μόνο στη στάση idle και ένα mouth message)· (δ) z-index `2147483000` έναντι modals· (ε) padding του `body` στο docked mode· (στ) ότι το Worker δεν εκθέτει αποτελέσματα AI χωρίς παραθέματα.
- **Μην θεωρήσεις ολοκληρωμένα:** P2, ενεργό AI, phoneme lip-sync, κλινική τεκμηρίωση, δοκιμές iPhone, benchmark με μετρήσεις.

## L. Πρόσθετη απαίτηση: AI Digital Human (desk research, 30/10/2026 — δεν υλοποιήθηκε)
**Κατάσταση:** μελέτη μόνο. Δεν έγινε ενσωμάτωση, δεν εκτελέστηκε καμία τεχνολογία και δεν υπάρχουν μετρήσεις. Οι άδειες προέρχονται από αποτελέσματα αναζήτησης και **πρέπει να επαληθευτούν στις επίσημες πηγές** πριν από οποιαδήποτε απόφαση. Δεν ανατρέπει καμία προηγούμενη ενότητα (A–K).

### L1. Τι υπάρχει ήδη στο μοντέλο
Το σημερινό GLB (`mentor/assets/mentor-real-3d.glb`) έχει 34 morph targets: υποσύνολο ARKit (eyeBlink, eyeWide, eyeSquint, brow*, jawOpen, mouthSmile/Frown/Pucker/Press/Stretch, noseSneer, mouthUpperUp) και 14 visemes τύπου Oculus (`viseme_PP … viseme_U`). Άρα ένα νευρωνικό μοντέλο που βγάζει ARKit blendshapes μπορεί κατ' αρχήν να οδηγήσει **μέρος** των στόχων, αλλά τα 52 ARKit δεν υπάρχουν όλα (π.χ. tongue*, cheek*, mouthRoll*) — απαιτείται χαρτογράφηση και έλεγχος.

### L2. Οι τρεις τεχνολογίες
| Τεχνολογία | Τι προσφέρει | Εφαρμοσιμότητα στο MENTOR (GitHub Pages, κινητά, χωρίς χρέωση) | Ανοιχτά σημεία |
| --- | --- | --- | --- |
| **Unreal MetaHuman** | Φωτορεαλιστικός ψηφιακός άνθρωπος, rig προσώπου | Η σελίδα MetaHuman αναφέρει χρήση «σε οποιαδήποτε μηχανή»· περιεχόμενο εκτός Unreal θεωρείται Non-Engine Product, με όριο εσόδων $1M και seat license πάνω από αυτό (FAQ όπως παρατίθεται από τρίτους). Το πραγματικό μοντέλο είναι βαρύ για browser/κινητό· απαιτεί αναδόμηση (LOD, texture, compression) σε GLB | Επαλήθευση EULA/FAQ της Epic για **web/mobile runtime**· ασυμφωνία πηγών για MetaHuman Animator (φόρουμ Reallusion: μόνο render μέσα στο Unreal)· κόστος ποιότητας/μεγέθους σε κινητό δεν μετρήθηκε |
| **NVIDIA ACE / Audio2Face-3D** | Ομιλία→εκφράσεις προσώπου υψηλής ποιότητας | Τα μοντέλα είναι υπό NVIDIA Open Model License· το NIM container υπό ξεχωριστούς όρους NVIDIA· η τοπική εκτέλεση χρειάζεται NVIDIA GPU (Ampere+ , ~2,9–4,4 GiB VRAM). **Δεν τρέχει σε browser/κινητό.** Θα απαιτούσε server με GPU ή φιλοξενούμενο NIM (build.nvidia.com) | Όροι/όρια δωρεάν χρήσης του φιλοξενούμενου API δεν επαληθεύτηκαν· μια επιπλέον πηγή αναφέρει ότι το v3.0 είναι πειραματικό· ο SDK σε MIT προέρχεται από δευτερεύουσες πηγές |
| **Real-time neural facial animation (browser)** | Ομιλία→ARKit blendshapes στον browser | Υποψήφιο: **LAM A2E** (Hugging Face `adolon-ai/lam-a2e`): Wav2Vec2, 52 ARKit weights σε 30 fps, ONNX με WebGPU/WASM παραλλαγή, αναφέρεται Apache 2.0. Εναλλακτικά **HeadAudio** (MFCC→Oculus visemes, χωρίς ONNX). Το NeuroSync έχει αντικρουόμενη άδεια (MIT <$1M ή CC BY-NC) και στοχεύει Unreal | Η άδεια του @omote/core SDK, η λειτουργία σε πραγματικό browser, η καθυστέρηση και η ποιότητα σε **ελληνικά** (τα μοντέλα είναι συνήθως εκπαιδευμένα σε αγγλικά/πολύγλωσσα δεδομένα) δεν επαληθεύτηκαν |

### L3. Συνδυασμός που φαίνεται εφαρμόσιμος (πρόταση, όχι υλοποίηση)
1. **Εμφάνιση:** φωτορεαλιστικό rigged πρόσωπο με ARKit/Oculus blendshapes, με αδειοδοτημένο asset (MetaHuman αν η άδεια επιβεβαιωθεί για web, αλλιώς άλλο αδειοδοτημένο μοντέλο)· μείωση βάρους με το ίδιο pipeline `scripts/optimize-mentor-glb.mjs` + συμπίεση textures.
2. **Κίνηση προσώπου:** ένα **client-side** μοντέλο ήχου→blendshapes (LAM A2E ή παρόμοιο) πάνω στον ήχο φωνής· **fallback** στο σημερινό σύστημα word-boundary που ήδη υπάρχει (εκτίμηση, όχι phoneme-accurate).
3. **Φωνή:** το νευρωνικό μοντέλο χρειάζεται **ροή ήχου**. Η Web Speech API δεν δίνει πρόσβαση στον ήχο της συσκευής, άρα απαιτείται TTS που επιστρέφει ήχο (P3 — εκκρεμεί επιλογή δωρεάν ελληνικής νευρωνικής φωνής και έλεγχος αδείας).
4. **Μικρο-συμπεριφορά:** τυχαίο ανοιγόκλεισμα/βλέμμα/αναπνοή ως procedural στρώμα, ανεξάρτητο από το ΑΙ.
5. **Νοημοσύνη:** ως έχει (P4/P6, απενεργοποιημένο έως επιβεβαίωση δωρεάν πλάνου).
Το NVIDIA ACE μπορεί να εξεταστεί **μόνο** ως προαιρετικό server-side βήμα αν υπάρξει δωρεάν πρόσβαση GPU — δεν προτείνεται ως βάση.

### L4. Δεν έγιναν / δεν ισχύουν
- Καμία **υπέρβαση** των εμπορικών digital humans δεν αποδείχθηκε ή μετρήθηκε. Ο στόχος «ξεπέρασμα» παραμένει φιλοδοξία· ρεαλιστικά, η ποιότητα σε κινητό περιορίζεται από GPU/μνήμη.
- Δεν δοκιμάστηκε κανένα από τα μοντέλα, ούτε η ποιότητά τους σε ελληνικά.
- Δεν έγινε λήψη, αγορά ή ενεργοποίηση υπηρεσίας· κανένα κόστος.

### L5. Επόμενα βήματα (χρειάζονται τον χρήστη ή αδειοδότηση)
1. Επιλογή και άδεια για asset προσώπου (P2) — ανάγνωση EULA/FAQ της Epic αν επιλεγεί MetaHuman.
2. Δοκιμαστικό prototype του LAM A2E σε `mentor-lab` με το υπάρχον GLB (χαρτογράφηση 52→34 targets), μέτρηση fps/μνήμης/καθυστέρησης σε πραγματικό τηλέφωνο.
3. Επιλογή δωρεάν TTS με πρόσβαση στον ήχο, με έλεγχο ελληνικών και όρων.
4. Σύγκριση πριν/μετά με πραγματικές μετρήσεις και κριτές (βλ. `mentor/BENCHMARK.md`).

### L6. Πηγές
- MetaHuman license: https://www.metahuman.com/license και https://www.unrealengine.com/eula/mhc
- MetaHumans σε Unity/Godot (DigitalProduction): https://digitalproduction.com/2025/06/05/metahumans-graduate-ready-for-unity-godot-and-the-fab-cash-register/
- Audio2Face-3D v3.0 (HF): https://huggingface.co/nvidia/Audio2Face-3D-v3.0
- ACE Unreal plugin / Audio2Face: https://docs.nvidia.com/ace/ace-unreal-plugin/2.5/ace-unreal-plugin-audio2face.html
- Audio2Face-3D NIM (NGC): https://catalog.ngc.nvidia.com/orgs/nim/nvidia/containers/audio2face-3d/2
- LAM A2E: https://huggingface.co/adolon-ai/lam-a2e
- HeadAudio: https://github.com/kyr0/HeadAudio
- NeuroSync: https://huggingface.co/convaitech/NEUROSYNC

## M. Ενημερώσεις μετά το αρχικό handoff
- 5039372: κουμπί επαναφοράς κρυμμένου MENTOR (mentor/presence/restore.mjs).
- Context kind: kindOfPath (mentor/context/bridge.mjs) αναγνωρίζει μάθημα / ανατομία / σενάριο / μελέτη μόνο από τη διεύθυνση σελίδας (χωρίς ανάγνωση περιεχομένου)· εμφανίζεται στο πλαίσιο που βλέπει ο μαθητής. Δεν προστέθηκαν εκπομπές mentor:context μέσα στις ίδιες τις σελίδες. Το mentor-oral.html προστέθηκε στις σελίδες εξέτασης (σιωπή).
- Οι 5 προϋπάρχοντες αποτυχημένοι έλεγχοι διορθώθηκαν (βλ. J.8).
- Η λίστα σελίδων εξέτασης παραμένει **εικασία**· ζητείται έλεγχος από GPT/άνθρωπο.

- Μετά το 5a7d77b (5a7d77b): συνέπειες επιλογών στο mentor-live, διακόπτης εξάσκηση/ενεργή εξέταση στο mentor-oral, εκφράσεις/χειρονομίες ανά δραστηριότητα, σχήματα στόματος ανά γράμμα. Οι ισχυρισμοί «ακριβές lip-sync» **δεν** ισχύουν (βλ. P3).

## N. Avatar Medical_Female_03 — ενσωμάτωση στον ενιαίο MENTOR
- **Πηγή/άδεια:** Microsoft Rocketbox, Medical_Female_03, MIT (`mentor/assets/AVATAR-PROVENANCE.md`, `mentor/assets/LICENSE-Microsoft-Rocketbox.md`). Μετατροπή FBX→GLB με three.js (δεν εκτελέστηκε εξωτερικό binary· το FBX2glTF **δεν** χρησιμοποιήθηκε), βήματα στο `scripts/avatar-female03/`.
- **Αλλαγές κώδικα:** `mentor/real-avatar/entry.mjs` (στάση χεριών με world-space aiming, χειρονομίες, αναπνοή, 14 visemes άμεσα από το widget, 8 εκφράσεις με επιπλέον ARKit βάρη, bust view, φωτισμός), `mentor/avatar/real3d.bundle.mjs` (ξαναχτίστηκε με esbuild), `mentor/presence/mouth.mjs` (γράμμα→viseme), `mentor/presence/expression.mjs`, `mentor/presence/presence.mjs` (`?view=bust`, cues), `sw.js` (νέο όνομα cache `…mentor-doctor-avatar`).
- **Δοκιμές:** 62 unit, 46 παλαιά, τα 5 παλαιά scripts (`layout, 3d, cinematic, voice, quick-answer`) και 95 browser checks περνούν· axe 0 παραβιάσεις· στοιχεία απόδοσης στον πίνακα §Η.
- **Δοκιμάστηκαν οπτικά (screenshots):** αρχική (`app-home-avatar.png`), widget desktop/κινητό (`app-widget-*.png`), χειρονομίες (`app-gesture-greet/explain/caution.png`).
- **Ιστορικό αποφάσεων ιδιοκτήτη:** επέλεξε το Female_03· ζήτησε το επίσημο σήμα ΕΚΑΒ (allaboutarmy.gr) — **δεν** μπήκε, γιατί θα έκανε τον MENTOR να φαίνεται επίσημος εκπρόσωπος του ΕΚΑΒ (αντίθετο με το αρχικό script) και δεν έχει επιβεβαιωθεί η άδεια της εικόνας· δοκιμάστηκε έμβλημα της εφαρμογής και μακρυμάνικο πουκάμισο, ο ιδιοκτήτης δεν τα ενέκρινε· κρατήθηκε η αρχική στολή και τα αρχικά σήματα.
- **Γνωστά όρια:** γενική στολή διασώστη, όχι ιατρική ποδιά· το πρόσωπο είναι μοντέλο 2020 χαμηλότερης πιστότητας από σύγχρονους digital humans· χωρίς clips animation· το στόμα οδηγείται από κείμενο (όχι ακριβές lip-sync)· καμία δοκιμή σε iPhone/Safari/Android· δεν έγινε μέτρηση μπαταρίας. Η ανακοίνωση «ιατρός–καθηγητής» αφορά μόνο τον ρόλο εκπαιδευτή· ο MENTOR δεν είναι αδειούχος ιατρός.
## O. Πρόοδος μετά την έγκριση του avatar (εργασία χωρίς τον ιδιοκτήτη)
- **Φωνή:** πολιτική «γυναικεία ελληνική φωνή» (`mentor/voice/speech.mjs`, `voice.mjs`, `home.js`, `lab.js`, κείμενα σελίδων, tests). Στον υπολογιστή δοκιμών εγκαταστάθηκε το Language.TextToSpeech el-GR (μέσω DISM· η εντολή `Install-Language` έδωσε «Access is denied»): προστέθηκε **μόνο η ανδρική «Stefanos»**. Η εφαρμογή πέφτει σε αυτή (σωστά, με σαφές μήνυμα) γιατί δεν υπάρχει γυναικεία. Γυναικεία φωνή αναμένεται σε iPhone (Μελίνα), Android/Chrome (Google ελληνικά) ή Edge με online φωνές — **δεν δοκιμάστηκε**.
- **Widget σε σελίδες υποφακέλων:** οι διευθύνσεις iframe/συνδέσμων υπολογίζονται από το module (`SITE_ROOT`), ώστε να δουλεύει και στο `ui-tools/anatomy-3d/`.
- **Συνεργασία με το `main`:** ο ιδιοκτήτης (ίδιο GitHub account) προχωρά παράλληλα στο `main` (v27.1.126: LAB/DEBRIEF πρωτοκόλλων, `mentor-study-bridge.mjs`, animation engine). Η ύπαρξη του bridge **και** του πλωτού widget σε ορισμένες σελίδες συνυπάρχει χωρίς σύγκρουση (βλ. merge `53e0b9b6`)· η ενοποίηση των δύο εμπειριών (π.χ. ανακοίνωση βήματος από το protocol suite) **δεν** έγινε.
- **Σημείωση εργασίας:** επειδή το φάκελο `C:\Users\Ppdks\ekab-spoudi` χρησιμοποιεί άλλη συνεδρία στο `main`, η εργασία μου έγινε σε ξεχωριστό worktree `C:\Users\Ppdks\ekab-mentor-work` (αυτό το αρχείο βρίσκεται εκεί).
