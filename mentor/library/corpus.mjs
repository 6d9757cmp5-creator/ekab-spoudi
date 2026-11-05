/** Controlled loading of source text from the review corpus.
 * Clinical use requires independent passage review. No model calls.
 */
import {readFile} from 'node:fs/promises';
import {dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {retrieve} from './retrieval.mjs';
const root=dirname(fileURLToPath(import.meta.url));
export async function loadPassages({sourceIds,reviewMode=false,rootDir=root}={}){
  const manifest=JSON.parse(await readFile(join(rootDir,'corpus/manifest.json'),'utf8'));
  const allowed=sourceIds?new Set(sourceIds):null;
  const passages=[];
  for(const source of manifest.books){
    if(allowed && !allowed.has(source.source_id))continue;
    const book=JSON.parse(await readFile(join(rootDir,'corpus',source.source_id+'.json'),'utf8'));
    for(const p of book.passages){
      if(p.review_status==='human-reviewed' || (reviewMode===true && p.review_status==='draft')){
        passages.push({...p,book_title:book.title});
      }
    }
  }
  return passages;
}
/** This will safely return an empty list until human review approvals exist. */
export async function searchApprovedBooks(query,{limit=5,sourceIds,rootDir}={}){
  return retrieve({query,passages:await loadPassages({sourceIds,rootDir}),limit});
}
