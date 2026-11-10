# Cloud Sync — κοινή υπηρεσία, όχι δεύτερος λογαριασμός
Canonical module helpers: `sync-model.js`, `sync-local.js`, `sync-codec.js` σε αυτόν τον κατάλογο. Root modules υπάρχουν μόνο ως σταθερά re-exports.
Το `/cloud-sync.js` παραμένει ο μοναδικός ενεργός Appwrite orchestrator, γιατί η μετακίνησή του αλλάζει και σχετικές διαδρομές SDK, OAuth και transport. Τα `appwrite-client.js`, `account-ui.js`, `auth-callback.js`, `oauth-return.js` παραμένουν root. Η διεπαφή και τα cloud file IDs δεν αλλάζουν.
**Μη** μεταφέρεις user session tokens στο repository ούτε να αλλάζεις σιωπηρά IndexedDB names, εκδόσεις schema, Appwrite permissions, αποθετήρια cloud ή storage keys.
Δοκιμές: `node scripts/verify-sync.mjs`, `node scripts/verify-sync-codec.mjs`, `node scripts/verify-service-boundaries.mjs`.
