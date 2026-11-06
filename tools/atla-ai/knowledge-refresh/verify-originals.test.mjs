import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,dirname} from 'node:path';
import {createHash} from 'node:crypto';
import {verifyOriginals} from './verify-originals.mjs';
const h=(b,alg)=>createHash(alg).update(b).digest('hex');
test('actual read-only evidence verifier compares publisher and local bytes without AI API',async()=>{
 const root=await mkdtemp(join(tmpdir(),'atla-originals-'));
 const path='tools/anatomy-3d/resources/hra-v1.2/pelvis/VH_F_Ovary_R.glb';
 const origin='https://raw.githubusercontent.com/hubmapconsortium/ccf-releases/b036a91aaf7234f462b1249d4a5f4fb0e982f412/v1.2/models/VH_F_Ovary_R.glb';
 const manifest='tools/anatomy-3d/resources/imported-manifest.json';
 const ledger='tools/atla-ai/knowledge-refresh/verified-upstream-evidence.json';
 const bytes=Buffer.from('glTF-fixture-source-unchanged');
 const sha=h(bytes,'sha256'),gitblob=h(Buffer.concat([Buffer.from('blob '+bytes.length+'\0'),bytes]),'sha1');
 const commit='b036a91aaf7234f462b1249d4a5f4fb0e982f412';
 const a={id:'hra-1.2-vh-f-ovary-r',output:path,source:origin,bytes:bytes.length,sha256:sha,sourceGitBlob:gitblob};
 const rec={path,sourceId:a.id,sourceVersion:commit,reviewedSourceVersion:commit,sourceUrl:origin,
  sha256:sha,exactSourceSha256:sha,originalMaterialSha256:sha,verifiedFromPrimaryPublisher:true,
  publisherReviewStatus:'publisher-expert-reviewed',reviewEvidenceUrl:'https://3d.nih.gov/collections',
  verificationDetails:{sourceRelease:'HRA v1.2',sourceGitBlob:gitblob}};
 const fixture=async(records=[rec])=>{
  await mkdir(dirname(join(root,path)),{recursive:true});
  await mkdir(dirname(join(root,ledger)),{recursive:true});
  await writeFile(join(root,path),bytes);
  await writeFile(join(root,manifest),JSON.stringify({sourceCommit:commit,assets:[a]}));
  await writeFile(join(root,ledger),JSON.stringify({schema_version:1,records}));
 };
 const fake=(content)=>async()=>({ok:true,status:200,arrayBuffer:async()=>Uint8Array.from(content).buffer});
 try{
  await fixture();
  const pass=await verifyOriginals({root,fetcher:fake(bytes)});
  assert.equal(pass.matched,1);
  assert.equal(pass.checked,1);
  assert.equal(pass.noApprovalsImplied,true);
  await assert.rejects(()=>verifyOriginals({root,fetcher:fake(Buffer.from('changed source bytes'))}),/publisher-binary-mismatch/);
  await writeFile(join(root,path),Buffer.from('changed local bytes'));
  await assert.rejects(()=>verifyOriginals({root,fetcher:fake(bytes)}),/local-binary-mismatch/);
  await fixture([{...rec,sourceUrl:origin.replace('hubmapconsortium','fake-owner')}]);
  await assert.rejects(()=>verifyOriginals({root,fetcher:fake(bytes)}),/source-identity-mismatch/);
  await fixture([]);
  const none=await verifyOriginals({root,fetcher:()=>{throw Error('unexpected-network');}});
  assert.equal(none.checked,0);
 }finally{await rm(root,{recursive:true,force:true});}
});
