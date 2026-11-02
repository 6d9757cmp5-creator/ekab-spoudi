// Verify persisted complete-textbook bytes, shard SHA-256 and original PDF SHA-256.
// Technical integrity only: no scientific approval, no change to clinical retrieval.
import {createHash} from 'node:crypto';
import {readFileSync,statSync,createReadStream,realpathSync} from 'node:fs';
import {resolve,relative,isAbsolute,sep} from 'node:path';

const root=realpathSync(process.cwd());
const base='tools/atla-ai/knowledge-base/full-books/';
const hex=/^[a-f0-9]{64}$/;
const failures=[];
const report={booksExpected:0,booksVerified:0,partsVerified:0,bytesVerified:0,failures};
function safe(path){
  if(typeof path!=='string'||!path||isAbsolute(path))throw Error('bad path');
  const p=resolve(root,path),r=relative(root,p);
  if(r==='..'||r.startsWith('..'+sep)||isAbsolute(r))throw Error('path traversal');
  const real=realpathSync(p),rr=relative(root,real);
  if(rr==='..'||rr.startsWith('..'+sep)||isAbsolute(rr))throw Error('symlink escape');
  if(!statSync(real).isFile())throw Error('not regular file');
  return real;
}
function json(path){return JSON.parse(readFileSync(safe(path),'utf8'));}
try{
  const archive=json(base+'archive-manifest.json');
  if(!Array.isArray(archive.books)||!archive.books.length||archive.complete_verified!==archive.books.length)throw Error('archive summary inconsistent');
  if(archive.scientific_approval!==false||archive.clinical_retrieval_enabled!==false)throw Error('unexpected clinical approval status');
  report.booksExpected=archive.books.length;
  const seen=new Set();
  for(const book of archive.books){
    try{
      if(typeof book.id!=='string'||!/^[a-z0-9][a-z0-9-]{3,80}$/.test(book.id)||seen.has(book.id))throw Error('invalid or duplicate book ID');
      seen.add(book.id);
      if(book.archival_status!=='full-file-verified'||book.independent_clinical_review!=='pending'||book.clinical_retrieval_enabled!==false)throw Error('book status mismatch');
      if(!hex.test(book.original_pdf_sha256)||!Number.isSafeInteger(book.original_pdf_bytes)||book.original_pdf_bytes<=0)throw Error('invalid PDF checksum/size');
      if(!Array.isArray(book.parts)||book.parts.length===0)throw Error('no book shards');
      const stored=json(base+'complete/'+book.id+'/MANIFEST.json');
      for(const key of ['id','original_pdf_sha256','original_pdf_bytes','archival_status']){
        if(stored[key]!==book[key])throw Error('local MANIFEST mismatch: '+key);
      }
      if(JSON.stringify(stored.parts)!==JSON.stringify(book.parts))throw Error('local shard list mismatch');
      let total=0,first=null;
      const h=createHash('sha256');
      const partNames=new Set();
      for(const part of book.parts){
        if(typeof part.file!=='string'||!/^part-\d{4}\.bin$/.test(part.file)||partNames.has(part.file))throw Error('invalid/duplicate shard name');
        partNames.add(part.file);
        if(!hex.test(part.sha256)||!Number.isSafeInteger(part.size)||part.size<=0)throw Error('invalid shard metadata');
        const f=safe(base+'complete/'+book.id+'/'+part.file);
        if(statSync(f).size!==part.size)throw Error('shard size mismatch: '+part.file);
        const sha=createHash('sha256');
        for await(const chunk of createReadStream(f)){
          if(first===null)first=chunk.subarray(0,5).toString('utf8');
          sha.update(chunk);h.update(chunk);
        }
        if(sha.digest('hex')!==part.sha256)throw Error('shard hash mismatch: '+part.file);
        total+=part.size;report.partsVerified++;
      }
      if(first!=='%PDF-')throw Error('PDF signature missing');
      if(total!==book.original_pdf_bytes||h.digest('hex')!==book.original_pdf_sha256)throw Error('reassembled original PDF checksum mismatch');
      report.booksVerified++;report.bytesVerified+=total;
    }catch(e){failures.push({book:book?.id??'(missing)',reason:String(e.message||e)})}
  }
}catch(e){failures.push({book:'archive-manifest.json',reason:String(e.message||e)})}
console.log(JSON.stringify(report,null,2));
if(failures.length||report.booksVerified!==report.booksExpected)process.exitCode=1;
