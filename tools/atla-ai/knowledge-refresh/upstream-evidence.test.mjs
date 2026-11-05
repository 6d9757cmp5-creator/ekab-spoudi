import test from 'node:test';
import assert from 'node:assert/strict';
import {assessUpstreamEvidence,reuseDecisionForPath} from './upstream-evidence.mjs';

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
