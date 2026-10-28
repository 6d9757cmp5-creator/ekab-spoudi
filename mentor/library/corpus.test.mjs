import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {loadPassages,searchApprovedBooks} from './corpus.mjs';
test('Production loader excludes draft book content; reviewer can inspect it',async()=>{
 const root=await mkdtemp(join(tmpdir(),'mentor-corpus-'));
 try{
  await mkdir(join(root,'corpus'));
  await writeFile(join(root,'corpus/manifest.json'),JSON.stringify({books:[{source_id:'who-bec'}]}));
  const p={id:'who-bec-p0001-00',source_id:'who-bec',title:'Clinical practice',section:'PDF page 1',source_url:'https://www.who.int/',text:'Airway breathing circulation disability exposure is a systematic assessment process.',review_status:'draft'};
  await writeFile(join(root,'corpus/who-bec.json'),JSON.stringify({title:'WHO BEC',passages:[p]}));
  assert.equal((await loadPassages({rootDir:root})).length,0);
  assert.equal((await loadPassages({rootDir:root,reviewMode:true})).length,1);
  assert.equal((await searchApprovedBooks('airway',{rootDir:root})).length,0);
 } finally {await rm(root,{recursive:true,force:true});}
});
