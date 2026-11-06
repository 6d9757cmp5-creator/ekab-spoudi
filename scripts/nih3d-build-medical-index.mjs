#!/usr/bin/env node
/** Build reviewable medical triage index from original NIH segments; no binaries copied. */
import {readdir,readFile,writeFile,mkdir} from 'node:fs/promises';
import {join} from 'node:path';
import {classifyEntry,extractEntries} from './nih3d-medical-classify.mjs';
const src=process.argv[2]??'tools/atla-ai/resources/nih3d-master-plan-2026';
const out=process.argv[3]??'tools/atla-ai/resources/nih3d-medical-index';
const index=JSON.parse(await readFile(join(src,'catalog-index.json'),'utf8'));
const files=(await readdir(join(src,'segments'))).filter(x=>/^entries-\d+-\d+\.json$/.test(x))
 .sort((a,b)=>Number(a.split('-')[1])-Number(b.split('-')[1]));
if(!files.length)throw Error('No NIH source segments found');
await mkdir(join(out,'segments'),{recursive:true});
const known=new Map(),counts={medical_candidate:0,manual_review:0,non_medical_candidate:0};
const categories={},licensing={},byTopic={},segments=[];
let sourceRecords=0,duplicates=0,totalModelFileReferences=0;
for(const filename of files){
 const raw=JSON.parse(await readFile(join(src,'segments',filename),'utf8'));
 const rows=extractEntries(raw);
 if(typeof raw.totalEntries==='number'&&raw.totalEntries!==rows.length)throw Error('Corrupt NIH source count: '+filename);
 const outRows=[],partial={medical_candidate:0,manual_review:0,non_medical_candidate:0};
 for(const entry of rows){
  sourceRecords++;
  const label=classifyEntry(entry);
  if(!Number.isInteger(Number(label.id)))throw Error('Missing entryId: '+filename);
  const key=String(label.id);
  if(known.has(key)){
   duplicates++;
   if(known.get(key).accession!==label.accession)throw Error('Conflicting accession: '+key);
   continue;
  }
  known.set(key,label);
  counts[label.decision]++;partial[label.decision]++;
  categories[label.category]=(categories[label.category]??0)+1;
  licensing[label.licensing]=(licensing[label.licensing]??0)+1;
  totalModelFileReferences+=label.fileCount;
  for(const topic of label.topics)byTopic[topic]=(byTopic[topic]??0)+1;
  outRows.push(label);
 }
 await writeFile(join(out,'segments',filename),JSON.stringify({source:filename,rows:outRows,counts:partial})+'\n');
 segments.push({source:filename,sourceEntries:rows.length,uniqueEntries:outRows.length,counts:partial});
}
if(index.publishedEntriesFound!==sourceRecords)throw Error('Catalog coverage mismatch: expected '+index.publishedEntriesFound+', found '+sourceRecords);
const summary={
 schemaVersion:1,classification:'AUTOMATED_TRIAGE_ONLY_NOT_MEDICAL_REVIEW',
 scope:'ALL_MEDICALLY_RELEVANT_NIH_3D_MODELS',
 sourceCatalogEntries:index.publishedEntriesFound,sourceSegments:files.length,
 sourceRecords,uniqueRecords:known.size,duplicates,
 counts,categories,licensing,byTopic,totalModelFileReferences,
 requirements:{originalArchive:true,classificationEngine:true,knowledgeGraph:true,contextualSelection:true},
 notes:[
 'Medical candidates are not a validated count of medically useful models.',
 'Manual review entries must be retained to avoid false exclusions.',
 'Nonmedical candidates are only suggested exclusions; original metadata is preserved.',
 'Per-model license and attribution must be verified before redistribution.',
 'This pipeline downloads or stores no NIH binary assets.'
 ],segments
};
await writeFile(join(out,'summary.json'),JSON.stringify(summary,null,2)+'\n');
console.log('ATLA NIH3D INDEX SUMMARY '+JSON.stringify({segments:files.length,scanned:sourceRecords,unique:known.size,duplicates,decisions:counts,licenses:licensing}));
