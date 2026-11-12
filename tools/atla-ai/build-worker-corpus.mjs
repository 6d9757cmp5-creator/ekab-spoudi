#!/usr/bin/env node
/**
 * Builds the ATLA Worker's copy of the published Greek study material (workers/mentor-chat/corpus.json).
 * The Worker accepts a passage from the browser only if its text appears word for word in this copy,
 * so answers stay grounded in the app's own material. The deploy workflow runs this before every
 * deployment, so new chapters, answers or books reach ATLA automatically.
 * Usage: node tools/atla-ai/build-worker-corpus.mjs [output]
 */
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {resolve,sep} from 'node:path';
import {tmpdir} from 'node:os';
import {SOURCES,parsePublishedSource,transformSource} from '../../atla/knowledge/read-only-index.mjs';

/** Same normalisation on both sides: whitespace collapsed, case and accents kept. */
export const squash=text=>String(text??'').replace(/\s+/g,' ').trim();
export const recordKey=(file,id)=>file+'#'+id;

export function buildCorpus(root='.'){
 const records={};let count=0;
 for(const source of SOURCES){
  const path=root+'/'+source.file;
  if(!existsSync(path))continue;
  const rows=transformSource(source,parsePublishedSource(source,readFileSync(path,'utf8')));
  for(const r of rows){if(!r.body)continue;records[recordKey(source.file,r.id)]={title:squash(r.title),body:squash(r.body),href:r.href||null};count++}
 }
 const glossary=JSON.parse(readFileSync(root+'/medical-terms.json','utf8')).items||[];
 for(const t of glossary)if(t.term&&t.definition){records[recordKey('medical-terms.json',t.term)]={title:squash(t.term),body:squash(t.definition),href:null};count++}
 return {version:new Date().toISOString().slice(0,10),count,records};
}

if(process.argv[1]&&import.meta.url.endsWith(process.argv[1].replace(/\\/g,'/').split('/').pop())){
 // Output only as a .json file inside the repository or the system temp folder.
 const out=resolve(process.argv[2]||'workers/mentor-chat/corpus.json');
 if(!out.endsWith('.json')||![resolve('.'),resolve(tmpdir())].some(dir=>out.startsWith(dir+sep)))throw Error('output must be a .json file inside the repository or the temp folder');
 const corpus=buildCorpus('.');
 writeFileSync(out,JSON.stringify(corpus));
 console.log(out+':',corpus.count,'records,',Math.round(JSON.stringify(corpus).length/1024),'KB');
}
