// Verify recorded SHA-256 values against actual repository bytes.
// Separate technical integrity from clinical/scientific approval.
import {createHash} from 'node:crypto';
import {createReadStream, readFileSync, statSync, realpathSync} from 'node:fs';
import {resolve, relative, isAbsolute, sep} from 'node:path';

const root=realpathSync(process.cwd());
const manifests=[
  ['tools/anatomy-3d/resources/imported-manifest.json','assets'],
  ['tools/anatomy-3d/resources/z-anatomy-research/imported-manifest.json','assets'],
  ['tools/patient-simulator/resources/makehuman/imported-manifest.json','assets'],
  ['tools/patient-simulator/resources/makehuman/supplemental-imported-manifest.json','files'],
  ['tools/patient-simulator/resources/quaternius/imported-manifest.json','assets'],
  ['tools/anatomy-3d/resources/bp3d43/compiled-shards/manifest.json','parts'],
  ['tools/anatomy-3d/resources/nih3d-approved/head-3dpx-000010/manifest.json','chunks']
];
const validHash=/^[0-9a-f]{64}$/;
const report={manifestCount:0,fileCount:0,verified:0,failures:[],sources:[]};
function resolveSafe(p){
  if(typeof p!=='string'||!p||isAbsolute(p))throw Error('unsafe/empty path: '+p);
  const candidate=resolve(root,p);
  const rel=relative(root,candidate);
  if(rel==='..'||rel.startsWith('..'+sep)||isAbsolute(rel))throw Error('path traversal: '+p);
  const actual=realpathSync(candidate);
  const actualRel=relative(root,actual);
  if(actualRel==='..'||actualRel.startsWith('..'+sep)||isAbsolute(actualRel))throw Error('symlink escapes repository: '+p);
  if(!statSync(actual).isFile())throw Error('not a regular file: '+p);
  return actual;
}
async function digest(path){
  const h=createHash('sha256');
  for await(const chunk of createReadStream(path))h.update(chunk);
  return h.digest('hex');
}
async function digestParts(paths){
  const h=createHash('sha256');
  for(const path of paths)for await(const chunk of createReadStream(path))h.update(chunk);
  return h.digest('hex');
}
for(const [manifest,listKey] of manifests){
  try{
    const j=JSON.parse(readFileSync(resolveSafe(manifest),'utf8'));
    const items=j[listKey];
    if(!Array.isArray(items)||items.length===0)throw Error('empty/missing '+listKey);
    report.manifestCount++;
    const seen=new Set(),parts=[];
    for(const item of items){
      report.fileCount++;
      const path=item.output||item.path||(listKey==='parts'?'tools/anatomy-3d/resources/bp3d43/compiled-shards/'+item.file:listKey==='chunks'?'tools/anatomy-3d/resources/nih3d-approved/head-3dpx-000010/'+item.file:null);
      try{
        if(typeof path!=='string')throw Error('missing path');
        if(seen.has(path))throw Error('duplicate path');
        seen.add(path);
        if(!validHash.test(item.sha256))throw Error('invalid recorded SHA-256');
        const file=resolveSafe(path);
        if(!Number.isSafeInteger(item.bytes??item.size)||statSync(file).size!==(item.bytes??item.size))throw Error('byte size mismatch');
        const actual=await digest(file);
        if(actual!==item.sha256)throw Error('SHA-256 mismatch');
        report.verified++;
        if(listKey==='parts'||listKey==='chunks')parts.push(file);
      }catch(e){report.failures.push({path:path??'(missing)',reason:String(e.message||e)})}
    }
    if(listKey==='parts'||listKey==='chunks'){
      try{
        if(parts.length!==items.length)throw Error('not all parts verified');
        if(listKey==='parts'&&j.partCount!==items.length)throw Error('partCount mismatch');
        const bytes=items.reduce((n,x)=>n+x.bytes,0);
        if(bytes!==j.totalBytes)throw Error('totalBytes mismatch');
        if(!validHash.test(j.sha256)||(await digestParts(parts))!==j.sha256)throw Error('combined SHA-256 mismatch');
      }catch(e){report.failures.push({path:manifest+' (combined)',reason:String(e.message||e)})}
    }
    report.sources.push({manifest,entries:items.length});
  }catch(e){report.failures.push({path:manifest,reason:String(e.message||e)})}
}
console.log(JSON.stringify(report,null,2));
if(report.failures.length||report.manifestCount!==manifests.length||report.verified!==report.fileCount)process.exitCode=1;
