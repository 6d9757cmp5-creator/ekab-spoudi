import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {plan,inspectBundle} from './nih3d-artifact-rescue.mjs';

test('select unsaved NIH originals, exclude expired/other artifact families and duplicates',()=>{
 const a=(id,name,size,expired=false,run=1)=>({id,name,size_in_bytes:size,expired,workflow_run:{id:run},expires_at:'2026-11-09'});
 const x=plan([a(1,'nih3d-originals-1',100),a(2,'nih3d-originals-101',100),a(3,'nih3d-originals-201',100,true),a(4,'nih3d-originals-301',7*1024**3),a(5,'original-z-anatomy-upstream-research-only',100),a(6,'nih3d-originals-2',100),a(7,'nih3d-originals-101',100,false,2)],[{name:'atla-nih3d-00001-00100-RESULT.json'}]);
 assert.equal(x.eligible,1);assert.equal(x.include[0].id,7);assert.equal(x.oversize.length,1);
});
test('verify pack names, lengths, range and SHA256 evidence before upload',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'nih3d-'));
 const base='atla-nih3d-00101-00200',part=base+'-part-000.tar.zst';
 try{
  await writeFile(join(dir,part),'1234');
  await writeFile(join(dir,base+'-RESULT.json'),JSON.stringify({range:{start:101,end:200},downloadedOriginalFiles:1,modelFiles:[{sha256:'a'.repeat(64)}],packs:[{name:part,bytes:4}]}));
  assert.equal((await inspectBundle(dir,101)).length,2);
  await writeFile(join(dir,part),'12');
  await assert.rejects(()=>inspectBundle(dir,101),/Pack size mismatch/);
 }finally{await rm(dir,{recursive:true,force:true})}
});
test('reject unlisted files and noncanonical ranges',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'nih3d-'));
 try{
  await writeFile(join(dir,'atla-nih3d-00101-00200-RESULT.json'),JSON.stringify({range:{start:101,end:200},downloadedOriginalFiles:0,modelFiles:[],packs:[]}));
  await assert.rejects(()=>inspectBundle(dir,102),/Noncanonical/);
  await writeFile(join(dir,'unlisted.tar.zst'),'12');
  await assert.rejects(()=>inspectBundle(dir,101),/Unlisted archive/);
 }finally{await rm(dir,{recursive:true,force:true})}
});
