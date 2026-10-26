# Image coverage continuation checkpoint

Latest completed batch: **2026-10-26, batch 3**. Continue on branch `coverage/greek-images-20261026` and the **existing draft PR #6**. Inspect current refs, merged state, and this checkpoint before writing. Never restart from old main.

## Selected sources versus published app

| Semester | Total chapters | Draft: source-selected (PR #6) | Main-branch registry (not proof of live publication) | Draft missing |
|---|---:|---:|---:|---:|
| Α | 71 | 27 | 10 | 44 |
| Β | 73 | 5 | 5 | 68 |
| Γ | 51 | 5 | 5 | 46 |
| Δ | 52 | 6 | 6 | 46 |
| **Total** | **247** | **43** | **26** | **204** |

**Do not report the main-branch numbers as live verified.** Four new local drawings are now committed and their structural CI checks have passed. Production version file on main: `27.1.68` (build 2026-10-26). Draft uses a service-worker cache variant `ekab-spoudi-v27.1.68-images-20261026-b5`; this is NOT a production version bump or a deployment. GitHub Pages visual/browser availability was not independently verified in this batch.

## Batch 3: actual changes

Four newly drawn original Greek SVG anatomical illustrations, all locally hosted, attributed CC BY 4.0 and registered with SHA-256:

- `01-01` anatomical position, anterior view, patient-right/left, palms anterior, midline and superior/inferior. **Partial**: anatomical planes, cavities and other directional terms still need specific illustrations.
- `01-04` anterior projection of liver, gallbladder, stomach, spleen, pancreas, small and large intestines, with patient-right/left correctly oriented. **Partial**: no retroperitoneal structures, peritoneum, depth, or full set of abdominal organs.
- `01-09` synovial joint cross-section: bone, articular cartilage, cavity, capsule, synovial membrane, ligament (bone–bone), tendon (muscle–bone). **Partial**: other joint types and musculature not shown.
- `01-13` kidneys, ureters, bladder, urethra in anterior view. **Partial**: male and female reproductive anatomy, urethral sex differences and kidney detail not shown.

Source background: OpenStax *Anatomy and Physiology 2e*, sections 1.6, 9.4, 25.2. The diagrams are original and not traced/copied OpenStax illustrations. Their licensing is the author's declared CC BY 4.0 for the original drawing, not an assertion about OpenStax's own image licensing.

Updated `saek-image-audit-2026.json` mappings, `sw.js` offline precache, and added `scripts/validate-saek-svg.py` plus workflow enforcement for XML validity, accessibility labels, visible Greek, local references, prohibited scripts, and SHA-256. CI run [40353543830](https://github.com/6d9757cmp5-creator/ekab-spoudi/actions/runs/40353543830): **passed**; 247 chapter mappings, 43 selected, 22 image assets, 0 errors, 5 warnings (requires separate inspection). XML/SVG validator: **15 local SVG assets, 0 errors**. SAEK content check [40353551300](https://github.com/6d9757cmp5-creator/ekab-spoudi/actions/runs/40353551300): **passed**.

## Critical quality gates (still open)

1. **Independent medical/scientific review: 0 verified approvals.** The images are drafts with citations, not independently clinically certified. Clinical-technique diagrams need verification against current authoritative practice and qualified independent review before any approval claims.
2. **Subject adequacy: not complete** for the four new placements; selected-source counts cannot be equated with complete coverage.
3. **Browser rendering, zoom and offline end-to-end test:** not executed/verified for these new images in a real browser. CI XML parsing and cache-list inclusion do not prove this.
4. **Live publication:** PR remains draft and unmerged. The public site could not be verified from the available browser/search path; no production increase is claimed.
5. **Five CI warnings** remain in the remote image-source check. CI has 0 hard errors; investigate warnings in the generated report rather than treating a green check as source availability proof.

## Exact continuation

Next add **male and female reproductive system** illustrations to complete the missing half of 01-13. Improve 01-01 with sagittal/coronal/transverse planes and 01-09 with muscle anatomy. Continue profession/public-health/assessment chapters, then remaining semesters, with images that actually depict each topic rather than recap cards.

For each new asset: verify relevance and the original source/license; render and inspect Greek labels and exact arrow endpoints; run registry and SVG checks, browser zoom and offline tests when possible; record source selection, subject adequacy, independent review, and actual production **separately**. Do not touch unrelated lessons, progress, accounts, or sync.
