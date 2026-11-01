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
 'upper jaw':'Άνω γνάθος','lower jaw':'Κάτω γνάθος'
};
const NUMS={first:1,second:2,third:3,fourth:4,fifth:5,sixth:6,seventh:7,eighth:8,ninth:9,tenth:10,eleventh:11,twelfth:12};
const WORDS={incisor:'τομέας',canine:'κυνόδοντας',premolar:'προγόμφιος',molar:'γομφίος'};
const FEMININE=/^(Πλευρά|Κλείδα|Ωμοπλάτη|Ωλένη|Κερκίδα|Κνήμη|Περόνη|Πτέρνα|Πύελος|Επιγονατίδα|Τραχεία|Αορτή|Ωοθήκη|Ουρήθρα|Σάλπιγγα|Κοιλία|Χοληδόχος κύστη|Κάτω γνάθος|Άνω γνάθος|Νεφρική πύελος)/;
const MASCULINE=/^(Πνεύμονας|Νεφρός|Βρόγχος|Κόλπος|Όρχις|Αδένας|Κόκκυγας|Λάρυγγας|Φάρυγγας|Σπόνδυλος|Αυχενικός|Θωρακικός|Οσφυϊκός|Κυνόδοντας|Γομφίος|Προγόμφιος|Τομέας|Θυρεοειδής|Προστάτης)/;
const ordinal=(n,fem=false)=>n+(fem?'η':'ο');
function prefix(side,word){if(!side)return word;const l=side==='left';const form=FEMININE.test(word)?(l?'Αριστερή':'Δεξιά'):MASCULINE.test(word)?(l?'Αριστερός':'Δεξιός'):(l?'Αριστερό':'Δεξιό');return form+' '+word.toLocaleLowerCase('el');}
function simplify(raw){return String(raw||'').trim().replace(/\s+/g,' ').replace(/\s*\([^)]*\)\s*/g,' ').trim().toLowerCase()}
export function anatomicalGreek(name){
 const raw=String(name||'').trim();if(!raw)return null;
 let base=simplify(raw);
 // Sided rib numbering must be complete. Do not render a bare "πλευρά"
 // for the anatomically different sixth, eighth etc.
 let m=base.match(/^(left|right)\s+(first|second|third|fourth|fifth|sixth|seventh|eighth|ninth|tenth|eleventh|twelfth|\d+(?:st|nd|rd|th)?)\s+rib$/);
 if(m){let n=NUMS[m[2]]||parseInt(m[2],10);if(n>=1&&n<=12)return (m[1]==='left'?'Αριστερή':'Δεξιά')+' '+ordinal(n,true)+' πλευρά';}
 m=base.match(/^(left|right)\s+(upper|lower)\s+(first|second|third|fourth|fifth|sixth|seventh|eighth|\d+(?:st|nd|rd|th)?)\s+(primary|secondary|deciduous|permanent)\s+(incisor|canine|premolar|molar)\s+tooth$/);
 if(m){const n=NUMS[m[3]]||parseInt(m[3],10),kind=WORDS[m[5]];if(n>=1&&n<=8)return (m[1]==='left'?'Αριστερός':'Δεξιός')+' '+(m[2]==='upper'?'άνω':'κάτω')+' '+n+'ος '+(m[4]==='primary'||m[4]==='deciduous'?'νεογιλός':'μόνιμος')+' '+kind;}
 m=base.match(/^(left|right)\s+(upper|lower)\s+(first|second|third|fourth|fifth|sixth|seventh|eighth|\d+(?:st|nd|rd|th)?)\s+(incisor|canine|premolar|molar)\s+tooth$/);
 if(m){const n=NUMS[m[3]]||parseInt(m[3],10);if(n>=1&&n<=8)return (m[1]==='left'?'Αριστερός':'Δεξιός')+' '+(m[2]==='upper'?'άνω':'κάτω')+' '+n+'ος '+WORDS[m[4]];}
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
