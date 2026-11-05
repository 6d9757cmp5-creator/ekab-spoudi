/**
 * Evidence reuse for exact, already evaluated third-party source material.
 * A reviewed institution is not an endorsement of every item it hosts.
 * This module routes science review work; it never authorizes clinical care,
 * creates independent scientific certification, or publishes curriculum.
 */
import {classifySource} from './source-policy.mjs';

const SHA=/^[0-9a-f]{64}$/;
const DAY=86400000;
const MAX_AGE_DAYS=45;
const REVIEWED=new Set(['publisher-expert-reviewed','publisher-peer-reviewed','publisher-official-guideline']);
const normalizeUrl=value=>{
 try {
  const u=new URL(value);
  if(u.protocol!=='https:'||u.username||u.password||u.port||u.hash)return null;
  return u.href;
 } catch {return null;}
};
const goodDate=(v,now)=>{
 if(typeof v!=='string'||!Number.isFinite(Date.parse(v)))return false;
 const timestamp=Date.parse(v);
 return timestamp<=now&&now-timestamp<=MAX_AGE_DAYS*DAY;
};
const result=(status,reason,sourceEvidence=null)=>({
 status,reason,externalEvidenceReused:status==='SOURCE_REVIEW_REUSED',
 independentMedicalReviewNeeded:status!=='SOURCE_REVIEW_REUSED',
 atlaScientificCertification:false,clinicalApproval:false,
 automaticClinicalPublishing:false,sourceEvidence
});

/**
 * @param {object} artifact - Actual imported original with byte digest.
 * @param {object} record - Publisher evidence ledger entry, independently
 *    checked against the publisher's exact primary record before recording.
 * @param {Date|string} now - Evaluated clock.
 *
 * Verifies the recorded document binding and freshness, not factual medical
 * accuracy. record is a trusted *checked ledger*, not raw uploader metadata.
 */
export function assessUpstreamEvidence(artifact,record,{now=new Date()}={}){
 const stamp=new Date(now).getTime();
 if(!Number.isFinite(stamp))return result('PENDING_REVIEW','invalid-clock');
 if(!artifact||!record)return result('PENDING_REVIEW','missing-exact-source-evidence');
 if(artifact.changed===true||artifact.generatedClaims===true||artifact.transformed===true)
  return result('INDEPENDENT_REVIEW_REQUIRED','changed-or-generated-medical-content');
 if(artifact.usage!=='educational-original')
  return result('INDEPENDENT_REVIEW_REQUIRED','outside-original-educational-scope');
 const source=normalizeUrl(artifact.sourceUrl),proof=normalizeUrl(record.reviewEvidenceUrl);
 if(!source||!proof||!classifySource(source).accepted||!classifySource(proof).accepted)
  return result('PENDING_REVIEW','publisher-evidence-not-allowlisted');
 if(source!==normalizeUrl(record.sourceUrl)||artifact.sourceId!==record.sourceId||
    String(artifact.sourceVersion)!==String(record.sourceVersion)||
    !artifact.sourceId||!record.sourceVersion)
  return result('PENDING_REVIEW','source-identity-version-mismatch');
 if(!SHA.test(String(artifact.sha256||''))||
    artifact.sha256!==record.exactSourceSha256||
    artifact.sha256!==record.originalMaterialSha256)
  return result('INDEPENDENT_REVIEW_REQUIRED','original-bytes-unmatched');
 if(!REVIEWED.has(record.publisherReviewStatus)||
   record.reviewedSourceId!==artifact.sourceId||
   String(record.reviewedSourceVersion)!==String(artifact.sourceVersion)||
   record.verifiedFromPrimaryPublisher!==true||
   record.publisherDocumentEvidenceMatched!==true)
  return result('PENDING_REVIEW','original-publication-review-unverified');
 if(record.scope!=='educational-reference'||record.retracted!==false||
    record.superseded!==false||record.materiallyDisputed!==false)
  return result('INDEPENDENT_REVIEW_REQUIRED','review-status-or-scope-not-clear');
 if(!goodDate(record.primaryEvidenceCheckedAt,stamp)||!goodDate(record.retractionCheckedAt,stamp))
  return result('PENDING_REVIEW','publisher-evidence-check-stale');
 return result('SOURCE_REVIEW_REUSED','identical-publisher-evaluated-original',{
  sourceId:record.sourceId,sourceVersion:record.sourceVersion,sourceUrl:source,
  publisherReviewStatus:record.publisherReviewStatus,reviewEvidenceUrl:proof,
  primaryEvidenceCheckedAt:record.primaryEvidenceCheckedAt,
  retractionCheckedAt:record.retractionCheckedAt
 });
}

/** Registry is internal, read-only in the review path; unknown paths never match. */
export function reuseDecisionForPath({path,sha256,records=[],now=new Date()}={}){
 if(!Array.isArray(records)||!records.length)return result('PENDING_REVIEW','no-upstream-ledger-entry');
 if(typeof path!=='string'||path.startsWith('/')||path.includes('\\')||
    path.split('/').some(s=>!s||s==='.'||s==='..'))
  return result('PENDING_REVIEW','invalid-artifact-path');
 const matches=records.filter(r=>r?.path===path);
 if(matches.length!==1)return result('PENDING_REVIEW','missing-or-ambiguous-ledger-entry');
 const r=matches[0];
 return assessUpstreamEvidence({
  sourceUrl:r.sourceUrl,sourceId:r.sourceId,sourceVersion:r.sourceVersion,sha256,
  changed:r.changed,generatedClaims:r.generatedClaims,transformed:r.transformed,
  usage:r.usage
 },r,{now});
}
