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
