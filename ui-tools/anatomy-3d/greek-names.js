/**
 * Human-curated display lexicon: EL first. No generative/dictionary guessing.
 * If a name does not match a known whole term or documented pattern, return null
 * and display the original only in the opt-in untranslated inventory.
 * This is a learning aid, not an independently validated Terminologia Anatomica.
 */
const CORE={
 'skull':'Κρανίο','cranium':'Κρανίο','frontal bone':'Μετωπιαίο οστό','parietal bone':'Βρεγματικό οστό',
 'temporal bone':'Κροταφικό οστό','occipital bone':'Ινιακό οστό','sphenoid bone':'Σφηνοειδές οστό',
 'ethmoid bone':'Ηθμοειδές οστό','mandible':'Κάτω γνάθος','maxilla':'Άνω γνάθος','nasal bone':'Ρινικό οστό',
 'zygomatic bone':'Ζυγωματικό οστό','lacrimal bone':'Δακρυϊκό οστό','palatine bone':'Υπερώιο οστό',
 'hyoid bone':'Υοειδές οστό','vomer':'Ύνις','clavicle':'Κλείδα','scapula':'Ωμοπλάτη',
 'sternum':'Στέρνο','manubrium':'Λαβή του στέρνου','xiphoid process':'Ξιφοειδής απόφυση',
 'rib':'Πλευρά','cervical vertebra':'Αυχενικός σπόνδυλος',
 'thoracic vertebra':'Θωρακικός σπόνδυλος','lumbar vertebra':'Οσφυϊκός σπόνδυλος',
 'sacrum':'Ιερό οστό','coccyx':'Κόκκυγας','pelvis':'Πύελος','ilium':'Λαγόνιο οστό',
 'ischium':'Ισχιακό οστό','pubis':'Ηβικό οστό','hip bone':'Ανώνυμο οστό',
 'humerus':'Βραχιόνιο οστό','ulna':'Ωλένη','radius':'Κερκίδα',
 'femur':'Μηριαίο οστό','patella':'Επιγονατίδα','tibia':'Κνήμη','fibula':'Περόνη',
 'calcaneus':'Πτέρνα','talus':'Αστράγαλος','metacarpal bone':'Μετακάρπιο οστό',
 'metatarsal bone':'Μετατάρσιο οστό','carpal bone':'Οστό του καρπού','tarsal bone':'Οστό του ταρσού',
 'brain':'Εγκέφαλος','cerebrum':'Εγκεφαλικά ημισφαίρια','cerebellum':'Παρεγκεφαλίδα',
 'medulla oblongata':'Προμήκης μυελός','pons':'Γέφυρα εγκεφαλικού στελέχους',
 'midbrain':'Μεσεγκέφαλος','spinal cord':'Νωτιαίος μυελός','hypothalamus':'Υποθάλαμος',
 'thalamus':'Θάλαμος','hippocampus':'Ιππόκαμπος','corpus callosum':'Μεσολόβιο',
 'heart':'Καρδιά','aorta':'Αορτή','ascending aorta':'Ανιούσα αορτή',
 'descending aorta':'Κατιούσα αορτή','aortic arch':'Αορτικό τόξο',
 'pulmonary artery':'Πνευμονική αρτηρία','pulmonary trunk':'Πνευμονικός κορμός',
 'pulmonary vein':'Πνευμονική φλέβα','superior vena cava':'Άνω κοίλη φλέβα',
 'inferior vena cava':'Κάτω κοίλη φλέβα','left atrium':'Αριστερός κόλπος',
 'right atrium':'Δεξιός κόλπος','left ventricle':'Αριστερή κοιλία','right ventricle':'Δεξιά κοιλία',
 'trachea':'Τραχεία','lung':'Πνεύμονας','bronchus':'Βρόγχος','bronchi':'Βρόγχοι',
 'larynx':'Λάρυγγας','pharynx':'Φάρυγγας','diaphragm':'Διάφραγμα',
 'epiglottis':'Επιγλωττίδα','esophagus':'Οισοφάγος','oesophagus':'Οισοφάγος',
 'stomach':'Στομάχι','liver':'Ήπαρ','gallbladder':'Χοληδόχος κύστη',
 'spleen':'Σπλήνας','pancreas':'Πάγκρεας','small intestine':'Λεπτό έντερο',
 'large intestine':'Παχύ έντερο','colon':'Κόλον','rectum':'Ορθό','appendix':'Σκωληκοειδής απόφυση',
 'duodenum':'Δωδεκαδάκτυλο','jejunum':'Νήστιδα','ileum':'Ειλεός','cecum':'Τυφλό έντερο',
 'kidney':'Νεφρός','renal pelvis':'Νεφρική πύελος','ureter':'Ουρητήρας',
 'urinary bladder':'Ουροδόχος κύστη','urethra':'Ουρήθρα',
 'uterus':'Μήτρα','cervix':'Τράχηλος της μήτρας','ovary':'Ωοθήκη',
 'vagina':'Κόλπος','uterine tube':'Σάλπιγγα','fallopian tube':'Σάλπιγγα',
 'breast':'Μαστός','mammary gland':'Μαστικός αδένας',
 'prostate':'Προστάτης','testis':'Όρχις','penis':'Πέος',
 'thyroid gland':'Θυρεοειδής αδένας','adrenal gland':'Επινεφρίδιο',
 'pituitary gland':'Υπόφυση','parathyroid gland':'Παραθυρεοειδής αδένας',
 'gingiva of upper jaw':'Ούλα άνω γνάθου','gingiva of lower jaw':'Ούλα κάτω γνάθου',
 'upper gingiva':'Ούλα άνω γνάθου','lower gingiva':'Ούλα κάτω γνάθου',
 'upper jaw':'Άνω γνάθος','lower jaw':'Κάτω γνάθος',
 // Ocular and auditory structures, full terms (do not strip qualifiers).
 'eyeball':'Οφθαλμικός βολβός','cornea':'Κερατοειδής χιτώνας',
 'retina':'Αμφιβληστροειδής χιτώνας','choroid':'Χοριοειδής χιτώνας',
 'iris':'Ίριδα','pupil':'Κόρη','lens':'Φακός','sclera':'Σκληρός χιτώνας',
 'fovea centralis':'Κεντρικό βοθρίο','macula lutea':'Ωχρά κηλίδα',
 'optic disc':'Οπτική θηλή','ora serrata':'Πριονωτή περιφέρεια',
 'ciliary body':'Ακτινωτό σώμα','ciliary muscle':'Ακτινωτός μυς',
 'ciliary processes':'Ακτινωτές αποφύσεις','ciliary ganglion':'Ακτινωτό γάγγλιο',
 'corneoscleral junction':'Σκληροκερατοειδές όριο','aqueous humor':'Υδατοειδές υγρό',
 'anterior chamber of eye':'Πρόσθιος θάλαμος οφθαλμού',
 'eye trabecular meshwork':'Δοκιδωτό δίκτυο του οφθαλμού',
 'lacrimal gland':'Δακρυϊκός αδένας','lacrimal nerve':'Δακρυϊκό νεύρο',
 'lacrimal lake':'Δακρυϊκή λίμνη','lacrimal canaliculus':'Δακρυϊκό σωληνάριο',
 'nasolacrimal duct':'Ρινοδακρυϊκός πόρος','frontal nerve':'Μετωπιαίο νεύρο',
 'infratrochlear nerve':'Υποτροχίλιο νεύρο','common tendinous ring':'Κοινός τενόντιος δακτύλιος',
 'inferior oblique':'Κάτω λοξός μυς','inferior rectus':'Κάτω ορθός μυς',
 'superior oblique':'Άνω λοξός μυς','superior rectus':'Άνω ορθός μυς',
 'lateral rectus':'Έξω ορθός μυς','medial rectus':'Έσω ορθός μυς',
 // Female organ and breast landmarks.
 'nipple':'Θηλή μαστού','female areola':'Θηλαία άλως',
 'areola':'Θηλαία άλως','areolar tubercle':'Φύμα θηλαίας άλω',
 'mammary lobe':'Μαστικός λοβός','lactiferous sinus':'Γαλακτοφόρος κόλπος',
 'main lactiferous duct':'Κύριος γαλακτοφόρος πόρος',
 'suspensory ligament':'Κρεμαστήριος σύνδεσμος',
 'mammary gland':'Μαστικός αδένας','mammary duct':'Μαστικός πόρος',
 'lactiferous duct':'Γαλακτοφόρος πόρος',
 // Renal and abdominal landmarks.
 'renal papilla':'Νεφρική θηλή','renal pyramid':'Νεφρική πυραμίδα',
 'renal capsule':'Νεφρική κάψα','renal cortex':'Φλοιός νεφρού',
 'renal medulla':'Μυελός νεφρού','minor calyx':'Ελάσσων νεφρικός κάλυκας',
 'major calyx':'Μείζων νεφρικός κάλυκας','renal calyx':'Νεφρικός κάλυκας',
 'splenic artery':'Σπληνική αρτηρία',
 'proximal part of jejunum':'Εγγύς τμήμα της νήστιδας',
 'middle part of jejunum':'Μέσο τμήμα της νήστιδας',
 'distal part of jejunum':'Άπω τμήμα της νήστιδας',
 'proximal part of ileum':'Εγγύς τμήμα του ειλεού',
 'middle part of ileum':'Μέσο τμήμα του ειλεού',
 'distal part of ileum':'Άπω τμήμα του ειλεού',

 // Curated full source phrases observed in the pinned male/female atlas audit.
 // Editorial translations: HUMAN MEDICAL REVIEW PENDING (AGENTS.md); no automated suggestions promoted.
 "lower central secondary incisor tooth":"Κάτω κεντρικός μόνιμος τομέας",
 "lower lateral secondary incisor tooth":"Κάτω πλάγιος μόνιμος τομέας",
 "lower secondary canine tooth":"Κάτω μόνιμος κυνόδοντας",
 "upper central secondary incisor tooth":"Άνω κεντρικός μόνιμος τομέας",
 "upper lateral secondary incisor tooth":"Άνω πλάγιος μόνιμος τομέας",
 "upper secondary canine tooth":"Άνω μόνιμος κυνόδοντας",
 "anterior chamber of left eyeball":"Πρόσθιος θάλαμος του αριστερού οφθαλμικού βολβού",
 "anterior ethmoidal nerve":"Πρόσθιο ηθμοειδές νεύρο",
 "posterior ethmoidal nerve":"Οπίσθιο ηθμοειδές νεύρο",
 "corona ciliaris":"Ακτινωτή στεφάνη",
 "inferior branch of left oculomotor nerve":"Κάτω κλάδος του αριστερού κοινού κινητικού νεύρου",
 "superior branch of left oculomotor nerve":"Άνω κλάδος του αριστερού κοινού κινητικού νεύρου",
 "levator palpebrae superioris":"Ανελκτήρας του άνω βλεφάρου",
 "lacrimal sac":"Δακρυϊκός ασκός",
 "nasociliary nerve":"Ρινοακτινωτό νεύρο",
 "ophthalmic nerve":"Οφθαλμικό νεύρο",
 "optic nerve":"Οπτικό νεύρο",
 "optic part of left retina":"Οπτική μοίρα του αριστερού αμφιβληστροειδούς",
 "long ciliary nerve":"Μακρό ακτινωτό νεύρο",
 "short ciliary nerve":"Βραχύ ακτινωτό νεύρο",
 "suspensory ligament of left lens":"Κρεμαστήριος σύνδεσμος του αριστερού φακού",
 "suspensory ligament of right lens":"Κρεμαστήριος σύνδεσμος του δεξιού φακού",
 "tarsal plate of left upper eyelid":"Ταρσικό πέταλο του αριστερού άνω βλεφάρου",
 "tarsal plate of left lower eyelid":"Ταρσικό πέταλο του αριστερού κάτω βλεφάρου",
 "supra-orbital nerve":"Υπερκόγχιο νεύρο",
 "supratrochlear nerve":"Υπερτροχίλιο νεύρο",
 "trochlea of left superior oblique":"Τροχιλία του αριστερού άνω λοξού μυός",
 "palpebral conjunctiva of right upper eyelid":"Βλεφαρικός επιπεφυκότας του δεξιού άνω βλεφάρου",
 "palpebral conjunctiva of right lower eyelid":"Βλεφαρικός επιπεφυκότας του δεξιού κάτω βλεφάρου",
 "palpebral conjunctiva of left upper eyelid":"Βλεφαρικός επιπεφυκότας του αριστερού άνω βλεφάρου",
 "palpebral conjunctiva of left lower eyelid":"Βλεφαρικός επιπεφυκότας του αριστερού κάτω βλεφάρου",
 "right scleral venous sinus":"Δεξιός φλεβώδης κόλπος του σκληρού χιτώνα",
 "left scleral venous sinus":"Αριστερός φλεβώδης κόλπος του σκληρού χιτώνα",
 "aqueous humor of right eyeball":"Υδατοειδές υγρό του δεξιού οφθαλμικού βολβού",
 "aqueous humor of left eyeball":"Υδατοειδές υγρό του αριστερού οφθαλμικού βολβού",
 "bulbar conjunctiva":"Βολβικός επιπεφυκότας",
 "interlobar adipose tissue of left mammary gland":"Μεσολόβιος λιπώδης ιστός του αριστερού μαστικού αδένα",
 "interlobar adipose tissue of right mammary gland":"Μεσολόβιος λιπώδης ιστός του δεξιού μαστικού αδένα",
 "suspensory ligament of left breast":"Κρεμαστήριος σύνδεσμος του αριστερού μαστού",
 "suspensory ligament of right breast":"Κρεμαστήριος σύνδεσμος του δεξιού μαστού",
 "dura mater":"Σκληρά μήνιγγα",
 "optic chiasma":"Οπτικό χίασμα",
 "olfactory bulb":"Οσφρητικός βολβός",
 "anterior olfactory nucleus":"Πρόσθιος οσφρητικός πυρήνας",
 "piriform cortex":"Απιοειδής φλοιός",
 "head of caudate":"Κεφαλή του κερκοφόρου πυρήνα",
 "body of caudate":"Σώμα του κερκοφόρου πυρήνα",
 "tail of caudate":"Ουρά του κερκοφόρου πυρήνα",
 "putamen":"Κέλυφος",
 "nucleus accumbens":"Επικλινής πυρήνας",
 "external segment of globus pallidus":"Έξω μοίρα της ωχράς σφαίρας",
 "internal segment of globus pallidus":"Έσω μοίρα της ωχράς σφαίρας",
 "posterior inferior cerebellar artery":"Οπίσθια κάτω παρεγκεφαλιδική αρτηρία",
 "posterior segmental vein":"Οπίσθια τμηματική φλέβα",
 "superior segmental bronchial tree":"Άνω τμηματικό βρογχικό δέντρο",
 "anterior segmental artery":"Πρόσθια τμηματική αρτηρία",
 "anterior segmental bronchial tree":"Πρόσθιο τμηματικό βρογχικό δέντρο",
 "apical segmental vein":"Κορυφαία τμηματική φλέβα",
 "superior segmental artery":"Άνω τμηματική αρτηρία",
 "apical segmental bronchial tree":"Κορυφαίο τμηματικό βρογχικό δέντρο",
 "posterior basal segmental artery":"Οπίσθια βασική τμηματική αρτηρία",
 "posterior basal segmental bronchial tree":"Οπίσθιο βασικό τμηματικό βρογχικό δέντρο",
 "posterior segmental bronchial tree":"Οπίσθιο τμηματικό βρογχικό δέντρο",
 "superior segmental vein":"Άνω τμηματική φλέβα",
 "lateral basal segmental artery":"Έξω βασική τμηματική αρτηρία",
 "lateral basal segmental bronchial tree":"Έξω βασικό τμηματικό βρογχικό δέντρο",
 "lateral basal segmental vein":"Έξω βασική τμηματική φλέβα",
 "anterior basal segmental vein":"Πρόσθια βασική τμηματική φλέβα",
 "apical segmental artery":"Κορυφαία τμηματική αρτηρία",
 "posterior basal segmental vein":"Οπίσθια βασική τμηματική φλέβα",
 "medial segmental bronchial tree":"Έσω τμηματικό βρογχικό δέντρο",
 "lateral segmental bronchial tree":"Έξω τμηματικό βρογχικό δέντρο",
 "superior lingular artery":"Άνω γλωσσίδια αρτηρία",
 "superior lingular bronchial tree":"Άνω γλωσσιδικό βρογχικό δέντρο",
 "inferior pulmonary vein":"Κάτω πνευμονική φλέβα",
 "colic vein":"Κολική φλέβα",
 "marginal vein":"Επιχείλια φλέβα",
 "posterior vein of left ventricle":"Οπίσθια φλέβα της αριστερής κοιλίας",
 "diagonal branch of anterior descending branch of left coronary artery":"Διαγώνιος κλάδος του πρόσθιου κατιόντος κλάδου της αριστερής στεφανιαίας αρτηρίας",
 "first posterior ventricular branch of right coronary artery":"Πρώτος οπίσθιος κοιλιακός κλάδος της δεξιάς στεφανιαίας αρτηρίας",
 "first anterior ventricular branch of right coronary artery":"Πρώτος πρόσθιος κοιλιακός κλάδος της δεξιάς στεφανιαίας αρτηρίας",
 "posterior interventricular branch of right coronary artery":"Οπίσθιος μεσοκοιλιακός κλάδος της δεξιάς στεφανιαίας αρτηρίας",
 "circumflex branch of left coronary artery":"Περισπώμενος κλάδος της αριστερής στεφανιαίας αρτηρίας",
 "anterior division of left renal artery":"Πρόσθια μοίρα της αριστερής νεφρικής αρτηρίας",
 "anterior division of right renal artery":"Πρόσθια μοίρα της δεξιάς νεφρικής αρτηρίας",
 "marginal branch of right coronary artery":"Επιχείλιος κλάδος της δεξιάς στεφανιαίας αρτηρίας",
 "anterior branch of right anterior segmental artery":"Πρόσθιος κλάδος της δεξιάς πρόσθιας τμηματικής αρτηρίας",
 "anterior part of right apical segmental artery":"Πρόσθιο τμήμα της δεξιάς κορυφαίας τμηματικής αρτηρίας",
 "apical part of right apical segmental artery":"Κορυφαίο τμήμα της δεξιάς κορυφαίας τμηματικής αρτηρίας",
 "artery of central sulcus":"Αρτηρία της κεντρικής αύλακας",
 "lateral branch of right lateral basal segmental artery":"Έξω κλάδος της δεξιάς έξω βασικής τμηματικής αρτηρίας",
 "tendinous arch of levator ani":"Τενόντιο τόξο του ανελκτήρα του πρωκτού",
 "anterior part of lateral segmental vein":"Πρόσθιο τμήμα της έξω τμηματικής φλέβας",
 "apical part of right apical segmental vein":"Κορυφαίο τμήμα της δεξιάς κορυφαίας τμηματικής φλέβας",
 "apical part of right posterior segmental artery":"Κορυφαίο τμήμα της δεξιάς οπίσθιας τμηματικής αρτηρίας",
 "artery of left precentral sulcus":"Αρτηρία της αριστερής προκεντρικής αύλακας",
 "artery of right precentral sulcus":"Αρτηρία της δεξιάς προκεντρικής αύλακας",
 "compact bone tissue":"Συμπαγής οστίτης ιστός",
 "external anal sphincter":"Έξω σφιγκτήρας του πρωκτού",
 // Standard cardiovascular and skeletal terms.
 'middle cardiac vein':'Μέση καρδιακή φλέβα',
 'anterior interventricular vein':'Πρόσθια μεσοκοιλιακή φλέβα',
 'posterior interventricular vein':'Οπίσθια μεσοκοιλιακή φλέβα',
 'interventricular septum':'Μεσοκοιλιακό διάφραγμα',
 'brachiocephalic trunk':'Βραχιονοκεφαλικός κορμός',
 'internal iliac vein':'Έσω λαγόνια φλέβα',
 'external iliac vein':'Έξω λαγόνια φλέβα',
 'internal iliac artery':'Έσω λαγόνια αρτηρία',
 'external iliac artery':'Έξω λαγόνια αρτηρία',
 'genicular vein':'Γονατιαία φλέβα',
 'inferior phrenic artery':'Κάτω φρενική αρτηρία',
 'superior phrenic artery':'Άνω φρενική αρτηρία',
 'inferior phrenic vein':'Κάτω φρενική φλέβα',
 'superior phrenic vein':'Άνω φρενική φλέβα'
};
const NUMS={first:1,second:2,third:3,fourth:4,fifth:5,sixth:6,seventh:7,eighth:8,ninth:9,tenth:10,eleventh:11,twelfth:12};
const WORDS={incisor:'τομέας',canine:'κυνόδοντας',premolar:'προγόμφιος',molar:'γομφίος'};
const FEMININE=/^(Πλευρά|Κλείδα|Ωμοπλάτη|Ωλένη|Κερκίδα|Κνήμη|Περόνη|Πτέρνα|Πύελος|Επιγονατίδα|Τραχεία|Αορτή|Ωοθήκη|Ουρήθρα|Σάλπιγγα|Κοιλία|Χοληδόχος κύστη|Κάτω γνάθος|Άνω γνάθος|Νεφρική πύελος)/;
const MASCULINE=/^(Πνεύμονας|Νεφρός|Βρόγχος|Κόλπος|Όρχις|Αδένας|Κόκκυγας|Λάρυγγας|Φάρυγγας|Σπόνδυλος|Αυχενικός|Θωρακικός|Οσφυϊκός|Κυνόδοντας|Γομφίος|Προγόμφιος|Τομέας|Θυρεοειδής|Προστάτης)/;
const ordinal=(n,fem=false)=>n+(fem?'η':'ο');
function prefix(side,word){
 if(!side)return word;
 const l=side==='left';
 // Infer grammatical gender from the head noun, including multi-word
 // anatomical labels. Never infer from adjectives alone.
 const feminine=FEMININE.test(word)||/^(Ακτινωτή στεφάνη|Κεφαλή|Ουρά|Έξω μοίρα|Έσω μοίρα|Σκληρά μήνιγγα)/.test(word)||/^(θηλή|νεφρική θηλή|νεφρική πυραμίδα|θηλαία άλως|ωχρά κηλίδα|νεφρική κάψα|πριονωτή περιφέρεια|δακρυϊκή λίμνη|ίριδα)/i.test(word)||/(αρτηρία|φλέβα|γνάθος|θηλή|πυραμίδα|κάψα|κόρη|ίριδα|κηλίδα|περιφέρεια|λίμνη|άλως|περόνη|κνήμη|φάλαγγα|σάλπιγγα|τραχεία|ωοθήκη)$/i.test(word);
 const masculine=MASCULINE.test(word)||/^(Ανελκτήρας|Επικλινής πυρήνας)/.test(word)||/^(φλοιός|μυελός|πρόσθιος θάλαμος|δακρυϊκός αδένας|κρεμαστήριος σύνδεσμος)/i.test(word)||/(χιτώνας|φακός|πόρος|μυς|αδένας|λοβός|κόλπος|κάλυκας|κορμός|δακτύλιος|σύνδεσμος|νεφρός|πνεύμονας|βρόγχος|φλοιός|μυελός|επιπεφυκότας|ασκός|τομέας|κυνόδοντας)$/i.test(word);
 const form=feminine?(l?'Αριστερή':'Δεξιά'):masculine?(l?'Αριστερός':'Δεξιός'):(l?'Αριστερό':'Δεξιό');
 return form+' '+word.toLocaleLowerCase('el');
}
function simplify(raw){return String(raw||'').trim().replace(/\s+/g,' ').toLowerCase()}
// A parenthesized side is anatomical information, never an ignorable suffix.
export function anatomicalGreek(name){
 const raw=String(name||'').trim();if(!raw)return null;
 let base=simplify(raw);
 const trailingSide=base.match(/^(.+?) \((left|right)\)$/);
 if(trailingSide){
  if(/^(left|right)\s/.test(trailingSide[1]))return null; // conflicting or duplicate laterality
  base=trailingSide[2]+' '+trailingSide[1];
 }
 // Sided rib numbering must be complete. Do not render a bare "πλευρά"
 // for the anatomically different sixth, eighth etc.
 let m=base.match(/^(left|right)\s+(first|second|third|fourth|fifth|sixth|seventh|eighth|ninth|tenth|eleventh|twelfth|\d+(?:st|nd|rd|th)?)\s+rib$/);
 if(m){let n=NUMS[m[2]]||parseInt(m[2],10);if(n>=1&&n<=12)return (m[1]==='left'?'Αριστερή':'Δεξιά')+' '+ordinal(n,true)+' πλευρά';}
 m=base.match(/^(left|right)\s+(upper|lower)\s+(first|second|third|fourth|fifth|sixth|seventh|eighth|\d+(?:st|nd|rd|th)?)\s+(primary|secondary|deciduous|permanent)\s+(incisor|canine|premolar|molar)\s+tooth$/);
 if(m){const n=NUMS[m[3]]||parseInt(m[3],10),kind=WORDS[m[5]];if(n>=1&&n<=8)return (m[1]==='left'?'Αριστερός':'Δεξιός')+' '+(m[2]==='upper'?'άνω':'κάτω')+' '+n+'ος '+(m[4]==='primary'||m[4]==='deciduous'?'νεογιλός':'μόνιμος')+' '+kind;}
 m=base.match(/^(left|right)\s+(upper|lower)\s+(first|second|third|fourth|fifth|sixth|seventh|eighth|\d+(?:st|nd|rd|th)?)\s+(incisor|canine|premolar|molar)\s+tooth$/);
 if(m){const n=NUMS[m[3]]||parseInt(m[3],10);if(n>=1&&n<=8)return (m[1]==='left'?'Αριστερός':'Δεξιός')+' '+(m[2]==='upper'?'άνω':'κάτω')+' '+n+'ος '+WORDS[m[4]];}
 if(CORE[base])return CORE[base]; // full phrase may contain internal laterality
 let side=null;
 m=base.match(/^(left|right)\s+(.+)$/);
 if(m){side=m[1];base=m[2];}
 if(CORE[base])return prefix(side,CORE[base]);
 // Strict standalone names only: no substring match ("rib" is not enough for
 // "sixth rib cartilage"). Unknown compounds keep their English metadata.
 return null;
}
export function anatomyName(name,system,systemsGreek={}){
 const el=anatomicalGreek(name);
 const dental=/\b(gingiva|tooth|teeth)\b/i.test(String(name||''));
 return {el,english:String(name||'').trim(),label:el||'Μη μεταφρασμένη δομή',systemName:dental?'Στοματική ανατομία':(systemsGreek[system]||system||'')};
}
/** Quiz on recognized and safely named elementary 3D parts only. */
export function eligibleQuizName(name,system){
 const greek=anatomicalGreek(name);
 if(!greek)return false;
 // Do not quiz on surface, borrowed meshes, tissue debris, or compound
 // metanames that could be hard to identify visually.
 if(!['skeletal','respiratory','cardiac','digestive','urinary','reproductive','nervous','brain','arterial','venous','endocrine'].includes(system))return false;
 // On mobile, favour large, distinguishable structures. No individually
 // numbered ribs, teeth, gum tissues or tiny fragments in an entry-level quiz.
 const basic=new Set(['skull','cranium','mandible','maxilla','sternum','clavicle','scapula','sacrum','pelvis','ilium','humerus','ulna','radius','femur','patella','tibia','fibula','brain','cerebrum','cerebellum','spinal cord','heart','aorta','trachea','lung','larynx','esophagus','stomach','liver','spleen','pancreas','kidney','urinary bladder','uterus','ovary','thyroid gland','prostate','testis']);
 return basic.has(simplify(name).replace(/^(left|right)\s+/,''));
}
