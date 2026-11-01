#!/usr/bin/env node
/**
 * ATLA research intake. Automated DISCOVERY ONLY; not model training,
 * not clinical retrieval, not learner-visible content, not clinical approval.
 * No external dependencies. Node.js 22.
 */
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {dirname,resolve} from 'node:path';
import {createHash} from 'node:crypto';

const HERE=dirname(fileURLToPath(import.meta.url));
const ROOT=resolve(HERE,'../../..');
const OUTPUT=resolve(HERE,'queue');
const PERIOD_DAYS=30;
const LIMIT_CANDIDATES=100;
const TOPICS=Object.freeze([
 {id:'prehospital',name:'Προνοσοκομειακή φροντίδα',term:'("Emergency Medical Services"[MeSH Terms] OR prehospital[Title/Abstract]) AND (guideline[Title/Abstract] OR "Systematic Review"[Publication Type])'},
 {id:'resuscitation',name:'Αναζωογόνηση',term:'("Cardiopulmonary Resuscitation"[MeSH Terms] OR "basic life support"[Title/Abstract]) AND (guideline[Title/Abstract] OR "Systematic Review"[Publication Type])'},
 {id:'trauma',name:'Τραύμα',term:'("Wounds and Injuries"[MeSH Terms] OR "trauma care"[Title/Abstract]) AND ("Emergency Medical Services"[MeSH Terms] OR prehospital[Title/Abstract]) AND (guideline[Title/Abstract] OR "Systematic Review"[Publication Type])'}
]);
const APPROVED_MONITOR_HOSTS=new Set([
 'www.who.int','who.int','www.ekab.gr','ekab.gr','www.ncbi.nlm.nih.gov',
 'openstax.org','www.openstax.org','wtcs.pressbooks.pub','www.resus.org.uk',
 'www.erc.edu','erc.edu','www.naemt.org','naemt.org','www.psglearning.com',
 'psglearning.com','shop.elsevier.com','www.wolterskluwer.com',
 'www.msdmanuals.com','www.cdc.gov','www.escardio.org','www.nice.org.uk',
 'www.ema.europa.eu','humanatlas.io','physionet.org','github.com',
 'www.idsociety.org','www.hematology.org','www.acog.org','www.ginasthma.org',
 'goldcopd.org','kdigo.org','diabetesjournals.org'
]);
const clean=(v,n=320)=>String(v??'').replace(/[\u0000-\u001f\u007f]+/g,' ').replace(/\s+/g,' ').trim().slice(0,n);
const canonical=(url)=>{
 try{
  const u=new URL(url);
  if(u.protocol!=='https:'||u.username||u.password||u.port||!APPROVED_MONITOR_HOSTS.has(u.hostname.toLowerCase()))return null;
  u.hash='';u.search='';
  return u.toString().replace(/\/$/,'');
 }catch{return null;}
};
export function buildWatchlist(registries){
 const found=new Map();
 for(const registry of registries){
  if(!Array.isArray(registry.sources))continue;
  for(const source of registry.sources){
   const url=canonical(source.source_url||source.url);
   if(!url)continue;
   const previous=found.get(url);
   const title=clean(source.title,220);
   if(previous){
    if(!previous.registry_ids.includes(registry.id))previous.registry_ids.push(registry.id);
    continue;
   }
   found.set(url,{url,title,registry_ids:[registry.id]});
  }
 }
 return [...found.values()].sort((a,b)=>a.url.localeCompare(b.url));
}
function readJson(path,fallback){
 return readFile(path,'utf8').then(JSON.parse).catch(e=>{
  if(e.code==='ENOENT')return fallback;
  throw e;
 });
}
function safeDate(value){
 const s=clean(value,40);
 return /^\d{4}(-\d{2}(-\d{2})?)?/.test(s)?s:'not-provided';
}
export function mergeCandidates(previous,found,now){
 const records=new Map();
 for(const c of Array.isArray(previous)?previous:[]){
  if(!/^\d{1,10}$/.test(String(c.pmid||''))||c.status!=='pending-review')continue;
  records.set(String(c.pmid),c);
 }
 let added=0;
 for(const item of found){
  const pmid=String(item.pmid);
  const old=records.get(pmid);
  if(!old)added++;
  records.set(pmid,{
   id:'pubmed-'+pmid,
   pmid,
   title:clean(item.title,300),
   published_at:safeDate(item.published_at),
   journal:clean(item.journal,140),
   source_url:'https://pubmed.ncbi.nlm.nih.gov/'+pmid+'/',
   topic_ids:[...new Set([...(old?.topic_ids||[]),item.topic_id])].sort(),
   first_detected:old?.first_detected||now,
   last_detected:now,
   status:'pending-review',
   content_imported:false,
   clinical_approval:false,
   atla_ai_retrieval_enabled:false,
   note:'Bibliographic discovery only. Check full text, methods, license and clinical relevance before manual acceptance.'
  });
 }
 return {items:[...records.values()].sort((a,b)=>b.last_detected.localeCompare(a.last_detected)||b.pmid.localeCompare(a.pmid)).slice(0,LIMIT_CANDIDATES),added};
}
async function requestJson(url,fetcher=fetch){
 const r=await fetcher(url,{headers:{accept:'application/json','user-agent':'ATLA-Source-Monitor/1.0 (research-only; GitHub Actions)'},signal:AbortSignal.timeout(15000)});
 if(!r.ok)throw Error('HTTP '+r.status);
 const body=await r.text();
 if(body.length>1_500_000)throw Error('oversized-source-response');
 return JSON.parse(body);
}
export async function discoverPubMed(fetcher=fetch){
 const articles=new Map(),failures=[];
 for(const topic of TOPICS){
  try{
   const search=new URL('https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi');
   for(const [k,v] of Object.entries({db:'pubmed',term:topic.term,retmode:'json',retmax:'10',sort:'pub date',reldate:String(PERIOD_DAYS),datetype:'edat'}))search.searchParams.set(k,v);
   const searchResult=await requestJson(search,fetcher);
   const ids=(searchResult.esearchresult?.idlist||[]).filter(v=>/^\d{1,10}$/.test(String(v))).slice(0,10);
   if(!ids.length)continue;
   const lookup=new URL('https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi');
   for(const [k,v] of Object.entries({db:'pubmed',id:ids.join(','),retmode:'json'}))lookup.searchParams.set(k,v);
   const result=await requestJson(lookup,fetcher);
   for(const pmid of ids){
    const a=result.result?.[pmid];
    if(!a?.title)continue;
    const item={pmid:String(pmid),title:a.title,published_at:a.pubdate||a.epubdate||'',journal:a.fulljournalname||a.source||'',topic_id:topic.id};
    if(!articles.has(pmid))articles.set(pmid,item);
    else{
     const old=articles.get(pmid);
     old.topic_ids=[...new Set([...(old.topic_ids||[old.topic_id]),topic.id])];
    }
   }
  }catch(e){failures.push({topic_id:topic.id,reason:clean(e.message,120)});}
 }
 const found=[...articles.values()].flatMap(item=>(item.topic_ids||[item.topic_id]).map(topic_id=>({...item,topic_id})));
 return {found,failures};
}
export function signalFor(previous,probe){
 if(!probe?.ok)return 'unverified';
 if(!previous?.ok)return 'baseline';
 if(previous.last_modified&&probe.last_modified&&previous.last_modified!==probe.last_modified)return 'possible-source-update';
 if(previous.etag&&probe.etag&&previous.etag!==probe.etag)return 'possible-source-update';
 return 'no-confirmed-change';
}
async function probeSource(source,fetcher=fetch){
 let url=source.url;
 for(let hops=0;hops<3;hops++){
  try{
   const r=await fetcher(url,{method:'HEAD',redirect:'manual',signal:AbortSignal.timeout(10000),
    headers:{'user-agent':'ATLA-Source-Monitor/1.0 (metadata-check only)'}});
   if([301,302,303,307,308].includes(r.status)){
    const next=canonical(new URL(r.headers.get('location')||'',url).toString());
    if(!next)return {ok:false,http_status:r.status,reason:'redirect-outside-allowlist'};
    url=next;continue;
   }
   return {ok:r.ok,http_status:r.status,etag:clean(r.headers.get('etag'),100),last_modified:clean(r.headers.get('last-modified'),80),final_url:url,reason:r.ok?'':('HTTP '+r.status)};
  }catch(e){return {ok:false,reason:clean(e.message,120)}}
 }
 return {ok:false,reason:'redirect-limit'};
}
async function loadRegistries(){
 const paths=[
  {id:'books',path:'mentor/library/source-index.json'},
  {id:'knowledge',path:'mentor/knowledge/sources.json'},
  {id:'clinical-ai',path:'mentor/clinical-desk/sources.json'}
 ];
 const registries=[];
 for(const item of paths){
  const file=await readJson(resolve(ROOT,item.path),null);
  if(file)registries.push({id:item.id,sources:file.sources});
 }
 return registries;
}
export async function main({fetcher=fetch,now=new Date().toISOString(),write=true}={}){
 const registries=await loadRegistries();
 if(!registries.length)throw Error('No source registries; refusing empty overwrite');
 const previous=await readJson(resolve(OUTPUT,'source-health.json'),{sources:[]});
 const lastCandidates=await readJson(resolve(OUTPUT,'pending-pubmed.json'),{items:[]});
 const watchlist=buildWatchlist(registries);
 const previousByUrl=new Map((previous.sources||[]).map(x=>[x.url,x]));
 const sourceResults=[];
 for(let i=0;i<watchlist.length;i+=4){
  const batch=watchlist.slice(i,i+4);
  const reports=await Promise.all(batch.map(async source=>{
   const probe=await probeSource(source,fetcher);
   return {...source,...probe,signal:signalFor(previousByUrl.get(source.url),probe)};
  }));
  sourceResults.push(...reports);
 }
 const discovered=await discoverPubMed(fetcher);
 const merged=mergeCandidates(lastCandidates.items,discovered.found,now);
 const metadata={schema_version:1,checked_at:now,registries:registries.map(r=>({id:r.id,entries:r.sources.length})),
  monitored_urls:watchlist.length,monitored_ok:sourceResults.filter(x=>x.ok).length,
  possible_source_updates:sourceResults.filter(x=>x.signal==='possible-source-update').length,
  newly_discovered_papers:merged.added,pending_papers:merged.items.length,pubmed_failures:discovered.failures,
  full_texts_imported:0,model_training_performed:false,clinical_retrieval_updated:false,
  summary:'Scans detect candidates only; no medical/learner knowledge is published automatically.'};
 const health={schema_version:1,checked_at:now,sources:sourceResults};
 const pending={schema_version:1,checked_at:now,scope:'ATLA internal pending review, never live learner content',
  items:merged.items};
 if(write){
  await mkdir(OUTPUT,{recursive:true});
  await Promise.all([
   writeFile(resolve(OUTPUT,'source-health.json'),JSON.stringify(health,null,2)+'\n'),
   writeFile(resolve(OUTPUT,'pending-pubmed.json'),JSON.stringify(pending,null,2)+'\n'),
   writeFile(resolve(OUTPUT,'last-scan.json'),JSON.stringify(metadata,null,2)+'\n')
  ]);
 }
 return {metadata,health,pending};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const dry=process.argv.includes('--dry-run');
 main({write:!dry}).then(out=>console.log(JSON.stringify(out.metadata,null,2))).catch(e=>{
  console.error('ATLA scan failed:',e.message);process.exitCode=1;
 });
}
