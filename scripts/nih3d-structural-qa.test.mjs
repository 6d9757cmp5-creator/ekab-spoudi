import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import {inspectGeometry,auditRestoredModels,imagesToRestore} from './nih3d-structural-qa.mjs';
const gltf={asset:{version:'2.0'},meshes:[{primitives:[{attributes:{POSITION:0}}]}],accessors:[{count:3}]};
const json=Buffer.from(JSON.stringify(gltf),'utf8');
const padded=Buffer.alloc(Math.ceil(json.length/4)*4,0x20);json.copy(padded);
const glb=Buffer.alloc(20+padded.length);
glb.write('glTF',0,'ascii');glb.writeUInt32LE(2,4);glb.writeUInt32LE(glb.length,8);
glb.writeUInt32LE(padded.length,12);glb.write('JSON',16,'ascii');padded.copy(glb,20);
assert.equal(inspectGeometry(glb,'GLB').status,'STRUCTURAL_CHECK_PASSED');
const wrong=Buffer.from(glb);wrong.writeUInt32LE(glb.length+1,8);
assert.equal(inspectGeometry(wrong,'GLB').status,'NEEDS_FORMAT_REVIEW');
const binarySTL=Buffer.alloc(134);binarySTL.writeUInt32LE(1,80);
assert.equal(inspectGeometry(binarySTL,'STL').triangleCount,1);
assert.equal(inspectGeometry(Buffer.alloc(135),'STL').status,'NEEDS_FORMAT_REVIEW');
const obj=Buffer.from('# Original\nv 0 0 0\nv 1 0 0\nv 0 1 0\nf 1 2 3\n');
assert.equal(inspectGeometry(obj,'OBJ').status,'NEEDS_FORMAT_REVIEW','Too small geometry should need review');
const longer=Buffer.concat([obj,Buffer.from('# valid 3D original input extra text to exceed structural threshold\n')]);
assert.equal(inspectGeometry(longer,'OBJ').status,'STRUCTURAL_CHECK_PASSED');
assert.equal(inspectGeometry(Buffer.from('<html>'+('x'.repeat(100))),'X3D').status,'INVALID_FORMAT');
assert.equal(inspectGeometry(Buffer.from('<?xml version="1.0"?><X3D>'+(' '.repeat(100))),'X3D').status,'STRUCTURAL_CHECK_PASSED');
assert.equal(inspectGeometry(Buffer.from('#VRML V2.0 utf8\n'+(' '.repeat(100))),'WRL').status,'STRUCTURAL_CHECK_PASSED');
// A new batch must be audited from restored bytes while earlier verified rows are reused.
const tmp=await fs.mkdtemp(path.join(os.tmpdir(),'nih3d-qa-'));
const oldImage='ghcr.io/x/a@sha256:'+'a'.repeat(64),newImage='ghcr.io/x/a@sha256:'+'b'.repeat(64);
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const registryFor=extra=>({sourceSHA256AndAnonymousRecoveryVerified:true,fullNIHArchiveComplete:false,
 archiveModelsWithAnyOriginal:1+extra.length,uniqueVerifiedOriginalFiles:1+extra.length,
 totalDistinctVerifiedOriginalBytes:glb.length+extra.reduce((n,x)=>n+x.bytes.length,0),
 models:[{entryId:1,accession:'3DPX-000001',verifiedFiles:[{format:'GLB',size:glb.length,sha256:sha(glb),
  originalSourceUrl:'u',verifiedOCI:{digest:oldImage,filePath:'originals/a.glb'}}]},
 ...extra.map(x=>({entryId:x.id,accession:'3DPX-00000'+x.id,verifiedFiles:[{format:'GLB',size:x.bytes.length,sha256:sha(x.bytes),
  originalSourceUrl:'u',verifiedOCI:{digest:newImage,filePath:'originals/b.glb'}}]}))]});
const write=async(file,data)=>{await fs.mkdir(path.dirname(file),{recursive:true});await fs.writeFile(file,data);return file;};
await write(path.join(tmp,'r/'+'a'.repeat(64)+'/originals/a.glb'),glb);
const reg1=await write(path.join(tmp,'r1.json'),JSON.stringify(registryFor([])));
const base=path.join(tmp,'qa1.json');
const first=await auditRestoredModels(reg1,path.join(tmp,'r'),base);
assert.equal(first.reusedPriorVerificationFiles,0);
const added=[{id:2,bytes:glb}];
assert.deepEqual(imagesToRestore(registryFor(added),first),[newImage],'Only the new image needs restoring');
await fs.rm(path.join(tmp,'r/'+'a'.repeat(64)),{recursive:true});
await write(path.join(tmp,'r/'+'b'.repeat(64)+'/originals/b.glb'),glb);
const reg2=await write(path.join(tmp,'r2.json'),JSON.stringify(registryFor(added)));
const second=await auditRestoredModels(reg2,path.join(tmp,'r'),path.join(tmp,'qa2.json'),base);
assert.equal(second.reusedPriorVerificationFiles,1);
assert.equal(second.counts.sha256Verified,2);
// Corrupted new bytes must still fail closed, and a changed hash cannot reuse an earlier row.
await write(path.join(tmp,'r/'+'b'.repeat(64)+'/originals/b.glb'),Buffer.concat([glb,Buffer.from('x')]));
await assert.rejects(auditRestoredModels(reg2,path.join(tmp,'r'),path.join(tmp,'qa3.json'),base));
const tampered=registryFor([]);tampered.models[0].verifiedFiles[0].sha256='c'.repeat(64);
assert.deepEqual(imagesToRestore(tampered,first),[oldImage],'A changed hash cannot reuse an earlier row');
// A non-passing earlier row is never reused.
const failing=JSON.parse(JSON.stringify(first));failing.files[0].formatCheck.status='NEEDS_FORMAT_REVIEW';
assert.deepEqual(imagesToRestore(registryFor([]),failing),[oldImage]);
await fs.rm(tmp,{recursive:true,force:true});
console.log('NIH source structural format tests passed');
