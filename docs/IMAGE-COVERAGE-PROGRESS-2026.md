# Image coverage continuation checkpoint

Latest completed batch: **2026-10-26, batch 4**. Continue on branch `coverage/greek-images-20261026` and the **existing draft PR #6**. Inspect current refs, merged state, and this checkpoint before writing. Never restart from old main.

## Selected sources versus published app

| Semester | Total chapters | Draft: source-selected (PR #6) | Main-branch registry (not proof of live publication) | Draft missing |
|---|---:|---:|---:|---:|
| Α | 71 | 27 | 10 | 44 |
| Β | 73 | 5 | 5 | 68 |
| Γ | 51 | 5 | 5 | 46 |
| Δ | 52 | 6 | 6 | 46 |
| **Total** | **247** | **43** | **26** | **204** |

**Do not report the main-branch numbers as live verified.** Four new local drawings are now committed and their structural CI checks have passed. Production version file on main: `27.1.68` (build 2026-10-26). Draft uses a service-worker cache variant `ekab-spoudi-v27.1.68-images-20261026-b6`; this is NOT a production version bump or a deployment. GitHub Pages visual/browser availability was not independently verified in this batch.

## Batch 3: actual changes

Four newly drawn original Greek SVG anatomical illustrations, all locally hosted, attributed CC BY 4.0 and registered with SHA-256:

- `01-01` anatomical position, anterior view, patient-right/left, palms anterior, midline and superior/inferior. **Partial**: anatomical planes, cavities and other directional terms still need specific illustrations.
- `01-04` anterior projection of liver, gallbladder, stomach, spleen, pancreas, small and large intestines, with patient-right/left correctly oriented. **Partial**: no retroperitoneal structures, peritoneum, depth, or full set of abdominal organs.
- `01-09` synovial joint cross-section: bone, articular cartilage, cavity, capsule, synovial membrane, ligament (bone–bone), tendon (muscle–bone). **Partial**: other joint types and musculature not shown.
- `01-13` kidneys, ureters, bladder, urethra in anterior view. **Partial**: male and female reproductive anatomy, urethral sex differences and kidney detail not shown.

Source background: OpenStax *Anatomy and Physiology 2e*, sections 1.6, 9.4, 25.2. The diagrams are original and not traced/copied OpenStax illustrations. Their licensing is the author's declared CC BY 4.0 for the original drawing, not an assertion about OpenStax's own image licensing.

Updated `saek-image-audit-2026.json` mappings, `sw.js` offline precache, and added `scripts/validate-saek-svg.py` plus workflow enforcement for XML validity, accessibility labels, visible Greek, local references, prohibited scripts, and SHA-256. CI run [40353543830](https://github.com/6d9757cmp5-creator/ekab-spoudi/actions/runs/40353543830): **passed**; 247 chapter mappings, 43 selected, 22 image assets, 0 errors, 5 warnings (requires separate inspection). XML/SVG validator: **15 local SVG assets, 0 errors (batch 3; batch 4 CI pending)**. SAEK content check [40353551300](https://github.com/6d9757cmp5-creator/ekab-spoudi/actions/runs/40353551300): **passed**.

## Critical quality gates (still open)

1. **Independent medical/scientific review: 0 verified approvals.** The images are drafts with citations, not independently clinically certified. Clinical-technique diagrams need verification against current authoritative practice and qualified independent review before any approval claims.
2. **Subject adequacy: not complete** for the four new placements; selected-source counts cannot be equated with complete coverage.
3. **Browser rendering, zoom and offline end-to-end test:** not executed/verified for these new images in a real browser. CI XML parsing and cache-list inclusion do not prove this.
4. **Live publication:** PR remains draft and unmerged. The public site could not be verified from the available browser/search path; no production increase is claimed.
5. **Five CI warnings** are HTTP 429 rate limits from Wikimedia Commons direct-file HEAD requests for `upper`, `spine`, `heart`, `respiratory`, `brain_medial` (run [40353733832](https://github.com/6d9757cmp5-creator/ekab-spoudi/actions/runs/40353733832)). These are NOT confirmed broken links, but availability was not proven. Recheck with respectful rate limits / alternate verification; CI has 0 hard errors.

## Exact continuation

Next add **male and female reproductive system** illustrations to complete the missing half of 01-13. Improve 01-01 with sagittal/coronal/transverse planes and 01-09 with muscle anatomy. Continue profession/public-health/assessment chapters, then remaining semesters, with images that actually depict each topic rather than recap cards.

For each new asset: verify relevance and the original source/license; render and inspect Greek labels and exact arrow endpoints; run registry and SVG checks, browser zoom and offline tests when possible; record source selection, subject adequacy, independent review, and actual production **separately**. Do not touch unrelated lessons, progress, accounts, or sync.

## Batch 4 — 2026-10-26: actual committed changes

- Created `assets/education/anatomical-planes-el.svg` as an original **Greek** three-panel diagram for sagittal, frontal/coronal and transverse planes in anatomy lesson **01-01**. Each panel shows a distinct oriented plane on a stylized body; the caption discloses symbolic perspective and thickness. Definitions checked against [OpenStax A&P 2e §1.6](https://openstax.org/books/anatomy-and-physiology-2e/pages/1-6-anatomical-terminology). Artwork is original (not a copied OpenStax image), declared CC BY 4.0.
- Rendered the exact SVG locally to PNG; corrected an initial overlap of the body silhouette and bottom labels; visually inspected the corrected rendering for Greek typography and panel alignment. Parsed SVG XML. This is **local** visual QA, not a live-browser or independent clinical review.
- Registered asset `anatomical_planes` with local path, source, license, SHA-256 `d51da43fa735d5a8200a216b0230bcf212fc4e7eec712ec06696e4258e620c05`, `clinicalReview: pending`, `subjectCompleteness: partial`; added mapping to `01-01` in both placements and course chapters.
- Added the SVG to `sw.js` precache and incremented the **draft** cache key to `ekab-spoudi-v27.1.68-images-20261026-b6`. No release/version bump or production deployment.
- Post-commit remote readback confirmed **23 registered assets, 16 local SVG, 247 mapped chapters, 43 with selected imagery** (Α 27/71, Β 5/73, Γ 5/51, Δ 6/52). No new chapter became selected; lesson 01-01 gained a second subject-specific diagram. The 204 missing chapters remain unchanged.

**Still blocked/unverified:** 0 independent scientific approvals; real browser image/zoom/offline end-to-end and GitHub Pages publication not verified; full adequacy of lesson 01-01 still partial (body cavities, oblique planes, etc.). Structural CI for batch 4 should be checked separately after GitHub Actions runs. Never mark this batch clinically approved or published based on SVG parsing or service-worker inclusion.

**Next safe batch:** add accurately sourced, Greek-labelled male/female reproductive anatomy to 01-13 (currently urinary only); then 01-09 muscular anatomy. For new unselected chapters in professional/public health courses, inspect actual lesson content first and choose concrete topic-relevant imagery. Continue in existing draft PR #6 without resetting its branch.
