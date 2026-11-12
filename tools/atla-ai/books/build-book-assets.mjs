#!/usr/bin/env node
/**
 * Builds ATLA's searchable copy of the open textbooks for the Worker (Cloudflare static assets):
 * small text chunks with their book, page and licence, plus a word index split into many small
 * files so the Worker reads only a few kilobytes per question.
 * Sources: the extracted book texts in mentor/library/corpus/ and the archived PDFs that have no
 * text copy yet (needs pdftotext; without it those books are skipped with a warning).
 * Usage: node tools/atla-ai/books/build-book-assets.mjs   (writes workers/mentor-chat/books/, gitignored)
 */
import {readFileSync,writeFileSync,mkdirSync,rmSync,existsSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';

const root=new URL('../../../',import.meta.url);
const read=path=>readFileSync(new URL(path,root),'utf8');
const OUT=new URL('workers/mentor-chat/books/',root);
const FULL_BOOKS='tools/atla-ai/knowledge-base/full-books/';
// Archived PDFs whose text is not already in mentor/library/corpus/.
const PDF_ONLY=['open-rn-nbk610445','open-rn-nbk610815','open-rn-nbk616982','open-rn-nbk615319','open-rn-nbk607454','uwm-cell-molecular-biology-5e'];
import {SHARDS,tokens,shardOf,normGreek} from './text.mjs';
// pdftotext from a fixed install location (Ubuntu runner, Git for Windows), never looked up through PATH.
const PDFTOTEXT=['/usr/bin/pdftotext','C:/Program Files/Git/ucrt64/bin/pdftotext.exe'].find(p=>existsSync(p));
const CHUNK=1100, CHUNK_MAX=1500, GROUP=64, TERMS_PER_CHUNK=40, POSTINGS_MAX=200;
/** Footnotes, licence lines and running page headers of the PDF books carry no teaching content. */
export function cleanPdfText(text){
 return text.split('\n').filter(line=>{
  const t=line.trim();
  return t&&!/^\d{1,4}$/.test(t)&&!/licensed under|Access for free at|is licensed|^\d+\.\s*[“"]/.test(t)&&!/\|\s*\d{1,4}$|^\d{1,4}\s*\|/.test(t);
 }).join('\n');
}
/** Splits text into chunks of about CHUNK characters at paragraph or sentence ends. */
export function chunkText(text){
 const parts=String(text).replace(/\r/g,'').split(/\n+|(?<=[.!?])\s+(?=[A-Z])/).map(s=>s.replace(/\s+/g,' ').trim()).filter(Boolean);
 const out=[];let cur='';
 for(const p of parts){
  if(cur&&cur.length+p.length+1>CHUNK){out.push(cur);cur='';}
  cur=cur?cur+' '+p:p;
  while(cur.length>CHUNK_MAX){out.push(cur.slice(0,CHUNK));cur=cur.slice(CHUNK);}
 }
 if(cur.trim().length>200)out.push(cur);
 return out;
}

function corpusBooks(){
 const manifest=JSON.parse(read('mentor/library/corpus/manifest.json'));
 return manifest.books.map(b=>{
  const data=JSON.parse(read(`mentor/library/corpus/${b.source_id}.json`));
  return {id:b.source_id,title:b.title,origin:b.origin,licence:b.licence,
   pieces:data.passages.flatMap(p=>chunkText(p.text).map(text=>({text,page:null})))};
 });
}

function pdfBooks(){
 if(!PDFTOTEXT){console.warn('pdftotext not found: the',PDF_ONLY.length,'PDF-only books are skipped');return [];}
 const catalog=JSON.parse(read(FULL_BOOKS+'catalog.json'));
 const temp=join(tmpdir(),'atla-book-pdfs');rmSync(temp,{recursive:true,force:true});mkdirSync(temp,{recursive:true});
 const books=[];
 for(const id of PDF_ONLY){
  const meta=catalog.books.find(b=>b.id===id);
  const pdf=join(temp,id+'.pdf'),txt=join(temp,id+'.txt');
  const rebuilt=spawnSync(process.execPath,[fileURLToPath(new URL(FULL_BOOKS+'rebuild.mjs',root)),id,pdf]);
  if(rebuilt.status!==0||spawnSync(PDFTOTEXT,['-enc','UTF-8',pdf,txt]).status!==0){console.warn('skipped',id);continue;}
  const pages=readFileSync(txt,'utf8').split('\f');
  const pieces=pages.flatMap((page,i)=>chunkText(cleanPdfText(page)).map(text=>({text,page:i+1})));
  books.push({id,title:meta.title,origin:meta.source_page,licence:meta.license,publisher:meta.publisher,pieces});
  rmSync(pdf,{force:true});rmSync(txt,{force:true});
 }
 return books;
}

/** English names of the glossary terms, so a Greek question can be searched in English books. */
function glossary(){
 const out={};
 for(const t of JSON.parse(read('medical-terms.json')).items){
  if(!t.en)continue;
  for(const name of [t.term,...(t.aliases||[])])if(name&&name.length>=4)out[normGreek(name)]=t.en;
 }
 return out;
}

export function build(){
 const books=[...corpusBooks(),...pdfBooks()];
 const chunks=[];
 for(const b of books)for(const p of b.pieces)chunks.push({book:b.id,page:p.page,text:p.text});
 // Document frequency, then each chunk keeps its most telling words (tf·idf).
 const df=new Map();
 const termCounts=chunks.map(c=>{const m=new Map();for(const t of tokens(c.text))m.set(t,(m.get(t)||0)+1);for(const t of m.keys())df.set(t,(df.get(t)||0)+1);return m;});
 const tooCommon=chunks.length*0.04;
 const shards=new Map();
 termCounts.forEach((m,i)=>{
  const ranked=[...m].filter(([t])=>df.get(t)<=tooCommon).map(([t,tf])=>[t,(1+Math.log(tf))*Math.log(chunks.length/df.get(t))]).sort((a,b)=>b[1]-a[1]).slice(0,TERMS_PER_CHUNK);
  for(const [t,w] of ranked){
   const s=shardOf(t);if(!shards.has(s))shards.set(s,{});
   (shards.get(s)[t]??=[]).push([i,Math.round(w*100)/100]);
  }
 });
 rmSync(OUT,{recursive:true,force:true});
 mkdirSync(new URL('index/',OUT),{recursive:true});mkdirSync(new URL('chunks/',OUT),{recursive:true});
 for(const [s,terms] of shards){
  for(const t of Object.keys(terms))terms[t]=terms[t].sort((a,b)=>b[1]-a[1]).slice(0,POSTINGS_MAX);
  writeFileSync(new URL(`index/${s}.json`,OUT),JSON.stringify(terms));
 }
 for(let g=0;g*GROUP<chunks.length;g++)writeFileSync(new URL(`chunks/${g}.json`,OUT),JSON.stringify(chunks.slice(g*GROUP,(g+1)*GROUP)));
 const meta={built:new Date().toISOString(),chunks:chunks.length,group:GROUP,shards:SHARDS,
  books:Object.fromEntries(books.map(b=>[b.id,{title:b.title,origin:b.origin,licence:b.licence,publisher:b.publisher||'',chunks:b.pieces.length}])),glossary:glossary()};
 writeFileSync(new URL('books.json',OUT),JSON.stringify(meta));
 return meta;
}

if(process.argv[1]&&import.meta.url.endsWith(process.argv[1].replace(/\\/g,'/').split('/').pop())){
 const meta=build();
 console.log('books',Object.keys(meta.books).length,'chunks',meta.chunks,existsSync(new URL('books.json',OUT))?'→ workers/mentor-chat/books/':'');
 for(const [id,b] of Object.entries(meta.books))console.log(' ',id,b.chunks,b.licence.slice(0,30));
}
