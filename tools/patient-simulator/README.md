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
