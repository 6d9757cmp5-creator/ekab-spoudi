import {test} from 'node:test';
import assert from 'node:assert/strict';
import {validateArchive,pageRecords} from './build-text-index.mjs';
test('rejects incomplete or clinically enabled archives',()=>{
 const m={complete_verified:10,books:Array.from({length:10},(_,i)=>({id:'book-'+i,archival_status:'full-file-verified',parts:[{file:'part-0001.bin'}],original_pdf_sha256:'a'.repeat(64)})),clinical_retrieval_enabled:false,scientific_approval:false};
 const c={books:m.books.map(({id})=>({id}))};
 assert.doesNotThrow(()=>validateArchive(m,c));
 assert.throws(()=>validateArchive({...m,clinical_retrieval_enabled:true},c),/Unsafe/);
 assert.throws(()=>validateArchive({...m,complete_verified:9},c),/Expected ten/);
});
test('preserves page numbering and omits blank pages',()=>{
 const rows=pageRecords({id:'demo'},'First page\f  \fThird page\f');
 assert.deepEqual(rows.map(x=>x.page),[1,3]);
 assert.equal(rows[1].text,'Third page');
});
