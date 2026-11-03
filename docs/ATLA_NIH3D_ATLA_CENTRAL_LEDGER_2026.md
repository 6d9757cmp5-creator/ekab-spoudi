# ATLA NIH3D + ATLA — ενιαίο μητρώο εκκρεμοτήτων

Δημιουργήθηκε (UTC): 2026-11-03T19:02:24.245Z

**Κατάσταση αρχικού έργου: ΟΧΙ ολοκληρωμένο.** Μη υπολογίσιμο ποσοστό μέχρι πλήρη τεκμηρίωση όλων των κριτηρίων.

## Επαληθευμένα συγκεντρωτικά στοιχεία

- Πλήρης πηγή μεταδεδομένων (snapshot): **15688** εγγραφές, **204346** πρωτότυπες αναφορές.
- Βιοϊατρικά υποψήφια **10041**· εκκρεμής σχετικότητα **4275**· πιθανώς άσχετα αλλά διατηρούμενα **1372**.
- Πλήρως ανακτημένα πρωτότυπα από GHCR: **54 μοντέλα, 326 μοναδικά αρχεία, 529915495 bytes**.
- Τεχνικό SHA256 + δομικό screening: **326** αρχεία· ανεξάρτητες επιστημονικές/κλινικές εγκρίσεις **0**.
- Ιστορικά 250 shards: παλιό report **14/250** canonical shards, **238** προβλήματα. Ενδέχεται να είναι παρωχημένο και δεν υποκαθιστά νέο έλεγχο.
- Μη ληγμένα Actions artifacts από 41363970707: **74**, πρώτη λήξη **2026-11-09T10:37:46Z**. Προσωρινή φύλαξη.

## Κεντρικός στόχος → υποεργασίες → αποδεικτικά

| ID | Στόχος | Κατάσταση | Απόδειξη | Τι απομένει |
|---|---|---|---|---|
| NIH-01 | Preserve complete original NIH 3D metadata index (not bulk-copying unrelated devices) | VERIFIED_COMPLETE_FOR_STATED_SCOPE | [αρχείο/CI](https://github.com/6d9757cmp5-creator/ekab-spoudi/blob/main/tools/atla-ai/resources/nih3d-master-plan-2026/catalog-index.json) · [αρχείο/CI](https://github.com/6d9757cmp5-creator/ekab-spoudi/blob/main/tools/atla-ai/resources/nih3d-biomedical-scope-2026/summary.json) | Check current NIH publications and version drift beyond the saved 2026 snapshot |
| NIH-02 | Complete biomedical relevance triage and expert scientific course mapping | PARTIAL_VERIFIED | [αρχείο/CI](https://github.com/6d9757cmp5-creator/ekab-spoudi/blob/main/tools/atla-ai/resources/nih3d-biomedical-scope-2026/summary.json) · [αρχείο/CI](https://github.com/6d9757cmp5-creator/ekab-spoudi/blob/main/tools/atla-ai/resources/nih3d-educational-evidence-2026/summary.json) | Review 4275 uncertain models, validate geometry/anatomy, SAEK, EOPPEP, Anatomy Lab and Cockpit links by domain experts |
| NIH-03 | Store ALL selected source original formats including dependent textures/animations where any | PARTIAL_VERIFIED | [αρχείο/CI](https://github.com/6d9757cmp5-creator/ekab-spoudi/blob/main/tools/atla-ai/resources/nih3d-verified-originals-2026.json) · [αρχείο/CI](https://github.com/6d9757cmp5-creator/ekab-spoudi/packages) | Most biomedical models and any external texture/animation dependencies are not yet proven archived; check original source formats per model and license |
| NIH-04 | SHA256, manifests, all split parts, long-term preservation and recovery | PARTIAL_VERIFIED | [αρχείο/CI](https://github.com/6d9757cmp5-creator/ekab-spoudi/blob/main/docs/ATLA_NIH3D_GEOMETRY_STRUCTURAL_QA_2026.json) · [αρχείο/CI](https://github.com/6d9757cmp5-creator/ekab-spoudi/blob/main/tools/atla-ai/resources/nih3d-verified-originals-2026.json) | Reconcile 250 RESULT.json, tar.zst + split parts, original file hashes and permanent recovery across every selected package |
| NIH-05 | Preserve and independently recover expiring historical GitHub Actions artifacts | PARTIAL_VERIFIED | [αρχείο/CI](https://github.com/6d9757cmp5-creator/ekab-spoudi/actions/runs/41363970707) · [αρχείο/CI](https://github.com/6d9757cmp5-creator/ekab-spoudi/blob/main/docs/ATLA_NIH3D_MODEL_ARCHIVE_STATUS_2026.json) · [αρχείο/CI](https://github.com/6d9757cmp5-creator/ekab-spoudi/releases) | Unexpired artifacts require urgent verified extraction; old report records 238 historical archive gaps. Published assets are not verified source SHA-256. |
| NIH-06 | Safe future expansion without duplicating data or unrelated NIH devices | PARTIAL_VERIFIED | [αρχείο/CI](https://github.com/6d9757cmp5-creator/ekab-spoudi/blob/main/.github/workflows/atla-nih3d-planned-batch-execution.yml) · [αρχείο/CI](https://github.com/6d9757cmp5-creator/ekab-spoudi/blob/main/scripts/nih3d-plan-next-originals.mjs) | Guarantee sustained storage, capacity, repository operational limits and robust resume after failures |
| NIH-07 | 3D viewer completeness and visual correctness for textures, animation, layers and interaction | UNVERIFIED_OR_PENDING | [αρχείο/CI](https://github.com/6d9757cmp5-creator/ekab-spoudi/actions) · [αρχείο/CI](https://github.com/6d9757cmp5-creator/ekab-spoudi/blob/main/docs/ATLA_MASTER_PLAN_ANATOMY_LAB_AND_CLINICAL_COCKPIT_2026.md) | Independent visual screenshot-based mobile/desktop tests of real selected models in full Anatomy Lab and Clinical Cockpit viewer |
| NIH-08 | Published live browser app loads actual selected original 3D objects | UNVERIFIED_OR_PENDING | [αρχείο/CI](https://github.com/6d9757cmp5-creator/ekab-spoudi/actions/workflows/pages/pages-build-deployment) · [αρχείο/CI](https://github.com/6d9757cmp5-creator/ekab-spoudi/blob/main/docs/ATLA_NIH3D_CONTEXTUAL_INTEGRATION.md) | Production URL, CORS, real model textures/animations, 3D rendering, clinical correctness and mobile interactions have not been fully verified |
| NIH-09 | Independent technical and scientific assessment (not automatic clinical certification) | PARTIAL_VERIFIED | [αρχείο/CI](https://github.com/6d9757cmp5-creator/ekab-spoudi/blob/main/docs/ATLA_NIH3D_GEOMETRY_STRUCTURAL_QA_2026.json) · [αρχείο/CI](https://github.com/6d9757cmp5-creator/ekab-spoudi/blob/main/docs/ATLA_INDEPENDENT_SCIENTIFIC_QA_2026-11-03.md) | Independent credentialed scientific review, per-model medical anatomy accuracy and pedagogical validation |
| ATLA-01 | Safely synchronize draft PR #197 after completing NIH3D, with zero loss of newer main binaries | UNVERIFIED_OR_PENDING | [αρχείο/CI](https://github.com/6d9757cmp5-creator/ekab-spoudi/pull/197) · [αρχείο/CI](https://github.com/6d9757cmp5-creator/ekab-spoudi/blob/main/tools/atla-ai/resources/nih3d-verified-originals-2026.json) | Preserve draft; rebase/reconcile against current main only after NIH3D audit and ensure all 3D manifests survive |
| ATLA-02 | One ATLA learning assistant, no duplicate MENTOR and no lost learner progress | UNVERIFIED_OR_PENDING | [αρχείο/CI](https://github.com/6d9757cmp5-creator/ekab-spoudi/pull/197) | PR #197 CI recheck, learner profile migrations, end-to-end navigation and regression, no external AI endpoint activation |
| ATLA-03 | Final integrated live production browser QA and release acceptance | UNVERIFIED_OR_PENDING | [αρχείο/CI](https://github.com/6d9757cmp5-creator/ekab-spoudi/actions) · [αρχείο/CI](https://github.com/6d9757cmp5-creator/ekab-spoudi/pull/197) | At least desktop/mobile production screenshot and interaction proof, learning progress retention and rollback validation |

## Υποχρεωτικά όρια

Το GHCR, τα Releases, τα tar.zst, τα split parts και τα προσωρινά Actions artifacts είναι ΔΙΑΦΟΡΕΤΙΚΕΣ αποθήκες με πιθανές επικαλύψεις. Κανένα δεν χαρακτηρίζεται πλήρες χωρίς ανεξάρτητο SHA-256 ανά πρωτότυπο και έλεγχο όλων των αρχικών file refs. Στοχεύουμε στα ιατρικά και βιοεπιστημονικά χρήσιμα μοντέλα, όχι όλη την ιστοσελίδα. Οι 12 υποεργασίες δεν αντιστοιχούν σε αξιόπιστο ποσοστό έργου.

**PR #197:** παραμένει draft και πρέπει να συγχρονιστεί μετά NIH3D, χωρίς αλλαγή σε AI endpoint, εκπαιδευτική μνήμη ή ήδη συγχωνευμένα assets.
