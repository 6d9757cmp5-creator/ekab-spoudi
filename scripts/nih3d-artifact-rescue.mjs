#!/usr/bin/env node
/** Recover only canonical NIH3D fallback artifacts. Never overwrite published bytes. */
import {readdir,readFile,stat,appendFile} from 'node:fs/promises';
import {createReadStream} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {join,basename} from 'node:path';
const TAG='atla-nih3d-master-2026',REPO=process.env.GITHUB_REPOSITORY||'6d9757cmp5-creator/ekab-spoudi';
const MAX_BYTES=6*1024**3,token=process.env.GH_TOKEN||process.env.GITHUB_TOKEN;
const validStart=s=>Number.isSafeInteger(s)&&s>=1&&s<=24901&&(s-1)%100===0;
const prefix=s=>'atla-nih3d-'+String(s).padStart(5,'0')+'-'+String(s+99).padStart(5,'0');
async function api(path){
 if(!token)throw Error('Missing GH_TOKEN');
 const r=await fetch('https://api.github.com'+path,{headers:{Authorization:'Bearer '+token,Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28','User-Agent':'ekab-nih3d-recovery'},signal:AbortSignal.timeout(45000)});
 if(!r.ok)throw Error('GitHub API '+r.status+' '+path);
 return r.json();
}
async function pages(path,key){
 const items=[];
 for(let page=1;page<=100;page++){
  const r=await api(path+(path.includes('?')?'&':'?')+'per_page=100&page='+page),chunk=key?r[key]:r;
  if(!Array.isArray(chunk))throw Error('Invalid paginated result');
  items.push(...chunk);if(chunk.length<100)break;
 }
 return items;
}
async function assets(){const r=await api('/repos/'+REPO+'/releases/tags/'+TAG);return pages('/repos/'+REPO+'/releases/'+r.id+'/assets');}
export function plan(artifacts,releaseAssets){
 const published=new Set(releaseAssets.map(a=>a.name)),candidates=[],oversize=[];
 for(const a of artifacts){
  const match=/^nih3d-originals-(\d+)$/.exec(a.name||'');
  if(!match||a.expired||!a.id||!a.workflow_run?.id)continue;
  const start=Number(match[1]);if(!validStart(start)||published.has(prefix(start)+'-RESULT.json'))continue;
  const bytes=Number(a.size_in_bytes);if(!Number.isFinite(bytes)||bytes<=0)continue;
  if(bytes>MAX_BYTES){oversize.push({id:a.id,name:a.name,bytes});continue}
  candidates.push({id:a.id,name:a.name,start,run_id:a.workflow_run.id,bytes,expires_at:a.expires_at||''});
 }
 candidates.sort((a,b)=>a.expires_at.localeCompare(b.expires_at)||b.run_id-a.run_id);
 const unique=[],seen=new Set();
 for(const a of candidates){if(!seen.has(a.start)){unique.push(a);seen.add(a.start)}}
 return {include:unique.slice(0,2),eligible:unique.length,oversize};
}
export async function inspectBundle(dir,start){
 if(!validStart(start))throw Error('Noncanonical shard start');
 const base=prefix(start),reportName=base+'-RESULT.json',names=await readdir(dir);
 if(!names.includes(reportName)||names.filter(n=>n.endsWith('-RESULT.json')).length!==1)throw Error('Expected exactly one canonical RESULT.json');
 const report=JSON.parse(await readFile(join(dir,reportName),'utf8'));
 if(report.range?.start!==start||report.range?.end!==start+99)throw Error('Manifest range mismatch');
 if(!Array.isArray(report.packs)||!Array.isArray(report.modelFiles)||report.modelFiles.length!==report.downloadedOriginalFiles)throw Error('Invalid source manifest');
 if(report.modelFiles.some(f=>!/^[a-f0-9]{64}$/i.test(f.sha256||'')))throw Error('Missing original SHA256 evidence');
 const files=[];
 for(const p of report.packs){
  const parts=p.split?.length?p.split:[p.name];
  if(!p.name||!parts.length||!Number.isSafeInteger(p.bytes)||p.bytes<=0)throw Error('Invalid archive inventory');
  let sum=0;
  for(const name of parts){
   if(!name.startsWith(base+'-part-')||!/^[a-z0-9.-]+\.tar\.zst(?:\.part-\d{3})?$/.test(name)||basename(name)!==name||!names.includes(name))throw Error('Unexpected/missing archive '+name);
   const bytes=(await stat(join(dir,name))).size;
   if(bytes<=0||bytes>=1950*1024**2)throw Error('Archive too large for Release '+name);
   files.push({name,path:join(dir,name),bytes});sum+=bytes;
  }
  if(sum!==p.bytes)throw Error('Pack size mismatch');
 }
 const expected=new Set([...files.map(f=>f.name),reportName]);
 if(expected.size!==files.length+1)throw Error('Duplicate pack filename');
 if(names.some(n=>(n.includes('.tar.zst'))&&!expected.has(n)))throw Error('Unlisted archive detected');
 files.push({name:reportName,path:join(dir,reportName),bytes:(await stat(join(dir,reportName))).size});
 return files;
}
async function sha(path){const h=createHash('sha256');for await(const c of createReadStream(path))h.update(c);return h.digest('hex')}
async function publish(dir,start){
 const files=await inspectBundle(dir,start),remote=new Map((await assets()).map(a=>[a.name,a]));
 for(const f of files){
  const exists=remote.get(f.name);
  if(exists){
   if(exists.size!==f.bytes)throw Error('Existing release asset size conflict: '+f.name);
   if(!exists.digest?.startsWith('sha256:'))throw Error('Cannot verify existing release digest: '+f.name);
   if(await sha(f.path)!==exists.digest.slice(7))throw Error('Existing release digest conflict: '+f.name);
   console.log('VERIFIED_EXISTING',f.name);continue;
  }
  execFileSync('gh',['release','upload',TAG,f.path,'--repo',REPO],{stdio:'inherit',env:process.env,timeout:15*60*1000});
  const uploaded=(await assets()).find(a=>a.name===f.name);
  if(!uploaded||uploaded.size!==f.bytes)throw Error('Remote size check failed: '+f.name);
  if(uploaded.digest?.startsWith('sha256:') && await sha(f.path)!==uploaded.digest.slice(7))throw Error('Remote digest check failed: '+f.name);
  remote.set(f.name,uploaded);
  console.log('PUBLISHED_SIZE_VERIFIED',f.name,f.bytes);
 }
 console.log('RESCUE_COMPLETED',prefix(start),files.length);
}
if(import.meta.url==='file://'+process.argv[1]){
 const mode=process.argv[2];
 if(mode==='plan'){
  const result=plan(await pages('/repos/'+REPO+'/actions/artifacts','artifacts'),await assets());
  console.log('RECOVERY_PLAN',JSON.stringify(result));
  if(process.env.GITHUB_OUTPUT)await appendFile(process.env.GITHUB_OUTPUT,'matrix='+JSON.stringify({include:result.include})+'\ncount='+result.include.length+'\n');
  if(result.oversize.length)console.log('::warning::Some artifacts exceed 6GiB hosted runner disk guard and require a separate large-runner migration');
 }else if(mode==='publish'){
  if(!process.argv[3])throw Error('Missing source directory');
  await publish(process.argv[3],Number(process.argv[4]));
 }else throw Error('Usage: plan | publish <directory> <start>');
}
