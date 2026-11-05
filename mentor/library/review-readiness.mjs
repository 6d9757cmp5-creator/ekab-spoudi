/**
 * Evidence-only readiness audit for the Mentor library.
 * This is a technical inventory. It NEVER approves clinical content, rights or publication.
 */
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';

export function assessReadiness(catalog,manifest){
  if(!Array.isArray(catalog?.sources)||!Array.isArray(manifest?.books)) throw Error('Invalid library inventory');
  const imported=new Set(manifest.books.map(b=>b.source_id));
  const issues=[];
  for(const s of catalog.sources){
    if(s.fulltext_ingested && !imported.has(s.id)) issues.push(s.id+': corpus missing');
    if(!s.fulltext_ingested) issues.push(s.id+': text not imported');
    if(s.clinical_review!=='approved') issues.push(s.id+': independent clinical review pending');
    if(s.rights_review!=='verified') issues.push(s.id+': publication rights not independently verified');
    if(s.production_retrieval!=='validated') issues.push(s.id+': production integration not demonstrated');
  }
  if(!catalog.sources.length)issues.push('empty catalog');
  return Object.freeze({
    source_count:catalog.sources.length,
    text_imported_count:catalog.sources.filter(s=>s.fulltext_ingested&&imported.has(s.id)).length,
    independent_review_complete:issues.length===0,
    ready_for_publication:issues.length===0,
    outstanding:issues
  });
}

if(process.argv[1]&&fileURLToPath(import.meta.url)===process.argv[1]){
  const [catalog,manifest]=await Promise.all([
    readFile(new URL('./catalog.json',import.meta.url),'utf8').then(JSON.parse),
    readFile(new URL('./corpus/manifest.json',import.meta.url),'utf8').then(JSON.parse)
  ]);
  const result=assessReadiness(catalog,manifest);
  console.log(JSON.stringify(result,null,2));
  if(!result.ready_for_publication){
    console.log('SAFE STATUS: research-only inventory; clinical and rights gates are not approved.');
  }
}
