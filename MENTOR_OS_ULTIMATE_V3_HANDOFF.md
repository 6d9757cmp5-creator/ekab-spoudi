# MENTOR OS ULTIMATE V3 — HANDOFF (για έλεγχο από GPT-6)

**Κατάσταση: ΜΕΡΙΚΗ ΥΛΟΠΟΙΗΣΗ.** Ολοκληρώθηκαν: P0, P1, P3 (φωνή, χωρίς phoneme lip-sync), P5 (μερικώς), το τεχνικό μέρος του P4 (**απενεργοποιημένο**), το τμήμα ανάκτησης του P6, και μέρος του P8 (a11y, performance, benchmark desk review). **Δεν** ολοκληρώθηκαν: P2 (νέο φωτορεαλιστικό μοντέλο), ενεργοποίηση AI, κλινική επιμέλεια περιεχομένου, P7 (πρόσθετες προσομοιώσεις), δοκιμές σε πραγματικό iPhone/Safari. Τίποτα δεν έχει ιατρική έγκριση.

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
- **Παρουσία:** drag (ποντίκι/αφή/βέλη), resize, καρφίτσωμα σε 4 γωνίες, προσάρτηση (πάνελ/bottom sheet), ελαχιστοποίηση, απόκρυψη, επαναφορά (`Alt+Shift+M` ή `window.EkabMentorPresence`). Προτιμήσεις `ekab.mentor.presence.v1` χωριστά desktop/κινητό (όριο 720 px). Προεπιλογή: ελαχιστοποιημένο, κάτω αριστερά (το κάτω δεξιά το πιάνει το κουμπί σημειώσεων). Το 3D φορτώνει μόνο όταν ανοίξει και αποδεσμεύεται όταν κλείσει.
- **Πλοήγηση:** νέο έγγραφο σε κάθε σελίδα· ο WebGL renderer **δεν** επιβιώνει — αποκαθίσταται η κατάσταση και το 3D ξαναφορτώνει. Η συνομιλία διατηρείται στο `sessionStorage` (μόνο η καρτέλα, διαγράφεται με κουμπί).
- **Context Bridge:** μόνο τίτλος, πρώτη επικεφαλίδα που **δεν** είναι το όνομα της εφαρμογής, path, και ρητά επιλεγμένο κείμενο (μόνο με κλικ). Ανακοινώσεις `mentor:context` με whitelist. Ο χρήστης βλέπει και απενεργοποιεί το πλαίσιο. Σελίδες εξέτασης (`written_exam, practical_exam, exam_focus, saek-exams`) ή ανακοινωμένη ενεργή εξέταση ⇒ ο MENTOR **αρνείται** να απαντήσει.
- **Smart navigation:** πρόταση συνδέσμου από σταθερή λίστα 16 σελίδων· ο χρήστης πατά τον σύνδεσμο· ο MENTOR δεν πλοηγεί μόνος του. Test ελέγχει ότι κάθε route υπάρχει.
- **Study modes / focus / memory:** επίπεδο (αρχάριος…επιστημονικός), αυτόματη ανάγνωση, ελαχιστοποίηση σε εξετάσεις (`ekab.mentor.learning.v1`). Ισχύει μόνο το επίπεδο για το (απενεργοποιημένο) AI prompt.
- **Ανοιχτά:** καμία σελίδα μαθήματος/ανατομίας/σεναρίου δεν εκπέμπει `mentor:context` (π.χ. ποιο όργανο έχει επιλεγεί)· δεν υπάρχει καταχώριση στο κεντρικό μενού· δεν δοκιμάστηκαν σύγκρουση z-index με modals της εφαρμογής πέρα από το κουμπί σημειώσεων· το docked mode προσθέτει padding στο `body` και δεν δοκιμάστηκε σε όλες τις σελίδες.

## E. Digital Human (P2/P3)
- **P2 ΔΕΝ έγινε:** το μοντέλο παραμένει το υπάρχον Ara 3D Gen (generator στο GLB). Η οπτική ποιότητα είναι χαμηλή (κοκκώδης υφή στολής, απλό πρόσωπο — screenshots στο evidence). Άδεια χρήσης/προέλευση του GLB **δεν επαληθεύτηκε**. Αντικατάσταση απαιτεί αδειοδοτημένο asset που επιλέγει ο ιδιοκτήτης.
- **Βελτιστοποίηση μνήμης (έγινε):** το GLB είχε 21 primitives με κοινούς buffers 65.156 vertices και όλα τα morph targets· ο renderer έφτιαχνε ≈21 αντίγραφα. `scripts/optimize-mentor-glb.mjs` (`compactPrimitive`) μείωσε τις εγγραφές vertices 1.368.276 → 65.156. Μέτρηση (Edge headless, software WebGL): JS heap **≈795 → ≈121 MB**, ready **≈11,4 → ≈3,6 s**, steady fps ίδιο (≈3 fps software, και πριν και μετά). Οπτικά ίδιο (`avatar-before/after-optimize.png`). **Δεν** μετρήθηκε σε πραγματική GPU ή iPhone.
- **Φωνή:** `voice.mjs` — Web Speech el-GR, προτίμηση γνωστής ανδρικής φωνής αλλιώς φωνή συσκευής· μικρόφωνο **μόνο μετά από πάτημα** με ορατή ένδειξη· barge-in (πληκτρολόγηση/μικρόφωνο σταματούν την ομιλία). Δοκιμάστηκε με **stubs** (δεν δοκιμάστηκε πραγματική φωνή/αναγνώριση).
- **Lip-sync:** εκτίμηση σχήματος στόματος από word boundaries (`chooseMouthShape`). **Δεν είναι phoneme-accurate.** Δεν επιλέχθηκε/δοκιμάστηκε cloud TTS με visemes (δεν επιβεβαιώθηκε η υποστήριξη ελληνικών visemes — βλ. BENCHMARK).
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

## H. Test Results
Περιβάλλον: Windows 11, Node 26.13.0, Microsoft Edge headless (`msedge`), SwiftShader WebGL. Το Playwright Chromium δεν κατέβηκε (η λήψη κόλλησε).
- **Unit/Worker:** `node --test mentor/presence/*.test.mjs mentor/context/*.test.mjs mentor/knowledge/*.test.mjs mentor/ai/*.test.mjs workers/mentor-chat/*.test.mjs` ⇒ **52/52** (presence-state 11, memory+navigate 7, bridge 7, retrieve 7, ai client 9, worker 11).
- **Browser:** `scripts/verify-mentor-presence-browser.mjs` ⇒ **85/85** (desktop 1440×900 + κινητό 390×844 touch/CDP): drag/clamp, persistence μετά από refresh και πλοήγηση, pin/unpin, resize, minimize/hide/restore, docked, Ask, explain-selection, context on/off, ανακοινώσεις, σιωπή σε σελίδα εξέτασης, συνομιλία μεταξύ σελίδων, διαγραφή, φραγή δοσολογίας, AI-off χωρίς εξωτερικά requests, πλοήγηση ως σύνδεσμος, μικρόφωνο μόνο με πάτημα, ομιλία el-GR με σχήμα στόματος, 0 uncaught errors.
- **Προϋπάρχοντα τεστ που περνούν:** layout 5, 3d 4, cinematic 4, voice 7, quick-answer 4 (και με το νέο GLB).
- **Προϋπάρχουσες αποτυχίες (επιβεβαιώθηκαν με `git stash` στο καθαρό branch):** 3 στο `mentor/core/*.test.mjs` (`ecg`, `oral`, `readonly`) και 2 στο `scripts/test-mentor-source-index.mjs` — διαβάζουν παλιά root αρχεία που πλέον είναι shims. Δεν διορθώθηκαν.
- **Accessibility:** axe-core 4.10.2 (wcag2a/aa, 21a/aa, best-practice) στο widget ανοιχτό με Ask+ρυθμίσεις: **0 παραβιάσεις**· `color-contrast` και `frame-tested` «incomplete» (δεν κρίθηκαν αυτόματα — χρειάζεται χειροκίνητος έλεγχος αντίθεσης). Στόχοι αφής <32 px: 2 checkboxes 18 px (το label γύρω τους ≥32 px) και λαβή resize 30 px. **Δεν** έγινε δοκιμή με screen reader.
- **Performance:** βλ. Ε. Ελαχιστοποιημένο: 0 iframes, heap ≈14 MB, 60 fps. Η εργασία έγινε σε software WebGL — **δεν υπάρχουν μετρήσεις FPS/μπαταρίας σε πραγματική συσκευή**.
- **Ασφάλεια (στατικός έλεγχος κώδικα):** χωρίς κλειδιά/μυστικά στον νέο κώδικα· συνδέσμοι πηγών μόνο `https://`, navigation μόνο allowlist, `credentials:"omit"` στις κλήσεις AI, χωρίς `innerHTML` στο widget (κείμενο μέσω `textContent`). Δεν έγινε εξωτερικός penetration test.
- **Πραγματικό iPhone/Safari: ΕΚΚΡΕΜΕΙ.** Ούτε πραγματική Android συσκευή.
- Δεν εκτελέστηκαν (απαιτούν `python3`): `scripts/app-load-smoke.mjs`, `verify-mentor-browser.mjs`.
- Evidence: `MENTOR_OS_ULTIMATE_V3_EVIDENCE.zip` (screenshots, logs, audit JSON).

## I. Competitive Benchmark (P8)
`mentor/BENCHMARK.md`: desk review 17 κριτηρίων με πηγές. **Όχι** head-to-head μετρήσεις και όχι βαθμοί. Οι πηγές για avatars είναι κυρίως προμηθευτικές· δεν βρέθηκαν πηγές για Convai/Inworld· για ελληνικά visemes δεν βρέθηκε επιβεβαίωση. Συμπέρασμα: ισχυρός σε παρουσία/ιδιωτικότητα/κόστος/ασφάλεια χρήσης, αδύναμος σε ρεαλισμό avatar, lip-sync, φυσικότητα φωνής και βάθος απαντήσεων.

## J. Remaining Work
1. **P2:** αδειοδοτημένο φωτορεαλιστικό rigged μοντέλο + στολή + προέλευση (απόφαση ιδιοκτήτη)· επανέλεγχος μνήμης/FPS.
2. **P3:** cloud/neural ελληνικό TTS με visemes (έλεγχος τεκμηρίωσης Azure/Google), πραγματική δοκιμή φωνής/STT, μέτρηση καθυστέρησης.
3. **P4:** ανάπτυξη Worker, επιβεβαίωση Free plan, δοκιμή ελληνικών, ενεργοποίηση `endpoint`, αναθεώρηση README.
4. **P5:** εκπομπή `mentor:context` από ανατομία/μαθήματα/σενάρια/εξετάσεις (και επιβεβαίωση λίστας σελίδων εξέτασης)· κατάλογος στο μενού.
5. **P6:** κλινική επιμέλεια, εκδόσεις πηγών, RAG σε εγκεκριμένα βιβλία, αναθεώρηση risk guard.
6. **P7:** δεν υλοποιήθηκε νέα προσομοίωση/ECG/ανατομία/adaptive/exam coach — υπάρχουν από πριν τα `mentor-live`, `mentor-ecg`, `mentor-oral`, `mentor-scenarios`, `anatomia`, adaptive· δεν συνδέθηκαν με τον MENTOR-companion πέρα από τους συνδέσμους πλοήγησης.
7. **P8:** πραγματικό iPhone/Safari, screen reader, GPU μετρήσεις, χειροκίνητος έλεγχος αντίθεσης, user testing.
8. Διόρθωση των 5 προϋπάρχοντων αποτυχημένων tests· απόφαση για merge στο main.

## K. Οδηγίες για GPT-6
- `git clone https://github.com/6d9757cmp5-creator/ekab-spoudi.git && git checkout refactor/mentor-unified-folder-20261030`
- Διαφορά προς έλεγχο: `git diff a163252..HEAD --stat` (ο κώδικας είναι σε `mentor/presence`, `mentor/context`, `mentor/knowledge`, `mentor/ai`, `workers/mentor-chat`, `scripts/*presence*`, `scripts/optimize-mentor-glb.mjs`).
- Επανάληψη: `node --test` στα αρχεία της ενότητας Η, και `PLAYWRIGHT_MODULE=<path> BROWSER_CHANNEL=msedge node scripts/verify-mentor-presence-browser.mjs` (ή `npm i playwright@1.56.1` και χωρίς μεταβλητές). Audit: `AXE_PATH=<axe.min.js> node scripts/audit-mentor-presence.mjs out.json`.
- **Έλεγξε με προτεραιότητα:** (α) το `EXAM_PAGES` regex στο `mentor/context/bridge.mjs` — λείπουν πιθανώς σελίδες αξιολόγησης (seminar-prep, σενάρια με βαθμολόγηση)· (β) τα regex του `riskGuard` για false negatives· (γ) ότι η μείωση vertices στο GLB δεν επηρεάζει morph targets/visemes σε όλες τις εκφράσεις (έγινε οπτικός έλεγχος μόνο στη στάση idle και ένα mouth message)· (δ) z-index `2147483000` έναντι modals· (ε) padding του `body` στο docked mode· (στ) ότι το Worker δεν εκθέτει αποτελέσματα AI χωρίς παραθέματα.
- **Μην θεωρήσεις ολοκληρωμένα:** P2, ενεργό AI, phoneme lip-sync, κλινική τεκμηρίωση, δοκιμές iPhone, benchmark με μετρήσεις.
