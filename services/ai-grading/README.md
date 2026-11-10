# AI βαθμολόγηση — μία λογική, δύο υπάρχοντα backends
Ενεργό UI: `/ai-grading-client.js` και `/ai-grading-config.js`.
Οι υπάρχουσες **διαφορετικές πλατφόρμες ανάπτυξης** `/functions/answer-grader/` (Appwrite) και `/workers/answer-grader/` (Cloudflare) παραμένουν στη θέση τους: οι σχετικές πλατφόρμες χρειάζονται τα δικά τους entrypoints. Δεν δημιουργούμε τρίτο backend.
Οι rubric, κριτικές ενδείξεις ασφαλείας και οι δοκιμές ανήκουν στα αντίστοιχα deployment packages, όχι στον frontend.
**Ασφάλεια:** server-side auth/rate limiting/budget, καμία αποκάλυψη API keys, διατήρηση κλινικά κρίσιμων σφαλμάτων. Η αυτοματοποιημένη βαθμολόγηση δεν είναι επιστημονικά επικυρωμένη.
