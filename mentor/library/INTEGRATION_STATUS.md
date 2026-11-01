# ATLA — επιβεβαιωμένη καταχώριση πηγών και θεματική διανομή

**Ημερομηνία:** 2026-11-01  
**Repository:** `6d9757cmp5-creator/ekab-spoudi`  
**Branch:** `feature/mentor-book-review-bridge` (draft PR #115)  
**Διαδικασία:** ενημέρωση υπάρχοντος καταλόγου και UI χωρίς συγχώνευση στο `main`.

## Πραγματικά αποτελέσματα

| Μετρική | Μετά τις αλλαγές |
| --- | ---: |
| Μοναδικές εγγραφές βιβλιογραφίας | **28** |
| Νέες, τεκμηριωμένες ως προς τον επίσημο σύνδεσμο εγγραφές | **13** |
| Πηγές κατάλληλες για τη διαδρομή Paramedic | **18** |
| Πηγές κατάλληλες για τη διαδρομή Ιατρική | **20** |
| Κοινές πηγές, χωρίς διπλά αρχεία | **10** |
| Πραγματικά εξαγμένα βιβλία από παλαιότερη εισαγωγή | **7 (αμετάβλητα)** |
| Νέες εισαγωγές πλήρους βιβλίου ή 3D/ΗΚΓ binary δεδομένων | **0** |
| Νέοι πρωτότυποι θεματικοί χάρτες εκπαιδευτικής πλοήγησης | **16** |
| Επιστημονικά εγκεκριμένα βιβλία | **0** |

Οι 13 νέες εγγραφές **εμφανίζονται λειτουργικά** στη βιβλιογραφία του
`mentor-library.html` μέσω του `mentor/library/source-index.json`.
Το `mentor-library.js` εμφανίζει έκδοση, ελληνικές θεματικές, σειρά
προτεραιότητας, φίλτρο Paramedic/Ιατρικής και συνδέσμους προς τις
πρωτογενείς πηγές. Το `mentor/library/study-paths.json` συνδέει 16
θεματικές διαδρομές με αναγνωριστικά που υπάρχουν πραγματικά στο μητρώο,
και η σελίδα εμφανίζει τον αντίστοιχο πλοηγό.

**Διάκριση:** «πηγή στον κατάλογο» δεν σημαίνει «το πλήρες βιβλίο βρίσκεται
στο repository», ούτε «παράγει κλινικά ελεγμένες απαντήσεις ο AI Tutor».
Οι νέες προσθήκες δεν επηρεάζουν τον loader των 7 παλιών review βιβλίων.

## Οι 13 νέες πηγές

| Κωδικός | Τίτλος | Εκπαιδευτική διαδρομή | Στάδιο | Επίσημη αναφορά |
| --- | --- | --- | ---: | --- |
| `nancy-caroline-9` | Nancy Caroline’s Emergency Care in the Streets | Paramedic | 2 | [Πρωτογενής σελίδα](https://www.psglearning.com/catalog/productdetails/9781284256789) |
| `phtls-10` | PHTLS — Prehospital Trauma Life Support | Paramedic | 2 | [Πρωτογενής σελίδα](https://www.naemt.org/education/trauma-education/phtls) |
| `amls-4` | AMLS — Advanced Medical Life Support | Paramedic | 2 | [Πρωτογενής σελίδα](https://naemt.org/education/medical-education/amls) |
| `who-prehospital-pocket-2026` | Prehospital Emergency Care: Pocket Reference | Paramedic + Ιατρική | 2 | [Πρωτογενής σελίδα](https://www.who.int/publications/b/82620) |
| `who-ambulance-operations-2025` | Prehospital Emergency Care — Operational Guidance for Ambulance Systems | Paramedic | 2 | [Πρωτογενής σελίδα](https://www.who.int/publications/9789240114067) |
| `guyton-hall-15` | Guyton and Hall Textbook of Medical Physiology | Ιατρική | 3 | [Πρωτογενής σελίδα](https://shop.elsevier.com/books/guyton-and-hall-textbook-of-medical-physiology/hall/978-0-443-11101-3) |
| `robbins-pathology-11` | Robbins, Cotran & Kumar Pathologic Basis of Disease | Ιατρική | 3 | [Πρωτογενής σελίδα](https://shop.elsevier.com/books/robbins-cotran-and-kumar-pathologic-basis-of-disease/kumar/978-0-443-26452-8) |
| `bates-examination-14` | Bates’ Guide to Physical Examination and History Taking | Ιατρική | 3 | [Πρωτογενής σελίδα](https://www.wolterskluwer.com/en/solutions/lippincott-medicine/medical-education/lippincott-connect/bates-guide-to-physical-examination) |
| `openstax-anatomy-physiology-2e` | Anatomy and Physiology 2e | Paramedic + Ιατρική | 3 | [Πρωτογενής σελίδα](https://openstax.org/books/anatomy-and-physiology-2e/pages/1-introduction) |
| `openstax-microbiology` | Microbiology | Ιατρική | 3 | [Πρωτογενής σελίδα](https://openstax.org/books/microbiology/pages/1-introduction) |
| `msd-professional` | MSD Manual — Professional Edition | Ιατρική | 3 | [Πρωτογενής σελίδα](https://www.msdmanuals.com/professional) |
| `z-anatomy-3d` | Z-Anatomy — Models of Human Anatomy | Paramedic + Ιατρική | 4 | [Πρωτογενής σελίδα](https://github.com/Z-Anatomy/Models-of-human-anatomy) |
| `physionet-ptb-xl-103` | PTB-XL — 12-Lead ECG Database | Paramedic + Ιατρική | 4 | [Πρωτογενής σελίδα](https://physionet.org/content/ptb-xl/1.0.3/) |

## Πηγές που υπήρχαν ήδη

Οι πηγές `who-bec`, `erc-2025`, `ekab-saek`, οι υπόλοιπες 12
καταχωρισμένες βιβλιογραφικές εγγραφές, καθώς και τα 7 review-only
εξαγμένα βιβλία, **δεν αντιγράφηκαν ξανά**. Η WHO pocket reference,
η WHO ambulance operations και το MSD έχουν επίσης αναφορά σε
`mentor/knowledge/sources.json` ή `mentor/clinical-desk/sources.json`·
η νέα εγγραφή βιβλιογραφίας δείχνει με `existing_knowledge_id` στην
υπάρχουσα εκπαιδευτική αναφορά, ώστε να μη δημιουργηθεί νέο αντίγραφο
περιεχομένου.

**Διόρθωση ευρημάτων Deep Research:** τα συγγράμματα *Nancy Caroline*,
*PHTLS* και *AMLS* **δεν** ανήκουν στα 7 παλαιότερα εξαγμένα βιβλία.
Καταχωρίστηκαν εδώ ως **νέες πηγές με επίσημο URL**. Πραγματικά παλιά
εξαγμένα βιβλία παραμένουν τα WisTech Emergency Medical Responder,
WHO/ICRC Basic Emergency Care, τέσσερα Open RN και OpenStax
Medical-Surgical Nursing (αναλυτικό manifest:
`mentor/review-corpus/manifest.json`).

## Τεχνική διάρθρωση

- `mentor/library/source-index.json`: μοναδικά `source_id`, `learning_tracks`,
  `learning_priority`, `curriculum_topics`, `edition`, `source_url`,
  `extracted_for_review` και αμετάβλητες κλινικές δικλείδες.
- `mentor/library/enrichment-queue.json`: συγχρονισμένες εγγραφές
  `source_verified`, `added_to_source_index: true`, `imported: false`.
- `mentor/library/study-paths.json`: θεματικοί χάρτες με `source_ids`
  ανά διαδρομή, διαβαθμισμένους εκπαιδευτικούς στόχους και σήμανση
  `curriculum-map-draft`.
- `mentor/library/catalog-search.mjs`: αναζήτηση και σε ελληνικά
  curriculum topics.
- `mentor-library.html`, `mentor-library.js`: θεματικές καρτέλες,
  σύνδεσμοι, φιλτράρισμα ανά επίπεδο.
- `scripts/test-mentor-source-index.mjs`, `scripts/verify-mentor-browser.mjs`:
  κριτήρια QA ενημερωμένα για τον νέο κατάλογο και τις 16 διαδρομές.

## Τι απομένει για πλήρη ενσωμάτωση των βιβλίων/δεδομένων

Για τα νέα συγγράμματα χρειάζονται πραγματικά πρωτογενή αρχεία/αντίγραφα,
εκδόσεις και προέλευση ανά κεφάλαιο (δεν εξήχθησαν σε αυτή την αλλαγή).
Για τα Z-Anatomy απαιτούνται επιλεγμένα 3D αρχεία και έλεγχος ορθότητας
ανά δομή. Για το PTB-XL απαιτείται εισαγωγή του πραγματικού dataset,
επεξεργασία κυματομορφών και ελεγχόμενες επισημάνσεις. Οι κλινικές
απαντήσεις του ATLA παραμένουν ανενεργές μέχρι ιατρική επιμέλεια.

Η σειρά των έξι προτεραιοτήτων διατηρείται αμετάβλητη στο
[ENRICHMENT_ROADMAP.md](ENRICHMENT_ROADMAP.md).
