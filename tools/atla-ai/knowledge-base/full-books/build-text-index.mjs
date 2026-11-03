#!/usr/bin/env node
/**
 * Build an isolated, provenance-preserving page-text index from archived PDFs.
 * Outputs are CI artifacts, never committed or enabled for clinical retrieval.
 * Requires poppler-utils (pdftotext) and Node 22.
 */
import {readFile,writeFile,mkdir,rm} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {dirname,join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
const HERE=dirname(fileURLToPath(import.meta.url));
const OUTPUT=resolve(process.argv[2]||join(HERE,'text-index-output'));
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
export function validateArchive(manifest,catalog){
 if(manifest.complete_verified!==10||manifest.books.length!==10||catalog.books.length!==10)throw Error('Expected ten archived books');
 if(manifest.clinical_retrieval_enabled!==false||manifest.scientific_approval!==false)throw Error('Unsafe clinical flags');
 const ids=new Set();
 for(const b of manifest.books){
  if(ids.has(b.id)||!catalog.books.some(x=>x.id===b.id))throw Error('Duplicate or unknown book');
  ids.add(b.id);
  if(b.archival_status!=='full-file-verified'||!Array.isArray(b.parts)||!b.parts.length||!/^[a-f0-9]{64}$/.test(b.original_pdf_sha256))throw Error('Invalid book record');
 }
}
export function pageRecords(book,text){
 return text.split('\f').map((page,i)=>({book_id:book.id,page:i+1,text:page.replace(/\r/g,'').trim()}))
  .filter(p=>p.text.length>0);
}
export async function build(){
 const manifest=JSON.parse(await readFile(join(HERE,'archive-manifest.json'),'utf8'));
 const catalog=JSON.parse(await readFile(join(HERE,'catalog.json'),'utf8'));
 validateArchive(manifest,catalog);
 await mkdir(OUTPUT,{recursive:true});
 const summary={schema_version:1,books:[],indexed_pages:0,clinical_retrieval_enabled:false,source:'verified-full-pdf-shards'};
 for(const book of manifest.books){
  const buffers=[];let bytes=0;
  for(const part of book.parts){
   if(!/^part-\d{4}\.bin$/.test(part.file))throw Error('Unsafe part name');
   const buffer=await readFile(join(HERE,'complete',book.id,part.file));
   if(buffer.length!==part.size||sha(buffer)!==part.sha256)throw Error('Corrupted part: '+book.id+'/'+part.file);
   buffers.push(buffer);bytes+=buffer.length;
  }
  const pdf=Buffer.concat(buffers);
  if(bytes!==book.original_pdf_bytes||sha(pdf)!==book.original_pdf_sha256||pdf.subarray(0,5).toString()!=='%PDF-')throw Error('PDF verification failed: '+book.id);
  const pdfPath=join(OUTPUT,book.id+'.pdf');
  await writeFile(pdfPath,pdf,{flag:'wx'});
  const result=spawnSync('pdftotext',['-enc','UTF-8',pdfPath,'-'],{encoding:'utf8',maxBuffer:200*1024*1024,timeout:600000});
  await rm(pdfPath,{force:true});
  if(result.status!==0||result.error)throw Error('pdftotext failed for '+book.id+': '+(result.stderr||result.error?.message||'unknown'));
  const pages=pageRecords(book,result.stdout);
  if(pages.length<20||pages.length>book.pages)throw Error('Unexpected extracted page count for '+book.id);
  const output=pages.map(p=>JSON.stringify({...p,source_url:book.source_page,pdf_sha256:book.original_pdf_sha256,clinical_approval:false})).join('\n')+'\n';
  await writeFile(join(OUTPUT,book.id+'.jsonl'),output,{flag:'wx'});
  summary.books.push({id:book.id,pages_with_text:pages.length,source_pages:book.pages,sha256:book.original_pdf_sha256});
  summary.indexed_pages+=pages.length;
 }
 await writeFile(join(OUTPUT,'summary.json'),JSON.stringify(summary,null,2)+'\n',{flag:'wx'});
 console.log('Indexed',summary.books.length,'verified books,',summary.indexed_pages,'nonempty pages; clinical retrieval disabled');
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))build().catch(e=>{console.error(e);process.exitCode=1});
