# Educational Animation ENGINE — implementation contract

**Scope:** all future educational content types; **initial activation:** SAEK only. EOPPEP examinations excluded. No production videos are generated or published during scientific cross-check.

## Existing system and migration
The current static GitHub Pages application includes `saek-course-series.js` and Scrimba-hosted course video links. The old course-series loader is retired. Do not delete the original lesson text, student progress, or Mentor OS. Audit separately any embedded per-chapter media before deleting media files; only remove confirmed legacy video assets, not anatomical images or unrelated files.

## Hard publication gate
Each video has `id`, `sourceId`, `sourceHash`, `status`, `videoUrl`, `clinicalApproval`, `coverageApproval`. The browser may display a video **only** when its source hash matches current approved source, clinical and coverage checks are true, and status is `published`. No fallback to outdated video. Approval cannot be inferred from targeted GitHub audit counters. Changes invalidate the affected source/scene approvals. Clinical approval is by qualified human for medical instructions.

## Architecture
1. Content adapters extract structured learning objectives and complete theory from SAEK now; support future lesson/document content types through adapters, not SAEK-specific engine code.
2. Source registry records stable IDs, content hashes, citations, rights and versions; cross-check PR #39 is not automatically production-approved.
3. AI pedagogy generates Greek teaching scripts, complete concept-to-scene coverage maps, storyboard and scene specifications; reviewers check all required concepts.
4. Anatomy source policy: BioDigital Human is the preferred provider **only** after verified API access and rights to create/distribute the intended educational videos. Without both, select from the combined BodyParts3D + HuBMAP Human Reference Atlas + NIH 3D asset registry. Assets are chosen per anatomical structure, not mixed blindly: verify license/version, provenance, attribution, derivatives/video rights, file format, anatomical correspondence and clinical accuracy. NIH 3D licenses are per asset; BodyParts3D release-specific license and share-alike requirements must be verified against the actual downloaded files. Never treat credit alone as sufficient where other restrictions apply. Source-selection policy is implemented in `educational-animation-sources.js`; no external connector is yet implemented. The project owner confirms existing permissions; no repetitive administrative approval gate per render.
5. Rendering architecture: Blender/Python may prepare and animate medically reviewed 3D meshes; a separately deployed rendering/orchestration worker (potentially Remotion for video assembly) runs outside static GitHub Pages, with no secret API keys in browser. Animate anatomy and physiology only with validated rigs/motion specifications; a static mesh is not evidence of physiological motion. Greek voice, subtitles and synchronized scenes are required. Static slide shows alone fail acceptance.
6. Automated tests validate source hashes, coverage, Greek terminology, media integrity, accessibility and render output; humans review clinical safety and actual teaching quality.
7. Publisher releases immutable approved assets, preserves previous version privately for rollback, and updates only affected videos after a source change. Visible overlay: **Educational Animation ENGINE**, plain text, **no link**.

## Current status
Core client-side publication guard added as `educational-animation-engine.js`. Legacy Scrimba course-series runtime retired. **No video production, production Blender/Remotion rendering worker, BioDigital integration, fallback asset ingestion, clinical approval workflow or publisher is implemented yet.** Never claim the engine is fully operational or show placeholder videos. Begin render jobs only after SAEK/EOPPEP cross-check and corresponding approved source corrections, plus human clinical review for high-risk medical instructions. Existing PR #39 remains separate and unmerged.

## Acceptance gates
- Static checks: source/version mismatch => invisible; missing clinical/coverage check => invisible; failed/scheduled/review => invisible; published and all approvals => eligible.
- No duplicated Mentor or student progress writes.
- Real-device browser checks and end-to-end render/approval tests required before marking production-ready.

## Permission policy
The owner states that permissions for all planned assets and services are already secured. Do not require new permission requests or manual license approvals at each render. Retain asset attribution/provenance and source tracking. Clinical content review is a separate patient-safety requirement, not a license-approval request.

## Provider fallback acceptance
- BioDigital first only when API and **video derivative/distribution rights** are explicitly confirmed; otherwise use approved fallback assets without blocking the curriculum.
- BodyParts3D, HuBMAP and NIH 3D are complementary sources, not a promise of complete coverage or interchangeable coordinate systems.
- Keep per-mesh license/attribution and source/version manifest; check share-alike, noncommercial and model-specific terms before redistribution.
- Reject unsupported formats, missing anatomy, unreviewed models and assets with unverified rights. Do not invent substitute anatomy.
- Validate end-to-end import, Blender motion, render, clinical review, Greek narration and publication gate before announcing readiness.
- Preserve existing lessons, student progress, Mentor OS and the published-only video guard; no placeholder media.

## Hybrid execution topology — approved design (not yet deployed)
- **GitHub Actions orchestrator:** schedules and validates jobs, selects workers, tracks retries, and coordinates publication. Use hosted runners for resource-intensive CPU rendering only when benchmarked within their actual memory/time limits. A GPU-capable external runner may be required for demanding 3D; never claim standard hosted runners provide a GPU.
- **Dell local worker:** on an always-on computer, prepares immutable render bundles (script, scenes, asset manifests, checksums, dependency versions, expected output), runs light 2D/short renders, and can validate outputs. Keep a bounded queue and one local render at a time initially.
- **Handoff:** local preparation uploads a checksum-verified, versioned bundle to a trusted artifact/object store. The GitHub orchestrator picks up the bundle by identifier; the remote worker verifies hashes before rendering. Avoid large binaries in git commits.
- **Routing:** estimate workload using scene count, 3D complexity, target resolution, duration, memory budget and GPU needs. Route light jobs to Dell; heavy CPU jobs to GitHub-hosted workers; GPU-required jobs to a GPU-capable provider only when configured. No silent downgrade of 3D quality and no fallback that pretends a video was rendered.
- **Security:** because the repository is public, do not install an unrestricted self-hosted runner on the everyday Windows host. Use isolated dedicated runner accounts/VMs, protected workflows, least-privilege tokens, no execution of untrusted PR code, and no secrets in artifacts or client scripts. GitHub-hosted runner is not automatically faster for every workload.
- **Feature lock:** `VIDEO_GENERATION_ENABLED=false` by default in all worker environments. The cross-check completion alone does not toggle it; explicit activation after verified SAEK content and clinical review is required. All jobs must check the lock before any AI generation, TTS or rendering.
- **Current state:** isolated Dell preparation tooling and a preparation-only validation workflow are installed. Production orchestration, runner registration, render queue and dispatch remain unimplemented. No videos generated.

## Dell preparation worker
The isolated preparation tooling now lives in `workers/educational-animation/` and shares this ENGINE contract; it is not a second engine. It accepts manually prepared, unapproved JSON inputs, checks asset provenance/checksums, prepares versioned bundles and estimates routing. See its `SETUP.md` for commands, boundaries and runner isolation design. `VIDEO_GENERATION_ENABLED=false` remains mandatory; rendering, AI, TTS, dispatch and publishing are deliberately unavailable in this preparation implementation. The preparation-only Actions workflow does not implement production orchestration. Scientific and clinical approvals remain separate and are never granted by tooling.
