#!/usr/bin/env node
/**
 * SAEK media review queue: inspection priorities only, NEVER approvals.
 * Run after check-saek-images.mjs and verify-saek-review-hashes.py.
 * Does not alter registry metadata or study progress.
 */
import fs from 'node:fs';
const registry = JSON.parse(fs.readFileSync('saek-image-audit-2026.json', 'utf8'));
const assets = registry.assets ?? {};
const hasDocumentedHumanReview = a =>
  a.clinicalReview === 'approved' &&
  typeof a.independentReviewer === 'string' && !!a.independentReviewer.trim() &&
  typeof a.independentReviewDate === 'string' && /^\d{4}-\d{2}-\d{2}/.test(a.independentReviewDate) &&
  typeof a.independentReviewEvidence?.documentUrl === 'string' &&
  /^https:\/\//.test(a.independentReviewEvidence.documentUrl) &&
  typeof a.independentReviewEvidence?.reviewerQualification === 'string' &&
  !!a.independentReviewEvidence.reviewerQualification.trim() &&
  !/(?:Claude|Anthropic|ChatGPT|OpenAI|GPT|LLM|\bAI\b)/i.test(a.independentReviewer);
const byAsset = new Map();
for (const course of registry.courses ?? []) {
  for (let i = 0; i < (course.chapters ?? []).length; i++) {
    const chapter = course.chapters[i];
    const id = String(course.course).padStart(2, '0') + '-' + String(i + 1).padStart(2, '0');
    for (const assetId of chapter.images ?? []) {
      const arr = byAsset.get(assetId) ?? [];
      arr.push({chapter: id, semester: course.semester, course: course.title ?? ''});
      byAsset.set(assetId, arr);
    }
  }
}
const records = Object.entries(assets).sort(([a], [b]) => a.localeCompare(b)).map(([id, a]) => {
  const reasons = [];
  const placement = byAsset.get(id) ?? [];
  if (!placement.length) reasons.push('not-selected-in-lessons');
  const visual = a.visualReview ?? {};
  const visualHashBound = typeof visual.date === 'string' &&
    /^\d{4}-\d{2}-\d{2}/.test(visual.date) &&
    typeof visual.sha256 === 'string' && visual.sha256 === a.sha256;
  if (!visualHashBound) reasons.push('visual-review-not-bound-to-current-sha256');
  const sourcePageReviewed = typeof a.sourcePageReviewed === 'string' &&
    /^\d{4}-\d{2}-\d{2}/.test(a.sourcePageReviewed);
  if (!sourcePageReviewed) reasons.push('source-page-review-not-dated');
  const clinicalReviewRecorded = hasDocumentedHumanReview(a);
  if (!clinicalReviewRecorded) reasons.push('independent-clinical-review-not-recorded');
  return {
    assetId: id,
    path: a.localPath ?? null,
    title: a.title ?? '',
    chapters: placement,
    usedInLessons: placement.length > 0,
    visualReviewCurrentSha: visualHashBound,
    datedSourcePageReview: sourcePageReviewed,
    clinicalApprovalRecorded: clinicalReviewRecorded,
    clinicalApprovalIndependentlyValidated: false,
    mobileSafariZoomOfflineVerified: false,
    rightsIndependentlyValidated: false,
    pending: reasons
  };
});
const count = fn => records.filter(fn).length;
const summary = {
  recordedAssets: records.length,
  selectedAssets: count(r => r.usedInLessons),
  unselectedAssets: count(r => !r.usedInLessons),
  imagePlacements: records.reduce((n, r) => n + r.chapters.length, 0),
  visualReviewsCurrentSha: count(r => r.visualReviewCurrentSha),
  pendingVisualReviews: count(r => !r.visualReviewCurrentSha),
  datedSourcePageReviews: count(r => r.datedSourcePageReview),
  pendingSourcePageReviews: count(r => !r.datedSourcePageReview),
  clinicalApprovalsRecordedUnverified: count(r => r.clinicalApprovalRecorded),
  clinicalApprovalsNotRecorded: count(r => !r.clinicalApprovalRecorded),
  fullyCertified: 0
};
const output = {
  generatedAt: new Date().toISOString(),
  scope: 'Review worklist derived from registry metadata, not independent medical, rights, browser, or release certification',
  summary,
  assets: records
};
fs.writeFileSync('saek-image-certification-queue.json', JSON.stringify(output, null, 2) + '\n');
console.log(JSON.stringify(summary, null, 2));
if (!records.length || Object.keys(assets).length !== records.length) process.exitCode = 1;
