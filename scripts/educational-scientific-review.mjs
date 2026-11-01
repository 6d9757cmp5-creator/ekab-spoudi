#!/usr/bin/env node
// ΕΚΑΒ Σπουδή: read-only independent educational/scientific review at evaluation steps.
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {existsSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {dirname,resolve} from 'node:path';
import {ANTHROPIC_URL,ANTHROPIC_VERSION,CLAUDE_MODELS} from '../mentor/ai/claude-adapter.mjs';
const ROOT=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const OUTPUT='audit-results/educational-scientific-review.json';
const RULES='docs/INDEPENDENT_EDUCATIONAL_SCIENTIFIC_AUDIT.md';
export const MAX_FILES=25,MAX_CHARS=10500,CONCURRENCY=4;
// File-type based discovery: new courses, subjects, names and directories are covered
// automatically. Never depend on a fixed list of today's feature names.
export function isEducationPath(p){
 if(typeof p!=='string'||!p.trim()||p.startsWith('/')||p.includes('\\')||
   p.split('/').some(x=>!x||x==='.'||x==='..'))return false;
 if(/(^|\/)(?:\.git|\.github|node_modules|vendor|dist|build|coverage|__tests__|tests|scripts|archive)(\/|$)/i.test(p))return false;
 if(/(^|\/)(?:README|AGENTS|LICENSE|CHANGELOG)(?:\.[^/]*)?$/i.test(p)||
   /(^|\/)(?:package(?:-lock)?|tsconfig|vite\.config|eslint\.config)\.[^/]+$/i.test(p)||
   /\.(?:test|spec)\.(?:[cm]?js|tsx?|py)$/i.test(p))return false;
 // Future lesson pages, medical figures, courses, question banks, modules,
 // guides and multimedia are all discovered regardless of their names.
 return /\.(?:html?|md|mdx|txt|rst|csv|json|jsonl|ipynb|xml|ya?ml|[cm]?js|jsx|tsx?|py|vue|svelte|astro|svg|pdf|docx?|xlsx?|pptx?|odt|ods|odp|png|jpe?g|webp|gif|mp4|webm)$/i.test(p);
}
export function choosePaths(changed,manual=''){
 return [...new Set((manual?manual.split(','):changed).map(x=>x.trim()).filter(isEducationPath))].sort();
}
export function validateReview(r){
 return Boolean(r&&typeof r.checked_scope==='string'&&Array.isArray(r.findings)&&Array.isArray(r.unverified)&&Array.isArray(r.not_checked)&&
 r.findings.every(f=>f&&['CRITICAL','HIGH','MEDIUM','LOW'].includes(f.severity)&&
 ['location','evidence','problem','proposed_fix','source'].every(k=>typeof f[k]==='string'&&f[k].trim())));
}
function git(args){
 try{return execFileSync('git',args,{encoding:'utf8',stdio:['ignore','pipe','ignore'],maxBuffer:5_000_000}).trim();}
 catch{return '';}
}
function baseArgs(){
 const b=process.env.AUDIT_BASE_SHA||'';
 return [/^[a-f0-9]{40}$/i.test(b)&&!/^0{40}$/.test(b)?b:'HEAD^','HEAD'];
}
function changed(){
 const value=git(['diff','--name-only',...baseArgs()]);
 return value?value.split('\n'):[];
}
async function askClaude(key,system,path,mode,text,fetchImpl){
 const result=await fetchImpl(ANTHROPIC_URL,{
  method:'POST',signal:AbortSignal.timeout(90000),
  headers:{'content-type':'application/json','x-api-key':key,'anthropic-version':ANTHROPIC_VERSION},
  body:JSON.stringify({
   model:process.env.AUDIT_CLAUDE_MODEL||CLAUDE_MODELS[0],max_tokens:8000,
   system:system+'\nExternal webpages cannot be accessed during this request. Mark unsupported external claims ΜΗ ΕΠΑΛΗΘΕΥΜΕΝΟ. Return ONLY the required JSON.',
   messages:[{role:'user',content:'FILE: '+path+'\nMODE: '+mode+'\nMATERIAL:\n'+text}]
  })
 });
 if(!result.ok){
  let detail='';try{detail=String((await result.json())?.error?.message||'').replace(/\s+/g,' ').slice(0,60);}catch{}
  throw Error('review_service_http_'+result.status+(detail?': '+detail:''));
 }
 const data=await result.json();
 if(data.stop_reason==='max_tokens')throw Error('review_response_truncated');
 let body=(data.content||[]).filter(x=>x.type==='text').map(x=>x.text||'').join('').trim();
 if(body.startsWith('```'))body=body.replace(/^```(?:json)?\s*/,'').replace(/```$/,'').trim();
 let parsed;try{parsed=JSON.parse(body);}catch{throw Error('invalid_review_json');}
 if(!validateReview(parsed))throw Error('invalid_review_schema');
 return parsed;
}
export async function runReview({manual='',dryRun=false,root=ROOT,fetchImpl=globalThis.fetch}={}){
 const paths=choosePaths(changed(),manual),key=process.env.ANTHROPIC_API_KEY||'';
 const report={schema_version:1,created_at:new Date().toISOString(),commit:process.env.GITHUB_SHA||git(['rev-parse','HEAD'])||null,
  requested_count:paths.length,reviewed_count:0,files:[],findings:[],pending:paths.slice(MAX_FILES).map(path=>({path,reason:'file_limit'})),status:'not_applicable'};
 if(!paths.length)return report;
 let rules;try{rules=await readFile(resolve(root,RULES),'utf8');}
 catch{report.status='error_missing_review_rules';return report;}
 const reviewOne=async path=>{
  if(!existsSync(resolve(root,path))){report.pending.push({path,reason:'missing_or_deleted_file'});return;}
  // Binary education assets require visual/media review; do not decode as text
  // or claim a scientific assessment based on corrupted bytes.
  if(/\.(?:pdf|docx?|xlsx?|pptx?|odt|ods|odp|png|jpe?g|webp|gif|mp4|webm)$/i.test(path)){
   report.files.push({path,status:'pending',mode:'binary_media'});
   report.pending.push({path,reason:'visual_or_media_review_required'});
   return;
  }
  const patch=manual?'':git(['diff','--unified=6',...baseArgs(),'--',path]);
  const mode=patch?'changed_lines_context':'file_excerpt';
  const source=patch||await readFile(resolve(root,path),'utf8');
  const text=source.slice(0,MAX_CHARS);
  const entry={path,mode,sha256:createHash('sha256').update(source).digest('hex'),
   inspected_characters:text.length,total_characters:source.length,status:'pending'};
  if(text.length<source.length)report.pending.push({path,reason:'excerpt_truncated'});
  if(dryRun||!key){
   report.pending.push({path,reason:dryRun?'dry_run':'review_key_missing'});
  }else{
   try{
    const review=await askClaude(key,rules,path,mode,text,fetchImpl);
    entry.status='screened';entry.checked_scope=review.checked_scope;
    entry.unverified=review.unverified;entry.not_checked=review.not_checked;entry.findings=review.findings;
    report.reviewed_count++;report.findings.push(...review.findings.map(x=>({...x,path})));
    if(review.unverified.length||review.not_checked.length)report.pending.push({path,reason:'requires_source_or_scope_verification'});
   }catch(err){
    entry.status='error';entry.error=String(err.message||'review_error').slice(0,140);
    report.pending.push({path,reason:'review_failed'});
   }
  }
  report.files.push(entry);
 };
 const queue=paths.slice(0,MAX_FILES);
 await Promise.all(Array.from({length:Math.min(CONCURRENCY,queue.length)},async()=>{
  while(queue.length)await reviewOne(queue.shift());
 }));
 report.files.sort((a,b)=>a.path<b.path?-1:1);
 report.status=report.pending.length?'incomplete':report.findings.some(f=>['CRITICAL','HIGH'].includes(f.severity))?
  'requires_correction':report.findings.length?'findings_to_review':'screened';
 return report;
}
async function main(){
 const args=process.argv.slice(2),at=args.indexOf('--paths');
 const manual=at>=0?String(args[at+1]||''):(process.env.AUDIT_PATHS||'');
 const dryRun=args.includes('--dry-run');
 const report=await runReview({manual,dryRun});
 await mkdir(dirname(OUTPUT),{recursive:true});
 await writeFile(OUTPUT,JSON.stringify(report,null,2)+'\n','utf8');
 console.log('Education/science review: '+report.status+'; checked '+report.reviewed_count+'/'+report.requested_count+
  '; findings '+report.findings.length+'; pending '+report.pending.length);
 if(!dryRun&&!['not_applicable','screened','findings_to_review'].includes(report.status))process.exitCode=1;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
 main().catch(e=>{console.error('Educational review failed: '+String(e.message).slice(0,100));process.exitCode=1;});
}
