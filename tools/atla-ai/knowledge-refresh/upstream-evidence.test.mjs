import test from 'node:test';
import assert from 'node:assert/strict';
import {assessUpstreamEvidence,reuseDecisionForPath} from './upstream-evidence.mjs';
import {readFileSync} from 'node:fs';

const hash='a'.repeat(64),now='2026-11-05T23:00:00.000Z';
const artifact=()=>({
 sourceUrl:'https://www.who.int/publications/i/item/exact-guide',sourceId:'WHO-GUIDE-123',
 sourceVersion:'2026-01',sha256:hash,changed:false,transformed:false,
 generatedClaims:false,usage:'educational-original'
});
const verified=()=>({
 path:'saek-material/source-guide.pdf',
 sourceUrl:'https://www.who.int/publications/i/item/exact-guide',
 sourceId:'WHO-GUIDE-123',sourceVersion:'2026-01',
 exactSourceSha256:hash,originalMaterialSha256:hash,
 reviewEvidenceUrl:'https://www.who.int/publications/guidelines/guide-methodology',
 publisherReviewStatus:'publisher-official-guideline',
 reviewedSourceId:'WHO-GUIDE-123',reviewedSourceVersion:'2026-01',
 verifiedFromPrimaryPublisher:true,publisherDocumentEvidenceMatched:true,
 scope:'educational-reference',retracted:false,superseded:false,
 materiallyDisputed:false,primaryEvidenceCheckedAt:'2026-11-05T09:00:00Z',
 retractionCheckedAt:'2026-11-05T09:00:00Z',
 changed:false,generatedClaims:false,transformed:false,
 usage:'educational-original'
});
const check=(a=artifact(),b=verified())=>assessUpstreamEvidence(a,b,{now});

test('exact publisher-evaluated original reuses upstream review, not ATLA certification',()=>{
 const out=check();
 assert.equal(out.status,'SOURCE_REVIEW_REUSED');
 assert.equal(out.externalEvidenceReused,true);
 assert.equal(out.independentMedicalReviewNeeded,false);
 assert.equal(out.clinicalApproval,false);
 assert.equal(out.automaticClinicalPublishing,false);
 assert.equal(out.atlaScientificCertification,false);
 assert.equal(out.sourceEvidence.reviewEvidenceUrl,verified().reviewEvidenceUrl);
});
test('publisher domain alone is not review evidence',()=>{
 assert.equal(check(artifact(),null).status,'PENDING_REVIEW');
 assert.equal(check(artifact(),{...verified(),verifiedFromPrimaryPublisher:false}).externalEvidenceReused,false);
 assert.equal(check(artifact(),{...verified(),publisherDocumentEvidenceMatched:false}).externalEvidenceReused,false);
});
test('version/identity must match the exact externally evaluated item',()=>{
 assert.equal(check({...artifact(),sourceVersion:'2026-02'}).externalEvidenceReused,false);
 assert.equal(check(artifact(),{...verified(),reviewedSourceId:'unrelated'}).externalEvidenceReused,false);
 assert.equal(check(artifact(),{...verified(),sourceId:'different'}).externalEvidenceReused,false);
});
test('partial or modified imports require independent review',()=>{
 for(const override of [{changed:true},{transformed:true},{generatedClaims:true},{usage:'clinical-direction'}])
  assert.equal(check({...artifact(),...override}).status,'INDEPENDENT_REVIEW_REQUIRED');
 assert.equal(check({...artifact(),sha256:'b'.repeat(64)}).externalEvidenceReused,false);
});
test('missing proof, fake publisher, wrong review claims cannot approve',()=>{
 assert.equal(check(artifact(),{...verified(),reviewEvidenceUrl:'https://www.who.int.evil.example/false'}).externalEvidenceReused,false);
 assert.equal(check({...artifact(),sourceUrl:'https://fake-medical.example/path'}).externalEvidenceReused,false);
 assert.equal(check(artifact(),{...verified(),publisherReviewStatus:'uploader-says-scientific'}).externalEvidenceReused,false);
});
test('retractions, supersessions or disputes never reuse evidence',()=>{
 for(const field of ['retracted','superseded','materiallyDisputed'])
  assert.equal(check(artifact(),{...verified(),[field]:true}).status,'INDEPENDENT_REVIEW_REQUIRED');
});
test('stale upstream and withdrawal verification fail closed',()=>{
 assert.equal(check(artifact(),{...verified(),retractionCheckedAt:'2026-06-05T09:00:00Z'}).status,'PENDING_REVIEW');
 assert.equal(check(artifact(),{...verified(),primaryEvidenceCheckedAt:'tomorrow'}).status,'PENDING_REVIEW');
});
test('user-uploaded NIH item cannot masquerade as peer-reviewed',()=>{
 const orig={...artifact(),sourceUrl:'https://3d.nih.gov/entries/3DPX-000168',
  sourceId:'3DPX-000168',sourceVersion:'3'};
 const evidence={...verified(),sourceUrl:orig.sourceUrl,sourceId:orig.sourceId,
  sourceVersion:'3',reviewedSourceId:orig.sourceId,reviewedSourceVersion:'3',
  reviewEvidenceUrl:'https://3d.nih.gov/entries/3DPX-000168',
  publisherReviewStatus:'uploader-claimed'};
 assert.equal(check(orig,evidence).externalEvidenceReused,false);
});
test('verified NIH item can reuse explicit, matched, primary-source review proof',()=>{
 const orig={...artifact(),sourceUrl:'https://3d.nih.gov/entries/3DPX-000168',
  sourceId:'3DPX-000168',sourceVersion:'3'};
 const evidence={...verified(),sourceUrl:orig.sourceUrl,sourceId:orig.sourceId,
  sourceVersion:'3',reviewedSourceId:orig.sourceId,reviewedSourceVersion:'3',
  reviewEvidenceUrl:'https://3d.nih.gov/entries/3DPX-000168',
  publisherReviewStatus:'publisher-peer-reviewed'};
 assert.equal(check(orig,evidence).status,'SOURCE_REVIEW_REUSED');
});
test('per-file matching is unique; missing or duplicate ledger entries never bypass review',()=>{
 const a=verified();
 assert.equal(reuseDecisionForPath({path:a.path,sha256:hash,records:[a],now}).status,'SOURCE_REVIEW_REUSED');
 assert.equal(reuseDecisionForPath({path:a.path,sha256:hash,records:[a,a],now}).externalEvidenceReused,false);
 assert.equal(reuseDecisionForPath({path:'../outside',sha256:hash,records:[a],now}).externalEvidenceReused,false);
 assert.equal(reuseDecisionForPath({path:'elsewhere/file',sha256:hash,records:[a],now}).externalEvidenceReused,false);
});


test('four actual HRA v1.2 originals have publisher-evaluated evidence tied to exact sha256',()=>{
 const data=JSON.parse(readFileSync(new URL('./verified-upstream-evidence.json',import.meta.url),'utf8'));
 assert.equal(data.schema_version,1);
 assert.equal(data.publisherCollectionEvidence.find(x=>x.id==='hra-v1.2').linkedLocalCandidates.count,54);
 assert.equal(data.records.length,4);
 const known=new Set(['hra-1.2-vh-f-ovary-r','hra-1.2-vh-f-thymus','hra-1.2-vh-f-pancreas','hra-1.2-vh-f-knee-l']);
 for(const row of data.records){
  assert.ok(known.has(row.sourceId));
  assert.equal(row.verifiedFromPrimaryPublisher,true);
  assert.equal(row.reviewEvidenceUrl,'https://3d.nih.gov/collections');
  assert.equal(row.publisherReviewStatus,'publisher-expert-reviewed');
  assert.equal(row.usage,'educational-original');
  assert.equal(row.verificationDetails.sha256IndependentlyRecomputed,true);
  const d=reuseDecisionForPath({path:row.path,sha256:row.sha256,records:data.records,now:'2026-11-06T01:00:00Z'});
  assert.equal(d.status,'SOURCE_REVIEW_REUSED',JSON.stringify(d));
  assert.equal(d.clinicalApproval,false);
  const altered=reuseDecisionForPath({path:row.path,sha256:'0'.repeat(64),records:data.records,now:'2026-11-06T01:00:00Z'});
  assert.equal(altered.externalEvidenceReused,false);
 }
 const noMatching= reuseDecisionForPath({path:'future/unverified.nih.glb',sha256:'a'.repeat(64),records:data.records,now:'2026-11-06T01:00:00Z'});
 assert.equal(noMatching.externalEvidenceReused,false);
});
test('only exact immutable HRA upstream origins are recognized, not adjacent GitHub repositories or unpinned files',()=>{
 const source='https://raw.githubusercontent.com/hubmapconsortium/ccf-releases/b036a91aaf7234f462b1249d4a5f4fb0e982f412/v1.2/models/VH_F_Thymus.glb';
 const a={...artifact(),sourceUrl:source,sourceId:'hra-1.2-vh-f-thymus',sourceVersion:'b036a91aaf7234f462b1249d4a5f4fb0e982f412'};
 const rec={...verified(),sourceUrl:source,sourceId:a.sourceId,sourceVersion:a.sourceVersion,reviewedSourceId:a.sourceId,reviewedSourceVersion:a.sourceVersion,reviewEvidenceUrl:'https://3d.nih.gov/collections',publisherReviewStatus:'publisher-expert-reviewed'};
 assert.equal(check(a,rec).status,'SOURCE_REVIEW_REUSED');
 assert.equal(check({...a,sourceUrl:source.replace('ccf-releases','other-repo')},rec).externalEvidenceReused,false);
 assert.equal(check({...a,sourceUrl:source.replace('b036a91','a036a91')},rec).externalEvidenceReused,false);
 assert.equal(check({...a,sourceUrl:source+'?unverified=1'},rec).externalEvidenceReused,false);
});
