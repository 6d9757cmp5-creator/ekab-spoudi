# ATLA — απολογισμός πραγματικών βιβλιογραφικών προσθηκών 02/11/2026

**Κατάσταση:** 13 βιβλιογραφικές εγγραφές προστέθηκαν στο `main`. Δεν έχει ενσωματωθεί νέο πλήρες βιβλίο ούτε εγκρίθηκε νέο κλινικό περιεχόμενο.

## Τι πραγματικά μεταφέρθηκε
- Πριν: **15** εγγραφές στον `mentor/library/source-index.json`.
- Μετά: **28** εγγραφές, **13 νέες** χωρίς διπλό source ID και χωρίς διαγραφή προϋπάρχουσας καταχώρισης.
- Από τις 13 νέες: **8 τίτλοι βιβλίων/εκπαιδευτικών συγγραμμάτων** (`textbook`, `open-textbook`, `textbook-and-course`), **5 άλλοι πόροι** (WHO pocket/operational references, MSD online reference, Z-Anatomy 3D, PhysioNet PTB-XL ECG).
- Οι 8: *Nancy Caroline’s Emergency Care in the Streets*, *PHTLS*, *AMLS*, *Guyton and Hall Textbook of Medical Physiology*, *Robbins, Cotran & Kumar Pathologic Basis of Disease*, *Bates’ Guide to Physical Examination and History Taking*, *OpenStax Anatomy and Physiology 2e*, *OpenStax Microbiology*.
- **0 νέα πλήρη αρχεία βιβλίων** εισήχθησαν στις 02/11. Οι 13 προσθήκες είναι `reference_only`, `full_text_imported:false`, `clinical_retrieval_enabled:false`, `publication_rights_review:not_verified`. Δεν υπάρχει άδεια να μετατρέψουμε βιβλιογραφικό URL σε πλήρες περιεχόμενο ή σε ενεργό RAG.
- **7 προϋπάρχουσες εγγραφές `extracted_for_review`** δηλώνουν εξαγωγή στο **δοκιμαστικό branch** του [PR #115](https://github.com/6d9757cmp5-creator/ekab-spoudi/pull/115). Το `mentor/review-corpus/manifest.json` δεν υπάρχει στο `main`, επομένως δεν είναι σωστό να ισχυριζόμαστε ότι οι 7 είναι ενεργά διαθέσιμες για ανάκτηση στον δημόσιο ATLA.

## Τι βλέπει ο μαθητής
- **18** συναφείς πηγές `paramedic` στην οθόνη βιβλιογραφίας, με ρητή ένδειξη ότι τα εξαγμένα κείμενα βρίσκονται στο δοκιμαστικό branch και δεν είναι εγκεκριμένα.
- **20** εγγραφές με εσωτερική ετικέτα `medicine`, εκ των οποίων **10 κοινές** με Paramedic. Οι ιατρικές πηγές διατηρούνται στο αρχείο για τον **εσωτερικό ATLA AI**, όχι δεύτερο εκπαιδευτικό τμήμα/μάθημα «Ιατρική».
- Η UI φιλτράρει `track:'paramedic'`, δεν τροποποιεί βαθμολογίες ή μαθητικό ιστορικό και δεν φορτώνει κείμενο τρίτων.

## Συμφωνία γνωστών πηγών
- **49** μοναδικά URL σε `source-index.json` + `knowledge-refresh/watchlist.json` + `knowledge-refresh/global-official-sources.json`, από τα οποία **44** έχουν προηγούμενη καταγραφή και **5** αποτελούν νέους διεθνείς επίσημους κόμβους.
- Το 44/44 αφορά *μόνο* την ακριβή αντιστοίχιση URL των 3 γνωστών προηγούμενων βιβλιογραφικών μητρώων. **Δεν** αποδεικνύει ότι έχουν συμφωνηθεί όλα τα παλαιά μηνύματα του χρήστη, όλα τα βιβλία, 3D meshes ή εκπαιδευτικά αποσπάσματα.
- Δεν αθροίζουμε URLs, βιβλία, δοκιμαστικά εξαγμένα κείμενα, 3D assets και PubMed papers ως ίδια μονάδα.

## Αποτελέσματα ελέγχου και όρια
- Ελέγχθηκαν τα πραγματικά αρχεία `main` μέσω της διασύνδεσης GitHub: counts/IDs, `assertPublicCatalog`, Paramedic filter, zero clinical retrieval, statuses και ύπαρξη αναφορών.
- Ο ανεξάρτητος έλεγχος κώδικα σε περιβάλλον JavaScript (εκτός GitHub Runner) πέρασε τα συγκεκριμένα assertions μεταδεδομένων/φίλτρων.
- Το [GitHub workflow](../.github/workflows/atla-daily-knowledge-refresh.yml) πλέον καλεί `node --test scripts/test-mentor-source-index.mjs` και `node --test tools/atla-ai/knowledge-refresh/scan.test.mjs` κατά τις αλλαγές και πριν από κάθε σάρωση.
- **Δεν έχει ακόμη επιβεβαιωθεί επιτυχία πραγματικού GitHub Actions runner, πρώτη σάρωση, browser smoke, ανεξάρτητη επιστημονική έγκριση ή πλήρης εισαγωγή βιβλίων**. Δεν θα παρουσιαστούν ως ολοκληρωμένα χωρίς logs/artifacts.
- Δεσμευτική πηγή αξιοπιστίας: [TRUSTED-SOURCES-POLICY](../tools/atla-ai/knowledge-refresh/TRUSTED-SOURCES-POLICY.md).

## Επόμενα ακριβή βήματα
1. Πραγματική επιβεβαίωση GitHub Actions `verify` και πρώτη `discover` μετά τις 02:17 UTC (04:17 ώρα Ελλάδας χειμώνα). Τα αρχεία `queue/last-scan.json`, `pending-pubmed.json`, `source-health.json` αποτελούν το αποδεικτικό.
2. Αν CI αποτύχει, διορθώνεται με βάση τα **ακριβή logs** (χωρίς εικασία), μετά επανεκτέλεση.
3. Πραγματική αντιστοίχιση ύλης ανά κεφάλαιο ΣΑΕΚ, τεκμηρίωση εκδόσεων/αδειών και ανεξάρτητη εκπαιδευτική/επιστημονική επαλήθευση, πριν από σύνδεση με ATLA AI.
4. Ξεχωριστή αξιολόγηση των 7 απομονωμένων review imports για ενδεχόμενη νόμιμη χρήση, **όχι** άκριτη δημοσίευση πλήρων κειμένων.
