#!/usr/bin/env node
/**
 * Build the single shared 3D library: every stored source in one registry. NIH models are served as
 * Draco/WebP display copies of SHA-256-verified originals (same triangles, see display-copies.json), or
 * as the original bytes where no copy exists yet. Original archive files stay in GHCR/Releases.
 * Every model that cannot be served records the exact reason.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {simplify,structureHits} from '../tools/atla-ai/nih3d-library.mjs';

export const MODELS_DIR='tools/atla-ai/resources/nih3d-library/models/';
const CURATION='tools/atla-ai/resources/nih3d-library/curation.json';
const DISPLAY='tools/atla-ai/resources/nih3d-library/display-copies.json';
const LEDGER='tools/atla-ai/resources/nih3d-verified-originals-2026.json';
const CATALOG='tools/atla-ai/resources/nih3d-master-plan-2026/segments';
const SCOPE='tools/atla-ai/resources/nih3d-biomedical-scope-2026/segments';
const OUTPUT='tools/atla-ai/resources/model-library.json';
export const MAX_MODEL_BYTES=25*1024**2;
export const MAX_LIBRARY_BYTES=700*1024**2;
const OPEN_LICENSE=/^(Public Domain|CC[- ]BY(?:[- ]SA)?(?: \d\.\d)?)$/i;
const CATEGORY_EL={Anatomy:'Ανατομία',Biomacromolecules:'Βιομακρομόριο',Viruses:'Ιός','Cells and Organelles':'Κύτταρα και οργανίδια',
 'Small Molecules':'Μικρό μόριο',Prosthetics:'Προσθετική','Devices and Hardware':'Συσκευή'};
export const REASONS=Object.freeze({
 NO_GLB:'Δεν υπάρχει πρωτότυπο GLB για προβολή.',
 OUT_OF_SCOPE:'Συσκευή ή εργαστηριακό αντικείμενο εκτός εκπαιδευτικού πεδίου.',
 OVERSIZE:'Το αρχείο υπερβαίνει το όριο των 25 MiB για κινητές συσκευές.',
 CAPACITY:'Έχει εξαντληθεί το όριο χωρητικότητας της άμεσης διάθεσης.',
 RESTORE_PENDING:'Το πρωτότυπο δεν έχει ανακτηθεί ακόμη για διάθεση.'
});
/** Why a stored model may not be served in the browser, or null when it may. The owner holds permission
 * for every NIH model, so the source licence never blocks delivery. Sizes are those of the served file. */
export function deliveryRestriction({glb,scopeStatus,servedBytes=0,bytes=glb?.size}){
 if(!glb)return 'NO_GLB';
 if(scopeStatus==='LIKELY_OUT_OF_MEDICAL_SCOPE')return 'OUT_OF_SCOPE';
 if(bytes>MAX_MODEL_BYTES)return 'OVERSIZE';
 if(servedBytes+bytes>MAX_LIBRARY_BYTES)return 'CAPACITY';
 return null;
}
const chooseGlb=model=>model.verifiedFiles.filter(f=>f.format==='GLB').sort((a,b)=>a.size-b.size||a.sha256.localeCompare(b.sha256))[0]??null;
const sha256=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
const readJson=async file=>JSON.parse(await fs.readFile(file,'utf8'));
const exists=file=>fs.access(file).then(()=>true,()=>false);
async function segments(dir,key){
 const rows=new Map();
 for(const name of (await fs.readdir(dir)).filter(x=>x.endsWith('.json'))){
  for(const row of (await readJson(path.join(dir,name)))[key])rows.set(row.entryId,row);
 }
 return rows;
}
/** Chapter links only where the real lesson text documents the concept, never by assumption. */
export function chapterEvidence(chapters,model,vocabulary){
 const links=[];
 for(const {chapter,text} of chapters){
  let occurrences=0;
  if(model.kind==='pathology'){
   const finding=vocabulary.findings[model.finding];
   for(const sentence of text.split(/[.;!?·\n]+/)){
    const near=model.structures.some(id=>structureHits(vocabulary.structures[id],vocabulary.exclude?.[id],sentence)>0);
    if(near&&structureHits(finding,null,sentence)>0)occurrences++;
   }
  }else{
   occurrences=model.structures.reduce((n,id)=>n+structureHits(vocabulary.structures[id],vocabulary.exclude?.[id],text),0);
   if(occurrences<2)occurrences=0; // A passing mention does not justify offering a 3D model.
  }
  if(occurrences)links.push({chapter,occurrences});
 }
 return links.sort((a,b)=>b.occurrences-a.occurrences);
}
/** Trauma lessons rarely name a bone and a fracture in one sentence, so these links are chosen by hand per structure. */
export function fractureLessonLinks(model,fractureLessons={}){
 if(model.kind!=='pathology'||model.finding!=='fracture')return [];
 return [...new Set(model.structures.flatMap(id=>fractureLessons[id]??[]))].map(chapter=>({chapter,occurrences:1}));
}
export function mergeChapterLinks(evidence,chosen){
 const known=new Set(evidence.map(link=>link.chapter));
 return [...evidence,...chosen.filter(link=>!known.has(link.chapter))];
}
export function parseCourseChapters(course,html){
 const parts=html.split(/<details[^>]*\bid="lesson-(\d+)"/);
 const out=[];
 for(let i=1;i<parts.length;i+=2){
  const body=parts[i+1].replace(/<(script|style)[\s\S]*?<\/\1>/g,' ').replace(/<[^>]+>/g,' ')
   .replace(/&nbsp;/g,' ').replace(/&amp;/g,'&');
  out.push({chapter:course+'/'+parts[i],text:simplify(body)});
 }
 return out;
}
async function courseChapters(){
 const chapters=[];
 for(const name of (await fs.readdir('.')).filter(x=>/^saek-course-\d{2}\.html$/.test(x)).sort()){
  chapters.push(...parseCourseChapters(name.slice(12,14),await fs.readFile(name,'utf8')));
 }
 return chapters;
}
async function otherSources(){
 const list=async(id,label,tool,file,{key='assets',pathKey='path',hashKey='sha256',license,extra={}}={})=>{
  const raw=await readJson(file);
  return (raw[key]??[]).map(a=>({id:a[pathKey],source:id,sourceLabel:label,tool,label:String(a.name||a[pathKey].split('/').pop()).replace(/\.(glb|obj)$/i,'').replace(/_/g,' '),
   license:String(a.license||license||raw.license||raw.sourceLicense||''),
   delivery:{path:a[pathKey],bytes:Number(a.bytes??a.size),sha256:a[hashKey]??a.gitBlobSha??null},clinicalUseApproved:false,...extra}));
 };
 return [
  ...await list('hra','HRA/HuBMAP','anatomy','tools/anatomy-3d/resources/imported-manifest.json',{pathKey:'output'}),
  ...await list('z-anatomy','Z-Anatomy','anatomy','tools/anatomy-3d/resources/z-anatomy-research/imported-manifest.json',{extra:{restriction:'Μόνο ερευνητική προβολή (NC-SA).'}}),
  ...await list('quaternius','Quaternius','cockpit','tools/patient-simulator/resources/quaternius/imported-manifest.json',{extra:{restriction:'Μη κλινικός χαρακτήρας· ερευνητική χρήση.'}}),
  ...await list('patients','Στατικοί ασθενείς CC0','cockpit','tools/patient-simulator/assets/patients/preview-manifest.json'),
  ...await list('makehuman','MakeHuman','cockpit','tools/patient-simulator/resources/makehuman/imported-manifest.json',{license:'CC0-1.0'}),
  ...await list('makehuman','MakeHuman','cockpit','tools/patient-simulator/resources/makehuman/supplemental-imported-manifest.json',{key:'files',license:'CC0-1.0'}),
  ...await list('makehuman-rigged','MakeHuman με σκελετό','cockpit','tools/patient-simulator/assets/patients/atla-makehuman-rigged-manifest.json')
 ];
}
/** Immutable images holding a selected GLB that is not yet present in same-origin delivery. */
export async function imagesToRestore(ledger,catalog,scope,display={}){
 const images=new Set();
 for(const model of ledger.models){
  const glb=chooseGlb(model);
  if(display[model.accession]||deliveryRestriction({glb,scopeStatus:scope.get(model.entryId)?.status}))continue;
  if(!await exists(MODELS_DIR+model.accession+'.glb'))images.add(glb.verifiedOCI.digest);
 }
 return [...images].sort();
}
/** A committed display copy, checked against the hash recorded when it was made from the verified original. */
async function placeDisplayCopy(model,copy){
 const target=MODELS_DIR+model.accession+'.glb';
 if(!await exists(target))return null;
 const bytes=await fs.readFile(target);
 assert.equal(bytes.length,copy.display.bytes,'Display copy size differs: '+target);
 assert.equal(sha256(bytes),copy.display.sha256,'Display copy differs from its record: '+target);
 return target;
}
/** Display-copy models from the release archive that the older GHCR ledger does not list, shaped like ledger rows. */
export function archiveModels(display,ledger,catalog){
 const known=new Set(ledger.models.map(m=>m.accession));
 return Object.entries(display).filter(([accession])=>!known.has(accession)).map(([accession,copy])=>{
  const record=catalog.get(copy.entryId);
  assert(record,'Display copy missing from catalog: '+accession);
  return {entryId:copy.entryId,accession,title:record.title,originalPage:record.url,sourceVersion:record.version??null,
   verifiedFiles:[{format:'GLB',size:copy.original.bytes,sha256:copy.original.sha256,archive:copy.original.archive}],
   scientificApproval:'NOT_ESTABLISHED',clinicalUseApproved:false};
 });
}
async function placeOriginal(model,glb,stagingRoot){
 const target=MODELS_DIR+model.accession+'.glb';
 if(await exists(target)){
  const bytes=await fs.readFile(target);
  assert.equal(sha256(bytes),glb.sha256,'Served file differs from the verified original: '+target);
  return target;
 }
 if(!stagingRoot)return null;
 const digest=glb.verifiedOCI.digest.split('@sha256:')[1];
 const source=path.join(stagingRoot,digest,glb.verifiedOCI.filePath);
 if(!await exists(source))return null;
 const bytes=await fs.readFile(source);
 assert.equal(bytes.length,glb.size,'Restored size differs: '+source);
 assert.equal(sha256(bytes),glb.sha256,'Restored SHA-256 differs: '+source);
 await fs.mkdir(MODELS_DIR,{recursive:true});
 await fs.writeFile(target,bytes);
 return target;
}
/** Limited delivery space goes first to models lessons depend on, then anatomy, smallest first. */
export function deliveryPriority(model,curated,category,servedSize=chooseGlb(model)?.size){
 return [curated?0:category==='Anatomy'?1:2,servedSize??Number.MAX_SAFE_INTEGER,model.entryId];
}
const comparePriority=(a,b)=>a[0]-b[0]||a[1]-b[1]||a[2]-b[2];
async function build(stagingRoot){
 const [ledger,curation,catalog,scope,chapters,others,displayFile]=await Promise.all([
  readJson(LEDGER),readJson(CURATION),segments(CATALOG,'items'),segments(SCOPE,'sourceModels'),courseChapters(),otherSources(),readJson(DISPLAY)]);
 const display=displayFile.models;
 const vocabulary={structures:curation.structures,findings:curation.findings,exclude:curation.exclude};
 const models=[],restrictions={};let servedBytes=0,served=0;
 const servedSize=model=>display[model.accession]?.display.bytes??chooseGlb(model)?.size;
 const priority=model=>deliveryPriority(model,curation.models[model.accession],catalog.get(model.entryId)?.category,servedSize(model));
 const ordered=[...ledger.models,...archiveModels(display,ledger,catalog)].sort((a,b)=>comparePriority(priority(a),priority(b)));
 for(const model of ordered){
  const record=catalog.get(model.entryId),scoped=scope.get(model.entryId);
  assert(record,'Ledger model missing from catalog: '+model.accession);
  assert.equal(model.scientificApproval,'NOT_ESTABLISHED');
  assert.equal(model.clinicalUseApproved,false);
  const glb=chooseGlb(model),curated=curation.models[model.accession]??null,copy=display[model.accession]??null;
  if(copy)assert.equal(copy.original.sha256,glb.sha256,'Display copy was made from another file: '+model.accession);
  const bytes=servedSize(model);
  let code=deliveryRestriction({glb,scopeStatus:scoped?.status,servedBytes,bytes});
  let delivered=null;
  if(!code){
   delivered=copy?await placeDisplayCopy(model,copy):await placeOriginal(model,glb,stagingRoot);
   if(!delivered)code='RESTORE_PENDING';
  }
  if(code)restrictions[code]=(restrictions[code]??0)+1;
  else{servedBytes+=bytes;served++;}
  const categoryEl=CATEGORY_EL[record.category]??record.category;
  const surfaces=!delivered?[]:!curated?['library']:curated.kind==='anatomy'?['library','lesson','anatomy','exam','cockpit','atla']:['library','lesson','exam','cockpit','atla'];
  models.push({
   id:model.accession,accession:model.accession,entryId:model.entryId,source:'nih3d',sourceLabel:'NIH 3D',
   // Library-only models carry a Greek title without lesson links.
   label:curated?.greekTitle??curation.titles?.[model.accession]??(categoryEl+' · '+model.title.trim()),
   greekTitle:curated?.greekTitle??curation.titles?.[model.accession]??null,originalTitle:model.title.trim(),category:categoryEl,
   kind:curated?.kind??null,structures:curated?.structures??[],finding:curated?.finding??null,
   laterality:null,license:record.licenseRaw,rightsBasis:OPEN_LICENSE.test(String(record.licenseRaw).trim())?'SOURCE_LICENSE':'OWNER_STATED_PERMISSION',creator:record.creator||null,sourceVersion:model.sourceVersion??record.version??null,
   originalPage:model.originalPage,archive:{files:model.verifiedFiles.length,image:glb?.verifiedOCI?.digest??null,release:glb?.archive??null,formats:[...new Set(model.verifiedFiles.map(f=>f.format))].sort()},
   delivery:!delivered?null:copy?{path:delivered,bytes:copy.display.bytes,sha256:copy.display.sha256,format:'glb',derived:true,
    transform:displayFile.settings,triangles:copy.display.triangles,original:{bytes:glb.size,sha256:glb.sha256}}
    :{path:delivered,bytes:glb.size,sha256:glb.sha256,format:'glb',derived:false},
   restrictionCode:code,restriction:code?REASONS[code]:curated?null:'Δεν έχει τεκμηριωθεί εκπαιδευτική σύνδεση· μόνο χειροκίνητη προβολή.',
   surfaces,saekChapters:curated&&delivered?mergeChapterLinks(chapterEvidence(chapters,curated,vocabulary),fractureLessonLinks(curated,curation.fractureLessons)):[],
   scopeStatus:scoped?.status??null,scientificApproval:'NOT_ESTABLISHED',clinicalUseApproved:false
  });
 }
 models.sort((a,b)=>a.entryId-b.entryId);
 const licenses={},scopes={};
 for(const row of catalog.values())licenses[row.licenseRaw]=(licenses[row.licenseRaw]??0)+1;
 for(const row of scope.values())scopes[row.status]=(scopes[row.status]??0)+1;
 const bySource={};
 for(const m of [...models,...others])bySource[m.source]=(bySource[m.source]??0)+1;
 const report={schemaVersion:1,
  scope:'Κοινός κατάλογος όλων των αποθηκευμένων πηγών 3D. Τα πρωτότυπα NIH παραμένουν στο αρχείο, αυτούσια.',
  ledgerCommit:process.env.GITHUB_SHA??null,clinicalUseApproved:false,vocabulary,
  counts:{bySource,nihVerifiedModels:ledger.models.length,nihServed:served,nihServedBytes:servedBytes,
   nihContextual:models.filter(m=>m.surfaces.includes('lesson')).length,
   nihWithSaekChapter:models.filter(m=>m.saekChapters.length).length,nihRestrictions:restrictions},
  nihCatalog:{publishedRecords:catalog.size,licenses,scopes,notYetVerifiedInLedger:catalog.size-ledger.models.length},
  atlases:[{id:'bp3d40',label:'BodyParts3D 4.0',path:'tools/anatomy-3d/resources/bp3d40/',tool:'anatomy'},
   {id:'bp3d43',label:'BodyParts3D 4.3',path:'tools/anatomy-3d/resources/bp3d43/',tool:'anatomy'}],
  models:[...models,...others]};
 await fs.writeFile(OUTPUT,JSON.stringify(report,null,1)+'\n');
 console.log('MODEL LIBRARY',JSON.stringify(report.counts));
 return report;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const [mode,arg]=process.argv.slice(2);
 if(mode==='images-to-restore'){
  const [ledger,catalog,scope,displayFile]=await Promise.all([readJson(LEDGER),segments(CATALOG,'items'),segments(SCOPE,'sourceModels'),readJson(DISPLAY)]);
  for(const image of await imagesToRestore(ledger,catalog,scope,displayFile.models))console.log(image);
 }else if(mode==='build')await build(arg);
 else throw Error('usage: node scripts/nih3d-build-library.mjs images-to-restore | build [staging-root]');
}
