import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {validateClinicalDesk,searchClinical,lookupClinical,fallbackSources,normalize,terms,isDirectTreatmentRequest,CLINICAL_STATUS} from './clinical-engine.mjs';

const dir=dirname(fileURLToPath(import.meta.url));
const sources=JSON.parse(await readFile(join(dir,'sources.json'),'utf8'));
const library=JSON.parse(await readFile(join(dir,'reference-questions.json'),'utf8'));
const copy=x=>JSON.parse(JSON.stringify(x));

test('Actual 51 original Greek clinical prompts cover 17 specialties with 14 verified publisher directories',()=>{
 const v=validateClinicalDesk({sources,library});
 assert.equal(v.library.records.length,51);
 assert.equal(v.library.specialties.length,17);
 assert.equal(v.sources.sources.length,14);
 assert.equal(v.sources.clinical_retrieval_enabled,false);
 assert.equal(v.sources.model_training_enabled,false);
 assert.equal(v.library.ai_model,false);
 assert.equal(v.library.medical_license,false);
 assert.equal(v.library.clinical_use_allowed,false);
 assert.equal(v.library.official_grade_effect,false);
 assert.ok(v.library.records.every(x=>x.review_status===CLINICAL_STATUS));
 assert.ok(v.sources.sources.every(x=>x.content_ingested===false));
});
test('Each specialty has three distinct, substantive learning prompts and linked official sources',()=>{
 const refs=new Set(sources.sources.map(x=>x.id));
 for(const specialty of library.specialties){
  const prompts=library.records.filter(x=>x.specialty===specialty.id);
  assert.equal(prompts.length,3,specialty.id);
  assert.equal(new Set(prompts.map(x=>x.question)).size,3);
  for(const prompt of prompts){
   assert.ok(prompt.framework.length>120);
   assert.ok(prompt.verify.length>50);
   assert.ok(prompt.caution.length>50);
   assert.ok(prompt.source_ids.every(id=>refs.has(id)));
   assert.equal(prompt.clinical_use_allowed,false);
   assert.equal(prompt.citation_granularity,'topical-guideline-index-not-claim-level');
  }
 }
});
test('Greek, English and acronym routing finds relevant physician-reference topics without invention',()=>{
 assert.equal(normalize('ΚΑΡΔΙΆ'),'καρδια');
 assert.ok(terms('Πνευμονική εμβολή').includes('pulmonology'));
 assert.ok(searchClinical(library,{query:'καρδιακή ανεπάρκεια'}).some(x=>x.specialty==='cardiology'));
 assert.ok(searchClinical(library,{query:'πνευμονική εμβολή'}).some(x=>x.specialty==='pulmonology'));
 assert.ok(searchClinical(library,{query:'eGFR κρεατινίνη'}).some(x=>x.specialty==='nephrology'));
 assert.ok(searchClinical(library,{query:'πυρετός ουδετεροπενία'}).some(x=>x.specialty==='oncology'));
 assert.ok(searchClinical(library,{query:'αναιμία MCV'}).some(x=>x.specialty==='hematology'));
 assert.equal(searchClinical(library,{query:'εξωπλανητικό σωματίδιο κάπως ανύπαρκτο'}).length,0);
});
test('Clinician source routing returns only pre-authored conceptual framework and actual linkable citations',()=>{
 const answer=lookupClinical({sources,library,question:'Γιατί η HbA1c δεν αρκεί στο διαβήτη τύπου 2 και νεφρική νόσο'});
 assert.ok(answer);
 assert.equal(answer.review_status,'human-review-pending');
 assert.equal(answer.medical_license,false);
 assert.equal(answer.clinical_decision,false);
 assert.equal(answer.source_level,'topic-directory');
 assert.ok(answer.references.length>0);
 assert.ok(answer.references.every(s=>s.url.startsWith('https://')));
 assert.ok(!Object.hasOwn(answer,'treatment'));
 assert.equal(lookupClinical({sources,library,question:'ακατανόητος αστροναύτης εξωγαλαξιακός'}),null);
 assert.equal(lookupClinical({sources,library,question:'β'}),null);
 assert.equal(fallbackSources(sources).length,2);
});
test('A fabricated publisher, fake clinical approval, changed source and broken category all fail closed',()=>{
 const badSource=copy(sources);
 badSource.sources[0].url='javascript:alert(1)';
 assert.throws(()=>validateClinicalDesk({sources:badSource,library}),/invalid-clinical-source/);
 const badApproval=copy(library);
 badApproval.records[0].clinical_use_allowed=true;
 assert.throws(()=>validateClinicalDesk({sources,library:badApproval}),/invalid-clinical-record/);
 const wrongCitation=copy(library);
 wrongCitation.records[0].source_ids=['fictional-guideline'];
 assert.throws(()=>validateClinicalDesk({sources,library:wrongCitation}),/invalid-clinical-record/);
 const erased=copy(library);
 erased.records.pop();
 assert.throws(()=>validateClinicalDesk({sources,library:erased}),/invalid-clinical-desk/);
 const rightsChanged=copy(sources);
 rightsChanged.sources[3].content_ingested=true;
 assert.throws(()=>validateClinicalDesk({sources:rightsChanged,library}),/invalid-clinical-source/);
});
test('Reference lookup is deterministic and does not modify clinical data or official progress',()=>{
 const before=JSON.stringify({sources,library});
 const a=lookupClinical({sources,library,question:'διαφορική διάγνωση δύσπνοιας'});
 const b=lookupClinical({sources,library,question:'διαφορική διάγνωση δύσπνοιας'});
 assert.deepEqual(a,b);
 assert.equal(before,JSON.stringify({sources,library}));
 assert.equal(library.records.some(x=>Object.hasOwn(x,'official_grade')),false);
 assert.equal(library.records.some(x=>/((\d+(?:[.,]\d+)?)\s*(?:mg|mcg|mL))\b/i.test(x.framework)),false);
});

test('Individual treatment requests are never redirected to unrelated specialist teaching cards',()=>{
 assert.equal(isDirectTreatmentRequest('Ποια θεραπεία να δώσω;'),true);
 assert.equal(isDirectTreatmentRequest('τι φάρμακο να χορηγήσω;'),true);
 assert.equal(isDirectTreatmentRequest('Πόση δόση να δώσω;'),true);
 assert.equal(lookupClinical({sources,library,question:'Ποια θεραπεία να δώσω;'}),null);
 assert.equal(isDirectTreatmentRequest('Τι σημαίνει η καρδιακή ανεπάρκεια;'),false);
 assert.equal(isDirectTreatmentRequest('Διαφορική διάγνωση δύσπνοιας'),false);
});
