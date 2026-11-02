#!/usr/bin/env node
// NIH3D medical relevance classifier: conservative triage, not final scientific review.
// Input: JSON array of NIH entries or {entries:[...]}; output: JSON lines to stdout.
import fs from 'node:fs';
const path=process.argv[2];
if(!path){console.error('Usage: node scripts/nih3d-medical-classify.mjs <entries.json>');process.exit(2);}
const data=JSON.parse(fs.readFileSync(path,'utf8'));
const entries=Array.isArray(data)?data:Array.isArray(data.entries)?data.entries:null;
if(!entries)throw new Error('Expected array or {entries: array}');
const rules=[
 ['anatomy',/anatom|organ|skeleton|bone|muscle|arter|vein|nerve|tissue|cranial|spine|vertebr|skull|pelvis/i],
 ['cardiovascular',/cardi|heart|coronar|vascular|aorta|ventric|atrium|myocard|electrocard/i],
 ['respiratory',/lung|bronch|trache|alveol|airway|respirat|pulmon/i],
 ['neurology',/brain|neuro|cerebr|spinal cord|stroke|neuron/i],
 ['pathology',/patholog|tumou?r|cancer|disease|fracture|injur|trauma|infection|inflamm|lesion/i],
 ['microbiology',/bacter|virus|viral|microb|fung|parasite|pathogen/i],
 ['molecular-medicine',/protein|receptor|enzyme|dna|rna|molecul|cellular|antibod|antigen/i],
 ['obstetrics-pediatrics',/foet|fet|uterus|placenta|pregnan|neonat|pediatr|embryo/i],
 ['pharmacology',/pharmac|drug|medicat|therapeut|toxicolog/i],
 ['clinical-tools',/medical|clinical|surg|patient|diagnos|catheter|implant|prosthe/i]
];
for(const e of entries){
 const text=[e.title,e.name,e.description,e.summary,e.tags,e.keywords,e.category].flat().filter(Boolean).join(' ');
 const matched=rules.filter(([,re])=>re.test(text)).map(([name])=>name);
 const decision=matched.length?'medical_candidate':'manual_review';
 process.stdout.write(JSON.stringify({id:e.id??e.accession??null,title:e.title??e.name??null,decision,specialties:matched,reviewRequired:true,sourceLicense:e.license??null})+'\n');
}
