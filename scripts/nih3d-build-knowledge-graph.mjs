#!/usr/bin/env node
/** Derived-only scientific graph: never infer clinical evidence from model co-occurrence. */
import {readFile,readdir,mkdir,writeFile} from 'node:fs/promises';
import {join} from 'node:path';
const src=process.argv[2]??'tools/atla-ai/resources/nih3d-medical-index';
const out=process.argv[3]??'tools/atla-ai/resources/nih3d-knowledge-graph';
const summary=JSON.parse(await readFile(join(src,'summary.json'),'utf8'));
const segments=(await readdir(join(src,'segments'))).filter(x=>/^entries-\d+-\d+\.json$/.test(x))
 .sort((a,b)=>Number(a.split('-')[1])-Number(b.split('-')[1]));
if(segments.length!==summary.sourceSegments)throw Error('Missing NIH triage segments');
await mkdir(join(out,'segments'),{recursive:true});
let models=0,edges=0;
const taxonomy=new Set();
for(const name of segments){
 const {rows}=JSON.parse(await readFile(join(src,'segments',name),'utf8'));
 const nodes=[],links=[];
 for(const entry of rows){
  const modelId='nih3d:'+entry.id;
  nodes.push({id:modelId,kind:'source-model',accession:entry.accession,title:entry.title,
   medicalStatus:entry.decision,version:entry.sourceVersion,sourceUrl:entry.sourceUrl,
   license:entry.originalLicense,scientificReviewStatus:'pending'});
  for(const topic of entry.topics){
   taxonomy.add(topic);
   links.push({from:modelId,to:'nih3d-topic:'+topic,type:'proposed-topic',basis:'automated-metadata-triage',scientificReviewStatus:'pending'});
  }
 }
 models+=nodes.length;edges+=links.length;
 await writeFile(join(out,'segments',name),JSON.stringify({source:name,nodes,links})+'\n');
}
if(models!==summary.uniqueRecords)throw Error('Knowledge graph coverage mismatch');
const report={schemaVersion:1,source:'NIH 3D per-record metadata',modelNodes:models,topicNodes:taxonomy.size,
 proposedEdges:edges,topics:[...taxonomy].sort(),scientificEvidenceStatus:'UNVERIFIED',
 clinicalRelationsInvented:false,modelModelRelationsAdded:0,
 notes:['Topic edges are proposed based on metadata, not scientific review.',
 'No biological/clinical causal connection is inferred.',
 'Original accession, version, and source URL are retained.']};
await writeFile(join(out,'summary.json'),JSON.stringify(report,null,2)+'\n');
console.log('ATLA NIH3D KNOWLEDGE GRAPH '+JSON.stringify({models,topics:taxonomy.size,proposedEdges:edges}));
