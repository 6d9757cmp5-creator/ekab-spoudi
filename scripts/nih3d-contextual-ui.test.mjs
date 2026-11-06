import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {selectLibraryModels} from '../tools/atla-ai/nih3d-library.mjs';
import {mountNih3dResearchReferences} from '../tools/atla-ai/nih3d-learning-surface.mjs';
import {getApprovedOriginalSourceLink,normalizeNihEntry} from '../tools/atla-ai/nih3d-original-source-gateway.mjs';
const library=JSON.parse(readFileSync('tools/atla-ai/resources/model-library.json','utf8'));
const pick=context=>selectLibraryModels(library,context)[0]?.accession??null;
const PATELLA='3DPX-000170';
assert.equal(mountNih3dResearchReferences(),'no-dom');
// The library has expanded: the chapter shows up to three highest-ranked models, not a fixed accession.
const selectedLessonModels=selectLibraryModels(library,{surface:'lesson',courseId:'01',chapterId:'2'});
assert(selectedLessonModels.length>0&&selectedLessonModels.length<=3,'Chapter links remain relevant and bounded');
assert(selectedLessonModels.every(m=>m.saekChapters?.some(c=>c.chapter==='01/2')),'Top-ranked links must have evidence in the chapter');
assert(library.models.find(m=>m.accession===PATELLA)?.saekChapters?.some(c=>c.chapter==='01/2'),
 'Patella remains linked to the chapter even if higher-ranked models take the three visible slots');
assert.equal(pick({surface:'lesson',courseId:'01',chapterId:'1'}),null);
assert.equal(pick({surface:'exam',text:'Τι γνωρίζεις για την επιγονατίδα;',revealed:false}),null);
assert.equal(pick({surface:'exam',text:'Τι γνωρίζεις για την επιγονατίδα;',revealed:true}),PATELLA);
assert.equal(pick({surface:'cockpit',text:'Επιγονατίδα',confirmedAnatomy:false}),null);
assert.equal(pick({surface:'cockpit',text:'Τροχαίο, πιθανό τραύμα',confirmedAnatomy:true}),null);
assert.equal(pick({surface:'cockpit',text:'Επιγονατίδα',confirmedAnatomy:true}),PATELLA);
assert.equal(pick({surface:'anatomy',text:'Επιγονατίδες'}),PATELLA);
assert.equal(pick({surface:'anatomy',text:'Σπονδυλική στήλη'}),null);
assert.equal(pick({surface:'learning',text:'Επιγονατίδα'}),null);
const patella=library.models.find(m=>m.accession===PATELLA);
assert.equal(patella.originalPage,'https://3d.nih.gov/entries/3DPX-000170');
assert.equal(patella.scientificApproval,'NOT_ESTABLISHED');
assert.equal(patella.clinicalUseApproved,false);
const catalog=JSON.parse(readFileSync('tools/atla-ai/resources/nih3d-master-plan-2026/segments/entries-1-500.json','utf8'));
const row=catalog.items.find(x=>x.entryId===170);
assert(row,'Original NIH patella record missing');
assert.equal(row.title,patella.originalTitle);
assert.equal(row.license,patella.license);
assert.equal(row.url,patella.originalPage);
assert.equal(getApprovedOriginalSourceLink(normalizeNihEntry(row)),null,'A scientific approval is still not implied');
for(const [file,needle] of [
 ['saek-exams.html','tools/atla-ai/nih3d-learning-surface.mjs'],
 ['mentor-next.html','tools/atla-ai/nih3d-learning-surface.mjs'],
 ['ui-tools/anatomy-3d/index.html','tools/atla-ai/nih3d-learning-surface.mjs'],
 ['ui-tools/anatomy-3d/saek-jumps.js','nih3d-learning-surface.mjs'],
 ['saek-exams.js','atla:saek-exam-question'],
 ['tools/patient-simulator/app/next-sim.mjs','atla:nih3d-cockpit-anatomy']]){
 assert(readFileSync(file,'utf8').includes(needle),'Missing integration: '+file);
}
console.log('ATLA NIH contextual references over the shared library passed (lesson, anatomy, exam, cockpit, source integrity).');
