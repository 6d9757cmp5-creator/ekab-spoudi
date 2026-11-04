import assert from 'node:assert/strict';
import {existsSync,readFileSync} from 'node:fs';
import crypto from 'node:crypto';
import {selectLibraryModels,selectAtlaVisual,safeReturnHref,viewerHref,simplify,structureHits} from '../tools/atla-ai/nih3d-library.mjs';
import {deliveryRestriction,chapterEvidence,parseCourseChapters,MAX_MODEL_BYTES,MODELS_DIR} from './nih3d-build-library.mjs';

// Delivery policy: every refusal has a specific cause.
const glb={size:1000};
assert.equal(deliveryRestriction({license:'Public Domain',glb,scopeStatus:'IN_SCOPE_RESEARCH_CANDIDATE'}),null);
assert.equal(deliveryRestriction({license:'CC BY 4.0',glb}),null);
assert.equal(deliveryRestriction({license:'CC-BY-SA',glb}),null);
for(const license of ['CC-BY-NC','CC-BY-NC-SA','CC-BY-NC-ND','CC BY-ND','CC-BY-ND','GNU GPLv3','','TAPR'])
 assert.equal(deliveryRestriction({license,glb}),'LICENSE_REVIEW',license);
assert.equal(deliveryRestriction({license:'Public Domain',glb:null}),'NO_GLB');
assert.equal(deliveryRestriction({license:'Public Domain',glb,scopeStatus:'LIKELY_OUT_OF_MEDICAL_SCOPE'}),'OUT_OF_SCOPE');
assert.equal(deliveryRestriction({license:'Public Domain',glb:{size:MAX_MODEL_BYTES+1}}),'OVERSIZE');
assert.equal(deliveryRestriction({license:'Public Domain',glb,servedBytes:400*1024**2}),'CAPACITY');

// Same-named vessels and nerves are not bones.
const vocab={
 structures:{femur:{match:['μηριαι','femur']},humerus:{match:['βραχιον']}},
 findings:{fracture:{match:['καταγμ']}},exclude:{femur:'μηριαι\\p{L}* (?:αρτηρ|φλεβ|νευρ)'}};
const n=(id,text)=>structureHits(vocab.structures[id],vocab.exclude[id],simplify(text));
assert.equal(n('femur','Η μηριαία αρτηρία πάλλεται'),0);
assert.equal(n('femur','Το μηριαίο οστό'),1);
assert.equal(n('humerus','Το υποβραχιόνιο'),0,'Stems match at the start of a word only');

// Chapter links require evidence in the real text.
const chapters=parseCourseChapters('01','<details id="lesson-2"><p>Το μηριαίο οστό και το <b>μηριαίο</b>.</p><script>μηριαίο</script></details><details id="lesson-3"><p>Το μηριαίο μία φορά.</p></details><details id="lesson-4"><p>Κάταγμα του βραχιονίου. Άλλη πρόταση.</p><p>Το κάταγμα εδώ. Το βραχιόνιο εκεί.</p></details>');
assert.deepEqual(chapterEvidence(chapters,{kind:'anatomy',structures:['femur']},vocab),[{chapter:'01/2',occurrences:2}]);
assert.deepEqual(chapterEvidence(chapters,{kind:'pathology',structures:['humerus'],finding:'fracture'},vocab),[{chapter:'01/4',occurrences:1}],'Finding and structure must share a sentence');

// Selection gates over a controlled library.
const delivery={path:MODELS_DIR+'x.glb',bytes:1000,sha256:'a'.repeat(64)};
const row=(entryId,extra)=>({source:'nih3d',accession:'3DPX-'+entryId,entryId,clinicalUseApproved:false,delivery,structures:[],...extra});
const allSurfaces=['library','lesson','anatomy','exam','cockpit','atla'];
const library={vocabulary:{structures:{patella:{match:['επιγονατιδ']},humerus:{match:['βραχιον']}},findings:vocab.findings,exclude:{}},models:[
 row(170,{kind:'anatomy',structures:['patella'],surfaces:allSurfaces,saekChapters:[{chapter:'01/2',occurrences:2}]}),
 row(802,{kind:'pathology',structures:['humerus'],finding:'fracture',surfaces:['library','lesson','exam','cockpit','atla'],saekChapters:[{chapter:'06/5',occurrences:1}]}),
 row(832,{kind:'pathology',structures:['humerus'],finding:'fracture',surfaces:['library','lesson','exam','cockpit','atla'],saekChapters:[{chapter:'06/5',occurrences:1}]}),
 row(900,{kind:null,surfaces:['library'],saekChapters:[]}),
 row(901,{kind:'anatomy',structures:['patella'],surfaces:allSurfaces,clinicalUseApproved:true})]};
const ids=c=>selectLibraryModels(library,c).map(m=>m.entryId);
assert.deepEqual(ids({surface:'lesson',courseId:'01',chapterId:'2'}),[170]);
assert.deepEqual(ids({surface:'lesson',courseId:'01',chapterId:'1'}),[],'No link without chapter evidence');
assert.deepEqual(ids({surface:'lesson',courseId:'06',chapterId:'5'}),[802],'One example for a pathology group');
assert.deepEqual(ids({surface:'anatomy',text:'Επιγονατίδες'}),[170]);
assert.deepEqual(ids({surface:'anatomy',text:'Σπονδυλική στήλη'}),[]);
assert.deepEqual(ids({surface:'anatomy',text:'Βραχιόνιο κάταγμα'}),[],'Fractures are not offered as normal anatomy');
assert.deepEqual(ids({surface:'exam',text:'Τι είναι η επιγονατίδα;',revealed:false}),[],'No hint before reveal');
assert.deepEqual(ids({surface:'exam',text:'Τι είναι η επιγονατίδα;',revealed:true}),[170]);
assert.deepEqual(ids({surface:'cockpit',text:'Επιγονατίδα',confirmedAnatomy:false}),[]);
assert.deepEqual(ids({surface:'cockpit',text:'Τροχαίο, πιθανό τραύμα',confirmedAnatomy:true}),[]);
assert.deepEqual(ids({surface:'cockpit',text:'Βραχιόνιο',confirmedAnatomy:true}),[],'A structure alone never implies a fracture');
assert.deepEqual(ids({surface:'cockpit',text:'Κάταγμα βραχιονίου',confirmedAnatomy:true}),[802]);
assert.deepEqual(ids({surface:'unknown',text:'Επιγονατίδα'}),[]);
assert.equal(selectLibraryModels(library,{surface:'anatomy',text:'Επιγονατίδα'}).some(m=>m.clinicalUseApproved),false);

// ATLA: the right model at the right moment, and none when text is enough.
const atla=c=>selectAtlaVisual(library,c)?.entryId??null;
assert.equal(atla({text:'Η επιγονατίδα'}),null,'Text suffices: nothing is loaded');
assert.equal(atla({text:'Η επιγονατίδα',requestedVisual:true}),170);
assert.equal(atla({text:'Η επιγονατίδα',struggling:true}),170);
assert.equal(atla({text:'Η επιγονατίδα',mode:'exam',requestedVisual:true,revealed:false}),null);
assert.equal(atla({text:'Η επιγονατίδα',mode:'exam',revealed:true}),170);
assert.equal(atla({text:'Η επιγονατίδα',mode:'simulation',requestedVisual:true}),null);
assert.equal(atla({text:'Η επιγονατίδα',mode:'simulation',confirmedAnatomy:true}),170);

// Return links stay on this origin.
const base='https://example.org/ekab-spoudi/';
assert.equal(safeReturnHref('/ekab-spoudi/saek-course-01.html#lesson-2',base,'x'),'/ekab-spoudi/saek-course-01.html#lesson-2');
for(const bad of ['https://evil.example/','//evil.example/','javascript:alert(1)','\\\\evil','', null,'saek.html'])
 assert.equal(safeReturnHref(bad,base,'x'),'x',String(bad));
assert.match(viewerHref({accession:'3DPX-000170'},{rootUrl:base,from:'/a#b'}),/atla-resource-preview\.html\?tool=anatomy&dataset=nih&model=3DPX-000170&from=%2Fa%23b$/);

// Once built, the real registry must describe real committed bytes, and every model must be accounted for.
if(existsSync('tools/atla-ai/resources/model-library.json')){
 const real=JSON.parse(readFileSync('tools/atla-ai/resources/model-library.json','utf8'));
 const ledger=JSON.parse(readFileSync('tools/atla-ai/resources/nih3d-verified-originals-2026.json','utf8'));
 const nih=real.models.filter(m=>m.source==='nih3d');
 assert.deepEqual(nih.map(m=>m.accession).sort(),ledger.models.map(m=>m.accession).sort(),'Every verified NIH model belongs to the library');
 for(const m of nih){
  assert.equal(m.clinicalUseApproved,false);
  assert.equal(m.scientificApproval,'NOT_ESTABLISHED');
  if(m.delivery){
   assert.equal(m.delivery.derived,false);
   const bytes=readFileSync(m.delivery.path);
   assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),m.delivery.sha256,m.accession);
   assert.equal(bytes.length,m.delivery.bytes,m.accession);
   assert.equal(m.restrictionCode,null,m.accession);
  }else assert(m.restriction&&m.restrictionCode,'Unserved model needs a stated reason: '+m.accession);
 }
 const femur=nih.find(m=>m.accession==='3DPX-000168');
 assert.equal(femur.kind,'anatomy');
 assert.equal(selectLibraryModels(real,{surface:'anatomy',text:'Μηριαία αρτηρία'}).length,0,'A vessel does not open the femur');
}
console.log('NIH 3D shared library: policy, selection, ATLA gates and registry bytes passed');
