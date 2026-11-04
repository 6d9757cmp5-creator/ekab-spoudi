#!/usr/bin/env node
// Deterministic content regression guard for SAEK 16 chapters 9 and 10.
// It checks that previously reviewed educational statements remain present.
// PASS is NOT proof of medical correctness, clinical certification, or Greek EMS authorization.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const html=readFileSync(new URL('../saek-course-16.html',import.meta.url),'utf8');
const chapters=[...html.matchAll(/<details class="fold reader-fold" id="lesson-(\d+)">/g)];
assert.equal(chapters.length,13,'Expected 13 chapters in SAEK 16');

function lesson(n){
  const matches=chapters.filter(m=>Number(m[1])===n);
  assert.equal(matches.length,1,`Expected exactly one lesson-${n}`);
  const selected=matches[0],idx=chapters.indexOf(selected);
  return html.slice(selected.index,idx+1<chapters.length?chapters[idx+1].index:html.length);
}

const adultBls=lesson(7);
assert.match(adultBls,/Ανακοπή: αναγνώριση και ενεργοποίηση/);
assert.match(adultBls,/πλήρη επαναφορά του θώρακα/);
assert.match(adultBls,/χωρίς υπερβολικό αερισμό/);
assert.match(adultBls,/κανείς δεν αγγίζει τον ασθενή κατά την ανάλυση του ρυθμού ή την εκφόρτιση/);
// Distinguish shock advised from no-shock: restarting before a recommended shock is unsafe.
assert.match(adultBls,/Αν υποδειχθεί εκφόρτιση, ο AED την παρέχει αυτόματα ή ζητά να πατηθεί το κουμπί/);
assert.match(adultBls,/μόλις πραγματοποιηθεί η εκφόρτιση, ξεκίνα ξανά αμέσως θωρακικές συμπιέσεις/);
assert.match(adultBls,/Αν δεν υποδειχθεί εκφόρτιση, ξεκίνα αμέσως ξανά συμπιέσεις/);
assert.doesNotMatch(adultBls,/συμπιέσεις μετά την ανάλυση, είτε υποδείχθηκε εκφόρτιση είτε όχι/);
assert.match(adultBls,/ERC\/RCUK 2025 ενθαρρύνουν οποιονδήποτε παρευρισκόμενο να χρησιμοποιήσει τον AED/);
assert.match(adultBls,/Υ4α\/οικ\.15576\/2007 αφορά την οργάνωση της ΚΑΑ στα νοσοκομεία/);
assert.match(adultBls,/εγκύκλιος 22\.8\.2007 ρυθμίζει τη χρήση ΑΕΑ σε δημόσιους χώρους/);
assert.match(adultBls,/καλόπιστη άμεση βοήθεια, ακόμη και από μη εκπαιδευμένο άτομο/);
assert.match(adultBls,/Y4-15576_07\.1452763919875\.pdf/);
assert.match(adultBls,/2025-resuscitation-guidelines\/adult-basic-life-support-guidelines/);

const anaphylaxis=lesson(9);
assert.match(anaphylaxis,/Σενάριο σοβαρής αλλεργίας/);
assert.match(anaphylaxis,/η ενδομυϊκή αδρεναλίνη είναι θεραπεία πρώτης γραμμής/i);
assert.match(anaphylaxis,/από τον ίδιο τον ασθενή ή κατάλληλα εκπαιδευμένο πρόσωπο/);
assert.match(anaphylaxis,/δεν αποτελεί οδηγία αυτόνομης φαρμακευτικής χορήγησης/);
assert.match(anaphylaxis,/2025-resuscitation-guidelines\/first-aid-guidelines/);
assert.match(anaphylaxis,/μπορεί να καθίσει με τα πόδια τεντωμένα/);
assert.match(anaphylaxis,/δυσκολία αναπνοής χωρίς σημεία κυκλοφορικής αστάθειας/);
assert.match(anaphylaxis,/Δεν πρέπει να σηκώνεται όρθιος ή να βαδίζει/);
assert.match(anaphylaxis,/ΠΔ 62\/2007 \(άρθρο 4, σημείο 20\)/);
assert.match(anaphylaxis,/απευθείας εντολή ιατρού Κινητής Ιατρικής Μονάδας ή Συντονιστικού Κέντρου ΕΚΑΒ/);
assert.match(anaphylaxis,/δεν ισοδυναμούν με υπηρεσιακή εξουσιοδότηση για αυτόνομη φαρμακευτική χορήγηση/);
assert.match(anaphylaxis,/ΦΕΚ Α΄70 · άρθρα 4–5/);


const seizures=lesson(10);
assert.match(seizures,/Σενάριο κρίσης και μετακριτικής σύγχυσης/);
assert.match(seizures,/Γενικευμένη σπασμωδική κρίση που διαρκεί 5 λεπτά ή περισσότερο/);
assert.match(seizures,/επαναλαμβανόμενες κρίσεις χωρίς ανάκτηση συνείδησης/);
assert.match(seizures,/εγκεκριμένο πρωτόκολλο και πραγματοποιείται από εξουσιοδοτημένο\/εκπαιδευμένο προσωπικό/);
assert.match(seizures,/nice\.org\.uk\/guidance\/ng217\/chapter\/7-Treating-status-epilepticus/);
assert.match(seizures,/πάνω από 2 λεπτά περισσότερο από τη συνήθη διάρκεια του ατόμου/);
assert.match(seizures,/τουλάχιστον 3 αυτοπεριοριζόμενες κρίσεις σε 24 ώρες/);
assert.match(seizures,/όταν είναι αξιόπιστα γνωστή η συνήθης διάρκεια κρίσης/);
assert.match(seizures,/αν δεν είναι γνωστή, δεν αναβάλλεται η επείγουσα εκτίμηση/);

console.log('PASS: SAEK 16 lessons 7/9/10 retain defined safety wording, scope boundaries and source links.');
console.log('NOT CLINICAL CERTIFICATION: wording must still be reviewed by qualified professionals.');
