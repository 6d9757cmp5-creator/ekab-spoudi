/**
 * Greek anatomy translation CANDIDATE generator.
 * English FMA-style phrase -> structured medical-Greek proposal. NOT APPROVED.
 * Candidate records must be checked against each full source term by a human
 * medical Greek editor before being promoted to the published glossary.
 * Do not import this file in the public web atlas.
 */
import {anatomicalGreek} from './greek-names.js';

const NOUNS={
 artery:['αρτηρία','f'],vein:['φλέβα','f'],nerve:['νεύρο','n'],muscle:['μυς','m'],
 bone:['οστό','n'],cartilage:['χόνδρος','m'],ligament:['σύνδεσμος','m'],tendon:['τένοντας','m'],
 branch:['κλάδος','m'],division:['μοίρα','f'],segment:['τμήμα','n'],part:['τμήμα','n'],
 head:['κεφαλή','f'],body:['σώμα','n'],tail:['ουρά','f'],root:['ρίζα','f'],canal:['πόρος','m'],
 duct:['πόρος','m'],sinus:['κόλπος','m'],cavity:['κοιλότητα','f'],chamber:['θάλαμος','m'],
 ring:['δακτύλιος','m'],process:['απόφυση','f'],surface:['επιφάνεια','f'],border:['χείλος','n'],
 plate:['πέταλο','n'],lobe:['λοβός','m'],lobule:['λοβίδιο','n'],lobus:['λοβός','m'],
 tract:['δεμάτιο','n'],fasciculus:['δεμάτιο','n'],bundle:['δεμάτιο','n'],plexus:['πλέγμα','n'],
 ganglion:['γάγγλιο','n'],nucleus:['πυρήνας','m'],sulcus:['αύλακα','f'],gyrus:['έλικα','f'],
 fissure:['σχισμή','f'],membrane:['υμένας','m'],fascia:['περιτονία','f'],
 capsule:['κάψα','f'],septum:['διάφραγμα','n'],valve:['βαλβίδα','f'],
 ventricle:['κοιλία','f'],atrium:['κόλπος','m'],arteriole:['αρτηρίδιο','n'],
 venule:['φλεβίδιο','n'],capillary:['τριχοειδές','n'],anastomosis:['αναστόμωση','f'],
 phalanx:['φάλαγγα','f'],vertebra:['σπόνδυλος','m'],tubercle:['φύμα','n'],
 papilla:['θηλή','f'],pyramid:['πυραμίδα','f'],calyx:['κάλυκας','m'],villus:['λάχνη','f'],
 bronchus:['βρόγχος','m'],bronchiole:['βρογχιόλιο','n'],
 alveolus:['κυψελίδα','f'],bronchial_tree:['βρογχικό δέντρο','n'],
 tree:['δέντρο','n'],set:['σύνολο','n'],tributary:['παραπόταμος','m'],
 lobelet:['λοβίδιο','n'],arterial_arch:['αρτηριακό τόξο','n'],
 joint:['άρθρωση','f'],recess:['κόλπωμα','n'],space:['χώρος','m'],
 ligamentum:['σύνδεσμος','m'],rib:['πλευρά','f'],tooth:['δόντι','n'],
 finger:['δάκτυλο χεριού','n'],toe:['δάκτυλο ποδιού','n'],foot:['πόδι','n'],
 hand:['χέρι','n'],eyeball:['βολβός του οφθαλμού','m'],
 pupil:['κόρη οφθαλμού','f'],iris:['ίριδα','f'],cornea:['κερατοειδής χιτώνας','m'],
 retina:['αμφιβληστροειδής χιτώνας','m'],choroid:['χοριοειδής χιτώνας','m'],
 lens:['φακός','m'],sclera:['σκληρός χιτώνας','m'],eyelid:['βλέφαρο','n'],
 gland:['αδένας','m'],ductule:['πορίδιο','n'],mammary_gland:['μαστικός αδένας','m'],
 nipple:['θηλή μαστού','f'],areola:['θηλαία άλως','f'],
 larynx:['λάρυγγας','m'],pharynx:['φάρυγγας','m'],
 bronchi:['βρόγχοι','m'],lung:['πνεύμονας','m'],
 kidney:['νεφρός','m'],liver:['ήπαρ','n'],spleen:['σπλήνας','m'],
 heart:['καρδιά','f'],colon:['κόλον','n'],stomach:['στομάχι','n'],
 jejunum:['νήστιδα','f'],ileum:['ειλεός','m'],duodenum:['δωδεκαδάκτυλο','n'],
 aorta:['αορτή','f'],cerebellum:['παρεγκεφαλίδα','f'],
 cerebrum:['μεγάλος εγκέφαλος','m'],brain:['εγκέφαλος','m'],
 diaphragm:['διάφραγμα','n'],aortic_arch:['αορτικό τόξο','n']
};
const ADJ={
 anterior:['πρόσθιος','πρόσθια','πρόσθιο'],
 posterior:['οπίσθιος','οπίσθια','οπίσθιο'],
 inferior:['κάτω','κάτω','κάτω'],superior:['άνω','άνω','άνω'],
 middle:['μέσος','μέση','μέσο'],median:['μέσος','μέση','μέσο'],
 medial:['έσω','έσω','έσω'],lateral:['έξω','έξω','έξω'],
 internal:['έσω','έσω','έσω'],external:['έξω','έξω','έξω'],
 basal:['βασικός','βασική','βασικό'],apical:['κορυφαίος','κορυφαία','κορυφαίο'],
 segmental:['τμηματικός','τμηματική','τμηματικό'],
 bronchial:['βρογχικός','βρογχική','βρογχικό'],
 bronchiolar:['βρογχιολικός','βρογχιολική','βρογχιολικό'],
 coronary:['στεφανιαίος','στεφανιαία','στεφανιαίο'],
 renal:['νεφρικός','νεφρική','νεφρικό'],
 hepatic:['ηπατικός','ηπατική','ηπατικό'],
 phrenic:['φρενικός','φρενική','φρενικό'],
 pulmonary:['πνευμονικός','πνευμονική','πνευμονικό'],
 cardiac:['καρδιακός','καρδιακή','καρδιακό'],
 cerebral:['εγκεφαλικός','εγκεφαλική','εγκεφαλικό'],
 cerebellar:['παρεγκεφαλιδικός','παρεγκεφαλιδική','παρεγκεφαλιδικό'],
 temporal:['κροταφικός','κροταφική','κροταφικό'],
 frontal:['μετωπιαίος','μετωπιαία','μετωπιαίο'],
 parietal:['βρεγματικός','βρεγματική','βρεγματικό'],
 occipital:['ινιακός','ινιακή','ινιακό'],
 cervical:['αυχενικός','αυχενική','αυχενικό'],
 thoracic:['θωρακικός','θωρακική','θωρακικό'],
 lumbar:['οσφυϊκός','οσφυϊκή','οσφυϊκό'],
 sacral:['ιερός','ιερή','ιερό'],abdominal:['κοιλιακός','κοιλιακή','κοιλιακό'],
 dorsal:['ραχιαίος','ραχιαία','ραχιαίο'],
 palmar:['παλαμιαίος','παλαμιαία','παλαμιαίο'],
 plantar:['πελματιαίος','πελματιαία','πελματιαίο'],
 digital:['δακτυλικός','δακτυλική','δακτυλικό'],
 vertebral:['σπονδυλικός','σπονδυλική','σπονδυλικό'],
 spinal:['νωτιαίος','νωτιαία','νωτιαίο'],
 radial:['κερκιδικός','κερκιδική','κερκιδικό'],
 ulnar:['ωλένιος','ωλένια','ωλένιο'],
 femoral:['μηριαίος','μηριαία','μηριαίο'],
 tibial:['κνημιαίος','κνημιαία','κνημιαίο'],
 peroneal:['περονιαίος','περονιαία','περονιαίο'],
 fibular:['περονιαίος','περονιαία','περονιαίο'],
 iliac:['λαγόνιος','λαγόνια','λαγόνιο'],
 intercostal:['μεσοπλεύριος','μεσοπλεύρια','μεσοπλεύριο'],
 interlobar:['μεσολόβιος','μεσολόβια','μεσολόβιο'],
 interlobular:['μεσολοβιακός','μεσολοβιακή','μεσολοβιακό'],
 intervertebral:['μεσοσπονδύλιος','μεσοσπονδύλια','μεσοσπονδύλιο'],
 interventricular:['μεσοκοιλιακός','μεσοκοιλιακή','μεσοκοιλιακό'],
 lateralized:['πλευρικός','πλευρική','πλευρικό'],
 proximal:['εγγύς','εγγύς','εγγύς'],distal:['άπω','άπω','άπω'],
 superficial:['επιπολής','επιπολής','επιπολής'],
 deep:['εν τω βάθει','εν τω βάθει','εν τω βάθει'],
 proper:['ιδίως','ίδια','ίδιο'],common:['κοινός','κοινή','κοινό'],
 main:['κύριος','κύρια','κύριο'],primary:['πρωτεύων','πρωτεύουσα','πρωτεύον'],
 secondary:['δευτερεύων','δευτερεύουσα','δευτερεύον'],
 accessory:['επικουρικός','επικουρική','επικουρικό'],
 terminal:['τελικός','τελική','τελικό'],
 central:['κεντρικός','κεντρική','κεντρικό'],
 circumflex:['περισπώμενος','περισπώμενη','περισπώμενο'],
 ascending:['ανιών','ανιούσα','ανιόν'],
 descending:['κατιών','κατιούσα','κατιόν'],
 transverse:['εγκάρσιος','εγκάρσια','εγκάρσιο'],
 longitudinal:['επιμήκης','επιμήκης','επιμήκες'],
 arcuate:['τοξοειδής','τοξοειδής','τοξοειδές'],
 straight:['ευθύς','ευθεία','ευθύ'],
 oblique:['λοξός','λοξή','λοξό'],
 anteriorly:['πρόσθιος','πρόσθια','πρόσθιο'],
 lateral_basal:['έξω βασικός','έξω βασική','έξω βασικό'],
 posterior_basal:['οπίσθιος βασικός','οπίσθια βασική','οπίσθιο βασικό'],
 apical_basal:['κορυφαίος βασικός','κορυφαία βασική','κορυφαίο βασικό'],
 retroperitoneal:['οπισθοπεριτοναϊκός','οπισθοπεριτοναϊκή','οπισθοπεριτοναϊκό'],
 subcutaneous:['υποδόριος','υποδόρια','υποδόριο'],
 cutaneous:['δερματικός','δερματική','δερματικό'],
 muscular:['μυϊκός','μυϊκή','μυϊκό'],
 tendinous:['τενοντώδης','τενοντώδης','τενοντώδες'],
 perforating:['διατιτραίνων','διατιτραίνουσα','διατιτραίνον'],
 articular:['αρθρικός','αρθρική','αρθρικό'],
 posteriorly:['οπίσθιος','οπίσθια','οπίσθιο'],
 orbital:['κογχικός','κογχική','κογχικό'],
 ocular:['οφθαλμικός','οφθαλμική','οφθαλμικό'],
 optic:['οπτικός','οπτική','οπτικό'],
 lacrimal:['δακρυϊκός','δακρυϊκή','δακρυϊκό'],
 ciliary:['ακτινωτός','ακτινωτή','ακτινωτό'],
 nasal:['ρινικός','ρινική','ρινικό'],
 infraorbital:['υποκόγχιος','υποκόγχια','υποκόγχιο'],
 supraorbital:['υπερκόγχιος','υπερκόγχια','υπερκόγχιο'],
 facial:['προσωπικός','προσωπική','προσωπικό'],
 lingual:['γλωσσικός','γλωσσική','γλωσσικό'],
 mandibular:['κάτω γναθικός','κάτω γναθική','κάτω γναθικό'],
 maxillary:['άνω γναθικός','άνω γναθική','άνω γναθικό'],
 mammary:['μαστικός','μαστική','μαστικό'],
 lactiferous:['γαλακτοφόρος','γαλακτοφόρος','γαλακτοφόρο'],
 urinary:['ουροποιητικός','ουροποιητική','ουροποιητικό'],
 pelvic:['πυελικός','πυελική','πυελικό'],
 gastric:['γαστρικός','γαστρική','γαστρικό'],
 intestinal:['εντερικός','εντερική','εντερικό'],
 mesenteric:['μεσεντέριος','μεσεντέρια','μεσεντέριο'],
 splenic:['σπληνικός','σπληνική','σπληνικό'],
 sigmoid:['σιγμοειδής','σιγμοειδής','σιγμοειδές'],
 ovarian:['ωοθηκικός','ωοθηκική','ωοθηκικό'],
 uterine:['μητριαίος','μητριαία','μητριαίο'],
 testicular:['ορχικός','ορχική','ορχικό'],
 vertebrobasilar:['σπονδυλοβασικός','σπονδυλοβασική','σπονδυλοβασικό']
};
const ORD={first:['πρώτος','πρώτη','πρώτο'],second:['δεύτερος','δεύτερη','δεύτερο'],
 third:['τρίτος','τρίτη','τρίτο'],fourth:['τέταρτος','τέταρτη','τέταρτο'],
 fifth:['πέμπτος','πέμπτη','πέμπτο'],sixth:['έκτος','έκτη','έκτο'],
 seventh:['έβδομος','έβδομη','έβδομο'],eighth:['όγδοος','όγδοη','όγδοο'],
 ninth:['ένατος','ένατη','ένατο'],tenth:['δέκατος','δέκατη','δέκατο']};
const GI={m:0,f:1,n:2};
function sideGreek(side,gender){return side==='left'?{m:'αριστερός',f:'αριστερή',n:'αριστερό'}[gender]:{m:'δεξιός',f:'δεξιά',n:'δεξιό'}[gender];}
function cap(s){return s.charAt(0).toLocaleUpperCase('el')+s.slice(1);}
function breakWords(s){return s.toLowerCase().trim().replace(/\s+/g,' ').split(' ');}
function greekPhrase(s, depth=0){
 if(depth>5)return null;
 const original=String(s||'').replace(/\s+/g,' ').trim();
 if(!original)return null;
 const approved=anatomicalGreek(original);
 if(approved)return {el:approved,source:'curated'};
 // 'of' phrases require independent grammar edit; do not claim finished
 const of=original.match(/^(.+?) of (.+)$/i);
 if(of){
  const head=greekPhrase(of[1],depth+1),tail=greekPhrase(of[2],depth+1);
  if(head&&tail)return {el:head.el+' · '+tail.el,source:'compound-awaiting-genitive-review'};
  return null;
 }
 const tokens=breakWords(original),side=(tokens[0]==='left'||tokens[0]==='right')?tokens.shift():null;
 if(tokens[0]==='the')tokens.shift();
 // Translate simple compound heads, longest nouns first.
 let rootName=tokens[tokens.length-1];
 if(tokens.length>=2&&tokens.slice(-2).join(' ')==='bronchial tree'){rootName='bronchial_tree';tokens.splice(-2,2);}
 else if(tokens.length>=2&&tokens.slice(-2).join(' ')==='mammary gland'){rootName='mammary_gland';tokens.splice(-2,2);}
 else if(tokens.length>=2&&tokens.slice(-2).join(' ')==='aortic arch'){rootName='aortic_arch';tokens.splice(-2,2);}
 else tokens.pop();
 const noun=NOUNS[rootName];if(!noun)return null;
 const [name,gender]=noun,g=GI[gender];
 const adjectives=[];
 for(const token of tokens){
  if(ADJ[token])adjectives.push(ADJ[token][g]);
  else if(ORD[token])adjectives.push(ORD[token][g]);
  else return null;
 }
 let result=[...(side?[sideGreek(side,gender)]:[]),...adjectives,name].join(' ');
 return {el:cap(result),source:'compositional-awaiting-review'};
}
export function suggestGreek(name){return greekPhrase(name);}
