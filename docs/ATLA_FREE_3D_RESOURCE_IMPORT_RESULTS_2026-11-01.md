# ATLA — Εισαγωγή δωρεάν 3D πόρων, διαχωρισμένη ανά εργαλείο

**Ημερομηνία:** 2026-11-01 · **Έλεγχος:** τα αρχεία και τα καταγεγραμμένα SHA256/Git SHA υπάρχουν στο `main`.

## Μετρήσιμο αποτέλεσμα

- **24 νέα αρχεία μοντέλων / γεωμετρίας / animation**, συνολικά **63.00 MiB**.
- **17 αρχεία MIT κώδικα/αδειών και βοηθητικών εισαγωγής** Open Anatomy Atlas, στον αποκλειστικό φάκελο της 3D Ανατομίας.
- Ο ήδη υπαρκτός **CC0 UMRAM supine human GLB** στο Cockpit διατηρήθηκε, χωρίς περιττή αντιγραφή.
- Στην εφαρμογή **δεν έχει γίνει συγχώνευση** του 3D Anatomy Viewer με το Simulation Cockpit. Τα νέα GLB/OBJ παραμένουν διαθέσιμες *πηγές* για αξιολόγηση. Η ύπαρξη αρχείων δεν αποτελεί αυτόματη ολοκλήρωση της premium εμφάνισης ούτε ανεξάρτητη ιατρική επικύρωση.

## HRA / HuBMAP

**Ενότητα:** `3D Anatomy Lab` · **15 αρχεία** · 39.67 MiB · **Άδεια:** CC BY 4.0.

Prepared for anatomical visualization; not integrated in old canonical viewer.

**Manifest:** [`tools/anatomy-3d/resources/imported-manifest.json`](../tools/anatomy-3d/resources/imported-manifest.json)

- `VH_F_Heart.glb`
- `VH_F_Kidney_L.glb`
- `VH_F_Kidney_R.glb`
- `VH_F_Liver.glb`
- `VH_F_Lung.glb`
- `VH_F_Pancreas.glb`
- `VH_F_Spinal_Cord.glb`
- `VH_F_Uterus.glb`
- `VH_M_Heart.glb`
- `VH_M_Kidney_L.glb`
- `VH_M_Kidney_R.glb`
- `VH_M_Liver.glb`
- `VH_M_Lung.glb`
- `VH_M_Pancreas.glb`
- `VH_M_Spinal_Cord.glb`

## Z-Anatomy research

**Ενότητα:** `3D Anatomy Lab research isolation` · **5 αρχεία** · 12.71 MiB · **Άδεια:** conservative upstream NC-SA.

Not live; nervous.glb and visceral.glb excluded.

**Manifest:** [`tools/anatomy-3d/resources/z-anatomy-research/imported-manifest.json`](../tools/anatomy-3d/resources/z-anatomy-research/imported-manifest.json)

- `cardiovascular.glb`
- `joints.glb`
- `lymphatic.glb`
- `muscular.glb`
- `skeletal.glb`

## MakeHuman core

**Ενότητα:** `Clinical Cockpit source geometry` · **2 αρχεία** · 1.87 MiB · **Άδεια:** CC0 core.

Raw OBJ + MakeHuman proxy; not a rigged patient.

**Manifest:** [`tools/patient-simulator/resources/makehuman/imported-manifest.json`](../tools/patient-simulator/resources/makehuman/imported-manifest.json)

- `base.obj`
- `base.mhclo`

## Quaternius free pack (rehost processing)

**Ενότητα:** `Clinical Cockpit research` · **2 αρχεία** · 8.75 MiB · **Άδεια:** CC0 original notices.

Rigged character and animation GLBs; research-only until rig/visual review.

**Manifest:** [`tools/patient-simulator/resources/quaternius/imported-manifest.json`](../tools/patient-simulator/resources/quaternius/imported-manifest.json)

- `night-striker.glb`
- `universal-animation-library.glb`

## Κώδικας και routing

- **MIT Open Anatomy Atlas upstream:** `tools/anatomy-3d/vendor/open-anatomy-atlas/` (17 files including `LICENSE` and `NOTICE.md`) — `src/data/bp3d43.js`, `src/data/obj.js`, `src/data/zip.js`, `src/data/zanatomy.js`, `tools/fetch-data.js` και τα dependencies. Χρήσιμος για πραγματικό BodyParts3D 4.3/import research, **δεν είναι αυτόματα ενεργός στο live atlas**.
- **Αυτόματες εργασίες εισαγωγής:** `.github/workflows/build-anatomy-resource-pack.yml`, `.github/workflows/import-z-anatomy-research.yml`, `.github/workflows/import-makehuman-core.yml`, `.github/workflows/import-quaternius-cc0.yml`. Κάθε εργασία διασταυρώνει upstream revision/hash/μορφή και αποθηκεύει attribution/manifest στον σωστό φάκελο.
- **Κατάλογοι δικαιωμάτων:** `tools/anatomy-3d/resources/catalog.json` (54 HRA URLs, 15 approved), `tools/anatomy-3d/resources/z-anatomy-catalog.json` (5 allowed, 2 excluded), `tools/patient-simulator/resources/makehuman/catalog.json`, `tools/patient-simulator/resources/quaternius/catalog.json`.

## Τι δεν αντιγράφηκε (σκόπιμα, όχι λανθασμένη δήλωση επιτυχίας)

1. **NIH 3D:** https://3d.nih.gov/terms — δεν υπάρχει καθολική άδεια. Χρειάζεται συγκεκριμένο entry ID και ρητός έλεγχος αρχείου/άδειας, πριν αντιγραφεί. Χωρίς τέτοιο ID απαγορεύεται αυτοματοποιημένη αδιάκριτη αντιγραφή.
2. **Z-Anatomy nervous.glb / visceral.glb:** περιέχουν στοιχεία με CC BY-NC-SA/CC BY-NC (inner ear/kidney) και αναφορές εγκεφαλικών assets χωρίς σαφή άδεια. Τα **5 υπόλοιπα GLB** βρίσκονται σε ερευνητικό φάκελο με τις αυθεντικές άδειες, χωρίς να ενεργοποιούνται στο live Anatomy.
3. **BodyParts3D 4.3 πλήρες dataset:** δεν αντιγράφηκε όλο (πολύ μεγάλο, απαιτεί chunked importer και version/license audit). Εισήχθη ο MIT κώδικας για επίσημη λήψη/επεξεργασία, ενώ στην τρέχουσα εφαρμογή υπάρχουν ήδη BodyParts3D-derived γεωμετρίες. Ελέγχουμε την άδεια της ακριβούς έκδοσης.
4. **Επίσημο ZIP Quaternius / πλήρης εγκατάσταση MakeHuman:** το δωρεάν Quaternius Standard pack διατίθεται από Itch.io (απαιτεί διαδραστικό download 122 MB), και το πλήρες MakeHuman είναι εφαρμογή AGPL. Εδώ εισήχθησαν μόνο επαληθευμένα CC0 ερευνητικά 3D αρχεία από τις καταγεγραμμένες πηγές — **όχι** το επί πληρωμή Source kit ή ο AGPL κώδικας.

## Υποχρεωτικοί επόμενοι τεχνικοί έλεγχοι πριν από ενεργοποίηση στο UI

Κλίμακα, προσανατολισμός, κοινός άξονας, ανατομική ευθυγράμμιση ανά φύλο, πραγματικός έλεγχος FMA/UBERON, όρια RAM/GPU iPhone, LOD/streaming, ύπαρξη rig και animations για ασθενείς, προειδοποιήσεις επιστημονικών κενών, άδεια ανά mesh, 3D screenshots και ανεξάρτητη επιστημονική αποδοχή. Ούτε το αρχείο CC0 από μόνο του ούτε το ερευνητικό Z-Anatomy ονομάζονται **κλινικά εγκεκριμένα**.

