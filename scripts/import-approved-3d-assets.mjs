#!/usr/bin/env node
/**
 * Import verified CC BY 4.0 Human Reference Atlas 3D GLBs into the Anatomy Lab.
 * Resources are pinned to exact upstream commit + Git blob hash.
 * Never imports NC assets, NIH unknown-license objects, or character packs here.
 */
import {readFile,writeFile,mkdir,rename,rm} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {resolve,relative,dirname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const manifestFile=resolve(root,'tools/anatomy-3d/resources/catalog.json');
const importedFile=resolve(root,'tools/anatomy-3d/resources/imported-manifest.json');
export const hash=(buf,algorithm='sha256')=>createHash(algorithm).update(buf).digest('hex');
export const gitBlobHash=buf=>createHash('sha1').update(Buffer.from('blob '+buf.byteLength+'\0')).update(buf).digest('hex');
export function validateGlb(buffer){
 const buf=Buffer.from(buffer);
 if(buf.length<32)throw Error('GLB too small or contains an LFS pointer');
 if(buf.toString('ascii',0,4)!=='glTF')throw Error('not binary glTF (magic mismatch)');
 if(buf.readUInt32LE(4)!==2)throw Error('unsupported glTF major version');
 if(buf.readUInt32LE(8)!==buf.length)throw Error('GLB declared length mismatch');
 const size=buf.readUInt32LE(12),kind=buf.readUInt32LE(16);
 if(kind!==0x4e4f534a||size<2||size+20>buf.length)throw Error('invalid first JSON chunk');
 const doc=JSON.parse(buf.subarray(20,20+size).toString('utf8'));
 if(!Array.isArray(doc.meshes)||!doc.meshes.length)throw Error('GLB lacks meshes');
 return {meshes:doc.meshes.length,nodes:doc.nodes?.length||0,version:doc.asset?.version||'unknown'};
}
export function safeOutput(output){
 if(typeof output!=='string'||!output.startsWith('tools/anatomy-3d/resources/hra-v1.2/'))throw Error('unexpected output directory');
 const path=resolve(root,output);
 if(relative(root,path).startsWith('..'+sep)||relative(root,path).startsWith('..'))throw Error('path traversal');
 if(!path.endsWith('.glb'))throw Error('expected GLB filename');
 return path;
}
export function validateAssetInfo(asset){
 if(!asset||asset.source!=='hra'||asset.approved!==true)throw Error('resource not explicitly approved');
 if(asset.license!=='CC-BY-4.0')throw Error('missing redistributable license');
 if(!/^https:\/\/raw\.githubusercontent\.com\/hubmapconsortium\/ccf-releases\/[0-9a-f]{40}\/v1\.2\/models\/[a-zA-Z0-9_]+\.glb$/.test(asset.url))throw Error('unapproved upstream URL');
 if(!Number.isInteger(asset.bytes)||asset.bytes<100||asset.bytes>80*1024*1024)throw Error('unreasonable asset size');
 if(!/^[0-9a-f]{40}$/.test(asset.gitBlobSha))throw Error('missing pinned Git blob');
 safeOutput(asset.output);
}
async function retrieve(asset,fetcher=fetch){
 validateAssetInfo(asset);
 const response=await fetcher(asset.url,{signal:AbortSignal.timeout(120000),redirect:'follow',headers:{'User-Agent':'EKAB-Spoudi-Research-Importer/1.0'}});
 if(!response.ok)throw Error('upstream HTTP '+response.status+' for '+asset.name);
 const length=Number(response.headers.get('content-length')||0);
 if(length&&length!==asset.bytes)throw Error('unexpected content-length for '+asset.name);
 const buf=Buffer.from(await response.arrayBuffer());
 if(buf.length!==asset.bytes)throw Error('download length mismatch for '+asset.name);
 if(gitBlobHash(buf)!==asset.gitBlobSha)throw Error('unverified upstream blob for '+asset.name);
 const info=validateGlb(buf);
 return {buf,info};
}
async function main(){
 const args=process.argv.slice(2);
 const dry=args.includes('--dry-run'),verify=args.includes('--verify-local');
 const onlyArg=args.find(x=>x.startsWith('--only=')),only=onlyArg?.slice(7).split(',').filter(Boolean)||null;
 const maxArg=args.find(x=>x.startsWith('--max-total-mb='));
 const maxBytes=(maxArg?Number(maxArg.slice('--max-total-mb='.length)):64)*1048576;
 if(!Number.isFinite(maxBytes)||maxBytes<=0)throw Error('Invalid max-total-mb');
 if(!dry&&!verify&&!args.includes('--approved'))throw Error('Explicit --approved flag is required for resource import');
 const catalog=JSON.parse(await readFile(manifestFile,'utf8'));
 let chosen=catalog.anatomyAssets.filter(a=>a.approved);
 if(only)chosen=chosen.filter(a=>only.includes(a.name)||only.includes(a.id));
 if(!chosen.length)throw Error('No approved assets selected');
 chosen.forEach(validateAssetInfo);
 const bytes=chosen.reduce((sum,a)=>sum+a.bytes,0);
 if(bytes>maxBytes)throw Error('Selection exceeds total storage budget: '+bytes+'/'+maxBytes);
 console.log(JSON.stringify({mode:dry?'dry-run':verify?'verify-local':'import',count:chosen.length,totalMB:+(bytes/1048576).toFixed(2),parts:chosen.map(x=>x.output)},null,2));
 if(dry)return;
 const results=[];
 for(const a of chosen){
  const path=safeOutput(a.output);let buf,info;
  if(verify){
   buf=await readFile(path);
   if(buf.length!==a.bytes||gitBlobHash(buf)!==a.gitBlobSha)throw Error('Local file changed: '+a.name);
   info=validateGlb(buf);
  }else{
   ({buf,info}=await retrieve(a));
   await mkdir(dirname(path),{recursive:true});
   const tmp=path+'.incoming';
   await writeFile(tmp,buf,{flag:'w'});
   await rename(tmp,path);
  }
  results.push({id:a.id,name:a.name,region:a.region,output:a.output,source:a.url,sourceGitBlob:a.gitBlobSha,bytes:buf.length,sha256:hash(buf),license:'CC-BY-4.0',attribution:catalog.sources.hra.credit,glb:info,status:'staged-not-clinically-validated'});
  console.log('VERIFIED '+a.name+' '+(buf.length/1048576).toFixed(2)+' MiB '+info.meshes+' meshes');
 }
 if(!verify){
  await writeFile(importedFile,JSON.stringify({generatedAt:new Date().toISOString(),sourceCommit:catalog.sources.hra.commit,sourceLicense:catalog.sources.hra.license,licenseUrl:catalog.sources.hra.licenseSource,clinicalStatus:'NOT_VALIDATED',assets:results},null,2)+'\n');
 }
 console.log('SUCCESS '+results.length+' verifiable assets');
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 main().catch(e=>{console.error('ASSET IMPORT FAILED:',e.message);process.exitCode=1;});
}
