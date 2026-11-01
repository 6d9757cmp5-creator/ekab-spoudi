import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {parseGLB} from './next-patient-mesh.mjs';
const file=new URL('../assets/cc0-human-body.glb',import.meta.url);
test('original locally bundled CC0 human GLB contains usable 3D patient geometry',()=>{
 const data=readFileSync(file),array=data.buffer.slice(data.byteOffset,data.byteOffset+data.byteLength);
 const model=parseGLB(array);
 assert(model.positions instanceof Float32Array);
 assert(model.normals instanceof Float32Array);
 assert(model.indices instanceof Uint16Array);
 assert(model.positions.length>10000);
 assert.equal(model.positions.length,model.normals.length);
 assert(model.indices.length>3000);
 assert(model.positions.every(Number.isFinite));
 assert(model.normals.every(Number.isFinite));
 assert(model.indices.every(i=>i<model.positions.length/3));
});
test('malformed or truncated GLB never gets accepted as patient asset',()=>{
 assert.throws(()=>parseGLB(new ArrayBuffer(22)));
 const data=readFileSync(file);
 const bytes=new Uint8Array(data);
 const truncated=bytes.slice(0,500);
 assert.throws(()=>parseGLB(truncated.buffer));
});
