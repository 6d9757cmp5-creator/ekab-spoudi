# Πρόοδος και προγραμματισμός μελέτης
Ενεργή υλοποίηση: `/progress.js`, `/home-progress-panel.js`, `/activity-time.js`, `/study-resume.js`, `/study-scheduler.js`. Τα αρχεία αυτά είναι κλασικά scripts ή έχουν root navigation assumptions· μένουν εκεί για συμβατότητα με bookmarks, IndexedDB backups και τοπικά `ekab.*` κλειδιά.
Ο `study-planner` χρησιμοποιεί αυτήν την κοινή υπηρεσία — **όχι** δεύτερο πρόγραμμα επαναλήψεων.
Πριν από κάθε μελλοντική μεταφορά: test old/new progress snapshot, monotonic activity counters, restore rollback, browser offline + across-device merge.
