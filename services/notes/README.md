# Προσωπικές σημειώσεις — μία κοινή υπηρεσία
Canonical: `notes-store.js`, `notes-delete.js`, `notes-position.js` στον παρόντα κατάλογο. Τα αντίστοιχα παλιά root files είναι ακριβή **ES module re-exports**, για να λειτουργούν χωρίς αλλαγή τα `notes-panel.js`, `notes-delete.js`, `sync-model.js` tests.
Ο μεγάλος UI controller `/notes-panel.js` μένει στη ρίζα μέχρι να ελεγχθούν όλα τα relative URLs των αρχείων ύλης του. Δεν υπάρχει δεύτερη αποθήκευση.
Κλειδιά: `ekab.personal-notes.v1` και οι υπάρχουσες τοπικές ρυθμίσεις θέσης· δεν μετονομάζονται. Οι προσωπικές σημειώσεις δεν γίνονται δημόσιο εκπαιδευτικό περιεχόμενο.
Δοκιμές: `node scripts/verify-notes-panel.mjs`, `node scripts/verify-notes-position.mjs`, `node scripts/verify-service-boundaries.mjs`.
