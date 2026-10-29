# MENTOR OS — Γνώσεις χωρίς AI: πρώτη πραγματική ελληνική βιβλιοθήκη

**2026-10-29 · Κατάσταση: δοκιμαστικό περιεχόμενο — ανθρωπινός κλινικός έλεγχος εκκρεμεί**

## Τι προστέθηκε πρακτικά

- **29 νέες πρωτότυπες εκπαιδευτικές κάρτες στα ελληνικά**, με τίτλο, ερμηνεία, ερώτηση ανάκλησης, ενδεικτικό σκεπτικό και πραγματικές πηγές.
- **9 επαληθεύσιμες βιβλιογραφικές αναφορές**. Δεν έγινε νέα αντιγραφή προστατευόμενων συγγραμμάτων. Οι κάρτες είναι πρωτότυπες σύντομες εκπαιδευτικές περιλήψεις που συνδέουν τον μαθητή με τις επίσημες ιστοσελίδες.
- **8 ενότητες:** ασφάλεια/επαγγελματισμός, αρχική εκτίμηση, επικοινωνία, θεωρία αναζωογόνησης, διαλογή, ανατομία/ορολογία, κλινική σκέψη/όρια ρόλου, μεθοδολογία μάθησης.
- **Ενεργή νέα καρτέλα «Γνώσεις»** στον Mentor, με αναζήτηση, φίλτρο ενότητας, ελληνικό εκπαιδευτικό κείμενο, αναδιπλούμενη ερώτηση αυτοελέγχου και συνδέσμους πηγών.
- **Υπάρχων βοηθητικός Mentor:** αντιστοίχιση ελληνικών όρων σε συγκεκριμένη κάρτα. Π.χ. «Τι σημαίνει ABCDE;» παράγει την αντίστοιχη έτοιμη ελληνική εξήγηση με παραπομπές· «Δώσε μου άσκηση BLS» παράγει ερώτηση ανάκλησης από την επιλεγμένη κάρτα. **Καμία παραγωγική AI**.
- **Ασφάλεια:** πραγματικά επείγοντα ή αιτήματα οδηγιών χορήγησης φαρμάκων/επεμβατικών πράξεων δεν παίρνουν κλινικές εντολές. Το σύστημα περιορίζεται σε γενική υπόδειξη άμεσης επικοινωνίας με τις αρμόδιες υπηρεσίες.
- **Η πρόοδος, η βαθμολόγηση και τα κλειδιά του παλιού sync παραμένουν αμετάβλητα**. Οι νέες αναζητήσεις δεν αποθηκεύονται, δεν συλλέγονται ούτε στέλνονται σε server.

## Πηγές — άμεσοι σύνδεσμοι, όχι αντιγραμμένα ξένα βιβλία

1. WisTech Open Emergency Medical Responder (2025): https://wtcs.pressbooks.pub/emergencymedtech/
2. WisTech EMR Chapter 2, Communication: https://wtcs.pressbooks.pub/emergencymedtech/chapter/preparatory-part-02/
3. WisTech EMR Chapter 3, Medical Terminology: https://wtcs.pressbooks.pub/emergencymedtech/chapter/chapter-4-medical-terminology-2-4/
4. WHO Basic Emergency Care overview: https://www.who.int/teams/integrated-health-services/clinical-services-and-systems/emergency-and-critical-care/bec
5. WHO Interagency Integrated Triage Tool overview: https://www.who.int/tools/triage
6. European Resuscitation Council Guidelines 2025: https://www.erc.edu/science-research/guidelines/guidelines-2025
7. European Resuscitation Council Chain of Survival (2025): https://www.erc.edu/for-everyone/learn-cpr/chain-of-survival/
8. Society for Academic Emergency Medicine CDEM Curriculum: https://www.saem.org/about-saem/academies-interest-groups-affiliates2/cdem/for-students/online-education
9. US National EMS Education Standards (2021, updated Feb 2025): https://www.ems.gov/assets/EMS_Education_Standards_2021_Updated2_24_25forEO.pdf

Οι τίτλοι και παραπομπές παραμένουν ιδιοκτησία των αντίστοιχων πηγών. Η τεκμηρίωση αδειών/όρων, όπου απαιτείται, αφορά τυχόν μελλοντική εισαγωγή πλήρων ξένων κειμένων, εικόνων, αλγορίθμων ή RAG. **Οι παρούσες εκπαιδευτικές κάρτες περιέχουν πρωτότυπη ελληνική διατύπωση.**

## Πεδία επιμέλειας και εκκρεμότητες

Οι κάρτες αποθηκεύονται ως πηγαίο κείμενο στο `mentor/knowledge/foundation-pack.mjs`, με `id`, `domain`, `title`, `aliases`, `explanation`, `recall_question`, `recall_guide`, `source_ids`, `created_at`, `reviewed_at:null`, `status:draft-historical-clinical-review-pending`, `clinical_instructions:false`, `medical_decision_support:false`. Ο κατάλογος πηγών περιέχει τον αληθινό URL/εκδότη/περιορισμούς.

- **Κλινική ποιότητα:** καμία κάρτα δεν έχει λάβει ανεξάρτητη ανθρώπινη έγκριση. Η αυτοματοποιημένη σύνδεση με επίσημη πηγή δεν επαληθεύει αυτομάτως κάθε περιγραφή.
- **Επικαιρότητα:** οι ERC Guidelines 2025 υπερισχύουν παλαιότερων γενικών εγχειριδίων για την ευρωπαϊκή αναζωογόνηση, αλλά **δεν** μετατρέπονται αυτομάτως σε ισχύον ελληνικό τοπικό πρωτόκολλο.
- **Διαλογή:** το WHO IITT αφορά κυρίως `facility-based` διαλογή, όχι επαλήθευση επίσημου πρωτοκόλλου ΕΚΑΒ Ελλάδας.
- **Αρμοδιότητες:** τα αμερικανικά EMS.gov, WisTech EMR και CDEM δεν πιστοποιούν νόμιμες επαγγελματικές αρμοδιότητες Έλληνα διασώστη.
- **Μηχανισμός:** λέξεις-κλειδιά και ορισμένες ελληνικές παραλλαγές, όχι γλωσσική κατανόηση AI. Αν δεν αναγνωρίσει έννοια, δεν εφευρίσκει πηγή.

## Τεχνικός έλεγχος

- `node --test mentor/knowledge/*.test.mjs`
- `node --check mentor/knowledge/search.mjs`
- `node --check mentor-lab.js`
- GitHub Actions: `Mentor Greek knowledge pack — sources and safety`.
- Mobile browser smoke: έλεγχοι σε Chromium + WebKit για καρτέλα γνώσης, πηγές, αποφυγή αδικαιολόγητης ιατρικής καθοδήγησης, διατήρηση βαθμολογίας.

**ΜΗΝ συγχωνεύσετε το PR πριν από κλινικό review, ελληνική ορολογική επιμέλεια και πραγματικό QA κινητού.** Η κανονική εφαρμογή και ο υφιστάμενος AI grader δεν αλλάζουν από αυτό το branch.
