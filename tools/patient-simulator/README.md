# Προσομοιωτής Ασθενών — ανεξάρτητο εργαλείο

Canonical location: tools/patient-simulator/. Ο simulator δεν αποτελεί υποσύστημα MENTOR OS.

- app/: UI, WebGL scene, CC0 patient renderer και tests
- core/: synthetic cases, ζωτικά, αποθήκευση και process debrief
- styles/: ανεξάρτητα responsive CSS
- assets/: CC0 ανθρώπινο mesh, έτοιμοι GLB ασθενείς και άδειες
- vendor/: Google model-viewer με άδεια Apache-2.0

**Δημόσια είσοδος:** [mentor-next.html](../../mentor-next.html) παραμένει στη ρίζα για τα bookmarks. Η προαιρετική παρουσία MENTOR OS φορτώνεται μόνο από την root HTML ως ξεχωριστό script.

Οι παλιές mentor/app/next-* και mentor/core/next-* διαδρομές είναι ελάχιστες γέφυρες. Οι τιμές localStorage και οι μαθητικές επιδόσεις δεν μετακινούνται. Τα περιστατικά παραμένουν συνθετικά, όχι κλινικά επικυρωμένα.

Δοκιμές: node scripts/verify-tool-boundaries.mjs · node --test tools/patient-simulator/core/*.test.mjs tools/patient-simulator/app/next-patient-mesh.test.mjs · node scripts/app-load-smoke.mjs.

## Visual Baseline A — στόχος Body Interact ή παραπάνω
Ο [αναλυτικός σχεδιασμός](../../docs/SIMULATION_COCKPIT_VISUAL_SPEC_2026.md) περιγράφει τη μελλοντική σκηνή, monitor, εργαλεία, κλινική αξιολόγηση και πλήρη quality gates. Το [cockpit-theme.css](styles/cockpit-theme.css) είναι η **πρώτη** εφαρμοσμένη φάση κοινής οπτικής γλώσσας, πάνω από το λειτουργικό `next-sim.css`. Τα `scripts/verify-cockpit-visual.mjs` tests παίρνουν πραγματικά screenshots desktop/tablet/mobile στο GitHub Actions και ελέγχουν overflow, panel layout, touch target και renderer ready/fallback. Αυτά **δεν αποδεικνύουν** σημερινή οπτική ισοδυναμία με το Body Interact.


## v0.6 — συγχρονισμός ορατής GLB κάμερας
Ο προσομοιωτής συνδέει τα υπάρχοντα πλήκτρα προβολής με την πραγματική κάμερα του static GLB μέσω `app/patient-camera.mjs` και `app/next-sim.mjs`. Ο υπολογισμός εστιάζει μόνο προσεγγιστικά σε περιοχές όρθιων μοντέλων, με σαφή ένδειξη ότι **δεν** είναι κλινική εξέταση· για τα ξαπλωμένα assets δεν προβάλλονται ατεκμηρίωτα anatomical landmarks.

Δοκιμές: `node --test tools/patient-simulator/app/patient-camera.test.mjs` και `scripts/app-load-smoke.mjs` στον πραγματικό browser. Κριτήριο μέλλοντος: ενοποίηση 3D σκηνής και ιατρικά επικυρωμένα μοντέλα/αποτελέσματα — δεν επιτεύχθηκε ακόμη.

## v0.7 — πραγματικά ενιαία 3D σκηνή
Η κύρια λειτουργία χρησιμοποιεί πλέον μία πρωτότυπη **Three.js r187** WebGL σκηνή με **δύο ταυτόχρονα πραγματικά CC0 GLB μοντέλα**, αντί για ξεχωριστό 3D overlay ενός ασθενούς. Η κοινή σκηνή συνδυάζει επιλεγόμενο ασθενή Α/Β, τρία πρωτότυπα συνθετικά περιβάλλοντα (δρόμος / κατοικία / πλατεία), στατικό 3D φορείο, μη λειτουργικό monitor και πρωτότυπο όχημα. Παρέχονται κίνηση κάμερας, φωτισμός και ελεγχόμενη αναβάθμιση αποδοτικότητας κινητού.

- Source: `app/unified-stage.mjs` (original authored code) → pinned offline-first bundle `vendor/unified-stage.bundle.mjs` με Three.js 0.187.0 και upstream MIT LICENSE στο `vendor/THREE-LICENSE.txt`.
- Rebuild: `.github/workflows/build-cockpit-stage.yml`. Μη χειρογράφετε αλλαγές στο compiled vendor bundle. Τα παλιά procedural canvas και CC0 model-viewer παραμένουν διαθέσιμα ως fallback.
- Η προσομοίωση ασθενών **παραμένει στατική**: δεν υλοποιήθηκαν rigged κινήσεις, αναπνοή, τραύμα, φαρμακευτικές επιδράσεις ή κλινικά επικυρωμένα σενάρια. Τα props είναι **οπτικά εκπαιδευτικά**, όχι πραγματικές ιατρικές πράξεις.
- QA: `scripts/verify-unified-scene.mjs`, `scripts/app-load-smoke.mjs`, `scripts/verify-cockpit-visual.mjs` για ενεργό renderer, 2 ασθενείς, αλλαγή περιβάλλοντος και mobile/desktop screenshots. Ο στόχος Body Interact ή ανώτερο παραμένει **ανεκπλήρωτος**.

## Ενοποίηση ειδικών εκπαιδευτικών αποστολών (ATLAS PR #147)

Η ιδιοκτησία του **καταλόγου δύο δοκιμαστικών MCI ασκήσεων και τριών καρτών αναγνώρισης εξοπλισμού** ανήκει πλέον σε αυτό το εργαλείο:
- `core/mission-activities.mjs` (σενάρια)
- `core/mission-workflow.mjs` (βήματα)
- `core/mission-activity-engine.mjs` (κατάσταση και ανασκόπηση)
- `core/mission-migration.test.mjs` (ιστορικά IDs / replay)

Τα ιστορικά imports `mentor/core/activities.mjs`, `mentor/core/workflow.mjs`, `mentor/core/activity-engine.mjs` είναι μόνο **re-export shims**. Δεν άλλαξε η μοναδική εκπαιδευτική κατάσταση, τα αποθηκευμένα session IDs ή η ειδική IndexedDB των δραστηριοτήτων. Η αποθήκη `mentor/core/activity-store.mjs` και η πλήρης UI μετεγκατάσταση αυτών των ασκήσεων εκκρεμούν και πρέπει να ελεγχθούν πριν την οριστική κατάργηση `mentor/`.

Το ATLAS βοηθά στην εκμάθηση, αλλά **δεν αποφασίζει τα συνθετικά αποτελέσματα, δεν κάνει κλινική διαλογή και δεν βαθμολογεί** τις αποστολές. Οι ασκήσεις δεν είναι κλινικά εγκεκριμένες.

