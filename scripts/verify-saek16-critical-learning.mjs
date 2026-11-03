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

const anaphylaxis=lesson(9);
assert.match(anaphylaxis,/Σενάριο σοβαρής αλλεργίας/);
assert.match(anaphylaxis,/η ενδομυϊκή αδρεναλίνη είναι θεραπεία πρώτης γραμμής/i);
assert.match(anaphylaxis,/από τον ίδιο τον ασθενή ή κατάλληλα εκπαιδευμένο πρόσωπο/);
assert.match(anaphylaxis,/δεν αποτελεί οδηγία αυτόνομης φαρμακευτικής χορήγησης/);
assert.match(anaphylaxis,/2025-resuscitation-guidelines\/first-aid-guidelines/);

const seizures=lesson(10);
assert.match(seizures,/Σενάριο κρίσης και μετακριτικής σύγχυσης/);
assert.match(seizures,/Γενικευμένη σπασμωδική κρίση που διαρκεί 5 λεπτά ή περισσότερο/);
assert.match(seizures,/επαναλαμβανόμενες κρίσεις χωρίς ανάκτηση συνείδησης/);
assert.match(seizures,/εγκεκριμένο πρωτόκολλο και πραγματοποιείται από εξουσιοδοτημένο\/εκπαιδευμένο προσωπικό/);
assert.match(seizures,/nice\.org\.uk\/guidance\/ng217\/chapter\/7-Treating-status-epilepticus/);

console.log('PASS: SAEK 16 lessons 9/10 retain defined educational risk boundaries and source links.');
console.log('NOT CLINICAL CERTIFICATION: wording must still be reviewed by qualified professionals.');
