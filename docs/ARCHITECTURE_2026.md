# ΕΚΑΒ Σπουδή — κανόνες επαγγελματικής ανάπτυξης (1 Νοεμβρίου 2026)

## Σκοπός και όρια
Ένα προϊόν/ένα repository, όχι monolith όπου κάθε αλλαγή αγγίζει οτιδήποτε. Διαχωρισμός:
- `/index.html`, δημόσιες σελίδες, navigation, Appwrite auth, service worker παραμένουν σταθερά entrypoints στη ρίζα.
- `/tools/`: εργαλεία μαθητή με δική τους υλοποίηση ή καταγεγραμμένη ιδιοκτησία και κανονικά URLs.
- `/services/`: επαναχρησιμοποιούμενη λογική για δεδομένα/AI/σημειώσεις/συγχρονισμό, **μία φορά**.
- `/content/`: διαχείριση εκπαιδευτικών πηγών χωρίς διπλές εκδόσεις.
- `/workers/`, `/functions/`: deployment-specific backends με ξεχωριστά permissions, secrets και κόστη.
- `/mentor/`: ιστορική ενεργή υλοποίηση MENTOR OS. Η προσομοίωση ασθενών ανήκει στο `tools/patient-simulator`.

### Τι μεταφέρθηκε πραγματικά
1. Το Patient Simulator και τέσσερα ειδικά εργαλεία είναι ήδη σε canonical `tools/` υλοποιήσεις.
2. Οι modules `notes-store.js`, `notes-delete.js`, `notes-position.js`, `sync-model.js`, `sync-local.js`, `sync-codec.js` έχουν canonical κώδικα στο `services/`. Τα παλιά root imports είναι **μονόγραμμες γέφυρες export**. Δεν άλλαξε καμία τιμή αποθήκευσης.
3. Τα AI worker deployments, το Appwrite `cloud-sync.js`, η UI σημειώσεων, ο scheduler και οι ειδοποιήσεις διατηρούνται στις παλιές λειτουργικές θέσεις. Έχουν μόνο ανατεθειμένο ιδιοκτήτη· δεν πρέπει να περιγράφονται ως μεταφερμένα.
4. Το `services/registry.json` είναι επαληθεύσιμο μητρώο των υφιστάμενων εργαλείων/υπηρεσιών/πηγών με πραγματικά paths και status. Για καινούργιο εργαλείο: πρώτα έλεγχος για ισοδύναμη υπάρχουσα λειτουργία, μετά εγγραφή στο μητρώο.

## Τεχνικό πρότυπο 2026
- **Μία πηγή αλήθειας** ανά module, με stable re-export στα παλιά URLs. Διατηρούμε τις ES Module live bindings. Κλασικά scripts δεν αντικαθίστανται με async dynamic imports, γιατί μπορεί να αλλάξει η σειρά εκτέλεσης.
- **Ασφάλεια:** κριτήρια σχεδιασμού από OWASP ASVS **5.0.0 stable** (May 2025)· https://asvs.owasp.org/ . Δεν ισχυριζόμαστε πιστοποίηση ASVS ή ολοκληρωμένο security audit. Χρειάζονται επιπλέον ανεξάρτητοι έλεγχοι σε authentication, authorization, secrets, worker endpoints, CORS, rate limits, prompt injection και προστασία δεδομένων.
- **Προσβασιμότητα:** στόχος WCAG **2.2 AA**, επίσημη σύσταση https://www.w3.org/TR/WCAG22/ . Keyboard-focus, labels, αναγνώσιμες ελληνικές περιγραφές, μειωμένη κίνηση και πραγματικές δοκιμές με βοηθητικές τεχνολογίες. Ο παρών διαχωρισμός **δεν** αποτελεί πλήρη έλεγχο WCAG.
- **Δεδομένα:** διατήρηση localStorage/IndexedDB keys, user IDs, sync schema, merge policy και rollback. Ελέγχουμε μέγιστο μέγεθος, κακόβουλα εισαγόμενα αρχεία, συγκρούσεις, αποκατάσταση και ελαχιστοποίηση προσωπικών δεδομένων.
- **PWA:** το `sw.js` κάνει cache την ίδια canonical dependency graph για offline χρήση. Αποφεύγεται η αποθήκευση OAuth URLs με προσωρινά tokens.
- **Performance:** τοπικά GLB/assets, προοδευτική φόρτωση, μετρήσεις στην πραγματική συσκευή, όχι υπόθεση ότι όλα τα iPhone/Android πετυχαίνουν σταθερό FPS.
- **Κλινικό περιεχόμενο:** οι μηχανισμοί βαθμολόγησης, εκπαιδευτική φυσιολογία, 3D ανατομία και SOP έχουν χωριστό επιστημονικό gate. Πράσινο CI δεν σημαίνει κλινική επικύρωση, ούτε ομοιότητα με Body Interact.
- **Λειτουργικό κόστος:** serverless workers/AI δημιουργούν δυνητικές χρεώσεις· δεν ενεργοποιούμε ανεξέλεγκτα παρόχους ή επαναλαμβανόμενες κλήσεις χωρίς καταγεγραμμένα quotas και approval.

## Merge/Release gate
1. Canonical scripts: `node --check`, unit tests και `node scripts/verify-service-boundaries.mjs`.
2. Συμβατότητα: `scripts/verify-sync.mjs`, `scripts/verify-sync-codec.mjs`, `scripts/verify-notes-panel.mjs`, `scripts/verify-notes-position.mjs`, `scripts/verify-study-scheduler.mjs`, παλιά URLs, offline PWA.
3. Browser smoke και deep mobile/desktop navigation.
4. Επιστημονικός έλεγχος και τεκμηρίωση πηγών *ξεχωριστά* για κάθε νέα ιατρική αλλαγή.
5. Δεν διαγράφουμε ιστορικά entrypoints/keys χωρίς τεκμηριωμένο migration και rollback.

## Τρέχοντα ανοιχτά θέματα
- Μεταφορά του root `cloud-sync.js` θα απαιτήσει ειδικό module graph mapping και πλήρη real-account testing.
- Κοινός `notes-panel.js` controller χρησιμοποιεί URLs δεδομένων σχετικών με τη θέση script — δεν μετακινείται χωρίς refactor και offline validation.
- Παλιά classic scripts για progress/scheduler/notifications παραμένουν στις ιστορικές θέσεις.
- Ανεξάρτητη κλινική, ασφάλειας, προσβασιμότητας και πραγματικής συσκευής αξιολόγηση **εκκρεμεί**.

## Επαναληπτικός έλεγχος — Βιβλιοθήκη PDF, Νοέμβριος 2026
Το ενεργό script της Βιβλιοθήκης PDF μεταφέρθηκε από `/pdf-library.js` στο `/tools/pdf-library/app/pdf-library.js`, με σταθερή root HTML και fallback loader. Η IndexedDB `ekab-personal-pdf-v1/documents` δεν άλλαξε. Η προηγούμενη PDF.js 3.11.174 είναι επηρεαζόμενη από CVE-2024-4367 σύμφωνα με το Mozilla advisory. Πλέον χρησιμοποιείται pinned PDF.js 6.4.299 ESM με `isEvalSupported:false`; ο worker είναι της ίδιας έκδοσης. Η ιστορική υπόσχεση offline προβολής διορθώθηκε: χωρίς vendored parser, ο αναγνώστης μπορεί να χρειαστεί δίκτυο. Για παραγωγική πιστοποίηση χρειάζεται δοκιμή πραγματικής προβολής, Safari/Chromium, επιπλέον CSP/SRI και ανεξάρτητο security audit.
