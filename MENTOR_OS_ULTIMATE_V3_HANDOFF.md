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
- **Παρουσία:** drag (ποντίκι/αφή/βέλη), resize, καρφίτσωμα σε 4 γωνίες, προσάρτηση (πάνελ/bottom sheet), ελαχιστοποίηση, απόκρυψη, επαναφορά (`Alt+Shift+M`, `window.EkabMentorPresence`, ή κουμπί «Εμφάνιση πλωτού MENTOR» στη σελίδα `mentor-lab.html`). Προτιμήσεις `ekab.mentor.presence.v1` χωριστά desktop/κινητό (όριο 720 px). Προεπιλογή: ελαχιστοποιημένο, κάτω αριστερά (το κάτω δεξιά το πιάνει το κουμπί σημειώσεων). Το 3D φορτώνει μόνο όταν ανοίξει και αποδεσμεύεται όταν κλείσει.
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
- **Unit/Worker:** `node --test mentor/presence/*.test.mjs mentor/context/*.test.mjs mentor/knowledge/*.test.mjs mentor/ai/*.test.mjs workers/mentor-chat/*.test.mjs` ⇒ **53/53** (presence-state 11, memory+navigate 7, bridge 8, retrieve 7, ai client 9, worker 11).
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
8. Οι 5 προϋπάρχοντες αποτυχημένοι έλεγχοι (`mentor/core/*`, `scripts/test-mentor-source-index.mjs`) **διορθώθηκαν**: διάβαζαν τα μονογραμμικά root shims αντί για τα πραγματικά `mentor/app/*.js`· τώρα `node --test mentor/core scripts/test-mentor-source-index.mjs` ⇒ 45/45. Εκκρεμεί: απόφαση για merge στο main (μόνο μετά από τον έλεγχο του GPT).

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
