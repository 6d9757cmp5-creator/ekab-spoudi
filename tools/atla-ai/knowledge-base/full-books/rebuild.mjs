#!/usr/bin/env node
/* Reconstruct byte-for-byte complete archived PDF from Git-safe shards. */
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {dirname,resolve,join} from 'node:path';
import {fileURLToPath} from 'node:url';
const here=dirname(fileURLToPath(import.meta.url));
const id=process.argv[2];
const target=process.argv[3];
if(!id||!/^[a-z0-9][a-z0-9-]{3,80}$/.test(id)||!target){
 console.error('Usage: node rebuild.mjs <book-id> <output.pdf>');
 process.exitCode=2;
}else{
 try{
  const manifest=JSON.parse(await readFile(join(here,'archive-manifest.json'),'utf8'));
  const book=manifest.books.find(x=>x.id===id && x.archival_status==='full-file-verified');
  if(!book)throw Error('No verified complete book in archive: '+id);
  const buffers=[],h=createHash('sha256');let total=0;
  for(const part of book.parts){
   if(!/^part-\d{4}\.bin$/.test(part.file))throw Error('Invalid shard filename');
   const buffer=await readFile(join(here,'complete',id,part.file));
   const digest=createHash('sha256').update(buffer).digest('hex');
   if(digest!==part.sha256||buffer.byteLength!==part.size)throw Error('Shard corrupted: '+part.file);
   buffers.push(buffer);h.update(buffer);total+=buffer.byteLength;
  }
  if(total!==book.original_pdf_bytes||h.digest('hex')!==book.original_pdf_sha256)throw Error('Original PDF SHA256 mismatch');
  const pdf=Buffer.concat(buffers);
  if(pdf.subarray(0,5).toString()!=='%PDF-')throw Error('Not a full PDF');
  await writeFile(resolve(target),pdf,{flag:'wx'});
  console.log('FULL ORIGINAL PDF restored:',id,'size:',total,'SHA256:',book.original_pdf_sha256);
 }catch(e){console.error(e.message);process.exitCode=1}
}
