import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {dirname,join} from 'node:path';
import {validatePassage} from './retrieval.mjs';
const root=dirname(fileURLToPath(import.meta.url));
export async function verify(rootDir=root) {
  const [c,m]=await Promise.all([
    readFile(join(rootDir,'catalog.json'),'utf8').then(JSON.parse),
    readFile(join(rootDir,'corpus/manifest.json'),'utf8').then(JSON.parse),
  ]);
  const registered=new Map(c.sources.map(s=>[s.id,s]));
  const imported=new Set();
  let total=0;
  for(const b of m.books){
    if(imported.has(b.source_id))throw Error('Duplicate imported source '+b.source_id);
    imported.add(b.source_id);
    const entry=registered.get(b.source_id);
    if(!entry || !entry.fulltext_ingested) throw Error('Not registered as imported: '+b.source_id);
    const bytes=await readFile(join(rootDir,'corpus',b.source_id+'.json'));
    const sha=createHash('sha256').update(bytes).digest('hex');
    if(sha!==b.sha256 || sha!==entry.corpus_sha256)throw Error('Checksum mismatch: '+b.source_id);
    const data=JSON.parse(bytes.toString('utf8'));
    if(data.source_id!==b.source_id || data.passages.length!==b.passage_count || entry.passages!==b.passage_count)throw Error('Count mismatch '+b.source_id);
    if(!data.licence)throw Error('Missing license '+b.source_id);
    const ids=new Set();
    for(const p of data.passages){
      if(!validatePassage(p))throw Error('Invalid passage in '+b.source_id);
      if(p.source_id!==b.source_id || ids.has(p.id))throw Error('Misattributed or duplicate passage '+p.id);
      if(p.review_status!=='draft') throw Error('Undocumented approval of passage '+p.id);
      ids.add(p.id);
    }
    total+=b.word_count;
  }
  if(total!==c.statistics.total_imported_words || m.books.length!==c.statistics.text_imported_books)throw Error('Catalog totals mismatch');
  if(c.sources.some(s=>s.fulltext_ingested && !imported.has(s.id)))throw Error('Catalog falsely claims imported source');
  return {books:imported.size,words:total,passages:m.books.reduce((sum,b)=>sum+b.passage_count,0)};
}
if(process.argv[1] && fileURLToPath(import.meta.url)===process.argv[1]){
  try{console.log('VERIFIED',JSON.stringify(await verify()));}
  catch(e){console.error(e);process.exit(1);}
}
