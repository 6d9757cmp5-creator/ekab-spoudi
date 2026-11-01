# ΕΚΑΒ Σπουδή — ανεξάρτητα εργαλεία

Η κεντρική εφαρμογή και τα δημόσια HTML entrypoints παραμένουν **στη ρίζα** ώστε να μη σπάσουν οι σύνδεσμοι GitHub Pages.

| Εργαλείο | Φάκελος ιδιοκτησίας | Ενεργές θέσεις |
|---|---|---|
| Προσομοιωτής Ασθενών | [patient-simulator](patient-simulator/) | Canonical app, core, tests, 3D assets όλα μέσα σε αυτόν |
| MENTOR OS | [mentor-os](mentor-os/) | Υφιστάμενος ενεργός φάκελος mentor/ για compatibility |
| Ελληνικά Πρωτόκολλα | [protocol-lab](protocol-lab/) | protocols.html, mentor-protocol-suite.html |
| ΣΑΕΚ | [saek-study](saek-study/) | saek.html και σελίδες μαθημάτων |
| ΕΟΠΠΕΠ | [eoppep-exams](eoppep-exams/) | eoppep.html, written_exam.html |
| Κοινή εφαρμογή | [shared](shared/) | index.html, navigation.js, app.js, sw.js |

**Κανόνας ανάπτυξης:** Κάθε καινούργιος κώδικας/asset ανήκει σε ένα εργαλείο. Το MENTOR OS παρέχει καθοδήγηση, ο Προσομοιωτής Ασθενών διαχειρίζεται τους ασθενείς και τη σκηνή. Συνδέονται μέσω του event mentor:context, όχι αντιγράφοντας κώδικα. Οι άλλες root λειτουργίες δεν μετακινούνται χωρίς ξεχωριστή έγκυρη δοκιμή και wrappers. Δες τα README κάθε φακέλου.
