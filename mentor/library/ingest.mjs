/**
 * Validates a locally prepared JSON passage file and emits an indexed JSON artifact.
 * Usage: node mentor/library/ingest.mjs input.json output.json
 * Requires the original source to have been obtained lawfully and reviewed.
 * This tool does not scrape websites or claim clinical approval.
 */
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {validatePassage} from './retrieval.mjs';
export function compile(input,catalog) {
  if (!Array.isArray(input)) throw new TypeError('Expected an array of passages');
  const sources=new Set(catalog.sources.map(s=>s.id));
  const ids=new Set();
  return input.map(p=>{
    if(!validatePassage(p)) throw new Error('Invalid passage '+(p?.id||'(missing id)'));
    if(!sources.has(p.source_id)) throw new Error('Unregistered source '+p.source_id);
    if(ids.has(p.id)) throw new Error('Duplicate passage id '+p.id);
    ids.add(p.id);
    return {...p,sha256:createHash('sha256').update(p.text).digest('hex')};
  });
}
if(process.argv[1] && fileURLToPath(import.meta.url)===process.argv[1]){
  const [src,dst]=process.argv.slice(2);
  if(!src||!dst) {console.error('Usage: node ingest.mjs passages.json output.json');process.exit(2);}
  const [raw,cat]=await Promise.all([readFile(src,'utf8'),readFile(new URL('./catalog.json',import.meta.url),'utf8')]);
  const passages=compile(JSON.parse(raw),JSON.parse(cat));
  await writeFile(dst,JSON.stringify({schema_version:1,passages},null,2)+'\n');
  console.log('Indexed',passages.length,'passages');
}
