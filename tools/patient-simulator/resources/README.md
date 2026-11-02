# ATLA Clinical Cockpit — εισαγμένοι πόροι 3D ασθενών

**Χωριστό εργαλείο από τη 3D Ανατομία.** Δεν συγχωνεύτηκαν οι μηχανές 3D ή τα περιβάλλοντα.

## Επαληθευμένη εισαγωγή στο GitHub

- `resources/makehuman/base.obj` και `base.mhclo`: τα δύο **πρωτότυπα επίσημα core MakeHuman CC0** αρχεία, σε pinned upstream commit, με `LICENSE-CC0.ASSETS.md` και `imported-manifest.json`. Πρόκειται για **άκαμπτη πηγή γεωμετρίας, όχι έτοιμο rigged patient GLB**.
- `resources/quaternius/night-striker.glb`: **Quaternius Universal Base Characters** free Standard CC0, σε επεξεργασμένη έκδοση από καταγεγραμμένο δημόσιο repository.
- `resources/quaternius/universal-animation-library.glb`: animation library του **Quaternius** free CC0, από την ίδια καταγεγραμμένη πηγή.
- Για τα Quaternius αρχεία υπάρχει `catalog.json`, `imported-manifest.json`, `LICENSE-BASE-CHARACTERS.txt` και `LICENSE-ANIMATIONS.txt`· **δεν** δηλώνεται ότι έχουμε αντιγράψει το επίσημο 122 MB ZIP ή το επί πληρωμή Source kit. Χρειάζεται έλεγχος χαρακτήρα, rig/retargeting και εφαρμογή κλινικής αισθητικής.
- **Ήδη διαθέσιμο:** `../assets/cc0-human-body.glb` από UMRAM-Bilkent supine-human-model, CC0, με notice. Επιπλέον οι προηγούμενοι 3 ασθενείς `../assets/patients/` δεν πειράχτηκαν.

Η εισαγωγή δεν ενεργοποιεί τα νέα μοντέλα αυτόματα στην οθόνη Cockpit. Απαιτούνται rig/animation validation, visual QA, performance και επιστημονική αξιολόγηση.

**Σύνδεση με το Anatomy Lab** γίνεται μόνο μέσω μελλοντικού ATLA context, χωρίς κοινό 3D engine.

Πλήρης αναφορά: `docs/ATLA_FREE_3D_RESOURCE_IMPORT_RESULTS_2026-11-01.md`.

## Επέκταση CC0 Cockpit πόρων (01/11/2026)

Στο επίσημο MakeHuman core υπάρχουν πλέον **10 validated CC0 source files**: `base.obj`, `base.mhclo`, `rigs/default.mhskel`, `rigs/default_weights.mhw`, `animations/walks/walk1.bvh`, `eyes/high-poly/high-poly.obj`, `eyes/high-poly/high-poly.mhclo`, `eyes/materials/brown_eye.png`, `eyes/materials/brown.mhmat`, `skins/default.mhmat`. Διατηρούνται original license notice, source SHA και δύο manifests (core + supplemental). Αυτά είναι πηγές κατασκευής μοντέλου με skeleton/weights, **όχι ήδη στημένο, animation-retargeted 3D patient**.

Τα δύο επαληθευμένα Quaternius CC0 GLBs διατηρούνται στον διαφορετικό υποφάκελο `resources/quaternius/`. Η 3D Ανατομία, ο πλήρης BP3D 4.3 άτλας και οι HRA 54 mesh models διατηρούνται **εκτός** του Cockpit: `tools/anatomy-3d/resources/`. Αναλυτική ακριβής απογραφή: `docs/ATLA_3D_ASSET_INTAKE_VERIFIED.md`.
