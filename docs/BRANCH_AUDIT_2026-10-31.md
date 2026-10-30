# Απογραφή και ασφαλής καθαρισμός branches — 31/10/2026

## Τι ελέγχθηκε

Απογραφή **145 branches**, με σύγκριση ιστορίας Git (`main...branch`) για τα 135 branches που δεν είναι ούτε το `main` ούτε τα 9 heads ανοιχτών PR. Η βάση ήταν η κατάσταση του `main` μετά τον τεχνικό έλεγχο και τον καθαρισμό του Οκτωβρίου 2026.

| Κατηγορία | Πλήθος | Απόφαση |
| --- | ---: | --- |
| `main` | 1 | ΑΠΑΓΟΡΕΥΕΤΑΙ η διαγραφή |
| Branches 9 ανοιχτών PR | 9 | ΠΡΟΣΤΑΣΙΑ — εκκρεμείς εργασίες |
| Branches χωρίς δικά τους επιπλέον commits (`ahead_by=0`) | 6 | Υποψήφια για αρχειοθέτηση/διαγραφή μετά τον λειτουργικό και επιχειρησιακό έλεγχο |
| Λοιπά branches με επιπλέον commits έναντι main | 129 | ΔΙΑΤΗΡΗΣΗ μέχρι εξακρίβωση ότι δεν υπάρχει χρήσιμο μη ενσωματωμένο περιεχόμενο |
| **Σύνολο** | **145** | **Δεν διαγράφηκε κανένα branch σε αυτή τη φάση.** |

**Προσοχή:** Τα `ahead_by > 0` δεν αποδεικνύουν ότι λείπει αντίστοιχη λειτουργία από το `main` (μπορεί να έγινε squash/cherry-pick). Ομοίως, `ahead_by=0` δηλώνει ότι δεν υπάρχουν πρόσθετα commits στον συγκεκριμένο κλάδο, αλλά δεν αποκλείει εξωτερικές εξαρτήσεις, deployments ή συνήθειες ομάδας.

## Έξι branches χωρίς επιπλέον commits

Η σύγκριση με το `main` επέστρεψε `behind` με **0 ahead, 0 changed files**:

| Branch | Ahead | Behind (στιγμιότυπο ελέγχου) | Εκτίμηση |
| --- | ---: | ---: | --- |
| `feature/combined-eclass-pdf-card` | 0 | 1223 | Πιθανό ασφαλές υποψήφιο καθαρισμού |
| `fix/compact-sources-independent-cards` | 0 | 589 | Πιθανό ασφαλές υποψήφιο καθαρισμού |
| `feature/saek-in-app-reader-20261025` | 0 | 1256 | Πιθανό ασφαλές υποψήφιο καθαρισμού |
| `free-only-ai-grading` | 0 | 284 | Πιθανό ασφαλές υποψήφιο καθαρισμού |
| `test-phase-two-smoke-rules` | 0 | 107 | Πιθανό ασφαλές υποψήφιο καθαρισμού |
| `ekab-spoudi-v2-android-staging` | 0 | 143 | **Να διατηρηθεί** μέχρι επαλήθευση διαδικασίας Android/V2 |

Κανένα από τα έξι δεν εμφανίζεται ως head στα εννέα ανοιχτά PR. Αναζήτηση ονομαστικών αναφορών στον τρέχοντα κώδικα δεν επέστρεψε αποτελέσματα, αλλά αυτό **δεν** επαληθεύει εξωτερικά workflows ή τα deployments.

## Εννέα branches που προστατεύονται λόγω ανοιχτών PR

| PR | Branch | Λόγος διατήρησης |
| --- | --- | --- |
| [#124](https://github.com/6d9757cmp5-creator/ekab-spoudi/pull/124) | `feature/mentor-verified-knowledge-pack` | 30 κάρτες γνώσης / κλινικός έλεγχος σε εκκρεμότητα |
| [#120](https://github.com/6d9757cmp5-creator/ekab-spoudi/pull/120) | `docs/mentor-roadmap-readonly-capability-20261029` | 26η λειτουργία αναγνωστηρίου — απαιτείται έλεγχος επικάλυψης |
| [#115](https://github.com/6d9757cmp5-creator/ekab-spoudi/pull/115) | `feature/mentor-book-review-bridge` | 7 βιβλία / 17 ειδικότητες — ανοικτά clinical, rights gates |
| [#97](https://github.com/6d9757cmp5-creator/ekab-spoudi/pull/97) | `feature/anatomy-complete-greek-terminology-20261029` | Ελληνική ορολογία, εκκρεμής έλεγχος |
| [#89](https://github.com/6d9757cmp5-creator/ekab-spoudi/pull/89) | `ui/aed-compact-poster-map-20261029` | Αφίσα AED — δικαιώματα / media gate |
| [#83](https://github.com/6d9757cmp5-creator/ekab-spoudi/pull/83) | `feature/mentor-clinical-library` | 15 βιβλιογραφικές πηγές, 7 review-only |
| [#39](https://github.com/6d9757cmp5-creator/ekab-spoudi/pull/39) | `audit/saek-eoppep-primary-source-crosscheck-20261028` | Αντιπαραβολή 561 εγγραφών, draft |
| [#15](https://github.com/6d9757cmp5-creator/ekab-spoudi/pull/15) | `feature/saek-second-ai-review-current-20261028` | Πύλη video εγκρίσεων· πρόωρο merge θα κρύψει 30 βίντεο |
| [#6](https://github.com/6d9757cmp5-creator/ekab-spoudi/pull/6) | `coverage/greek-images-20261026` | 649 τοποθετήσεις εικόνων, media/clinical approvals εκκρεμούν |

## Διαδικασία πριν από διαγραφή

1. Επιβεβαίωση ότι δεν αποτελεί branch ενεργού PR, release, staged deployment ή εξωτερικής ολοκλήρωσης.
2. Επαναληπτικός έλεγχος του τρέχοντος head και `git rev-list --count origin/main..origin/BRANCH`: πρέπει να είναι **0** για την απλή ασφαλή κατηγορία.
3. Διατήρηση πλήρους ανακτήσιμου SHA ή tag, αν πρόκειται για σημαντικό ιστορικό.
4. Διαγραφή **μόνο συγκεκριμένου** επιβεβαιωμένου branch με ελεγχόμενο API ή εντολή Git, ποτέ μαζική διαγραφή με βάση ημερομηνία ή όνομα.
5. Επανάληψη CI (PWA smoke, 29 υποχρεωτικοί έλεγχοι, 17 browser journeys, MENTOR και 3D) και επιβεβαίωση αναφορών.

## Τρέχουσα έκβαση

Η απογραφή **ολοκληρώθηκε**, αλλά το branch deletion **δεν έχει εκτελεστεί**. Το συνδεδεμένο GitHub εργαλείο δεν προσφέρει εδώ λειτουργία διαγραφής branch/ref· δεν υποκαθιστούμε το δικαίωμα αυτό με μη ασφαλή αυτοματισμό. Οι 5 πρώτοι υποψήφιοι μπορούν να αφαιρεθούν μελλοντικά αφού επιβεβαιωθεί η μη χρήση τους. Το Android/V2 staging branch και όλοι οι 9 κλάδοι των ανοιχτών PR παραμένουν.
