# SIMULATION COCKPIT — τελικό οπτικό και λειτουργικό πρότυπο 2026

**Έκδοση προτύπου:** Design System / Acceptance Baseline 1.0 — 2026-11-01  
**Ιδιοκτησία:** ΕΚΑΒ Σπουδή → \`tools/patient-simulator/\` (όχι MENTOR OS)  
**Σκοπός:** ανεξάρτητο, πρωτότυπο ελληνικό cockpit επιπέδου **Body Interact ή ανώτερου** τόσο σε εμφάνιση όσο και σε εκπαιδευτική λειτουργία, με τεκμηριωμένη ανεξάρτητη αξιολόγηση. **ΣΤΟΧΟΣ**, όχι ισχυρισμός ότι το σημερινό προϊόν έχει φτάσει εκεί.

## 1. Benchmark — δημόσια στοιχεία του Body Interact (όχι αντιγραφή)
- Επίσημο 15-point simulation interface: https://help.bodyinteract.com/body-interact-simulator-app/using-the-simulation/simulation-interface-overview/
- Vital signs & monitoring: https://help.bodyinteract.com/body-interact-simulator-app/using-the-simulation/monitor-vital-signs/
- Physical exam ABCDE / head-to-toe: https://help.bodyinteract.com/body-interact-simulator-app/using-the-simulation/perform-a-physical-examination/
- Performance / timeline: https://help.bodyinteract.com/body-interact-simulator-app/using-the-simulation/understand-performance-area/ και https://help.bodyinteract.com/body-interact-simulator-app/using-the-simulation/understand-timeline/
- Real-time physiology and clinical scenarios: https://bodyinteract.com/virtual-patient-simulator/
- Εκπαιδευτικό/λειτουργικό benchmark **μόνο**. Απαγορεύεται χρήση ιδιόκτητου κώδικα, asset, UI screenshot ως δήθεν δικό μας, πρωτοκόλλων ή αλγορίθμων χωρίς δικαιώματα. Όλες οι αποφάσεις σχεδιασμού υλοποιούνται πρωτότυπα.

## 2. Η τελική οθόνη 1440 × 900 (στόχος, όχι σημερινή υλοποίηση)

\`\`\`text
┌───────────────────────────────────────────────────────────────────────────────────────────────┐
│ ΕΚΑΒ ΣΠΟΥΔΗ / ΠΡΟΣΟΜΟΙΩΤΗΣ     ΠΕΡΙΣΤΑΤΙΚΟ: Τροχαίο    ΧΡΟΝΟΣ 08:32  ⏸  ⛶  Βοήθεια  │
├───────────────────┬─────────────────────────────────────────────┬─────────────────────────────┤
│ ΣΚΗΝΗ / ΑΠΟΣΤΟΛΗ │         3D ΚΕΝΤΡΙΚΗ ΣΚΗΝΗ ΑΣΘΕΝΟΥΣ         │ MONITOR / ΑΣΘΕΝΗΣ Α         │
│ Περιβάλλον        │           60%+ του βασικού χώρου           │ HR        RR      SpO₂       │
│ Άτομο Α / Β       │ ΦΩΤΟΡΕΑΛΙΣΤΙΚΟ ΦΩΣ, ΑΝΑΠΝΟΗ, ΕΚΦΡΑΣΕΙΣ      │ ΑΠ/ΗΚΓ μόνο όταν έγκυρα      │
│ Σύντομος στόχος   │ Ασφαλές focus: κεφάλι / θώρακας / άκρα      │ Γράφημα & μεταβολές          │
│ Ιστορικό/ABCDE    │ Ανεξάρτητα επιλεγόμενα assets/αντικείμενα    │ Κλινικά ευρήματα ΜΟΝΟ ελεγμένα │
├───────────────────┴─────────────────────────────────────────────┴─────────────────────────────┤
│ ΕΝΕΡΓΕΙΕΣ: Διάλογος  ABCDE/Εξέταση  Παρακολούθηση  Εξετάσεις  Κλήση  Παρεμβάσεις  Φάρμακα │
├────────────────────────────────────────────────────────┬──────────────────────────────────────┤
│ ΕΝΕΡΓΟ ΕΡΓΑΛΕΙΟ: αποτελέσματα, επιλογές, κατάσταση       │ ΙΣΤΟΡΙΚΟ ΕΝΕΡΓΕΙΩΝ / ΧΡΟΝΟΛΟΓΙΟ     │
│ Σαφή κουμπιά, απαιτούμενος εξοπλισμός, επιπτώσεις        │ Χρονική σήμανση, ξεχωριστός ασθενής │
└────────────────────────────────────────────────────────┴──────────────────────────────────────┘
  ΔΙΑΚΡΙΤΟ MENTOR OS (προαιρετικός εκπαιδευτής) · Μετά το περιστατικό: πλήρες DEBRIEF.
\`\`\`

Το παραπάνω είναι διάταξη στόχος, **όχι screenshot**. Η δική μας τρέχουσα διεπαφή βρίσκεται στο \`/mentor-next.html\` με λειτουργικό shell, αλλά **χωρίς** όλη την πλήρη σκηνή, τα εξελιγμένα assets και την επιστημονικά επικυρωμένη φυσιολογία.

### Κατανομή οθόνης
- Desktop ≥1280px: σκηνή ~60–65%, αριστερό rail 13–16%, δεξί monitor 22–26%. Το dock εφάπτεται οπτικά στη σκηνή, χωρίς να καλύπτει ζωτικά.
- Tablet 768–1279px: κεντρική σκηνή επάνω, monitor ως πλήρους πλάτους οριζόντια σειρά, εργαλεία σε scrollable dock. Δεν κρύβονται κρίσιμες πληροφορίες.
- Mobile 320–767px: σκηνή πρώτα με σωστό portrait framing, βασικά vitals επάνω/ακριβώς κάτω, sticky dock επιλογών, panel ως sheet ή inline section με πλήρη πρόσβαση αφής. Fullscreen και portrait/landscape υποστήριξη. **Ούτε ένας κύριος έλεγχος να απαιτεί οριζόντιο scroll της σελίδας.**
- Καμία 3D αποστολή δεν πρέπει να εμφανίζει placeholder/stock φωτογραφία ως πραγματικό runtime asset. Ενδείξεις renderer "ready/fallback" και σαφή ενημέρωση για τα όρια.

## 3. Μία κοινή γλώσσα σχεδιασμού (Original Clinical Dark)
- Χρώματα: canvas \`#071823\`, panels \`#102938\`, raised \`#193849\`, border \`#40647A\`, primary \`#76E3D4\`, text \`#EEF7FA\`, muted \`#ABC5CD\`, action blue \`#8ABAF0\`. ΠΡΟΕΙΔΟΠΟΙΗΣΗ amber, ΚΡΙΣΙΜΟ red μόνο για πραγματικά μαθησιακά κρίσιμη ένδειξη — **όχι** τυχαία εικονικά ζωτικά.
- Κλίμακα αποστάσεων 4/8/12/16/24/32px, γωνίες 10/14/20px, border 1px, typography system/Greek-compatible, numbers tabular.
- Buttons, toggles, tabs, cards, status, tooltips, dropdowns, log rows, feedback: ενιαία tokens και states \`default/hover/focus/pressed/disabled/loading/error\`.
- Τουλάχιστον 44×44 CSS px touch targets όπου πρακτικό, εμφανές \`:focus-visible\`, σωστά \`aria-pressed\`, \`role=status\`, label σε κάθε input, χρωματική αντίθεση WCAG 2.2 AA.
- Reduced motion \`prefers-reduced-motion\`, ελάχιστη κίνηση μόνο για ουσιαστική 3D δράση. Βαθιά χρώματα, ρεαλιστικό φως, **όχι gamified neon**.

## 4. 3D ΠΑΡΟΥΣΙΑ (κριτήριο ισοδυναμίας)
1. **Μία ενιαία σκηνή**: 3D ασθενής, έδαφος/σκηνικό/ασθενοφόρο, αντικείμενα και ιατρικός εξοπλισμός στον *ίδιο* real-time renderer, με ομοιόμορφο φωτισμό, σκιά, κλίμακα και camera. Το σημερινό \`model-viewer\` overlay των στατικών GLB είναι **μεταβατικό**, όχι τελικό.
2. Πλήρεις νόμιμες glTF 2.0 / PBR υφές, φυσιολογικό skin shading, αντοχή mobile GPU, ανατομικά σωστές αναλογίες. Όχι rip/extraction εμπορικού simulator.
3. Rigged/animated ασθενής με στάσεις, παρατηρήσιμη αναπνοή, απλή κίνηση κεφαλής, βλέμμα και βασικές εκφράσεις. **Μόνο** εφόσον έχουμε πραγματικό rig/animation, όχι ολόκληρο μοντέλο γυρισμένο τεχνητά.
4. Πραγματικές συνέπειες ενεργειών **μόνο** από τεκμηριωμένο/επιστημονικά ελεγμένο state-machine και physiology engine — δεν επινοούμε υποτιθέμενη ιατρική ακρίβεια.
5. Διαφορετικά περιβάλλοντα ελληνικής προνοσοκομειακής καθημερινότητας, φωτοτεκμηριωμένα/αυθεντικά περιουσιακά στοιχεία, body regions, camera orbit/zoom/focus, ασφαλής επιλογή δύο ασθενών.
6. Graceful fallback για συσκευές χωρίς WebGL, χωρίς κατάρρευση εκπαιδευτικού controller.

## 5. Λειτουργίες που πρέπει να φτάσουν/ξεπεράσουν το benchmark
| Κατηγορία | Απαίτηση τελικού Cockpit | Σήμερα |
| --- | --- | --- |
| Case/briefing | Ελληνική τεκμηριωμένη βιβλιοθήκη, ρεαλιστικό περιβάλλον, στόχοι, σαφή αποτελέσματα | 3 **συνθετικά** demo περιστατικά |
| Clinical monitor | HR/RR/SpO₂/ΑΠ/ΗΚΓ με πραγματικό source & source-labeled waveform | Μόνο συνθετικά HR/RR/SpO₂ |
| Patient views & positions | Ενιαίες rigged αλλαγές στάσης / φυσικές αλληλεπιδράσεις | Κάμερα/focus και στατικά GLB |
| Dialogue | Ελληνικός φυσικός διάλογος με role/context, ένδειξη βεβαιότητας, privacy guards | Τοπικές προκαθορισμένες απαντήσεις |
| Physical exam | ABCDE, αξιοπιστία εξέτασης, ευρήματα/ήχοι/ψηλάφηση από case data | Μερικές επιλογές οργάνωσης |
| Monitoring/testing | 3D εξοπλισμός + αξιόπιστα δεδομένα tests, χρονικές μεταβολές | Συνθετικό chart χωρίς εξετάσεις |
| Calls/interventions | Ρεαλιστικό workflow ελληνικού ΕΚΑΒ, ακέραιο event timeline | Περιορισμένη οργάνωση |
| Medication | Κλειδωμένη μέχρι επιστημονική/νομική έγκριση ανά ρόλο | Κλειδωμένη |
| Health records | Case-specific chart, evidence audit trail, private storage | Τοπική εκπαιδευτική καταγραφή |
| Debrief | Αποτελέσματα ανά επικοινωνία/αξιολόγηση/διαχείριση, πλήρες timeline, κρίσιμα λάθη, τεκμηρίωση | Εκπαιδευτικό οργανωτικό checklist |
| Time/pause/cleanup | Σταθερή προσομοίωση, pause, reset με σαφή επιβεβαίωση | Λειτουργικό, συνθετικός χρόνος |
| Extra vs benchmark | Ελληνικό ΕΚΑΒ-first πρωτόκολλο, 2 ασθενείς, offline quick guide, τοπικά 0-credit tests, διδασκαλία MENTOR OS | Μερικά prototype θεμέλια |

**Μην** υιοθετήσεις αυτομάτως εμπορικά scoring weights, clinical algorithms ή γιατρούς-first δράσεις χωρίς ειδικό εκπαιδευτικό και νομικό έλεγχο ελληνικού διασώστη.

## 6. Αποδοχή πριν από κάθε παράδοση (Definition of Done)
- **A. Λειτουργία:** automated unit/integration/browser tests, κανένα σπασμένο URL, τα δύο άτομα/σενάρια/time/pause/review λειτουργούν και δεν χάνονται saves.
- **B. Οπτικά screenshots πραγματικού browser:** 390×844 (mobile portrait), 820×1180 (tablet), 1440×900 (desktop), ιδανικά πρόσθετο mobile landscape. Αρχειοθετούνται από CI με screenshot filename και commit SHA. Απαγορεύεται άσχετη stock εικόνα ως αποδεικτικό.
- **C. Layout:** μηδενικό horizontal overflow, χωρίς αλληλοκάλυψη, focus targets 44px, key sections ορατά, charts readable, ελληνική γλώσσα σε όλα.
- **D. 3D:** πραγματική φόρτωση textured asset ή σαφές fallback. Προσωρινό avatar overlay **δεν** δικαιολογεί πλήρη 3D ισοδυναμία. Ανεξάρτητα metrics για ανά frame και memory.
- **E. Επιστήμη:** ξεχωριστό clinical review με sources, role boundaries, δεύτερο ειδικό, versioned scenario. Το τεχνικό CI ή ένα AI grade δεν ισοδυναμεί με κλινική πιστοποίηση.
- **F. Ασφάλεια/privacy:** licensed assets, consent for personal data, authentication validation, no keys in client, offline save/recovery, OWASP ASVS review.
- **G. Side-by-side:** blind 5-person UX panel συγκρίνει τουλάχιστον 5 αντιπροσωπευτικά scenarios για visual fidelity, realism, workflow discoverability και mobile usability με την τότε τρέχουσα νόμιμη έκδοση του Body Interact. Επίσης μετρήσιμη **functional coverage** των 15 επίσημων ελέγχων. Για στόχο «παραπάνω», απαιτείται ισοδυναμία σε όλα τα ουσιαστικά σημεία **και** ανεξάρτητη αξιολόγηση του πρόσθετου ελληνικού προνοσοκομειακού έργου.
- **H. Κατάσταση:** χαρακτηρίζεται \`Πρωτότυπο / Beta / Παραδόθηκε με ευρήματα / Επαληθευμένο\`. Δεν χρησιμοποιούμε την ετικέτα **ΙΣΑΞΙΟ ΜΕ BODY INTERACT** μέχρι πλήρη, ανεξάρτητα τεκμηριωμένη επιτυχία. Ελλείψεις παραμένουν ορατές.

## 7. Σειρά πραγματικής υλοποίησης — μεγάλα βήματα
**Phase A — Visual shell**: tokens/typography/focus, monitor, scene, mobile responsive, screenshots & QA gates. Ο πραγματικός λειτουργικός κώδικας μένει ο ίδιος.  
**Phase B — True 3D stage**: ενοποιημένος glTF renderer, πραγματικά rigged CC0/licensed μοντέλα, φως/PBR περιβάλλοντα, performance budgets, επιλογή ασθενών με camera moves.  
**Phase C — Integrated interaction**: shared object graph, εργαλείο→αντικείμενο→patient case event, simulated equipment, τεκμηριωμένα κλινικά στοιχεία, συγχρονισμός UI/3D.  
**Phase D — Verified clinical fidelity**: εξειδικευμένα σενάρια, ελληνικά πρωτόκολλα και ελεγχόμενη φυσιολογία/φάρμακα/εξετάσεις *μετά* την ανεξάρτητη κλινική έγκριση.  
**Phase E — Market-grade release**: real-device tests, full accessibility, detailed debrief, robust recovery, benchmarks, independent reviewer signoff.

## 8. Πρότυπα αναφοράς
- W3C WCAG 2.2 AA: https://www.w3.org/TR/WCAG22/
- Khronos glTF 2.0 format: https://registry.khronos.org/glTF/specs/2.0/glTF-2.0.html
- OWASP ASVS: https://owasp.org/www-project-application-security-verification-standard/
- Body Interact official help pages above.

**Τελευταία ακριβής κατάσταση:** υπάρχει πραγματικός κώδικας WebGL, ανεξάρτητο patient simulator, 3 εκπαιδευτικά περιστατικά, τοπικά στατικά GLB, βασικό UI και events. Η εφαρμογή **δεν** είναι ακόμη στο συνολικό οπτικό/λειτουργικό/κλινικό επίπεδο Body Interact. Η παρούσα προδιαγραφή είναι συμβόλαιο ποιότητας, όχι ισχυρισμός υλοποίησης.


## 9. Μόνιμος στόχος — ισοδυναμία ή υπέρβαση *ποιότητας κώδικα*
Η οπτική και λειτουργική ισοδυναμία δεν είναι αντιγραφή του εσωτερικού/ιδιόκτητου source code της Body Interact, στο οποίο **δεν έχουμε πρόσβαση**. Δεν υπάρχει έγκυρη μέθοδος «σύγκρισης γραμμή προς γραμμή». Χτίζουμε **αυθεντικό, νόμιμο, δοκιμασμένο** έργο και συγκρίνουμε παρατηρήσιμα αποτελέσματα.

**Engineering acceptance targets (δεν αποτελούν ήδη επιτευγμένες μετρήσεις):**
- Ανεξάρτητο `tools/patient-simulator/` με σαφή όρια UI → case state → 3D renderer. MENTOR OS μέσω συμβατικού event, όχι άμεσων dependencies.
- Ενιαία real-time σκηνή glTF 2.0 (mesh, materials/PBR, texture maps, skinning, animation)· προοδευτική φόρτωση και δοκιμή απόδοσης σε πραγματικό iPhone.
- State-driven visual commands με αναπαραγώγιμα, ελεγμένα pure functions. **Καμία** επιλογή UI δεν επιτρέπεται να επηρεάζει μόνο κρυμμένο 3D canvas ενώ ο χρήστης βλέπει άλλο μοντέλο.
- Tests σε state transitions, διατήρηση παλιάς προόδου, 3D κάμερα και διάκριση «οπτικό placeholder»/«πραγματικό κλινικό αποτέλεσμα».
- Real-browser visual regression: mobile/tablet/desktop screenshots, μηδενικά οριζόντια overflow/overlaps, ελληνική ορολογία, χειρισμός με πληκτρολόγιο/αφή και WCAG 2.2 AA.
- Σύγκριση των 15 επίσημων Body Interact controls με πραγματικές ενδείξεις αξιολόγησης ανά έκδοση. Δεν χαρακτηρίζεται «ίσο» χωρίς ισοδυναμία κρίσιμων λειτουργιών και ανεξάρτητη αξιολόγηση.
- Μετρήσιμος προϋπολογισμός απόδοσης (FPS, memory, loading, mobile thermals) σε **πραγματικές συσκευές**· μη δημοσιεύεις αυθαίρετους αριθμούς χωρίς μετρήσεις.
- Πλήρης τεκμηρίωση άδειας κάθε asset και ελάχιστη μεταφορά προσωπικών/ιατρικών δεδομένων.

### Πραγματικό βήμα v0.6
Το module `tools/patient-simulator/app/patient-camera.mjs` δημιουργεί ελεγμένα camera presets και τα συνδέει με **την εμφανιζόμενη** GLB κάμερα `<model-viewer>`. Εφόσον το συγκεκριμένο asset είναι όρθιο και υποστηρίζει bounding box, γίνεται **προσεγγιστική** στόχευση βάσει γεωμετρίας. Τα οριζόντια μοντέλα **δεν** ισχυρίζονται ότι έχουν επαληθευμένα ανατομικά landmarks. Αυτό είναι βελτίωση οπτικής πλοήγησης, **όχι** ενιαίος rigged 3D patient engine ούτε κλινική εξέταση.

**Χωρίς τεκμηριωμένα κριτήρια δεν υπάρχει «προσωρινά ισάξιο» και δεν χαρακτηρίζεται ολοκληρωμένη η συνολική εμπειρία.**

## 10. Πρόοδος πρωτότυπης υλοποίησης — v0.7 (2026-11-01)
Το milestone «ενιαία 3D σκηνή» προχώρησε πραγματικά: η `unified-stage.mjs` περιέχει πρωτότυπη WebGL σκηνή Three.js r187, φορτώνει **δύο στατικά licensed GLB** στην ίδια σκηνή, παράγει αυτοτελές περιβάλλον δρόμου/κατοικίας/πλατείας και συνδυάζει φορείο, όχημα και οπτικό monitor. Τα κουμπιά ασθενούς/γωνίας και οι συνθετικές αποστολές συνδέονται στο ίδιο visual scene API. Η προηγούμενη λειτουργία διατηρείται ως fallback.

Ο **τεχνικός engine** είναι ενιαίος, αλλά η εκπαίδευση **δεν** είναι ακόμη market-grade ή ισάξια με Body Interact: στατικά σώματα, προσεγγιστική εστίαση χωρίς landmarks, όχι πραγματική επαφή/αλληλεπίδραση εξοπλισμού με σώμα, όχι rig/φυσιολογία/φαρμακολογία, χαμηλού πολυγώνου σκηνικά, όχι ανεξάρτητη κλινική αξιολόγηση. Τα 3D props είναι για οπτική εξοικείωση, όχι θεραπευτικές ενέργειες.

Η απόδοση και οι επικαλύψεις UI απαιτούν επανέλεγχο σε screenshots mobile/tablet/desktop ανά commit. Δεν παρουσιάζεται «ίσο» μέχρι τη διεξοδική σύγκριση των επίσημων 15 λειτουργιών και ανεξάρτητη επιστημονική τεκμηρίωση.
