# ΕΚΑΒ Σπουδή — 3D Anatomy Lab (προσχέδιο PR #86)

## Τι υλοποιήθηκε

- Ο νέος **ενεργός** viewer είναι το αρχείο `hires-anatomy.js`, που αντικαθιστά τη χρήση του πρώτου `anatomy.js` στο HTML. Το παλιό σχηματικό αρχείο διατηρείται **μόνο ως ιστορικό prototype**, δεν φορτώνεται.
- Χρησιμοποιούνται πραγματικά λεπτομερή 3D πλέγματα, **όχι procedural spheres / cylinders** ως ανατομία.
- Ανδρικός άτλας: **2.234 meshes, 15 συστήματα, BodyParts3D 4.0** με προσαρμογές από το ανοικτό Human-Atlas.
- Γυναικείος σύνθετος άτλας: **3.004 meshes, 16 συστήματα**. Γυναικεία όργανα HuBMAP Visible Human Female v1.5, με συμπλήρωση ελλειπόντων οστών, μυών, αγγείων κ.ά. από **γεωμετρικά μετασχηματισμένο BodyParts3D ανδρικό**. Δίνει *κάλυψη όλων των συστημάτων*, όχι ανεξάρτητο ανατομικά ακριβές γυναικείο scan όλων των ιστών. Η κατανομή ανά δομή δεν έχει ακόμη επαληθευθεί ανεξάρτητα.
- Πραγματικό zoom, 360° περιστροφή, front/back, επιλογή δομής με raycasting, απομόνωση (shader ανά vertex), συστήματα, διαφάνεια δέρματος, αναζήτηση και αυτοέλεγχος.
- Προοδευτική λήψη gzip συμπιεσμένων chunks με pin στα Git commit hashes, συνέπεια πλήθους δομών και έλεγχο ακεραιότητας μήκους bytes, χωρίς ανάγνωση ή τροποποίηση επίδοσης.
- Ελληνικά labels για βασικούς όρους. Οι άγνωστοι όροι διατηρούνται στα αγγλικά με ένδειξη **«μετάφραση προς έλεγχο»**. Δεν ισχυριζόμαστε ότι οι ~5.000 δομές έχουν ήδη επιστημονικά επικυρωμένη ελληνική απόδοση.

## Δεδομένα / άδειες / επίσημες πηγές

**Ανδρικό dataset (fixed revision)**
- Source: https://github.com/slorksmo/Human-Atlas/tree/5bb5713aab18d7fe9380c3339eb09f173491ea06
- Mesh archive: BodyParts3D 4.0 © DBCLS; προσαρμογή του open-source Human-Atlas.
- Δεδομένα: CC BY 4.0 σύμφωνα με την τρέχουσα επίσημη ιστοσελίδα DBCLS https://dbarchive.biosciencedbc.jp/en/bodyparts3d/lic.html και την αναφορά Human-Atlas.
- Source README/credits: https://github.com/slorksmo/Human-Atlas/blob/main/public/ATTRIBUTION.md

**Γυναικείο σύνθετο dataset (fixed revision)**
- Source: https://github.com/HiMahendraBeniwal/female-atlas/tree/b0a20fa3a009ca5f6bfa07b7479312e04c862af2
- Source README/credits: https://github.com/HiMahendraBeniwal/female-atlas/blob/main/public/ATTRIBUTION.md
- HuBMAP: *3D Reference Organ Set for Female v1.5*, Kristen Browne / Heidi Schlehlein, DOI https://doi.org/10.48539/HBM352.BTSQ.586
- Skeleton/muscles/vessels filling gaps: BodyParts3D © DBCLS, male source geometries transformed by Mahendra Beniwal in scripts/build-perfect-female-atlas.mjs.
- Mesh data CC BY 4.0, authorship as above. Viewer code is independent original code, using Three.js MIT.

**Important:** BOTH datasets are fetched **from third-party pinned jsDelivr GitHub CDN endpoints**. CDN availability, CORS behaviour, and heavy mobile downloads must be tested. They are not hosted or available offline in this repo. Loading the first time costs ~30–60 MB per model, potentially more without supported gzip. Do not claim standalone offline mode.

## Pending before production

1. Independent scientific anatomy audit: per-system coverage, provenance for each female mesh, shape / alignment / left-right correctness, actual feminine morphology versus transformed male donor. Use no "100% authentic female" claim.
2. Live browser tests (iOS Safari, Android, desktop), performance memory and GPU profiling; validate remote CDN fetch and SHA-pinned availability.
3. Explicit source-level CC BY credit text and full multilingual medical nomenclature review. English text is temporarily flagged.
4. Basic accessibility keyboard, search and list controls completed; perform real VoiceOver/screen-reader test and device support check.
5. Add reliable offline bundle only after rights and storage quota review.
6. Source-appropriate teaching caveats: never present geometry as diagnostic, surgical, or individually representative. No cross-mapped 'same patient' assumptions.

**Merge gate:** leave the PR in DRAFT until scientific and device checks are actually completed in line with AGENTS.md. Existing progress, notes, EOPPEP and scoring code were not modified.

## Δύο κάρτες στην αρχική και σύνδεση με κεφάλαια ΣΑΕΚ

- Η αρχική εμφανίζει **δύο ανεξάρτητες κάρτες δίπλα δίπλα** κάτω από «Διαδραστικά εργαλεία»: **Σκελετός** και **Όργανα**. Και στο κινητό διατηρούνται δίπλα δίπλα, με τις υπάρχουσες τοπικές εικόνες ως ελαφριές ενδεικτικές μικρογραφίες. Δεν φορτώνονται αυτόματα τα βαριά 3D αρχεία στην αρχική.
- Κάθε κάρτα μεταφέρει στον **ίδιο** 3D viewer με URL query: mode=skeleton/system=skeletal ή mode=organs. Αμέσως μετά μπορεί ο μαθητής να αλλάξει άνδρα/γυναίκα.
- Το ξεχωριστό read-only script **saek-jumps.js** δημιουργεί contextual links **μόνο** στα αντίστοιχα κεφάλαια ΣΑΕΚ: 01 Ανατομία, 02 Φυσιολογία, 05 Προνοσοκομειακή εκτίμηση, 10 Επείγουσες παθολογικές καταστάσεις, 14 Τραύμα, 17 Πρακτικές δεξιότητες παθολογικών και 18 Πρακτικές δεξιότητες τραύματος.
- Κεφάλαια με συνδυασμένο αντικείμενο μπορούν να έχουν δύο επιλογές (π.χ. κρανίο και εγκέφαλος). Κεφάλαια χωρίς τεκμηριωμένο άμεσο ανατομικό αντιστοιχισμό **δεν** εμφανίζουν κουμπί.
- Τα URL parameters mode, system, sex και focus ελέγχονται με **λευκή λίστα**. Ο viewer επιλέγει συγκεκριμένο πλέγμα μόνο εάν βρεθεί όνομα που αντιστοιχεί στην ανατομία και στο σύστημα που ζητήθηκε. Διαφορετικά ανοίγει το σωστό **σύστημα** με σαφές μήνυμα ότι δεν βρέθηκε συγκεκριμένο πλέγμα· δεν παρουσιάζει άσχετο οστό ή όργανο ως σωστό.
- Κάθε βαθύς σύνδεσμος κρατά ελεγμένη επιστροφή **στο ίδιο κεφάλαιο** από το κουμπί επιστροφής, χωρίς δυνατότητα εξωτερικής ανακατεύθυνσης.
- Δεν τροποποιείται η λογική «Ολοκλήρωσα την ανάγνωση», οι βαθμολογίες ή το cloud. Η αρχική παραγωγή παραμένει ανέπαφη μέχρι να συγχωνευθεί το draft PR μετά από δοκιμές και επιστημονικό έλεγχο.
- **Εκκρεμεί:** Δοκιμή σε πραγματικό iOS Safari για διάταξη δύο καρτών, σωστό frame/ζουμ και deep links, έλεγχος ονομάτων σε όλα τα υψηλής λεπτομέρειας πλέγματα και πλήρης ελληνική ορολογία.
