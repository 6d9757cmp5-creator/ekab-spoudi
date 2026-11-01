/* EKAB SAEK → 3D group matching against atlas names AND systems.
   Partial models are described as available structures, never as complete anatomy. */
export const FOCUS_GROUPS=Object.freeze({
 thorax:{name:'Θωρακικός κλωβός',description:'Διαθέσιμες πλευρές, στέρνο, θωρακικοί σπόνδυλοι και χόνδροι.'},
 ribs:{name:'Πλευρές',description:'Οι διαθέσιμες πλευρές ως ομάδα, όχι μία αυθαίρετα επιλεγμένη πλευρά.'},
 lungs:{name:'Πνευμονικές δομές',description:'Διαθέσιμοι βρόγχοι και βρογχοπνευμονικά τμήματα. Ο άτλας δεν διαθέτει απαραίτητα πλήρεις επιφάνειες πνευμόνων.'},
 kidneys:{name:'Νεφροί',description:'Και τα δύο αναγνωρίσιμα νεφρά, εφόσον υπάρχουν στον άτλαντα.'},
 spine:{name:'Σπονδυλική στήλη',description:'Διαθέσιμοι σπόνδυλοι, μεσοσπονδύλιοι δίσκοι και ιεροκοκκυγική περιοχή.'},
 airways:{name:'Αεραγωγοί',description:'Διαθέσιμοι ανώτεροι και κατώτεροι αεραγωγοί, όχι προσομοίωση απόφραξης.'},
 nervous:{name:'Νευρικό σύστημα',description:'Οι διαθέσιμες δομές του νευρικού συστήματος, όχι μόνο ο εγκέφαλος.'},
 digestive:{name:'Πεπτικό σύστημα',description:'Οι διαθέσιμες δομές του πεπτικού συστήματος, όχι μόνο το στομάχι.'},
 circulation:{name:'Κυκλοφορικό σύστημα',description:'Οι διαθέσιμες καρδιακές, αρτηριακές και φλεβικές δομές — όχι κυκλοφορική παθολογία.'},
 arteries:{name:'Αρτηρίες',description:'Οι διαθέσιμες αρτηρίες, όχι μόνο η αορτή.'},
 abdomen:{name:'Κοιλιακές δομές',description:'Διαθέσιμες πεπτικές, νεφρικές και σπληνικές δομές. Δεν εμφανίζονται τα ανατομικά τεταρτημόρια.'},
 limbs:{name:'Οστά άκρων',description:'Τα διαθέσιμα οστά των άνω και κάτω άκρων, όχι προσομοίωση κατάγματος.'},
 skull:{name:'Οστά κρανίου',description:'Τα διαθέσιμα οστά του κρανίου, όχι αναγκαστικά πλήρες ενιαίο κρανίο.'},
 pelvis:{name:'Οστά πυέλου',description:'Τα διαθέσιμα πυελικά και ιεροκοκκυγικά οστά.'},
 brain:{name:'Εγκεφαλικές δομές',description:'Τα διαθέσιμα τμήματα του εγκεφάλου· όχι κατ’ ανάγκη ολόκληρη η εγκεφαλική επιφάνεια.'},
 heart:{name:'Καρδιακές δομές',description:'Διαθέσιμες καρδιακές δομές, όχι μία τυχαία κοιλία ούτε οξύ καρδιακό επεισόδιο.'},
 pancreas:{name:'Πάγκρεας',description:'Ανατομική αναφορά στο πάγκρεας, χωρίς προσομοίωση ινσουλίνης ή γλυκαγόνης.'},
 femora:{name:'Μηριαία οστά',description:'Αριστερό και δεξί μηριαίο, εφόσον υπάρχουν και τα δύο.'},
 humeri:{name:'Βραχιόνια οστά',description:'Αριστερό και δεξί βραχιόνιο, εφόσον υπάρχουν και τα δύο.'},
 trachea:{name:'Τραχεία',description:'Διαθέσιμη τραχεία και ανατομικά τμήματά της.'},
 cord:{name:'Νωτιαίος μυελός',description:'Διαθέσιμα τμήματα νωτιαίου μυελού. Αν λείπουν, εμφανίζεται η έλλειψη, όχι άλλο όργανο.'},
 liver:{name:'Ηπατικές δομές',description:'Διαθέσιμα τμήματα ήπατος· όχι αυθαίρετο μικρό τμήμα ως ολόκληρο ήπαρ.'},
 stomach:{name:'Στομάχι',description:'Το διαθέσιμο μοντέλο του στομάχου.'},
 aorta:{name:'Αορτή',description:'Διαθέσιμα τμήματα αορτής από καρδιακό και αρτηριακό σύστημα.'},
 uterus:{name:'Μήτρα',description:'Αναγνωρίσιμες αναπαραγωγικές δομές της μήτρας στο επιλεγμένο φύλο.'}
});
const KEYS=Object.keys(FOCUS_GROUPS);
export const FOCUS_FLAGS=Object.freeze(Object.fromEntries(KEYS.map((k,i)=>[k,{lo:i<16?2**i:0,hi:i>=16?2**(i-16):0}])));
const CAGE=/\bribs?\b|\bcostae?\b|\bcostal cartilage\b|\bsternum\b|\bmanubrium\b|\bxiphoid\b|\bthoracic vertebr(?:a|ae)\b/i;
const RIB=/\bribs?\b|\bcostae?\b/i;
const SPINE=/vertebr|intervertebral dis[ck]|\bsacrum\b|\bcoccyx\b/i;
const LIMBS=/femur|humerus|tibia|fibula|ulna|radius|patella|scapula|clavicle|carpal|tarsal|phalan|calcaneus|talus|navicular|cuboid|cuneiform|metacarp|metatars/i;
const SKULL=/frontal bone|parietal bone|occipital bone|sphenoid|ethmoid|temporal bone|zygomatic|mandible|maxilla|nasal bone|palatine|lacrimal|vomer|cranium|skull/i;
const BRAIN=/gyrus|cerebell|cerebral|cerebrum|white matter|thalam|amygdal|hippocamp|pons|midbrain|forebrain|cortex|putamen|caudate|callosum|vermis|medulla oblongata|olfactory bulb|colliculus|peduncle/i;
const CARDIAC=/heart|atria|atrium|ventricle|valve|papillary|septum|aortic|mitral|tricuspid|pulmonary|coronary|wall of/i;
export function matchesFocusGroup(p,key){
 if(!p||!FOCUS_GROUPS[key])return false;
 const s=p.system,n=String(p.name||'');
 switch(key){
 case 'thorax':return s==='skeletal'&&CAGE.test(n);
 case 'ribs':return s==='skeletal'&&RIB.test(n);
 case 'spine':return s==='skeletal'&&SPINE.test(n);
 case 'limbs':return s==='skeletal'&&LIMBS.test(n);
 case 'skull':return s==='skeletal'&&SKULL.test(n);
 case 'pelvis':return s==='skeletal'&&/hip bone|sacrum|coccyx|ilium|ischium|pubis|pelvis/i.test(n);
 case 'femora':return s==='skeletal'&&/\bfemur\b/i.test(n);
 case 'humeri':return s==='skeletal'&&/\bhumerus\b/i.test(n);
 case 'lungs':return s==='respiratory'&&/bronch|lung hilus/i.test(n);
 case 'airways':return s==='respiratory'&&/trachea|bronch|pharyng|laryng|epiglott|nasal concha/i.test(n);
 case 'trachea':return s==='respiratory'&&/\btrachea\b/i.test(n);
 case 'kidneys':return s==='urinary'&&/^(left|right)\s+kidney$/i.test(n);
 case 'nervous':return s==='nervous';
 case 'brain':return s==='nervous'&&BRAIN.test(n);
 case 'cord':return s==='nervous'&&/spinal cord/i.test(n)&&!/\bcentral canal\b/i.test(n);
 case 'digestive':return s==='digestive';
 case 'circulation':return ['arterial','venous','cardiac'].includes(s);
 case 'arteries':return s==='arterial'||(s==='cardiac'&&/\b(aorta|artery|coronary)\b/i.test(n));
 case 'heart':return s==='cardiac'&&CARDIAC.test(n)&&!/\b(third|fourth|lateral)\s+ventricle\b|\binterventricular foramen\b/i.test(n);
 case 'abdomen':return ['digestive','urinary','lymphatic'].includes(s)&&/stomach|liver|pancrea|gallbladder|colon|rectum|intestin|ileum|jejunum|duoden|mesenter|appendix|caecum|cecum|spleen|kidney/i.test(n);
 case 'pancreas':return s==='digestive'&&/pancrea/i.test(n);
 case 'liver':return s==='digestive'&&/liver|hepatic/i.test(n);
 case 'stomach':return s==='digestive'&&/^stomach$/i.test(n);
 case 'aorta':return ['arterial','cardiac'].includes(s)&&/\baorta\b/i.test(n);
 case 'uterus':return s==='reproductive'&&/\buterus\b|\buterine\b/i.test(n);
 default:return false;
 }
}
export function focusMasks(p){
 let lo=0,hi=0;
 for(const k of KEYS)if(matchesFocusGroup(p,k)){const f=FOCUS_FLAGS[k];lo+=f.lo;hi+=f.hi;}
 return [lo,hi];
}
export function focusMembers(parts,key){
 const items=parts.filter(p=>p._loaded!==false&&matchesFocusGroup(p,key)&&Array.isArray(p.bounds)&&p.bounds.length===2);
 const bilateral=['kidneys','femora','humeri'].includes(key);
 const valid=items.length>0&&(!bilateral||(items.some(p=>/\bleft\b/i.test(p.name))&&items.some(p=>/\bright\b/i.test(p.name))));
 return {items,valid,reason:bilateral?'Απουσιάζει το αριστερό ή το δεξί πλέγμα.':'Δεν υπάρχει αναγνωρίσιμη δομή του ζητούμενου θέματος.'};
}
