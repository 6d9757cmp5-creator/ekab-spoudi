/**
 * Read-only source-provenance inventory for the ATLA glossary.
 * Checking link metadata never establishes scientific truth.
 */
import assert from 'node:assert/strict';
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
const glossary=JSON.parse(readFileSync('medical-terms.json','utf8'));
const items=glossary.items;
assert(Array.isArray(items),'Glossary is not an array');
assert.equal(glossary.count,items.length,'Stated and actual glossary counts differ');
const names=new Set(),distribution={};
for(const item of items){
 assert.equal(typeof item.term,'string');
 assert.equal(typeof item.definition,'string');
 assert(!names.has(item.term),'Duplicate glossary term: '+item.term);
 names.add(item.term);
 assert(typeof item.source==='string'&&item.source.startsWith('https://'),'Missing HTTPS source '+item.term);
 const kind=item.sourceType||'unset';
 distribution[kind]=(distribution[kind]||0)+1;
 if(kind==='direct-section'){
   assert(item.sourceSection&&item.sourceVersion&&item.sourceCrosscheck,'Incomplete direct provenance '+item.term);
   assert.equal(item.sourceCrosscheck,'2026-11-04-primary-section');
 }
}
const mapped=[
 ['Καρδιοπνευμονική αναζωογόνηση','adult-basic-life-support-guidelines'],
 ['Αναφυλαξία','Emergency%20Treatment%20of%20Anaphylaxis%20May%202021_0.pdf'],
 ['Αεραγωγός','22-1-organs-and-structures-of-the-respiratory-system'],
 ['Ηλεκτροκαρδιογράφημα','lab-tests/electrocardiogram/'],
 ['Αγγειακό εγκεφαλικό επεισόδιο','/stroke.html'],
 ['Αυτόματος εξωτερικός απινιδωτής','adult-basic-life-support-guidelines'],
 ['Απινίδωση','Adult%20ALS%20algorithm%202025.pdf'],
 ['Αρτηριακή πίεση','highbloodpressure.html'],
 ['Αρρυθμία','arrhythmia.html'],
 ['Αναιμία','anemia.html'],
 ['Βιοψία','dictionaries/cancer-terms/def/biopsy'],
 ['Καρδιακή ανακοπή','suddencardiacarrest.html'],
 ['Έμφραγμα μυοκαρδίου','heartattack.html'],
 ['Επιληπτική κρίση','seizures.html'],
 ['Επιληψία','epilepsy.html'],
 ['Πνευμοθώρακας','ency/article/000087.htm'],
 ['Πνευμονική εμβολή','health/pulmonary-embolism'],
 ['Υπογλυκαιμία','hypoglycemia.html'],
 ['Υποξία','books/NBK482316/'],
 ['Υποξαιμία','books/NBK482316/'],
 ['Κορεσμός οξυγόνου','lab-tests/pulse-oximetry/']
];
for(const [term,path] of mapped){
 const record=items.find(x=>x.term===term);
 assert(record&&record.sourceType==='direct-section',term+' lacks specific primary-source crosscheck');
 assert(record.source.includes(path),'Wrong official citation location for '+term);
 if(term==='Αναφυλαξία')assert(record.sourcePage===7,'Anaphylaxis source must identify guideline printed page 7');
}
const cpr=items.find(x=>x.term==='Καρδιοπνευμονική αναζωογόνηση');
assert.match(cpr.definition,/συμπιέσεις.*κυκλοφορίας.*αερισμούς.*αναπνοής/,'CPR roles are clinically ambiguous');
assert(cpr.independentSource?.includes('cpr.heart.org/en/resuscitation-science/cpr-and-ecc-guidelines/adult-basic-life-support'),'Missing independent AHA BLS source');
const report={date:'2026-11-04',source:'medical-terms.json',total:items.length,
 distribution,sourceSectionMapped:items.filter(x=>x.sourceType==='direct-section').length,
 sourceSectionCoveragePercent:Math.round(10000*(distribution['direct-section']||0)/items.length)/100,
 notes:['Source links alone do not validate clinical correctness.','Unmapped entries must not be presented as claim-by-claim certified.','This audit does not verify live URLs or conduct a second-model review.'],
 releaseStatus:'BLOCKED_INCOMPLETE_CLAIM_LEVEL_PROVENANCE'};
mkdirSync('audit-results',{recursive:true});
writeFileSync('audit-results/atla-glossary-source-coverage-20261104.json',JSON.stringify(report,null,2)+'\n');
if(report.sourceSectionMapped<items.length&&process.env.ATLA_CLAIM_ALL_SOURCES_VERIFIED==='true')
 throw Error('Cannot assert ATLA source certification with '+report.sourceSectionMapped+'/'+items.length+' mappings');
console.log('ATLA_PRIMARY_SOURCE_COVERAGE',report.sourceSectionMapped+'/'+items.length,JSON.stringify(distribution),'RELEASE',report.releaseStatus);
