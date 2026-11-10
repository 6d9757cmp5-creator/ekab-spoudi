# ΕΚΑΒ Σπουδή — Evidence-based image release review (31/10/2026)

**Status: TECHNICAL INSPECTION COMPLETE FOR THE CHECKED SCOPE; NOT CLINICALLY CERTIFIED.**

This document deliberately distinguishes file integrity, browser rendering, rights, source accuracy, and independent professional clinical review. None of the checks below constitutes authorization to present the app as medically certified.

## Verified from GitHub Actions and registry

| Measure | Observed |
| --- | ---: |
| Images in registry | 1,114 |
| Images assigned to actual SAEK lessons | 464 |
| Images not assigned to a lesson (retain pending triage; do not delete) | 650 |
| SAEK chapters with at least one selected image | 247/247 |
| Local files with matching SHA-256 | 1,114/1,114 |
| Local render attempts that succeeded | 1,114/1,114 |
| SVG text-bound tests | 648 SVG; 0 overflow after five layout repairs |
| Visual reviews bound to current asset hash (prior to new fixes) | 473 |
| Visual review records without current-hash binding | 641 |
| Documented source-page review entries | 666 |
| Missing dated source-page reviews | 448 |
| **Independent human clinical approvals with evidence** | **0/1,114** |
| Confirmed live Safari/offline/zoom testing of each image | **Not verified** |

The 148 earlier `clinicalReview=approved` records were attributed exclusively to Claude (AI). Their own reviewer descriptions explicitly stated that they were **not independent medical certification**. Their AI pre-review provenance was preserved under `aiPreReview`, and their clinical state was corrected to `pending`, without altering the images or study progress. AI review must not satisfy the human clinical gate.

## Reproducible checks

- `.github/workflows/saek-image-evidence.yml`: registry, lesson placement, file integrity, current SHA-256, local media references, contact sheets, and browser SVG text bounding boxes.
- `.github/workflows/media-gate.yml`: fails on newly changed media lacking approved per-file evidence in `media-review.json`. The check protects the workflow result, but **does not enforce branch protection when repository rules are disabled**.
- `scripts/build-saek-certification-queue.mjs`: produces `saek-image-certification-queue.json` as an Actions artifact, one record per image, with pending review reasons.
- `scripts/check-saek-images.mjs` and `scripts/verify-saek-image-integration.mjs`: reject claims of independent clinical review without reviewer, date, human qualification, and evidence document; AI-only evidence is excluded.

The five text-bound defects repaired in commit `cdcdc5f` affect `heart-chambers-and-valves-el.svg`, `semester-c-13-10-core-el.svg`, `semester-c-14-07-review-el.svg`, `semester-c-16-01-review-el.svg`, and `semester-c-16-06-review-el.svg`. The updates were atomic with the five new SHA-256 values. The independent clinical review of these diagrams is still pending.

## Required for each image before independent clinical approval

1. Assign an appropriate reviewer with verifiable clinical or anatomical expertise and **independence** from AI-generated checking. For nonclinical graphics, record the appropriate domain/content reviewer and scope instead of pretending medical credentials are necessary.
2. Record the exact image identifier and SHA-256, source page and version/date, reviewer qualifications, dated signed evidence document, and any corrections.
3. Inspect actual visual content: Greek nomenclature, anatomy and laterality, arrow heads/endpoints, proportions, text readability, color/contrast and appropriate captions, at the actual lesson context.
4. Confirm exact third-party licensing, attribution, adaptation terms and source-file provenance. A user-declared blanket permission does not automatically waive a third party's license requirements.
5. Run actual mobile Safari/iPhone, desktop, zoom, failed-load/retry, caching/offline and update tests. Chromium and structural checks alone do not prove these cases.
6. Check the 650 unselected images for usefulness, duplicates, and fit to chapters. Do not force images into unrelated topics merely to increase coverage.
7. Complete `media-review.json` evidence and obtain a green media publication gate **without bypassing or fabricating approvals**. Enable enforceable main-branch ruleset/status checks in repository settings; current tooling cannot establish that protection itself.

## Release decision

**NOT CERTIFIED / APPROVAL REQUIRED.** Content is in the main branch due to the earlier PR #6 merge, but that is not clinical or license certification. The technical checks confirm reproducible file/render properties only. Any failed publication gate remains a real blocker to a claim of readiness.

GitHub action: https://github.com/6d9757cmp5-creator/ekab-spoudi/actions/workflows/saek-image-evidence.yml

PR #6: https://github.com/6d9757cmp5-creator/ekab-spoudi/pull/6
