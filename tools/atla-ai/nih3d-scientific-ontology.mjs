/**
 * ATLA controlled educational concept vocabulary. Internal ATLA identifiers, NOT
 * SNOMED/FMA/ICD identifiers: do not manufacture third-party ontology mappings.
 * Matching source TITLE/category is research discovery, never clinical accuracy approval.
 */
const concepts=[
 ['patella','Επιγονατίδα',['patella','επιγονατιδ']],
 ['femur','Μηριαίο οστό',['femur','femoral','μηριαι']],
 ['tibia','Κνήμη',['tibia','tibial','κνημ']],
 ['fibula','Περόνη',['fibula','περον']],
 ['clavicle','Κλείδα',['clavicle','κλειδ']],
 ['pelvis','Πύελος',['pelvis','pelvic','acetabulum','πυελ']],
 ['humerus','Βραχιόνιο',['humerus','humeral','βραχιον']],
 ['skull','Κρανίο',['skull','cranial bone','κρανι']],
 ['wrist','Καρπός',['wrist','carpal','scaphoid','scafoid','καρπ']],
 ['elbow','Αγκώνας',['elbow','coronoid process','αγκων']],
 ['ankle','Ποδοκνημική',['ankle','talus','calcaneal','ποδοκνημ']],
 ['shoulder','Ώμος',['shoulder','glenoid','scapula','ωμ']],
 ['lumbar-spine','Οσφυϊκή μοίρα',['lumbar','οσφυ']],
 ['cervical-spine','Αυχενική μοίρα',['cervical spine','αυχεν']],
 ['thoracic-spine','Θωρακική μοίρα',['thoracic spine','θωρακικ']],
 ['vertebra','Σπόνδυλος',['vertebra','vertebral','σπονδυλ']],
 ['brain','Εγκέφαλος',['brain','cerebrum','εγκεφαλ']],
 ['brain-ventricles','Εγκεφαλικές κοιλίες',['brain ventricles','cerebral ventricles','εγκεφαλικ κοιλι']],
 ['medulla-oblongata','Προμήκης μυελός',['medulla oblongata','προμηκ μυελ']],
 ['corpus-callosum','Μεσολόβιο',['corpus callosum','μεσολοβ']],
 ['trachea','Τραχεία',['trachea','tracheal','τραχει']],
 ['lung','Πνεύμονας',['lung','pulmonary','πνευμον']],
 ['heart','Καρδιά',['heart','cardiac anatomy','καρδι']],
 ['aorta','Αορτή',['aorta','aortic','αορτ']],
 ['artery','Αρτηρία',['artery','arterial','αρτηρ']],
 ['vein','Φλέβα',['vein','venous','φλεβ']],
 ['kidney','Νεφρός',['kidney','renal','νεφρ']],
 ['uterus','Μήτρα',['uterus','uterine','μητρ']],
 ['teeth','Δόντια',['teeth','tooth','dental','δοντ']]
];
export const SCIENTIFIC_CONCEPTS=Object.freeze(concepts.map(([slug,greek,aliases])=>
 Object.freeze({id:'ATLA-ANATOMY-'+slug,slug,greek,aliases:Object.freeze(aliases)})));
export function simplifyText(value){
 return String(value??'').normalize('NFD').replace(/\p{M}/gu,'').toLocaleLowerCase('el').replace(/\s+/g,' ').trim();
}
function boundaryIncludes(text,alias){
 const needle=simplifyText(alias),haystack=simplifyText(text);
 const start=haystack.indexOf(needle);
 if(start===-1)return false;
 const en=/^[a-z0-9]/i.test(needle)&&/^[a-z0-9]+$/i.test(needle);
 // Ensure whole English terms. Greek aliases intentionally use declined-word stems.
 if(en){
  const pat=new RegExp('(^|[^a-z])'+needle.replace(/[.*+?^$\{\}()|[\]\\]/g,'\\$&')+'([^a-z]|$)','i');
  return pat.test(haystack);
 }
 return true;
}
const NONHUMAN=/(?:^|\W)(dog|rat|frog|mouse|horse|bovine|ovine|canine|feline|rhesus|macaque|rabbit|zebrafish|porcine)(?:\W|$)/i;
const DISEASE=/(fractur|fratur|surgical|post.op|tumou?r|malignan|arthritis|lesion|dislocat|osteochondroma|injur|trauma|coarctation)/i;
const FRACTURE=/(fractur|fratur|καταγμ|καταγμα)/i;
export function clinicalContextOfTitle(title){
 return FRACTURE.test(title)?'fracture':DISEASE.test(title)?'pathology_or_postoperative':'normal_or_unspecified';
}
export function suggestSourceConcepts(entry){
 // Molecular 'human bone morphogenetic protein' is NOT a femur model.
 if(String(entry.category)!=='Anatomy')return [];
 return SCIENTIFIC_CONCEPTS.filter(c=>c.aliases.some(alias=>boundaryIncludes(entry.title,alias))).map(c=>c.id);
}
export function screenSourceResearch(entry){
 const concepts=suggestSourceConcepts(entry);
 const nonhuman=NONHUMAN.test(entry.title??'');
 const pathology=clinicalContextOfTitle(entry.title??'');
 const license=entry.license??null;
 return {
  entryId:entry.entryId??entry.id,
  accession:entry.accession??null,title:entry.title??'',originalPage:entry.url??null,
  sourceCategory:entry.category??'',sourceVersion:entry.version??null,
  sourceLicenseRaw:entry.licenseRaw??license,license,
  modelFileReferences:Array.isArray(entry.files)?entry.files.length:0,
  conceptCandidates:concepts,
  speciesFlag:nonhuman?'explicitly_nonhuman':'human_or_unspecified',
  pathologyContext:pathology,
  sourceEvidence:entry.description?'NIH_metadata_description':'NIH_metadata_title_only',
  sourceCitationPresent:Boolean(entry.citation),
  reviewStatus:'SCIENTIFIC_REVIEW_NOT_COMPLETED',
  suitableForClinicalAdvice:false,
  humanAnatomyResearchCandidate:concepts.length>0&&!nonhuman,
  originalSourceGeometryVerifiedByThisScreen:false
 };
}
export function suggestObjectiveConcepts(objective){
 return SCIENTIFIC_CONCEPTS.filter(c=>c.aliases.some(alias=>boundaryIncludes(objective,alias))).map(c=>c.id);
}
/**
 * A clinically unreviewed research model may be suggested as an external source
 * but must NEVER be rendered as a clinically approved model. No exam hints.
 */
export function selectScientificSources(rows,{surface,objective='',examAnswerRevealed=false,confirmedClinicalStructure=false,
  clinicalCondition=null,requireDisplay3D=false,approvedModelIds=[],limit=3}={}){
 if(!['lesson','exam','cockpit','anatomy'].includes(surface))return [];
 if(surface==='exam'&&!examAnswerRevealed)return [];
 if(surface==='cockpit'&&!confirmedClinicalStructure)return [];
 const target=new Set(suggestObjectiveConcepts(objective));
 if(!target.size)return [];
 const approved=new Set(approvedModelIds.map(Number));
 const matches=rows.filter(row=>
   row.humanAnatomyResearchCandidate&&row.speciesFlag!=='explicitly_nonhuman'&&
   row.conceptCandidates.some(id=>target.has(id))&&
   row.originalPage?.startsWith('https://3d.nih.gov/entries/3DPX-')&&
   (row.pathologyContext==='normal_or_unspecified' || clinicalCondition===row.pathologyContext ||
    (clinicalCondition==='fracture'&&row.pathologyContext==='fracture'))&&
   (!requireDisplay3D||approved.has(Number(row.entryId)))
 );
 return matches.slice(0,Math.max(0,Math.min(10,Number(limit)||3))).map(row=>({
  id:row.entryId,title:row.title,sourcePage:row.originalPage,
  evidence:row.sourceEvidence,clinicalValidation:approved.has(Number(row.entryId))?'REVIEWED_EXTERNALLY':'NOT_ESTABLISHED',
  role:requireDisplay3D?'reviewer-approved-educational-3d':'official-research-reference-only'
 }));
}
