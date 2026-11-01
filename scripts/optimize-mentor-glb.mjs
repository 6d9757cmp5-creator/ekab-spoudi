// Rewrites the MENTOR GLB so every material section keeps only the vertices it uses.
// The original file gives all 21 sections the same 65k-vertex buffers plus every face morph target,
// so the renderer built ~21 copies of the morph data (~800 MB of JS heap). Geometry, skeleton,
// animations, morph-target names and textures are unchanged.
// Usage: node scripts/optimize-mentor-glb.mjs <in.glb> <out.glb>   (needs @gltf-transform/core + functions)
import {NodeIO} from '@gltf-transform/core';
import {compactPrimitive} from '@gltf-transform/functions';

const [input,output]=process.argv.slice(2);
if(!input||!output){console.error('usage: optimize-mentor-glb.mjs <in.glb> <out.glb>');process.exit(2);}
const io=new NodeIO();
const doc=await io.read(input);
let before=0,after=0,prims=0;
for(const mesh of doc.getRoot().listMeshes()){
 for(const prim of mesh.listPrimitives()){
  before+=prim.getAttribute('POSITION').getCount();
  compactPrimitive(prim);
  after+=prim.getAttribute('POSITION').getCount();
  prims++;
 }
}
// Drop accessors/buffers that nothing references any more.
for(const a of doc.getRoot().listAccessors())if(a.listParents().every(p=>p.propertyType==='Root'))a.dispose();
await io.write(output,doc);
console.log(JSON.stringify({primitives:prims,vertexEntriesBefore:before,vertexEntriesAfter:after}));
