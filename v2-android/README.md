# ΕΚΑΒ Σπουδή V2 — Android (staging)

Η native Android εφαρμογή «ΕΚΑΒ Σπουδή V2» είναι ανεξάρτητη από την ήδη δημοσιευμένη web/PWA «ΕΚΑΒ Σπουδή».

**Κατάσταση:** Προετοιμασία GitHub. Το πλήρες ZIP source παραδόθηκε στη συνομιλία, αλλά ΔΕΝ έχει ανέβει ακόμη σε αυτό το branch. Μην εκτελείτε build πριν ανέβουν όλα τα source files.

Για ολοκλήρωση: αποσυμπίεση του ekab-spoudi-v2-github.zip στον φάκελο v2-android του branch, έλεγχος για μυστικά, commit/push, εκτέλεση GitHub Actions, έλεγχος πραγματικού APK.

Ασφάλεια: Δεν τροποποιούμε το main και δεν αντικαθιστούμε την τρέχουσα έκδοση. Για iOS IPA απαιτείται ξεχωριστή εφαρμογή, Xcode, Apple signing και provisioning. Η αλλαγή τίτλου σε V2 δεν αλλάζει το Android applicationId ή Firebase config.
