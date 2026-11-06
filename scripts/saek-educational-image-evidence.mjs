/**
 * SAEK image evidence: bibliographic source/visual-review metadata validation,
 * never independent anatomy certification, clinical permission or a learner
 * publication switch. Uses no reviewer identity and grants no approval itself.
 */
const validUrl=s=>typeof s==='string'&&/^https:\/\/[^/?#]+(?:[/?#]|$)/.test(s);
const validDate=s=>typeof s==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s);
const validHash=s=>typeof s==='string'&&/^[a-f0-9]{64}$/.test(s);

export function hasSourceCheckedEducationalImage(a){
 const r=a?.educationalSourceReview;
 return Boolean(
   r?.status==='source-checked-educational' &&
   r?.scope==='educational-only' &&
   r?.clinicalUseApproved===false &&
   r?.unresolvedHighRisk===false &&
   validHash(a?.sha256) &&
   r.assetSha256===a.sha256 &&
   validDate(r.checkedAt) &&
   validUrl(r.sourceUrl) &&
   typeof r.sourceSection==='string'&&r.sourceSection.trim().length>5 &&
   validHash(r.sourceCaptureSha256) &&
   validUrl(r.secondAiReview?.evidenceUrl) &&
   r.secondAiReview?.status==='passed' &&
   typeof r.claimCompared==='string'&&r.claimCompared.trim().length>=30
 );
}
export function statusIsSafeForEducationalInventory(a){
 // An "approved" clinical flag has no meaning in an AI-evidence-only system.
 return a?.clinicalReview==='pending' &&
 (a?.educationalSourceReview?.status!=='source-checked-educational'||
  hasSourceCheckedEducationalImage(a));
}
