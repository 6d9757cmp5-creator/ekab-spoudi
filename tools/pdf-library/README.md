# Βιβλιοθήκη PDF — ανεξάρτητο εργαλείο

**Canonical code:** `tools/pdf-library/app/pdf-library.js`. Δημόσια είσοδος: `/pdf-library.html` παραμένει στην κεντρική εφαρμογή. Το παλιό `/pdf-library.js` παραμένει ένα ελάχιστο compatibility loader για τυχόν παλιές HTML αναφορές. **Δεν υπάρχουν δύο διαφορετικές υλοποιήσεις του PDF reader.**

**Δεδομένα αμετάβλητα:** Η υπάρχουσα IndexedDB `ekab-personal-pdf-v1`, object store `documents`, τα UUID και όλα τα προσωπικά αποθηκευμένα PDF παραμένουν στην ίδια προέλευση/browser. Δεν απαιτείται διαγραφή ούτε εκ νέου εισαγωγή.

**Security:** στις 2026-11-01 εντοπίστηκε ιστορική έκδοση PDF.js 3.11.174, ευάλωτη στο [CVE-2024-4367](https://github.com/mozilla/pdf.js/security/advisories/GHSA-wgrm-67xf-hhpq), όταν χρησιμοποιείται με `isEvalSupported:true` (default). Αντικαταστάθηκε ο προβολέας με pinned Mozilla PDF.js **6.4.299** ESM `pdf.min.mjs` και το αντίστοιχο `pdf.worker.min.mjs` (cdnjs), με `isEvalSupported:false`. Δεν φορτώνονται remote PDF από αυθαίρετη διεύθυνση, μόνο τα αποθηκευμένα προσωπικά Blob URLs.

**Ανοιχτό:** ο νέος PDF.js renderer φορτώνεται από CDN στην πρώτη ανάγνωση και **δεν προσφέρεται εγγυημένη προβολή εκτός σύνδεσης**. Χρειάζεται vendoring με integrity checks, έλεγχος iPhone Safari, χειρισμός accessibility, διαχείριση malicious PDF και e2e test ανάγνωσης πραγματικού μικρού PDF. Δεν δηλώνουμε πλήρη πιστοποίηση ασφαλείας.

Τεχνική επαλήθευση: `node scripts/verify-pdf-library-boundaries.mjs`, `node scripts/verify-static-pages.mjs`.
