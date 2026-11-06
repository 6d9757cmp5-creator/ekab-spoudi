#!/usr/bin/env node
/** Read-only, independent byte verification of publisher-reviewed originals.
 * This verifies exact upstream bytes and publisher release identity, NOT medical
 * correctness, regulatory approval, or deployment eligibility.
 */
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {classifySource} from './source-policy.mjs';

const ROOT=resolve(dirname(fileURLToPath(import.meta.url)),'../../..');
const LEDGER='tools/atla-ai/knowledge-refresh/verified-upstream-evidence.json';
const HRA_MANIFEST='tools/anatomy-3d/resources/imported-manifest.json';
const SHA=/^[a-f0-9]{64}$/;
const HASH=data=>createHash('sha256').update(data).digest('hex');
const blobHash=data=>createHash('sha1').update('blob '+data.byteLength+'\0').update(data).digest('hex');
const reject=(why)=>{throw Error('upstream-originals-unverified:'+why);};
const safelyRooted=(root,path)=>{
 if(typeof path!=='string'||!path||path.startsWith('/')||path.includes('\\')||
    path.split('/').some(x=>!x||x==='.'||x==='..'))reject('unsafe-path');
 const full=resolve(root,path);
 if(!full.startsWith(resolve(root)+'/'))reject('path-outside-root');
 return full;
};
export async function verifyOriginals({root=ROOT,fetcher=fetch}={}){
 const ledger=JSON.parse(await readFile(safelyRooted(root,LEDGER),'utf8'));
 const imports=JSON.parse(await readFile(safelyRooted(root,HRA_MANIFEST),'utf8'));
 if(ledger.schema_version!==1||!Array.isArray(ledger.records))reject('invalid-ledger');
 const rows=ledger.records.filter(x=>x?.verificationDetails?.sourceRelease==='HRA v1.2');
 if(!rows.length)return {checked:0,matched:0,source:'HRA v1.2',noApprovalsImplied:true};
 const out=[];
 for(const row of rows){
  const item=imports.assets?.find(x=>x.id===row.sourceId);
  if(!item||item.output!==row.path||item.source!==row.sourceUrl||
     row.sourceVersion!==imports.sourceCommit||row.reviewedSourceVersion!==imports.sourceCommit||
     !SHA.test(row.sha256)||row.sha256!==item.sha256||
     row.sha256!==row.exactSourceSha256||row.sha256!==row.originalMaterialSha256||
     row.verificationDetails.sourceGitBlob!==item.sourceGitBlob||
     row.verifiedFromPrimaryPublisher!==true||row.publisherReviewStatus!=='publisher-expert-reviewed'||
     row.reviewEvidenceUrl!=='https://3d.nih.gov/collections'||
     !classifySource(row.sourceUrl).accepted)reject('source-identity-mismatch-'+row.sourceId);
  const local=await readFile(safelyRooted(root,row.path));
  if(local.byteLength!==item.bytes||HASH(local)!==row.sha256||
     blobHash(local)!==item.sourceGitBlob)reject('local-binary-mismatch-'+row.sourceId);
  const response=await fetcher(row.sourceUrl,{redirect:'error',signal:AbortSignal.timeout(20000)});
  if(!response.ok||response.status!==200)reject('publisher-fetch-failed-'+row.sourceId);
  const remote=Buffer.from(await response.arrayBuffer());
  if(remote.byteLength!==local.byteLength||
    HASH(remote)!==row.sha256||
    blobHash(remote)!==item.sourceGitBlob||
    !remote.equals(local))reject('publisher-binary-mismatch-'+row.sourceId);
  out.push({id:row.sourceId,bytes:local.byteLength,sha256:row.sha256,upstreamRelease:imports.sourceCommit});
 }
 return {checked:rows.length,matched:out.length,source:'HRA v1.2',bytes:out.reduce((a,x)=>a+x.bytes,0),results:out,noApprovalsImplied:true};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 verifyOriginals().then(x=>console.log(JSON.stringify(x,null,2)))
 .catch(e=>{console.error(String(e));process.exitCode=1;});
}
