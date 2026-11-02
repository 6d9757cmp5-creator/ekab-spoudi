import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {selectNihResearchSource,officialResearchLink,RESEARCH_ENTRY} from '../tools/atla-ai/nih3d-research-context.mjs';
import {mountNih3dResearchReferences} from '../tools/atla-ai/nih3d-learning-surface.mjs';
import {getApprovedOriginalSourceLink,normalizeNihEntry} from '../tools/atla-ai/nih3d-original-source-gateway.mjs';
const pick=selectNihResearchSource;
assert.equal(mountNih3dResearchReferences(),'no-dom');
assert.equal(pick({surface:'lesson',courseId:'01',chapterId:'2',text:'Το μηριαίο και η επιγονατίδα'}),RESEARCH_ENTRY);
assert.equal(pick({surface:'lesson',courseId:'01',chapterId:'1',text:'Η επιγονατίδα'}),null);
assert.equal(pick({surface:'lesson',courseId:'10',chapterId:'2',text:'Η επιγονατίδα'}),null);
assert.equal(pick({surface:'lesson',courseId:'01',chapterId:'2',text:'Η αορτή'}),null);
assert.equal(pick({surface:'exam',text:'Τι γνωρίζεις για την επιγονατίδα;',revealed:false}),null);
assert.equal(pick({surface:'exam',text:'Τι γνωρίζεις για την επιγονατίδα;',revealed:true}),RESEARCH_ENTRY);
assert.equal(pick({surface:'cockpit',text:'Επιγονατίδα',confirmedAnatomy:false}),null);
assert.equal(pick({surface:'cockpit',text:'Τροχαίο, πιθανό τραύμα',confirmedAnatomy:true}),null);
assert.equal(pick({surface:'cockpit',text:'Επιγονατίδα',confirmedAnatomy:true}),RESEARCH_ENTRY);
assert.equal(pick({surface:'anatomy',text:'Επιγονατίδες'}),RESEARCH_ENTRY);
assert.equal(pick({surface:'anatomy',text:'Σπονδυλική στήλη'}),null);
assert.equal(pick({surface:'learning',text:'Επιγονατίδα'}),null);
const link=officialResearchLink(RESEARCH_ENTRY);
assert.equal(link.href,'https://3d.nih.gov/entries/3DPX-000170');
assert.equal(link.target,'_blank');
assert.equal(link.independentScientificApproval,false);
assert.equal(officialResearchLink({...RESEARCH_ENTRY}),null,'Ad-hoc/modified records never authorize source references');
assert.equal(RESEARCH_ENTRY.scientificApproval,'NOT_ESTABLISHED');
const catalog=JSON.parse(readFileSync('tools/atla-ai/resources/nih3d-master-plan-2026/segments/entries-1-500.json','utf8'));
const row=catalog.items.find(x=>x.entryId===170);
assert(row,'Original NIH patella record missing');
assert.equal(row.title,RESEARCH_ENTRY.title);
assert.equal(row.category,RESEARCH_ENTRY.category);
assert.equal(row.license,RESEARCH_ENTRY.originalLicense);
assert.equal(row.url,RESEARCH_ENTRY.officialPage);
assert(row.files.some(f=>f.format==='STL'&&f.size===RESEARCH_ENTRY.verifiedFileBytes));
assert.equal(getApprovedOriginalSourceLink(normalizeNihEntry(row)),null,'No scientific approval, so no in-app renderer');
const report=JSON.parse(readFileSync('docs/ATLA_NIH3D_LIVE_ORIGINAL_PROBE_2026.json','utf8'));
const verified=report.tests.find(x=>x.accession===RESEARCH_ENTRY.accession);
assert(verified?.formatValidated&&verified.httpStatus===200,'Actual source file has not been verified');
assert.equal(verified.sha256,RESEARCH_ENTRY.verifiedFileSha256);
for(const [file,needle] of [
 ['saek-exams.html','tools/atla-ai/nih3d-learning-surface.mjs'],
 ['mentor-next.html','tools/atla-ai/nih3d-learning-surface.mjs'],
 ['ui-tools/anatomy-3d/index.html','tools/atla-ai/nih3d-learning-surface.mjs'],
 ['ui-tools/anatomy-3d/saek-jumps.js','nih3d-learning-surface.mjs'],
 ['saek-exams.js','atla:saek-exam-question'],
 ['tools/patient-simulator/app/next-sim.mjs','atla:nih3d-cockpit-anatomy']]){
 assert(readFileSync(file,'utf8').includes(needle),'Missing integration: '+file);
}
console.log('ATLA NIH contextual source references: 24 checks passed (lesson, anatomy, exam, cockpit, source integrity).');
