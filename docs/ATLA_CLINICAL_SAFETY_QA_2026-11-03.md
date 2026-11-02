# ATLA clinical-safety QA — independent criteria review (2026-11-03)

Scope: static, adversarial review of PR #148 commit 4c79c4e7, not an independent clinician certification and not a deployed end-to-end test.

## Critical — FAIL: streamed model output bypasses the declared surface gate
In `workers/mentor-chat/src/index.js`, both `answerWithClaude` and the Cloudflare AI path return `new Response(...stream...)` directly. `auditAssistantReply` from `atla/ai/teaching-policy.mjs` is not imported or called. Therefore the stated fail-closed validation of citations, dose-like outputs and emotional inference is not enforced by this Worker before display. Required remediation: buffer and validate the complete output, or use a verified safe incremental parser that cannot leak unvalidated tokens; test both provider paths, invalid citations, dose outputs, oversized responses, and SSE framing.

## High — FAIL: citation checks are not scientific verification
`auditAssistantReply` only checks citation tokens against passage IDs and a few lexical patterns. It does not establish whether a citation actually supports the medical assertion, detect contradictions, or assess medical accuracy. Independent expert review and a documented reference-based clinical test set remain required.

## High — FAIL: canonical learner model and preservation proof
`atla/student/memory.mjs` stores preferences and up to 12 session chat turns. No canonical learner-state reconciliation, skill mastery evidence, or migration proof was established by this review. Preserve grade and progress stores and test historical snapshots before any migration.

## High — FAIL: live AI not demonstrated
`atla/ai/config.mjs` sets `endpoint:""`. No live ATLA AI request or deployment has been verified. No production activation is authorized.

## Medium — partial: approved video helper
`approvedTeachingVideo` checks approved/reviewed/published flags, chapter IDs and HTTPS URLs. This is a selection predicate, not verification of reviewer identity, content provenance, accessibility, or live publication.

## Medium — partial: adaptive teaching
`teachingApproach` uses severity and simplification keywords. This is useful initial behavior but not an evidence-based, unified learner model.

## Acceptance gates
- [ ] Ensure *all* model output paths pass a fail-closed gate before display.
- [ ] Add adversarial automated tests for ungrounded claims, invented citations, unsafe dose output, ambiguity and contradictory sources.
- [ ] Obtain qualified independent clinician review with recorded reviewer, source versions, cases, and sign-off.
- [ ] Validate unified learner profile, backward-compatible migration, and zero-loss historical progress.
- [ ] Verify end-to-end deployed behavior, privacy, costs, mobile UX, and all CI checks.
- [ ] Merge only after required reviews and explicit deployment authorization.

This report records blockers; it is **not** a clinical certification or approval to merge.
