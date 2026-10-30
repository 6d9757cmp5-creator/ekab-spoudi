# MENTOR OS — Ένας κεντρικός φάκελος στο GitHub

Ο MENTOR OS έχει **μία οργανωμένη βάση κώδικα**: τον φάκελο `mentor/`.

```text
mentor/
├── app/                 Όλες οι κύριες λειτουργίες και εκπαιδευτικές οθόνες
│   ├── home.js          Εμφάνιση στην αρχική της εφαρμογής
│   ├── lab.js           Κεντρικό εργαστήριο
│   ├── adaptive.js      Προσαρμοστικός εκπαιδευτής
│   ├── personal-v1.js   Προσωπικός εκπαιδευτής
│   ├── live.js          Αποστολές
│   ├── ecg.js           ECG
│   ├── oral.js          Προφορικές εξετάσεις
│   ├── library.js       Βιβλιοθήκη
│   ├── readonly.js      Ανάγνωση παλαιάς προόδου
│   └── scenarios.js     Άτλας περιστατικών
├── avatar/              3D μοντέλο, κινήσεις, πρόσωπο, cinematic και renderer
├── assets/              3D GLB και εικόνες
├── voice/               Ελληνική ομιλία
├── styles/              Εμφάνιση και responsive layout
├── core/                Εκπαιδευτικοί μηχανισμοί και δοκιμές
├── library/             Δημόσιες βιβλιογραφικές πηγές
├── real-avatar/         Αρχικό υλικό κατασκευής 3D
└── scenario-atlas/      Εγκυκλοπαίδεια εκπαιδευτικών περιστατικών
```

## Γιατί υπάρχουν ακόμα αρχεία `mentor-*` στη ρίζα;

Η εφαρμογή λειτουργεί μέσω **GitHub Pages** και έχει ήδη δημόσιες διευθύνσεις, π.χ. `/mentor-lab.html`, `/mentor-live.html`, `/mentor-oral.html`. Τα αρχεία HTML **μένουν ως δημόσιες είσοδοι**, επειδή η μεταφορά τους θα άλλαζε τα URLs. Δεν είναι δεύτερος Mentor.

Οι παλιές διευθύνσεις αρχείων ES module `/mentor-lab.js`, `/mentor-home.js`, `/mentor-voice.mjs`, κ.ά. αποτελούν πλέον **μικρές γέφυρες** (`import` / `export *`) που κατευθύνουν στο `mentor/`. Έτσι, τρίτοι σύνδεσμοι/παλιές μνήμες cache εξακολουθούν να λειτουργούν.

Οι δύο παλιοί **classic scripts** `mentor-adaptive.js` και `mentor-personal-v1.js` παραμένουν ως παλαιά συμβατά αρχεία, επειδή η μετατροπή τους σε ασύγχρονα wrappers μπορεί να σπάσει το `defer`/CommonJS. **Το κανονικό εργαστήριο φορτώνει τις κεντρικές εκδόσεις** `mentor/app/adaptive.js` και `mentor/app/personal-v1.js`.

Αντίστοιχα, τα παλιά root CSS και `assets/mentor-*` είναι fallback για παλαιές δημοσιεύσεις. Τα ενεργά styles είναι πλέον `mentor/styles/`, το πλήρες 3D bundle `mentor/avatar/real3d.bundle.mjs` και το GLB `mentor/assets/mentor-real-3d.glb`. Η αντιγραφή του μεγάλου GLB επαναχρησιμοποιεί το **ίδιο Git blob**, χωρίς επανασυμπίεση/αλλοίωση.

## Ασφάλεια και κανόνες συγχώνευσης

- Δεν αλλάζει καμία επίσημη βαθμολογία, σημείωση, δεδομένα ΣΑΕΚ/ΕΟΠΠΕΠ ή cloud sync.
- Δεν γίνεται νέα σύνδεση AI, διάγνωση ή εισαγωγή ανέλεγκτου κλινικού περιεχομένου.
- Η μορφή, ο ήχος και οι επιλογές χρήστη διατηρούνται από τον ίδιο υπάρχοντα κώδικα.
- Προβλέπονται έλεγχοι για όλες τις νέες εισαγωγές, τους παλιούς συνδέσμους, τα styles και τις 3D εικόνες.
- Οι απαιτήσεις `AGENTS.md` και η επιστημονική έγκριση **δεν** αίρονται από αυτό το καθαρά δομικό refactor.

**Στάδιο:** έτοιμη δομική αλλαγή σε απομονωμένο PR για browser QA, **όχι ακόμη στο main**. Η μετάβαση σε παραγωγή θα γίνει μόνο αφού ολοκληρωθούν οι προβλεπόμενοι έλεγχοι.

## MENTOR Live Companion (V3)

Ένας κοινός, κινητός MENTOR σε όλες τις σελίδες μελέτης (μία γραμμή `<script type="module" src="mentor/presence/presence.mjs">` ανά σελίδα). Η αρχική και το εργαστήριο έχουν δικό τους MENTOR και παραλείπονται.

| Μονάδα | Ρόλος |
| --- | --- |
| `presence/presence-state.mjs`, `presence.mjs`, `presence.css` | Μετακίνηση, resize, καρφίτσωμα, προσάρτηση, ελαχιστοποίηση, απόκρυψη, αποθήκευση ανά desktop/κινητό |
| `presence/voice.mjs` | Ελληνική φωνή (ανδρική όπου υπάρχει), μικρόφωνο **μόνο μετά από πάτημα**, barge-in· το σχήμα στόματος είναι εκτίμηση, **όχι** phoneme lip-sync |
| `presence/memory.mjs` | Συνομιλία στο `sessionStorage` (μόνο αυτή η καρτέλα, διαγράφεται), προτιμήσεις επιπέδου/φωνής στο `localStorage` |
| `presence/navigate.mjs` | Πρόταση συνδέσμου από σταθερή λίστα σελίδων· ο MENTOR δεν πλοηγεί μόνος του |
| `context/bridge.mjs` | Μόνο τίτλος, πρώτη επικεφαλίδα, path και ρητά επιλεγμένο κείμενο· σιγή σε σελίδες εξέτασης |
| `knowledge/retrieve.mjs` | Ανάκτηση παραθεμάτων από `medical-terms.json` + φραγή δοσολογιών/διαγνώσεων/πραγματικού περιστατικού |
| `ai/client.mjs`, `ai/config.mjs` | Προσαρμογέας AI. **Απενεργοποιημένος**: `endpoint` κενό, καμία αποστολή δεδομένων |
| `workers/mentor-chat/` | Cloudflare Worker (Workers AI) με allowlist, όρια, μόνο τεκμηριωμένες απαντήσεις· ανενεργός μέχρι ανθρώπινη ενεργοποίηση (βλ. README του) |

Η σύνδεση AI **δεν** έχει ενεργοποιηθεί. Ο προηγούμενος κανόνας «χωρίς νέα σύνδεση AI» ισχύει έως ότου ο ιδιοκτήτης αναπτύξει τον Worker, επιβεβαιώσει δωρεάν πλάνο και ορίσει το `endpoint`.

Έλεγχοι: `node --test mentor/presence/*.test.mjs mentor/context/*.test.mjs mentor/knowledge/*.test.mjs mentor/ai/*.test.mjs workers/mentor-chat/*.test.mjs` και `node scripts/verify-mentor-presence-browser.mjs`. Δεν έχει δοκιμαστεί σε πραγματικό iPhone/Safari.

## 3D μοντέλο (MENTOR)

Το `mentor-real-3d.glb` (δύο πανομοιότυπα αντίγραφα: `mentor/assets/` και `assets/`) είναι το **Medical_Female_03** της Microsoft Rocketbox (άδεια MIT) — προέλευση, άδεια και βήματα μετατροπής στα `mentor/assets/AVATAR-PROVENANCE.md`, `mentor/assets/LICENSE-Microsoft-Rocketbox.md` και `scripts/avatar-female03/`. Έχει 80 οστά και 67 morph targets (15 visemes + 52 ARKit), δεν έχει animation clips: η στάση, η αναπνοή, οι εκφράσεις και οι χειρονομίες των χεριών οδηγούνται από το `mentor/real-avatar/entry.mjs`. Το bundle `mentor/avatar/real3d.bundle.mjs` ξαναχτίζεται με `esbuild mentor/real-avatar/entry.mjs --bundle --format=esm --minify --outfile=mentor/avatar/real3d.bundle.mjs`. Το widget φορτώνει την προβολή «bust» (`mentor-presence.html?view=bust`).

Η μπλε στολή **δεν** είναι επίσημη στολή ΕΚΑΒ και ο MENTOR δεν είναι επίσημος εκπρόσωπος του ΕΚΑΒ ούτε αδειούχος ιατρός. Το στόμα οδηγείται από τα γράμματα του κειμένου και τα word boundaries της φωνής συσκευής — **όχι** από τον ήχο· δεν είναι ακριβές lip-sync.

Μέτρηση (Edge, πραγματική GPU Intel Iris 540, desktop): ≈60 fps, JS heap ≈57 MB, έτοιμο ≈2 s. Δεν έχει μετρηθεί σε τηλέφωνο, iPhone ή Safari.
