#!/usr/bin/env node
/** Conservative NIH3D triage. No uncertain biomedical record is silently excluded. */
import fs from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
const RULES=[
 ['anatomy',/\b(anatom\w*|skeleton|bone|bones|muscle|arter\w*|vein\w*|nerve\w*|organ|organs|tissue|cranial|spine|vertebr\w*|skull|pelvis|femur|patella|tibia|fibula|humerus|clavicle|scapula|sternum|cartilage|ligament|tendon)\b/i],
 ['cardiovascular',/\b(cardi\w*|heart|coronar\w*|vascular|aorta|ventric\w*|atri\w*|myocard\w*|electrocard\w*)\b/i],
 ['respiratory',/\b(lung|lungs|bronch\w*|trache\w*|alveol\w*|airway|respirat\w*|pulmon\w*)\b/i],
 ['neurology',/\b(brain|neuro\w*|cerebr\w*|spinal|stroke|neuron\w*|encephal\w*)\b/i],
 ['pathology',/\b(patholog\w*|tumou?r\w*|cancer|disease\w*|fracture\w*|injur\w*|trauma\w*|infection\w*|inflamm\w*|lesion\w*|malignan\w*|sepsis|diabet\w*|alzheimer\w*)\b/i],
 ['microbiology',/\b(bacter\w*|virus|viral|virolog\w*|microb\w*|fung\w*|parasite\w*|pathogen\w*|hiv|influenza|sars|mycobacter\w*|plasmod\w*)\b/i],
 ['molecular-medicine',/\b(protein\w*|receptor\w*|enzyme\w*|dna|rna|molecul\w*|cell\w*|antibod\w*|antigen\w*|ribosom\w*|genom\w*|hemoglobin|haemoglobin)\b/i],
 ['obstetrics-pediatrics',/\b(foet\w*|fet\w*|uter\w*|placenta\w*|pregnan\w*|neonat\w*|pediatr\w*|embryo\w*)\b/i],
 ['pharmacology',/\b(pharmac\w*|drug\w*|medicat\w*|therapeut\w*|toxicolog\w*|inhibitor\w*|insulin|antibiotic\w*)\b/i],
 ['clinical-tools',/\b(medical|clinical|surg\w*|patient\w*|diagnos\w*|catheter\w*|implant\w*|prosthe\w*|splint\w*|stethoscope|ventilat\w*|ambulance)\b/i]
];
const STRONG=new Set(['anatomy','cardiovascular','respiratory','neurology','pathology','obstetrics-pediatrics','pharmacology','clinical-tools']);
const BIO=new Set(['biomacromolecules','cells and organelles','viruses']);
const ALLOWED=new Set(['public domain','cc by 4.0','cc0 1.0']);
const clean=v=>Array.isArray(v)?v.map(clean).join(' '):v==null?'':String(v).replace(/<[^>]*>/g,' ').replace(/&(?:nbsp|amp|quot|lt|gt);/gi,' ');
export function classifyEntry(e){
 const title=clean(e.title??e.name).trim(),category=clean(e.category).trim(),cat=category.toLowerCase();
 const detail=[e.title,e.name,e.description,e.summary,e.tags,e.keywords].map(clean).join(' ');
 const topics=RULES.filter(([,re])=>re.test(detail)).map(([topic])=>topic);
 // 'human' and 'body' alone are not anatomy evidence: molecular structures also carry those words.
 const direct=cat==='anatomy'||(!BIO.has(cat)&&topics.some(x=>STRONG.has(x)));
 const bio=BIO.has(cat)||topics.includes('molecular-medicine')||topics.includes('microbiology');
 const decision=direct?'medical_candidate':bio?'manual_review':cat==='devices and hardware'?'non_medical_candidate':'manual_review';
 const originalLicense=e.license??e.licenseRaw??null;
 const licensing=originalLicense&&ALLOWED.has(String(originalLicense).trim().toLowerCase())?'catalog_license_allows_with_conditions':'license_review_required';
 return {id:e.entryId??e.id??null,accession:e.accession??null,title,category,decision,topics,
  reviewRequired:true,originalLicense,licensing,sourceUrl:e.url??null,sourceVersion:e.version??null,
  fileCount:(e.files??[]).length,formats:[...new Set((e.files??[]).map(x=>x.format).filter(Boolean))],
  contextualSelectionRequired:true};
}
export function extractEntries(data){
 if(Array.isArray(data))return data;
 if(Array.isArray(data?.items))return data.items;
 if(Array.isArray(data?.entries))return data.entries;
 throw Error('Expected array, NIH segment {items: [...]}, or {entries: [...]}');
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const filename=process.argv[2];
 if(!filename){console.error('Usage: node scripts/nih3d-medical-classify.mjs <NIH-segment.json>');process.exit(2);}
 for(const item of extractEntries(JSON.parse(fs.readFileSync(filename,'utf8')))){
  process.stdout.write(JSON.stringify(classifyEntry(item))+'\n');
 }
}
