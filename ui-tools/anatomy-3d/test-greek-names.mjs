import assert from 'node:assert/strict';
import {anatomicalGreek,anatomyName,eligibleQuizName} from './greek-names.js';
const samples={
 'Left sixth rib':'Αριστερή 6η πλευρά',
 'Right seventh rib':'Δεξιά 7η πλευρά',
 'Gingiva of upper jaw':'Ούλα άνω γνάθου',
 'Gingiva of lower jaw':'Ούλα κάτω γνάθου',
 'Left femur':'Αριστερό μηριαίο οστό',
 'Right tibia':'Δεξιά κνήμη',
 'Left lower first secondary molar tooth':'Αριστερός κάτω 1ος μόνιμος γομφίος',
 'Right upper first primary incisor tooth':'Δεξιός άνω 1ος νεογιλός τομέας',
 'Heart':'Καρδιά',
 'Right kidney':'Δεξιός νεφρός',
 'Left ovary':'Αριστερή ωοθήκη',
 'Trachea':'Τραχεία'
};
for(const [en,el] of Object.entries(samples))assert.equal(anatomicalGreek(en),el,en);
assert.equal(anatomicalGreek('Left sixth rib cartilage'),null,'Never drop anatomical qualifiers');
assert.equal(anatomicalGreek('Left lower first secondary molar tooth (test suffix)'),null,'Never discard unknown parenthetical qualifiers');
assert.equal(anatomicalGreek('Unexpected highly specific structure'),null,'Unknown terms must not be invented');
assert.equal(anatomicalGreek('Right internal iliac vein'),'Δεξιά έσω λαγόνια φλέβα');
assert.equal(anatomicalGreek('Left lacrimal gland'),'Αριστερός δακρυϊκός αδένας');
assert.equal(anatomicalGreek('Left cornea'),'Αριστερός κερατοειδής χιτώνας');
assert.equal(anatomicalGreek('Right iris'),'Δεξιά ίριδα');
assert.equal(anatomicalGreek('Left renal papilla'),'Αριστερή νεφρική θηλή');
assert.equal(anatomicalGreek('Left nipple'),'Αριστερή θηλή μαστού');
assert.equal(anatomicalGreek('Anterior interventricular vein'),'Πρόσθια μεσοκοιλιακή φλέβα');
assert.equal(anatomicalGreek('Middle part of jejunum'),'Μέσο τμήμα της νήστιδας');
assert.equal(anatomicalGreek('Minor calyx'),'Ελάσσων νεφρικός κάλυκας');


// Exact audit-observed anatomy labels: editorial mappings awaiting independent medical review.
const expandedSamples={
  "Left lower central secondary incisor tooth": "Αριστερός κάτω κεντρικός μόνιμος τομέας",
  "Right upper lateral secondary incisor tooth": "Δεξιός άνω πλάγιος μόνιμος τομέας",
  "Left lower secondary canine tooth": "Αριστερός κάτω μόνιμος κυνόδοντας",
  "Anterior chamber of left eyeball": "Πρόσθιος θάλαμος του αριστερού οφθαλμικού βολβού",
  "Left optic nerve": "Αριστερό οπτικό νεύρο",
  "Right optic nerve": "Δεξιό οπτικό νεύρο",
  "Left levator palpebrae superioris": "Αριστερός ανελκτήρας του άνω βλεφάρου",
  "Left lacrimal sac": "Αριστερός δακρυϊκός ασκός",
  "Right bulbar conjunctiva": "Δεξιός βολβικός επιπεφυκότας",
  "Palpebral conjunctiva of right upper eyelid": "Βλεφαρικός επιπεφυκότας του δεξιού άνω βλεφάρου",
  "Suspensory ligament of left lens": "Κρεμαστήριος σύνδεσμος του αριστερού φακού",
  "Interlobar adipose tissue of left mammary gland": "Μεσολόβιος λιπώδης ιστός του αριστερού μαστικού αδένα",
  "Head of caudate (left)": "Αριστερή κεφαλή του κερκοφόρου πυρήνα",
  "Body of caudate (right)": "Δεξιό σώμα του κερκοφόρου πυρήνα",
  "Tail of caudate (left)": "Αριστερή ουρά του κερκοφόρου πυρήνα",
  "Nucleus accumbens (left)": "Αριστερός επικλινής πυρήνας",
  "External segment of globus pallidus (left)": "Αριστερή έξω μοίρα της ωχράς σφαίρας",
  "Left posterior inferior cerebellar artery": "Αριστερή οπίσθια κάτω παρεγκεφαλιδική αρτηρία",
  "Right superior segmental bronchial tree": "Δεξιό άνω τμηματικό βρογχικό δέντρο",
  "Left posterior basal segmental vein": "Αριστερή οπίσθια βασική τμηματική φλέβα",
  "Right lateral basal segmental artery": "Δεξιά έξω βασική τμηματική αρτηρία",
  "Circumflex branch of left coronary artery": "Περισπώμενος κλάδος της αριστερής στεφανιαίας αρτηρίας",
  "Anterior division of right renal artery": "Πρόσθια μοίρα της δεξιάς νεφρικής αρτηρίας",
  "Artery of left precentral sulcus": "Αρτηρία της αριστερής προκεντρικής αύλακας",
  "External anal sphincter": "Έξω σφιγκτήρας του πρωκτού"
};
for(const [en,el] of Object.entries(expandedSamples))assert.equal(anatomicalGreek(en),el,en);
assert.equal(anatomicalGreek('Head of caudate (unknown)'),null,'Unrecognized parentheses must not be dropped');
assert.equal(anatomicalGreek('Left head of caudate (right)'),null,'Conflicting sides must not be accepted');

assert.deepEqual(anatomyName('Untranslated source mesh','skeletal',{skeletal:'Σκελετικό'}),{
 el:null,english:'Untranslated source mesh',label:'Μη μεταφρασμένη δομή',systemName:'Σκελετικό'
});
assert.equal(anatomyName('Gingiva of upper jaw','skeletal',{skeletal:'Σκελετικό'}).systemName,'Στοματική ανατομία');
assert.equal(eligibleQuizName('Left sixth rib','skeletal'),false,'Tiny rib details are not good entry-level targets');
assert.equal(eligibleQuizName('Gingiva of upper jaw','skeletal'),false,'Gums are not a practical 3D target');
assert.equal(eligibleQuizName('Unexpected highly specific structure','skeletal'),false);
assert.equal(eligibleQuizName('Right kidney','urinary'),true);
assert.equal(eligibleQuizName('Left femur','skeletal'),true);
assert.equal(eligibleQuizName('Left ovary','integumentary'),false);
console.log('PASS Greek-first anatomy terms, precise side/number mapping and verified-only quiz pool');
