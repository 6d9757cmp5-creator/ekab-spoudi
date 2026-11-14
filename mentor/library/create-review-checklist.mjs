/** Non-clinical 1:1 inventory of imported textbook passages for independent human review.
 * Never decides whether a passage is medically correct or publishable.
 */
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';

export const FIELDS=['passage_id','source_id','section','source_url','text_sha256','automated_topic_hint','review_status','reviewer','review_date','primary_source_verified','license_verified','clinical_approval_evidence'];
export function csvField(value){
  const v=String(value??'');
  // Avoid spreadsheet formula execution when reviewing exported CSV from external sources.
  const safe=/^[=+\-@\t\r]/.test(v)?"'"+v:v;
  return '"'+safe.replace(/"/g,'""')+'"';
}
export function hint(text){
  const v=String(text??'').toLowerCase();
  if(/\b(?:dose|dosage|medication|drug|pharmac|administer|mg\/kg)\b/i.test(v))return 'check-pharmacology';
  if(/\b(?:airway|ventilat|resuscitat|cardiac arrest|cpr|defibrillat|oxygen)\b/i.test(v))return 'check-resuscitation-airway';
  if(/\b(?:triage|shock|trauma|bleed|haemorrhag|hemorrhag)\b/i.test(v))return 'check-triage-trauma';
  return 'general-manual-review';
}
export function recordsForBook(book){
  if(!book||!Array.isArray(book.passages)||typeof book.source_id!=='string')throw Error('Invalid book');
  return book.passages.map(p=>{
    if(p.source_id!==book.source_id||typeof p.text!=='string'||!p.id)throw Error('Invalid passage attribution');
    if(p.review_status!=='draft')throw Error('Unexpected approval without individual human evidence: '+p.id);
    return {
      passage_id:p.id,source_id:p.source_id,section:p.section||'',
      source_url:p.source_url,text_sha256:createHash('sha256').update(p.text).digest('hex'),
      automated_topic_hint:hint(p.text),review_status:'pending-human',
      reviewer:'',review_date:'',primary_source_verified:'',license_verified:'',clinical_approval_evidence:''
    };
  });
}
export function toCsv(records){
  return [FIELDS.map(csvField).join(','),...records.map(r=>FIELDS.map(k=>csvField(r[k])).join(','))].join('\n')+'\n';
}
export async function generate(rootDir=new URL('./',import.meta.url)){
  const manifest=JSON.parse(await readFile(new URL('corpus/manifest.json',rootDir),'utf8'));
  const ids=new Set(),all=[];
  for(const item of manifest.books){
    const book=JSON.parse(await readFile(new URL('corpus/'+item.source_id+'.json',rootDir),'utf8'));
    const records=recordsForBook(book);
    if(records.length!==item.passage_count)throw Error('Manifest count mismatch '+item.source_id);
    for(const record of records){
      const key=record.source_id+':'+record.passage_id;
      if(ids.has(key))throw Error('Duplicate passage '+key);
      ids.add(key);
      all.push(record);
    }
  }
  return {records:all,books:manifest.books.length,counts:Object.fromEntries(manifest.books.map(b=>[b.source_id,b.passage_count]))};
}
if(process.argv[1]&&fileURLToPath(import.meta.url)===process.argv[1]){
  const out=process.argv[2]||'/tmp/mentor-review-checklist.csv';
  try{
    const result=await generate();
    await writeFile(out,toCsv(result.records),'utf8');
    console.log(JSON.stringify({file:out,total:result.records.length,books:result.books,counts:result.counts,clinical_approvals:0}));
    console.log('STATUS: automated inventory only, no independent human clinical or rights approvals');
  }catch(e){console.error(e);process.exitCode=1;}
}
