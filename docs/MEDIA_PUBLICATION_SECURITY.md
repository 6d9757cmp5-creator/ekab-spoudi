# ΕΚΑΒ Σπουδή — Ασφαλής δημοσίευση εκπαιδευτικών μέσων

## Κατάσταση
Το `media-gate` ελέγχει τις αλλαγές στο repository. **Δεν επιβάλλει από μόνο του branch protection**, ούτε σαρώνει ανεξάρτητα το ιατρικό περιεχόμενο. Η πραγματική επιστημονική έγκριση απαιτεί εξουσιοδοτημένο ανεξάρτητο αξιολογητή.

## Υποχρεωτικές ρυθμίσεις GitHub
Repository Settings → Rules → Rulesets → New branch ruleset:
- Name: `main-production-gate`, target `main`, Enforcement: Active.
- Require pull request, τουλάχιστον 1 approval, dismiss stale approvals, resolve conversations.
- Require status check **`media-gate`** από GitHub Actions.
- Block force pushes/deletions. No routine bypass.
- Enable code owner approval **μόνο αφού** οριστεί ανεξάρτητος reviewer με write access και σωστό CODEOWNERS. Διαφορετικά μπορεί να κλειδώσει κάθε merge.
- Επιβεβαίωση: ένα PR με μη εγκεκριμένο νέο media **δεν** μπορεί να συγχωνευθεί, ενώ απλή αλλαγή κώδικα περνά το check.

## Appwrite — ξεχωριστή υποδομή, όχι αλλαγές στο private sync
- Το υφιστάμενο private sync και τα προσωπικά PDF **δεν τροποποιούνται**.
- Δημιουργία ξεχωριστού private quarantine bucket και public bucket με **server-only write**.
- Upload ≠ publish. Απαιτούνται έλεγχος πραγματικού format, SHA-256, malware scan, άδεια χρήσης, αντιστοίχιση μαθήματος, ελληνική λεζάντα, επιστημονικές εγκρίσεις.
- Τα αρχεία >20 MB χρειάζονται ανεξάρτητο scanner: το ενσωματωμένο antivirus της Appwrite δεν αρκεί.
- Έγκριση δεμένη στο ακριβές SHA-256, με audit log, υπογραφή και ανάκληση. Έλεγχος hash ξανά αμέσως πριν τη δημοσίευση.
- Απαιτούνται Appwrite Console admin, Functions, ασφαλή server secrets και δοκιμές δικαιωμάτων. **Δεν είναι ενεργό μέχρι να επαληθευτεί στον server.**

## Επιστημονικός έλεγχος
- Το AI επισημαίνει πιθανά λάθη, αλλά δεν υποκαθιστά επιστημονικό reviewer.
- Για υλικό υψηλού κινδύνου (ΚΑΡΠΑ, αεραγωγός, φάρμακα, αλγόριθμοι) προτείνονται δύο ανεξάρτητες εγκρίσεις.
- Καμία αυτόματη έγκριση εικόνων του PR #6 χωρίς έλεγχο ακρίβειας, πηγών, δικαιωμάτων και αντιστοίχισης με μάθημα.

## Σειρά ενεργοποίησης
1. Δοκιμές του CI και ανεξάρτητος reviewer.
2. Ruleset και επαλήθευση αποκλεισμού μη εγκεκριμένου PR.
3. Appwrite staging quarantine/scanner/approval/publisher.
4. End-to-end αρνητικές και θετικές δοκιμές.
5. Παραγωγή και επανέλεγχος, χωρίς διακοπή private sync.
