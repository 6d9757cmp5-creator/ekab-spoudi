# ECG Lab — ανεξάρτητη εκπαιδευτική εξάσκηση ΗΚΓ

**Canonical modules:** `tools/ecg-lab/app/` και `tools/ecg-lab/core/`. Η δημόσια διεύθυνση `/mentor-ecg.html` διατηρήθηκε και φορτώνει τα canonical modules. Το `/mentor-ecg.js` παραμένει public compatibility entry. Οι παλιές θέσεις `mentor/app/ecg*.js` και `mentor/core/ecg*.mjs` είναι μικρές γέφυρες προς το ίδιο canonical implementation — **χωρίς δεύτερο ECG engine**.

Ο MENTOR OS μπορεί να δίνει εκπαιδευτική καθοδήγηση μέσω `mentor:context`, αλλά η παραγωγή συνθετικής κυματομορφής, το εξάδευτερο QRS drill, οι δοκιμές και τα τοπικά δεδομένα ανήκουν στο ECG Lab.

**Σημαντικό:** Ο κυματομορφικός generator είναι σχηματική μαθηματική άσκηση — όχι πραγματικό ιατρικό ΗΚΓ, όχι διάγνωση, όχι επικυρωμένη κλινική αξιολόγηση.

**Δοκιμές:** `node --test tools/ecg-lab/core/*.test.mjs` και browser smoke.
