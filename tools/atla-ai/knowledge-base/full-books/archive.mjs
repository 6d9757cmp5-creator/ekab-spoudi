#!/usr/bin/env node
/**
 * Archive FULL official open-license PDFs without modifying or extracting them.
 * Not ATLA-RAG and not clinical approval. Verifies PDF structure/page count,
 * byte-by-byte integrity and immutable SHA256; saves full bytes in Git-safe shards.
 * Fail closed: partial downloads never become archived manifests.
 */
import {readFile,writeFile,mkdir,rm,open,stat,rename} from 'node:fs/promises';
import {createWriteStream} from 'node:fs';
import {Readable} from 'node:stream';
import {pipeline} from 'node:stream/promises';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {dirname,resolve,join} from 'node:path';
import {fileURLToPath} from 'node:url';
const HERE=dirname(fileURLToPath(import.meta.url));
const CATALOG=join(HERE,'catalog.json');
const ARCHIVED=join(HERE,'archive-manifest.json');
const STORAGE=join(HERE,'complete');
const MAX_BOOK=160*1024*1024;
const MAX_TOTAL=450*1024*1024;
const SHARD_BYTES=16*1024*1024;
const ALLOWED_HOSTS=new Set(['www.ncbi.nlm.nih.gov','minds.wisconsin.edu','minds.wisc.edu']);
const sha=data=>createHash('sha256').update(data).digest('hex');
export function isAllowedSource(raw){
 try{const u=new URL(raw);return u.protocol==='https:'&&!u.username&&!u.password&&!u.port&&ALLOWED_HOSTS.has(u.hostname)}catch{return false}
}
const slug=id=>/^[a-z0-9][a-z0-9-]{3,80}$/.test(id);
export function validateSource(b){
 if(!slug(b.id)||!isAllowedSource(b.official_pdf))throw Error('Unapproved PDF source '+String(b.id));
 if(!/^CC BY 4\.0\b/i.test(b.license))throw Error('No documented CC-BY source approval: '+b.id);
 if(!b.license_url?.startsWith('https://creativecommons.org/licenses/by/4.0/'))throw Error('Missing approved license: '+b.id);
 if(b.atla_ai_retrieval_enabled!==false||b.content_status!=='NOT_YET_ARCHIVED'||b.independent_clinical_review!=='pending')throw Error('Unsafe source state '+b.id);
}
async function redirectSafeFetch(uri,fetcher=fetch){
 let current=uri;
 for(let redirect=0;redirect<5;redirect++){
  if(!isAllowedSource(current))throw Error('Unapproved download destination');
  const r=await fetcher(current,{redirect:'manual',signal:AbortSignal.timeout(150000),
    headers:{'user-agent':'ATLA-OER-Archiver/1.0 (full-book licensed archival; contact repository maintainer)','accept':'application/pdf'}});
  if([301,302,303,307,308].includes(r.status)){
   const target=new URL(r.headers.get('location')||'',current).toString();
   if(!isAllowedSource(target))throw Error('Redirect outside authorized source host: '+target.slice(0,60));
   current=target;continue;
  }
  if(!r.ok||!r.body)throw Error('Upstream PDF HTTP '+r.status);
  if(!/^application\/pdf\b/i.test((r.headers.get('content-type')||'').toLowerCase())){
   // NCBI may serve PDFs with application/octet-stream, but never accept HTML.
   const contentType=(r.headers.get('content-type')||'').toLowerCase();
   if(!contentType.includes('octet-stream'))throw Error('Unexpected MIME '+contentType);
  }
  return r;
 }
 throw Error('Too many redirects');
}
export async function savePdfFully(book,{fetcher=fetch}={}){
 validateSource(book);
 await mkdir(STORAGE,{recursive:true});
 const folder=join(STORAGE,book.id),temp=join(STORAGE,'.downloading-'+book.id+'.pdf');
 await rm(temp,{force:true});
 let downloaded=0,stream;
 try{
  const r=await redirectSafeFetch(book.official_pdf,fetcher);
  const len=Number(r.headers.get('content-length'));
  if(Number.isFinite(len)&&len>MAX_BOOK)throw Error('Full PDF exceeds per-book storage cap');
  const input=Readable.fromWeb(r.body);
  stream=createWriteStream(temp,{flags:'wx'});
  for await(const block of input){
   downloaded+=block.length;
   if(downloaded>MAX_BOOK)throw Error('Full PDF exceeded per-book limit');
   if(!stream.write(block))await new Promise((ok,bad)=>{stream.once('drain',ok);stream.once('error',bad)});
  }
  await new Promise((ok,bad)=>stream.end(error=>error?bad(error):ok()));
  if(downloaded<30000)throw Error('PDF implausibly short');
  const f=await open(temp,'r');
  const header=Buffer.alloc(5);
  const tail=Buffer.alloc(Math.min(downloaded,16384));
  try{await f.read(header,0,5,0);await f.read(tail,0,tail.length,downloaded-tail.length)}finally{await f.close()}
  if(header.toString()!=='%PDF-'||!tail.toString('latin1').includes('%%EOF'))throw Error('No complete PDF header/trailer');
  let pdfInfo;
  try{pdfInfo=execFileSync('pdfinfo',[temp],{encoding:'utf8',timeout:60000})}catch{throw Error('PDF structural validation failed (pdfinfo)')}
  const pages=Number(pdfInfo.match(/^Pages:\s*(\d+)/m)?.[1]);
  if(!Number.isInteger(pages)||pages<20)throw Error('Not a complete book: pages <20');
  const sourceBytes=await readFile(temp);
  const digest=sha(sourceBytes);
  const pieces=[];
  await mkdir(folder,{recursive:true});
  // A re-run with new upstream bytes cannot leave stale final shards.
  const {readdir}=await import('node:fs/promises');
  for(const old of await readdir(folder))if(/^part-\d{4}\.bin$/.test(old))await rm(join(folder,old));
  for(let pos=0,i=1;pos<sourceBytes.length;pos+=SHARD_BYTES,i++){
   const bytes=sourceBytes.subarray(pos,Math.min(sourceBytes.length,pos+SHARD_BYTES));
   const name='part-'+String(i).padStart(4,'0')+'.bin';
   await writeFile(join(folder,name),bytes);
   pieces.push({file:name,size:bytes.length,sha256:sha(bytes)});
  }
  // Verify every persisted part, order and complete original bytes.
  const verifier=createHash('sha256');let total=0;
  for(const part of pieces){
   const b=await readFile(join(folder,part.file));
   if(b.length!==part.size||sha(b)!==part.sha256)throw Error('Shard integrity mismatch');
   verifier.update(b);total+=b.length;
  }
  if(total!==sourceBytes.length||verifier.digest('hex')!==digest)throw Error('Not a lossless complete archive');
  await writeFile(join(folder,'ATTRIBUTION.txt'),
    book.attribution+'\nOriginal: '+book.source_page+'\nComplete PDF: '+book.official_pdf+
    '\nLicense: '+book.license+'\nLicense URL: '+book.license_url+
    '\nThird-party restrictions/exceptions: '+book.rights_scope+
    '\nThis is a complete byte-for-byte PDF archive, NOT an independently approved clinical source or an AI-indexed textbook.\n');
  const record={id:book.id,title:book.title,source_page:book.source_page,official_pdf:book.official_pdf,
   license:book.license,attribution:book.attribution,archival_status:'full-file-verified',
   clinical_retrieval_enabled:false,independent_clinical_review:'pending',
   original_pdf_bytes:total,original_pdf_sha256:digest,pages,parts:pieces};
  await writeFile(join(folder,'MANIFEST.json'),JSON.stringify(record,null,2)+'\n');
  await rm(temp,{force:true});
  return record;
 }catch(e){
  if(stream&&!stream.destroyed)stream.destroy();
  await rm(temp,{force:true});
  if(await stat(folder).catch(()=>null))await rm(folder,{recursive:true,force:true});
  throw e;
 }
}
export async function main(){
 const catalog=JSON.parse(await readFile(CATALOG,'utf8'));
 if(catalog.schema_version!==1||catalog.book_count!==catalog.books.length)throw Error('Invalid open-book catalog');
 const eligible=catalog.books.filter(x=>x.full_book_archival_requested);
 const prev=JSON.parse(await readFile(ARCHIVED,'utf8').catch(e=>e.code==='ENOENT'?'{"books":[]}':Promise.reject(e)));
 const previous=new Map(prev.books.map(x=>[x.id,x]));
 const results=[],failures=[];
 let budget=0;
 for(const book of eligible){
  try{
   validateSource(book);
   // Verify any previous full archive is valid; never trust a manifest alone.
   const cached=previous.get(book.id);
   if(cached?.archival_status==='full-file-verified'){
    const h=createHash('sha256');let bytes=0;
    for(const part of cached.parts){
     const b=await readFile(join(STORAGE,book.id,part.file));
     if(sha(b)!==part.sha256||b.length!==part.size)throw Error('Cached archive corrupt');
     bytes+=b.length;h.update(b);
    }
    if(bytes!==cached.original_pdf_bytes||h.digest('hex')!==cached.original_pdf_sha256)throw Error('Cached complete hash mismatch');
    results.push(cached);budget+=bytes;continue;
   }
   if(budget>=MAX_TOTAL)throw Error('Total archive budget reached, no partial PDF stored');
   const record=await savePdfFully(book);
   if(budget+record.original_pdf_bytes>MAX_TOTAL){
    await rm(join(STORAGE,book.id),{recursive:true,force:true});
    throw Error('Total archive budget reached; full source deferred');
   }
   results.push(record);budget+=record.original_pdf_bytes;
  }catch(e){failures.push({id:book.id,error:String(e.message).slice(0,240),status:'not-archived'});}
 }
 const ids=new Set(results.map(r=>r.id));
 const report={schema_version:1,checked_at:new Date().toISOString(),
  catalog_count:catalog.books.length,attempted:eligible.length,complete_verified:results.length,
  complete_total_bytes:budget,not_archived:catalog.books.filter(b=>!ids.has(b.id)).map(b=>b.id),
  status:failures.length?'PARTIAL':'VERIFIED_FOR_ARCHIVED_FILES_ONLY',
  clinical_retrieval_enabled:false,scientific_approval:false,
  books:results,failures};
 await writeFile(ARCHIVED,JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify({catalog_count:report.catalog_count,attempted:report.attempted,
   verified:report.complete_verified,bytes:budget,failed:failures,scientific_approval:false},null,2));
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 main().catch(e=>{console.error('Archive failed:',e);process.exitCode=1});
}
