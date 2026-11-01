# ATLA — Επαληθευμένο μητρώο 3D πόρων, 01/11/2026

Συνολικά **71 ανεξάρτητα νέα αρχεία** ανατομίας, ασθενών, γεωμετρίας και κινήσεων, συν **2 επαληθευμένες εκδόσεις BodyParts3D** και **36 MIT αρχεία Open Anatomy Atlas**. Πηγές, άδειες, hashes και ακριβή ονόματα όλων των επιμέρους αρχείων βρίσκονται στα manifests.

## 3D Anatomy Lab (ξεχωριστή ενότητα)

- **HRA/HuBMAP:** 54 verified GLB, CC BY 4.0, `tools/anatomy-3d/resources/hra-v1.2/`. [Κατάλογος 54 αρχείων](../tools/anatomy-3d/resources/imported-manifest.json)
- **Z-Anatomy:** 5 verified GLB μόνο για NC-SA research, `tools/anatomy-3d/resources/z-anatomy-research/`. Διατηρήθηκαν τα original license notices. Αποκλείονται αβέβαιοι/επιπρόσθετα περιορισμένοι ιστοί. [Κατάλογος](../tools/anatomy-3d/resources/z-anatomy-research/imported-manifest.json)
- **BodyParts3D 4.0:** επίσημο archive DBCLS, **1.259 meshes, 2.017 named concepts**, διαθέσιμο ως πηγή και compact atlas `tools/anatomy-3d/resources/bp3d40/` στο GitHub.
- **BodyParts3D 4.3 πλήρης ανάλυση:** επίσημοι 65 raw batches, **3210 meshes, 3954 named structures**, 8.647.172 τρίγωνα. Ο compact binary atlas **192.40 MiB** είναι μόνιμα στο repo σε 4 GitHub-safe shards: `tools/anatomy-3d/resources/bp3d43/compiled-shards/` με SHA-256, index.json και manifest. [Αρχικά official source ZIPs / artifact 30 ημερών](https://github.com/6d9757cmp5-creator/ekab-spoudi/actions/runs/41347864318)
- **Πλήρης ανοικτός κώδικας Open Anatomy Atlas:** 36 αρχεία MIT σε `tools/anatomy-3d/vendor/open-anatomy-atlas/`, περιλαμβάνουν renderer, UX, OBJ/ZIP parsers, BodyParts3D4.3 importer, Z importer, tests, original LICENSE/NOTICE.
- **Πρωτότυπο Z-Anatomy** (Z-Anatomy.zip, Z-Biomechanics.7z, TA2.csv, Python helper, license): [επαληθευμένο Research Actions artifact 30 ημερών](https://github.com/6d9757cmp5-creator/ekab-spoudi/actions/runs/41347572616), **δεν αντιγράφηκε δημόσια ολόκληρο** λόγω διαφορετικών δικαιωμάτων επιμέρους αντικειμένων.

**Χωριστοί φάκελοι HRA ανά σύστημα:** `abdomen` (10), `cardiovascular` (2), `head-brain` (6), `integumentary` (2), `limbs` (4), `lymphatic` (2), `neurology` (2), `pelvis` (16), `thorax` (6), `urinary` (4).

## Clinical Cockpit (άλλη ανεξάρτητη ενότητα)

- `tools/patient-simulator/resources/makehuman/`: **10 επίσημα CC0 core αρχεία** (OBJ, proxy, skeleton, rig weights, BVH animation, eyes/skin). [Core manifest](../tools/patient-simulator/resources/makehuman/imported-manifest.json) · [Supplemental rig/eyes manifest](../tools/patient-simulator/resources/makehuman/supplemental-imported-manifest.json)
- `tools/patient-simulator/resources/quaternius/`: **2 επαληθευμένα CC0 GLB** free character/animation, [manifest](../tools/patient-simulator/resources/quaternius/imported-manifest.json).
- Ο ήδη εγκατεστημένος UMRAM/Bilkent CC0 human-patient GLB παραμένει. Δεν έγινε καμία μίξη των 3D viewers.

## NIH 3D και όρια

Το https://3d.nih.gov/terms **δεν είναι μονολιθική βιβλιοθήκη με καθολική άδεια**. NIH/HRA-origin objects περιλαμβάνονται στην verified HRA συλλογή, ενώ άλλοι ανεξάρτητοι NIH 3D χρήστες/καταχωρίσεις απαιτούν license check ανά model ID και δεν αντιγράφηκαν αδιακρίτως.

**Διαχωρισμός κατάστασης:** Αρχεία στο GitHub και επιτυχημένη εισαγωγή ≠ λειτουργία μέσα στον live 3D viewer ≠ αισθητική reference εικόνων ≠ επιστημονική επικύρωση. Απαιτούνται μοντέλα κοινής κλίμακας, load integration, οπτική και εκπαιδευτική επαλήθευση, QA κινητού και κλινική αξιολόγηση.
