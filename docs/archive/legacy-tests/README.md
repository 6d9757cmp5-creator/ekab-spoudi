# Παρωχημένα UI snapshots — ιστορικό, όχι τρέχον tests

Τα τρία παρακάτω scripts δημιουργήθηκαν για παλαιότερες εκδόσεις του MENTOR (στατικό πορτρέτο, procedural WebGL και παλιά διάταξη). Αφαιρέθηκαν από τα ενεργά tests μετά την επιτυχή επαλήθευση της τρέχουσας απεικόνισης με πραγματικό αρθρωμένο GLB, επειδή οι απαιτήσεις τους αντιφάσκουν με την υφιστάμενη διεπαφή.

- `verify-home-mentor-aed.mjs`: προηγούμενα στιγμιότυπα MENTOR/εικόνας, παλιά metadata και προϋποθέσεις UI.
- `test-mentor-3d.mjs`: παλιό procedural WebGL 3D / εναλλαγή με πορτρέτο.
- `test-mentor-cinematic.mjs`: παλιό στατικό κινηματογραφικό avatar.

Διατηρήθηκαν με **ακριβώς τα ίδια Git blob SHAs**, όχι ως πραγματικά regressions για την τρέχουσα έκδοση. Τρέχουσες εναλλακτικές δοκιμές: `scripts/app-load-smoke.mjs`, `scripts/verify-mentor-browser.mjs`, `scripts/audit-browser-journeys.mjs`, `scripts/test-mentor-voice.mjs`, `scripts/test-mentor-protocols.mjs`.

Δεν τεκμηριώνεται κλινική επάρκεια, ανεξάρτητη ιατρική έγκριση ή λειτουργικότητα όλων των πιθανών συσκευών.
