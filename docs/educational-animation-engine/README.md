# Educational Animation ENGINE — implementation contract

**Scope:** all future educational content types; **initial activation:** SAEK only. EOPPEP examinations excluded. No production videos are generated or published during scientific cross-check.

## Existing system and migration
The current static GitHub Pages application includes `saek-course-series.js` and Scrimba-hosted course video links. The old course-series loader is retired. Do not delete the original lesson text, student progress, or Mentor OS. Audit separately any embedded per-chapter media before deleting media files; only remove confirmed legacy video assets, not anatomical images or unrelated files.

## Hard publication gate
Each video has `id`, `sourceId`, `sourceHash`, `status`, `videoUrl`, `clinicalApproval`, `coverageApproval`, `assetApproval`. The browser may display a video **only** when its source hash matches current approved source, all approvals are true, and status is `published`. No fallback to outdated video. Approval cannot be inferred from targeted GitHub audit counters. Changes invalidate the affected source/scene approvals. Clinical approval is by qualified human for medical instructions.

## Architecture
1. Content adapters extract structured learning objectives and complete theory from SAEK now; support future lesson/document content types through adapters, not SAEK-specific engine code.
2. Source registry records stable IDs, content hashes, citations, rights and versions; cross-check PR #39 is not automatically production-approved.
3. AI pedagogy generates Greek teaching scripts, complete concept-to-scene coverage maps, storyboard and scene specifications; reviewers check all required concepts.
4. Licensed asset registry tracks BioDigital source ID, license scope, export/recording permissions, credits and hashes. Written permission must be verified for actual capture, transformation and distribution workflows.
5. Remotion render worker runs separately from static GitHub Pages; no secret API keys in browser. Dynamic anatomy animation, Greek voice, subtitles and synchronized scenes. Static slide shows alone fail acceptance.
6. Automated tests validate source hashes, coverage, Greek terminology, media integrity, accessibility, render output and rights; humans review clinical safety and actual teaching quality.
7. Publisher releases immutable approved assets, preserves previous version privately for rollback, and updates only affected videos after a source change. Visible overlay: **Educational Animation ENGINE**, plain text, **no link**.

## Current status
Core client-side publication guard added as `educational-animation-engine.js`. Legacy Scrimba course-series runtime retired. **No video production, Remotion worker, BioDigital integration, clinical approval workflow or publisher is implemented yet.** Never claim the engine is fully operational or show placeholder videos. Begin render jobs only after SAEK/EOPPEP cross-check and corresponding approved source corrections, plus verified licensing and human clinical sign-off. Existing PR #39 remains separate and unmerged.

## Acceptance gates
- Static checks: source/version mismatch => invisible; missing approval => invisible; failed/scheduled/review => invisible; published and all approvals => eligible.
- No duplicated Mentor or student progress writes.
- Real-device browser checks and end-to-end render/approval tests required before marking production-ready.
