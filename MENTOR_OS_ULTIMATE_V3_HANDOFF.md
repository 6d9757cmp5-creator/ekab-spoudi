# MENTOR OS ULTIMATE V3 — HANDOFF (για έλεγχο από GPT-6)

**Κατάσταση: ΜΕΡΙΚΗ ΥΛΟΠΟΙΗΣΗ.** Ολοκληρώθηκαν P0, P1 και τμήμα του P5. Οι φάσεις P2, P3 (μερικώς υπάρχουσα), P4, P6, P7, P8 **δεν** ολοκληρώθηκαν. Τίποτα εδώ δεν έχει ιατρική ή επιστημονική έγκριση.

## A. Repository & Version
- Repository: https://github.com/6d9757cmp5-creator/ekab-spoudi
- Branch εργασίας: `refactor/mentor-unified-folder-20261030`
- Αρχικό commit του branch: `a163252` (7 commits μπροστά από το main, 0 πίσω)
- Merge-base με main: `05faa30` (main = `05faa30`, δεν άλλαξε)
- Commits αυτής της εργασίας:
  - `d63afc6` feat(mentor): shared floating Live Companion
  - `d40263f` feat(mentor): Context Bridge + Ask panel
  - `ed0daa8` fix(mentor): default corner bottom-left + grow while Ask open
  - (το commit που προσθέτει αυτό το αρχείο έπεται του `ed0daa8`· δες `git log`)
- **Κατάσταση ενσωμάτωσης στο main: ΟΧΙ ενσωματωμένο.** Ο χρήστης επέλεξε εργασία σε branch· το main/GitHub Pages δεν έχει αλλάξει. Το `AGENTS.md` προβλέπει απευθείας main χωρίς PR, αλλά αυτό **δεν** εφαρμόστηκε εδώ ώστε να μην δημοσιευτεί ημιτελές έργο.

## B. Audit (P0)
- `AGENTS.md`: δύο κανόνες (φορτώνει η εφαρμογή· φορτώνει σε κινητό και υπολογιστή), αλλαγές απευθείας στο main.
- Ο φάκελος `mentor/` έχει `app/ avatar/ assets/ voice/ styles/ core/ library/ real-avatar/ scenario-atlas/`. Τα root `mentor-*.js/.mjs` είναι μικρά shims· τα `mentor-*.html` μένουν ως δημόσιες είσοδοι.
- Ο MENTOR 3D ήταν ενσωματωμένος **μόνο** στην αρχική (`index.html`, iframe `mentor-presence.html`) και στο `mentor-lab.html`. Μοντέλο: `mentor/assets/mentor-real-3d.glb` (≈23,5 MB), renderer `mentor/avatar/real3d.bundle.mjs` (≈627 KB).
- Υπάρχον AI: μόνο για βαθμολόγηση απαντήσεων (`workers/answer-grader`, `functions/answer-grader/free-providers.js`, `FREE-SETUP.md`): Cloudflare Workers AI, OpenRouter, Gemini, με server-side κλειδιά. Σύμφωνα με το ίδιο το `FREE-SETUP.md` μόνο το OpenRouter έχει περάσει live δοκιμή. **Δεν** βρέθηκε AI για συνομιλία. Το `mentor/README.md` δηλώνει ρητά «δεν γίνεται νέα σύνδεση AI».
- Δεν εκτέθηκαν μυστικά· δεν διαβάστηκαν τιμές κλειδιών.

## C. Implementation
Νέα αρχεία:
- `mentor/presence/presence-state.mjs` — καθαρή λογική: geometry, clamp, snap, γωνίες, docked box, αποθήκευση προτιμήσεων (`ekab.mentor.presence.v1`).
- `mentor/presence/presence.mjs` — controller DOM (μία instance, lazy iframe, drag/resize/pin/dock/minimize/hide, πλαίσιο Ask).
- `mentor/presence/presence.css`
- `mentor/context/bridge.mjs` — Context Bridge (`ekab.mentor.context.v1`).
- Δοκιμές: `mentor/presence/presence-state.test.mjs`, `mentor/context/bridge.test.mjs`, `scripts/verify-mentor-presence-browser.mjs`.
Τροποποιήσεις:
- 51 σελίδες `*.html` (όχι `index.html`, `mentor-lab.html`, `mentor-presence.html`, `oauth-callback.html`, `repair.html`): προστέθηκε μία γραμμή `<script type="module" src="mentor/presence/presence.mjs"></script>` πριν το `</body>`.
- `sw.js`: τα νέα αρχεία στη λίστα ASSETS (το όνομα cache **δεν** άλλαξε).
- `.github/workflows/app-load.yml`: syntax check, unit tests και browser test (τρέχει μόνο σε push στο main).
- `mentor/README.md`: ενότητα «MENTOR Live Companion».
Dependencies: καμία νέα στο repo. Για το browser test χρειάζεται `playwright` (ήδη στο CI).

## D. Platform-Wide Mentor (P1)
- **Floating/drag:** pointer events (ποντίκι + αφή), κατώφλι 4 px, clamp στα όρια οθόνης και safe-area, προαιρετικό snap 16 px στις άκρες, βέλη πληκτρολογίου (Shift = μεγάλο βήμα).
- **Pin:** 4 γωνίες, ελεύθερη θέση, «προσάρτηση» (δεξί πάνελ σε desktop, bottom sheet σε κινητό με padding στο `body`). Σύρσιμο καρφιτσωμένου MENTOR τον ξεκαρφιτσώνει.
- **Απόκρυψη/ελαχιστοποίηση:** κουμπί MENTOR (launcher) για επαναφορά· η απόκρυψη δεν αφήνει τίποτα στην οθόνη· επαναφορά με `Alt+Shift+M` ή `window.EkabMentorPresence.show()`.
- **Resize:** χειρολαβή και πληκτρολόγιο· όρια ανά layout (desktop 160×240–460×680, κινητό 120×180–260×390).
- **Persistence:** localStorage, χωριστά desktop/κινητό (όριο 720 px), συγχρονισμός μεταξύ καρτελών μέσω `storage` event, ασφαλής αποκατάσταση από κατεστραμμένα δεδομένα.
- **Πλοήγηση:** κάθε σελίδα φορτώνει νέο έγγραφο· ο WebGL renderer **δεν** επιβιώνει — αποκαθίσταται η κατάσταση και το 3D ξαναφορτώνει όταν το widget είναι ανοιχτό. Η συνομιλία (κείμενο ερώτησης/απάντησης) **δεν** διατηρείται μεταξύ σελίδων (δεν υλοποιήθηκε).
- **Προεπιλογή:** ελαχιστοποιημένος (μόνο μικρό κουμπί), κάτω αριστερά, ώστε να μην καλύπτει το υπάρχον κουμπί σημειώσεων κάτω δεξιά.
- **Μία instance:** guard `window.__ekabMentorPresence`, παράλειψη σε iframes και σε σελίδες με δικό τους MENTOR.
- **Pause/απελευθέρωση πόρων:** ο iframe αφαιρείται όταν ελαχιστοποιηθεί/κρυφτεί/`pagehide`. Δεν υπάρχει pause του render loop όταν το tab είναι κρυφό.
- **Προσβασιμότητα:** ετικέτες aria, `aria-live`, focus-visible, reduced motion, στόχοι αφής ≥32–44 px, Escape.
- **Ανοιχτά:** δεν υπάρχει καταχώριση στο κεντρικό μενού/ρυθμίσεις της εφαρμογής για επαναφορά κρυφού MENTOR (μόνο Alt+Shift+M και API)· δεν δοκιμάστηκε σύγκρουση με άλλα floating στοιχεία πέρα από το κουμπί σημειώσεων.

## E. Digital Human (P2/P3) — ΔΕΝ ΕΓΙΝΕ
- Δεν αντικαταστάθηκε το μοντέλο. Παραμένει το υπάρχον GLB. Προέλευση/άδεια του GLB **δεν** ελέγχθηκε εδώ.
- Δεν προστέθηκε νέα φωνή, STT/TTS ή lip-sync. Υπάρχει το προϋπάρχον `mentor/voice/speech.mjs` και `mentor/avatar/live.mjs` (προσεγγιστικό σχήμα στόματος). Το status του avatar δηλώνει ότι η φωνή συσκευής δεν δίνει ακριβή χρονοσήματα φωνημάτων — **δεν είναι phoneme-accurate lip-sync**.
- Στο widget δεν συνδέθηκε φωνή.
- Μια φωτογραφική ρεαλιστική ανθρώπινη μορφή απαιτεί αδειοδοτημένο asset που θα επιλέξει/εγκρίνει ο ιδιοκτήτης.

## F. AI (P4) — ΔΕΝ ΕΓΙΝΕ
- Δεν γράφτηκε adapter συνομιλίας, proxy ή streaming. Το πλαίσιο «Ρώτα» χρησιμοποιεί **μόνο** το τοπικό `mentor/core/quick-answer.mjs` (όροι από `medical-terms.json`)· εκτός βιβλιοθήκης απαντά ότι δεν υπάρχει τεκμηριωμένη απάντηση. **Δεν είναι AI.**
- Υπάρχουσα υποδομή που μπορεί να επεκταθεί: worker `workers/answer-grader` (Cloudflare AI binding) με Appwrite auth. Απαιτείται ανθρώπινη ενέργεια: επιβεβαίωση Free plan, μυστικά στον server, live δοκιμή, βαθμονόμηση μοντέλου για ελληνικά, και αναθεώρηση του κανόνα στο `mentor/README.md`.

## G. Medical Knowledge (P6) — ΔΕΝ ΕΓΙΝΕ
- Δεν προστέθηκε RAG, νέες πηγές ή κλινικό περιεχόμενο. Όλο το υπάρχον περιεχόμενο παραμένει «clinical-review-pending» όπως δηλώνει το `mentor/FOUNDATION-README.md`.
- **Context Bridge (P5, υλοποιημένο):** διαβάζει μόνο τίτλο, πρώτη επικεφαλίδα και path· επιλεγμένο κείμενο μόνο με κλικ στο «Εξήγησε την επιλογή μου»· ανακοινώσεις σελίδας (`mentor:context`) με whitelist (`course, chapter, anatomy-object, scenario, study-mode, exam`) και όριο 120 χαρακτήρων. Ο χρήστης βλέπει πάντα το πλαίσιο που χρησιμοποιείται και μπορεί να το απενεργοποιήσει (αποθηκεύεται). Σε σελίδες εξέτασης (`written_exam, practical_exam, exam_focus, saek-exams`) ή όταν ανακοινωθεί ενεργή εξέταση, ο MENTOR **αρνείται** να απαντήσει.
- Περιορισμός: η «πρώτη επικεφαλίδα» στις περισσότερες σελίδες είναι το όνομα της εφαρμογής («ΕΚΑΒ Σπουδή v27.1.122»), όχι το μάθημα. Για πραγματικό πλαίσιο μαθήματος/ανατομίας/σεναρίου οι σελίδες πρέπει να εκπέμπουν `mentor:context` — **δεν** προστέθηκε εκπομπή σε καμία σελίδα.
- Δεν δοκιμάστηκε σελίδα εξέτασης με πραγματική ροή εξέτασης (μόνο φόρτωση `written_exam.html` και άρνηση απάντησης).

## H. Test Results
Περιβάλλον: Windows 11, Node 26.13.0, Microsoft Edge (headless, `channel: msedge`, SwiftShader WebGL). Το Playwright Chromium **δεν κατέβηκε** (η λήψη κόλλησε)· χρησιμοποιήθηκε ο Edge. CI χρησιμοποιεί Chromium 1.56.1 — δεν έχει εκτελεστεί εδώ.
- `node --test mentor/presence/presence-state.test.mjs mentor/context/bridge.test.mjs`: **18/18 πέρασαν**.
- `node scripts/verify-mentor-presence-browser.mjs`: **63/63 πέρασαν** (desktop 1440×900 και κινητό 390×844 με αφή, το σύρσιμο στο κινητό μέσω CDP touch events). Καλύπτει: lazy launcher, μία instance, φόρτωση 3D στο widget, drag (+ clamp εκτός ορίων), persistence μετά από refresh και πλοήγηση, pin, ξεκαρφίτσωμα με drag, resize, minimize/hide/restore, Alt+Shift+M, docked, Ask με τοπική απάντηση, explain-selection (με/χωρίς επιλογή), context off + persistence, ανακοίνωση context, απόρριψη άγνωστης ανακοίνωσης, άρνηση σε σελίδα εξέτασης, αποφυγή διπλής instance σε αρχική και εργαστήριο, μηδέν uncaught errors.
- Προϋπάρχουσες δοκιμές που περνούν: `scripts/test-mentor-layout|3d|cinematic|voice|quick-answer.mjs`.
- **Προϋπάρχουσες αποτυχίες (δεν προκλήθηκαν από αυτή την εργασία — επιβεβαιώθηκαν με `git stash` στο καθαρό branch):** 3 στο `mentor/core/*.test.mjs` (`ecg`, `oral`, `readonly`) και 2 στο `scripts/test-mentor-source-index.mjs`. Διαβάζουν παλιά root αρχεία που πλέον είναι shims και δεν βρίσκουν τον αναμενόμενο κώδικα.
- Δεν εκτελέστηκε: `scripts/app-load-smoke.mjs` και `verify-mentor-browser.mjs` (απαιτούν `python3`, που λείπει), οι οποίες υπάρχουν στο CI.
- **Πραγματικό iPhone/Safari: ΕΚΚΡΕΜΕΙ.** Δεν δοκιμάστηκε. Ούτε πραγματική συσκευή Android.
- Επιδόσεις (FPS, μνήμη, μπαταρία): **δεν μετρήθηκαν**.
- Evidence: `MENTOR_OS_ULTIMATE_V3_EVIDENCE.zip` (screenshots desktop/κινητό: launcher, ανοιχτό widget, Ask με απάντηση).

## I. Competitive Benchmark (P8) — ΔΕΝ ΕΓΙΝΕ
Δεν έγινε έρευνα ούτε μετρήσεις. Δεν παρατίθενται συγκριτικά αποτελέσματα.

## J. Remaining Work
1. **P2:** αδειοδοτημένο φωτορεαλιστικό rigged μοντέλο (απαιτεί επιλογή/άδεια από τον ιδιοκτήτη), στολή, προέλευση asset.
2. **P3:** ελληνικό STT/TTS με χρονισμό, barge-in, σύνδεση φωνής με το widget, τίμιος χαρακτηρισμός lip-sync.
3. **P4:** AI adapter + proxy + streaming + fallback + όρια, μετά από ανθρώπινη επιβεβαίωση δωρεάν λογαριασμού και αναθεώρηση του κανόνα «χωρίς AI» στο README.
4. **P5:** εκπομπή `mentor:context` από σελίδες μαθημάτων/ανατομίας/σεναρίων· διατήρηση συνομιλίας μεταξύ σελίδων· πλοήγηση μέσω adapter· καταχώριση επαναφοράς στο μενού.
5. **P6–P7:** RAG με ελεγμένες πηγές, προσομοιώσεις με engine, ECG, ανατομία, adaptive learning — όλα απαιτούν κλινικό έλεγχο.
6. **P8:** performance/προσβασιμότητα/ασφάλεια ελέγχοι, benchmark με πηγές, πραγματικό iPhone/Safari.
7. Διόρθωση των 5 προϋπάρχοντων αποτυχημένων δοκιμών.
8. Απόφαση ιδιοκτήτη για merge στο main (μετά τα CI checks).

## K. Οδηγίες για GPT-6
- Κλωνοποίηση και checkout: `git clone https://github.com/6d9757cmp5-creator/ekab-spoudi.git && git checkout refactor/mentor-unified-folder-20261030`.
- Κώδικας προς έλεγχο: `git diff a163252..ed0daa8 -- mentor/presence mentor/context scripts/verify-mentor-presence-browser.mjs sw.js .github mentor/README.md` (+ τη μία γραμμή script στις 51 σελίδες: `git diff a163252..ed0daa8 --stat -- '*.html'`).
- Επανάληψη δοκιμών: `node --test mentor/presence/presence-state.test.mjs mentor/context/bridge.test.mjs` και `PLAYWRIGHT_MODULE=<path> BROWSER_CHANNEL=msedge node scripts/verify-mentor-presence-browser.mjs` (ή `npm i playwright@1.56.1` χωρίς τις μεταβλητές).
- Τι να ελέγξεις με προτεραιότητα: (α) ότι δεν υπάρχει διαρροή ευαίσθητων δεδομένων από το Context Bridge· (β) ότι ο MENTOR δεν απαντά σε εξετάσεις — η λίστα σελίδων είναι στο `EXAM_PAGES` του `mentor/context/bridge.mjs`· υπάρχει κίνδυνος να λείπουν σελίδες εξέτασης (π.χ. seminar-prep, σενάρια με αξιολόγηση)· (γ) z-index `2147483000` του widget έναντι modals της εφαρμογής· (δ) επίπτωση του docked padding στο `body` σε σελίδες με fixed layout· (ε) αν η προεπιλογή «ελαχιστοποιημένο» ικανοποιεί την απαίτηση «ο χρήστης βλέπει MENTOR».
- Μην θεωρήσεις ολοκληρωμένο οτιδήποτε στα Ε, F, G, I παραπάνω.
