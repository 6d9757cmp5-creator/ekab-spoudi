/**
 * Which shared-library models may appear in the student anatomy atlas.
 *
 * The shared registry keeps every record and file (nothing is deleted); this module only
 * decides what the learner sees. A model is shown when it depicts recognisable human
 * anatomy with educational value and usable rights. Pathology stays available only as a
 * clearly labelled example, never as normal anatomy. Everything else (molecules, cells,
 * viruses, devices, prostheses, animal or veterinary specimens, CAD constructs, phantoms,
 * simulator characters, post-operative states) is hidden from the atlas.
 *
 * NIH records the earlier import had classified as anatomy/pathology were checked for
 * non-human species. The 99 "Ανατομία" records without a classification were reviewed
 * one by one from their original title (2026-11-10); records whose species or content
 * could not be confirmed from the title stay hidden until reviewed.
 */

export const ATLAS_ROLES=Object.freeze({anatomy:'Φυσιολογική ανατομία',pathology:'Παθολογικό παράδειγμα'});

const ANATOMY_SOURCES=new Set(['hra','z-anatomy']);
const CHARACTER_SOURCES=new Set(['quaternius','patients','makehuman','makehuman-rigged']);
const NON_ANATOMY_CATEGORIES=new Set(['Βιομακρομόριο','Κύτταρα και οργανίδια','Προσθετική','Συσκευή','Ιός','Μικρό μόριο']);

// Manual decisions for NIH "Ανατομία" records that had no anatomy/pathology classification.
const REVIEWED=new Map([
 // Normal human anatomy.
 ...['3DPX-000010','3DPX-000718','3DPX-000761','3DPX-001277','3DPX-002604','3DPX-003410','3DPX-011384',
  '3DPX-011385','3DPX-012628','3DPX-012629','3DPX-014739','3DPX-020992','3DPX-021022','3DPX-021332',
  '3DPX-022818','3DPX-023600','3DPX-023604','3DPX-023607'].map(id=>[id,{role:'anatomy',reason:'Ανθρώπινη ανατομική δομή (έλεγχος τίτλου)'}]),
 // Human pathology, kept only as labelled examples.
 ...['3DPX-000329','3DPX-000332','3DPX-000341','3DPX-000349','3DPX-000406','3DPX-000581','3DPX-000806',
  '3DPX-001203','3DPX-001204','3DPX-001560','3DPX-003250','3DPX-003267','3DPX-003854','3DPX-005000',
  '3DPX-007477','3DPX-007496','3DPX-008908','3DPX-009507','3DPX-009508','3DPX-012831','3DPX-012832',
  '3DPX-012834','3DPX-012835','3DPX-016081','3DPX-016412','3DPX-020871','3DPX-020872','3DPX-021281',
  '3DPX-021609','3DPX-021675','3DPX-023687'].map(id=>[id,{role:'pathology',reason:'Ανθρώπινη παθολογία ή ανατομική παραλλαγή (έλεγχος τίτλου)'}]),
 // Hidden: animal or likely veterinary specimens.
 ...['3DPX-002058','3DPX-003952','3DPX-004542','3DPX-008970','3DPX-022753','3DPX-023220','3DPX-023244',
  '3DPX-004653','3DPX-004654','3DPX-004656','3DPX-004799','3DPX-004800','3DPX-004812','3DPX-004814',
  '3DPX-004819','3DPX-004821','3DPX-004922','3DPX-004923'].map(id=>[id,{role:null,reason:'Ζωικό ή πιθανώς κτηνιατρικό δείγμα'}]),
 // Hidden: constructs, phantoms, prostheses, anthropometric forms, imaging maps.
 ...['3DPX-000451','3DPX-000452','3DPX-004452','3DPX-009352','3DPX-015142','3DPX-020403','3DPX-003145',
  '3DPX-021799'].map(id=>[id,{role:null,reason:'Κατασκευή, ομοίωμα ή απεικονιστικός χάρτης, όχι ανατομική δομή'}]),
 // Hidden: post-operative states, fetal development, incomplete or unclear records.
 ...['3DPX-000395','3DPX-001334','3DPX-004318'].map(id=>[id,{role:null,reason:'Μετεγχειρητική κατάσταση εκτός ύλης'}]),
 ...['3DPX-002766','3DPX-003377'].map(id=>[id,{role:null,reason:'Εμβρυϊκή ανάπτυξη εκτός ύλης διασώστη'}]),
 ...['3DPX-000528','3DPX-008931','3DPX-023523'].map(id=>[id,{role:null,reason:'Ελλιπές ή δοκιμαστικό αρχείο'}]),
 ...['3DPX-001549','3DPX-001558','3DPX-001617','3DPX-003091','3DPX-003092','3DPX-003093','3DPX-003095',
  '3DPX-003096','3DPX-003097','3DPX-003098','3DPX-004418','3DPX-008097','3DPX-008610','3DPX-008635',
  '3DPX-018266','3DPX-020227'].map(id=>[id,{role:null,reason:'Το είδος ή το περιεχόμενο δεν επιβεβαιώνεται από τον τίτλο· αναμένει έλεγχο'}]),
]);

/** @returns {{role:'anatomy'|'pathology'|null, reason:string}} role null = hidden from the atlas */
export function atlasRole(model){
 if(!model||typeof model!=='object')return {role:null,reason:'Άκυρη εγγραφή'};
 if(CHARACTER_SOURCES.has(model.source))return {role:null,reason:'Χαρακτήρας προσομοιωτή, όχι ανατομικό μοντέλο'};
 if(ANATOMY_SOURCES.has(model.source))return {role:'anatomy',reason:'Ανατομικός άτλαντας αναφοράς'};
 if(model.source!=='nih3d')return {role:null,reason:'Άγνωστη πηγή'};
 if(model.restrictionCode||/OUT_OF/.test(model.scopeStatus||''))return {role:null,reason:'Περιορισμός πηγής ή εκτός πεδίου'};
 if(!model.delivery?.path)return {role:null,reason:'Μόνο μεταδεδομένα, χωρίς αρχείο'};
 if(NON_ANATOMY_CATEGORIES.has(model.category))return {role:null,reason:'Μη ανατομικό αντικείμενο ('+model.category+')'};
 if(model.kind==='anatomy')return {role:'anatomy',reason:'Ταξινομημένη ανθρώπινη ανατομία'};
 if(model.kind==='pathology')return {role:'pathology',reason:'Ταξινομημένη ανθρώπινη παθολογία'};
 return REVIEWED.get(model.id)||{role:null,reason:'Δεν έχει ελεγχθεί για τον άτλαντα'};
}

export function atlasModels(models){
 return (models||[]).map(model=>({model,...atlasRole(model)})).filter(x=>x.role);
}

/*
 * «Λεπτομερής εξερεύνηση»: which registry structures (vocabulary keys) a structure selected
 * in the whole-body atlas belongs to. Matching uses the English source name of the mesh and
 * whole anatomical terms only, never word fragments: "left ventricle" is the heart, "lateral
 * ventricle" is the brain, and the Greek "κοιλία" alone decides nothing.
 */
const DETAIL_RULES=[
 [/\b(lateral|third|fourth) ventricle|choroid plexus|cerebral aqueduct/,['brain-ventricles','brain']],
 [/coronary/,['coronary','heart']],
 [/\b(left|right) (ventricle|atrium|auricle)\b|\bheart\b|cardiac|myocard|pericard|endocard|papillary muscle|chordae|interventricular|interatrial|(mitral|tricuspid|bicuspid) valve|(aortic|pulmonary) valve|sinoatrial|atrioventricular/,['heart']],
 [/aort/,['aorta']],
 [/corpus callosum/,['corpus-callosum','brain']],
 [/medulla oblongata/,['medulla-oblongata','brain']],
 [/cerebr|cerebell|\bgyrus|sulcus|thalam|hippocamp|amygdal|\bpons\b|midbrain|brain|caudate|putamen|globus pallidus|insula\b|(frontal|parietal|occipital|temporal) lobe/,['brain']],
 [/spinal cord|cauda equina/,['spinal-cord']],
 [/menisc|cruciate|\bknee\b/,['knee']],
 [/patell/,['patella','knee']],
 [/femur|femora$|femoral head|greater trochanter/,['femur']],
 [/tibia/,['tibia']],
 [/fibula/,['fibula']],
 [/calcane/,['calcaneus','foot']],
 [/\btalus\b/,['talus','ankle','foot']],
 [/metatars|\btarsal|navicular|cuboid|cuneiform|phalan[a-z]* of (the )?foot|toe/,['foot']],
 [/scaphoid/,['scaphoid','wrist','hand']],
 [/metacarp|\bcarpal|lunate|triquetr|pisiform|trapezi|capitate|hamate|phalan[a-z]* of (the )?hand|finger|thumb/,['hand','wrist']],
 [/\bradius\b|\bulna\b/,['forearm','elbow']],
 [/humer/,['humerus','shoulder']],
 [/clavic/,['clavicle','shoulder']],
 [/scapul/,['scapula','shoulder']],
 [/sacrum|sacral|coccy/,['sacrum','pelvis']],
 [/hip bone|\bilium\b|ischium|pubi|acetabul|pelvi(?!s of)/,['pelvis','hip']],
 [/\brib\b|\bribs\b|costal/,['ribs']],
 [/stern/,['sternum','ribs']],
 [/\b(atlas|axis)\b|cervical vertebra/,['cervical-spine','spine']],
 [/thoracic vertebra/,['thoracic-spine','spine']],
 [/lumbar vertebra/,['lumbar-vertebra','lumbar-spine','spine']],
 [/intervertebral|vertebra|vertebral column|^spine$/,['spine']],
 [/^thorax$/,['ribs','sternum']],
 [/^airways$/,['upper-airway','trachea','bronchi']],
 [/mandib|maxill/,['jaw','face']],
 [/nasal|\bnose\b/,['nose','face']],
 [/zygomat|lacrimal|palatine|vomer/,['face']],
 [/skull|cranial|cranium|(frontal|parietal|occipital|temporal|sphenoid|ethmoid) bone/,['skull']],
 [/renal pelvis/,['renal-pelvis','kidney']],
 [/kidney|renal/,['kidney']],
 [/liver|hepat/,['liver']],
 [/spleen|splenic/,['spleen']],
 [/stomach|gastric/,['stomach']],
 [/urinary bladder|\bbladder\b/,['bladder']],
 [/trachea/,['trachea']],
 [/bronch/,['bronchi','lung']],
 [/\blung|pulmonary lobe|lobe of (left|right) lung/,['lung']],
 [/larynx|laryngeal|epiglott|thyroid cartilage|cricoid/,['larynx','upper-airway']],
 [/pharyn/,['upper-airway']],
 [/eyeball|\beye\b|retina|cornea|\blens\b|sclera|\biris\b/,['eye']],
 [/uter/,['uterus']],
 [/ovar/,['ovary']],
 [/placenta/,['placenta']],
 [/thymus/,['thymus']],
];
export function detailKeysForStructure(english){
 const name=String(english||'').toLowerCase();
 if(!name)return [];
 for(const [pattern,keys] of DETAIL_RULES)if(pattern.test(name))return keys;
 return [];
}
const fold=v=>String(v||'').normalize('NFD').replace(/\p{M}/gu,'').toLocaleLowerCase('el');
/** True when a curated model shows one of the requested registry structures. */
export function modelShowsStructures(model,keys,vocabulary={}){
 if(!keys.length||!model)return false;
 if(model.source==='nih3d')return (model.structures||[]).some(id=>keys.includes(id));
 // HRA / Z-Anatomy records have no structure ids: compare whole Greek terms in the title.
 const title=' '+fold(model.greekTitle||model.label).replace(/[^\p{L}\p{N}]+/gu,' ')+' ';
 return keys.some(key=>{const greek=fold(vocabulary[key]?.greek);return greek&&title.includes(' '+greek+' ');});
}
