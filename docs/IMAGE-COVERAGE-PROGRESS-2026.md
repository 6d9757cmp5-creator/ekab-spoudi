# Image coverage continuation checkpoint

Latest completed batch: **2026-10-26, batch 12**. Continue on branch `coverage/greek-images-20261026` and the **existing draft PR #6**. Inspect current refs, merged state, and this checkpoint before writing. Never restart from old main.

## Selected sources versus published app

| Semester | Total chapters | Draft: source-selected (PR #6) | Main-branch registry (not proof of live publication) | Draft missing |
|---|---:|---:|---:|---:|
| Α | 71 | 35 | 10 | 36 |
| Β | 73 | 5 | 5 | 68 |
| Γ | 51 | 5 | 5 | 46 |
| Δ | 52 | 6 | 6 | 46 |
| **Total** | **247** | **51** | **26** | **196** |

**Do not report the main-branch numbers as live verified.** Four new local drawings are now committed and their structural CI checks have passed. Production version file on main: `27.1.68` (build 2026-10-26). Draft uses a service-worker cache variant `ekab-spoudi-v27.1.68-images-20261026-b14`; this is NOT a production version bump or a deployment. GitHub Pages visual/browser availability was not independently verified in this batch.

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

## Batch 5 — 2026-10-26: new selected chapter 04-02

- Inspected the actual text of **04-02** (“Αλυσίδα μετάδοσης λοιμώξεων”) before drawing; created original Greek SVG `assets/education/chain-of-infection-el.svg` showing six ordered components, directional arrows and concrete examples, rather than a generic lesson-summary card.
- Verified terminology and sequence against official [CDC/NIOSH chain-of-infection components](https://www.cdc.gov/niosh/learning/safetyculturehc/module-2/3.html). Original artwork, declared CC BY 4.0; no CDC graphic copied. Distinct examples in nodes do not imply a single disease. No 2026-specific protocol asserted.
- Locally parsed SVG and rendered it to PNG. Corrected heading overflow and arrow lengths after visual inspection. Browser zoom, service-worker offline end-to-end and independent scientific assessment **not** verified.
- Added `infection_chain` asset with SHA-256 `0fb31dc9fd094ab6d197294c72b16539d8d6eed28e4bf5028880f23d1b38fc42` and `clinicalReview: pending`, `subjectCompleteness: partial`. Mapped it to `04-02` in both registry locations and added to offline precache. Draft cache key now `ekab-spoudi-v27.1.68-images-20261026-b7`.
- New selected-source counts **44/247**: Α **28/71**, Β **5/73**, Γ **5/51**, Δ **6/52**. **203** chapters still have no selected source. Registry has **24** assets, including **17** locally hosted SVG. Selection does not establish full lesson adequacy or approval.

**Remaining quality gates:** 0 documented independent scientific approvals; source/subject completeness pending; production deployment and real browser/offline/zoom verification pending. Public site version remains **27.1.68** according to previous checkpoint; this draft batch has not been merged or published. Next: reproductive anatomy 01-13, muscular anatomy 01-09, then further uncovered 04-xx chapters with verified source-specific figures.

**Post-batch-5 CI readback:** GitHub Actions SAEK quality run [40363485365](https://github.com/6d9757cmp5-creator/ekab-spoudi/actions/runs/40363485365) completed **successfully** for checkpoint commit `f97d27a12725bd5f322996c7cc25ed65127a5847`; the earlier image mapping and precache commits also had successful SAEK quality runs [40363416900](https://github.com/6d9757cmp5-creator/ekab-spoudi/actions/runs/40363416900) and [40363437507](https://github.com/6d9757cmp5-creator/ekab-spoudi/actions/runs/40363437507). A separate image-specific audit CI run for this batch has not been confirmed; do not infer it from SAEK quality CI. Remote readback verified registry counts and mappings. Main registry remains 26 selected (Α 10, Β 5, Γ 5, Δ 6), **not** a live browser publication proof.

## Batch 6 — 2026-10-26: epidemiology 04-05

- Inspected the actual course 04 lesson index and targeted **04-05, Βασικές έννοιες επιδημιολογίας**. Drew `assets/education/incidence-prevalence-el.svg` as a **specific population illustration**, not a generic recap card: the same 20 people at T0/T1, 2 pre-existing cases, 3 new cases, and explicit absence of recovery or attrition. Incidence proportion 3/18 = 16.7%; point prevalence at T1 5/20 = 25%. No person-time incidence rate claimed.
- Definitions and denominators checked against [CDC Field Epidemiology Manual](https://www.cdc.gov/field-epi-manual/php/chapters/describing-epi-data.html) and [CDC Principles of Epidemiology, Lesson 3](https://archive.cdc.gov/www_cdc_gov/csels/dsepd/ss1978/lesson3/section2.html). Diagram is independently drawn and declared CC BY 4.0; no CDC artwork copied.
- Reproduced the exact SVG locally, XML parsed and rendered to PNG; inspected Greek labels, 20 dots in each panel, 2 purple pre-existing, 3 orange new cases, denominator arithmetic and no overlap. SHA-256 `cafc8c66c26ed6000944c7ed8e065ba8d18c3973c922049fd506edfdb5b06b71` checked against remote GitHub content.
- Registered `incidence_prevalence` in `assets`, `placements['04-05']`, and course 4 chapter 5. Added local SVG to service-worker precache and advanced **draft cache only** to `ekab-spoudi-v27.1.68-images-20261026-b8`. Existing PR #6 remains draft; no release or production claim.
- New source-selected count **45/247**: Α **29/71**, Β **5/73**, Γ **5/51**, Δ **6/52**. **202** without any selected image. **25** registered image assets, **18** local SVG. This chapter has **partial** subject coverage only (epidemiology includes other concepts and methods).

**Quality gates:** independent scientific approvals **0 documented**; real-browser load/zoom and offline end-to-end unverified; production **unverified** (main registry remains A10/B5/C5/D6 and is not a proof of live deployment). The new figure is **non-protocol**, not a clinical procedure. Next: reproductive system 01-13, muscular anatomy 01-09, then epidemiology 04-06/04-07 with topic-specific drawings after source and clinical-scope verification. Do not substitute lesson summaries for illustrations. Validate image registry, SHA-256 and SVG structure in CI before any merge.

## Batch 7 — 2026-10-26: reproductive anatomy for 01-13

- Confirmed PR #6 open/draft/unmerged; existing branch ahead of main, 0 commits behind at start. Continued without new PR or reset.
- Inspected the actual **01-13** lesson: it explicitly teaches urinary plus male and female reproductive organs. Added **two original Greek-labelled anatomical SVGs**: `assets/education/female-reproductive-system-el.svg` (uterus, uterine tubes, ovaries, cervix, vagina) and `assets/education/male-reproductive-system-el.svg` (testis, epididymis, ductus deferens, seminal vesicle, prostate, urethra, penis and bladder). These are actual organ illustrations, not text recap cards. The female image was corrected so ovary label leaders terminate on the organs.
- Sources for anatomical relationships: [OpenStax A&P 2e 27.2](https://openstax.org/books/anatomy-and-physiology-2e/pages/27-2-anatomy-and-physiology-of-the-ovarian-reproductive-system) and [OpenStax A&P 2e 27.1](https://openstax.org/books/anatomy-and-physiology-2e/pages/27-1-anatomy-and-physiology-of-the-testicular-reproductive-system). **No source figures were copied/traced**; both original SVG artworks are declared CC BY 4.0 with explicit license links. The source licenses are not being asserted as CC BY 4.0.
- Registered `female_reproductive` and `male_reproductive` in the image audit with SHA-256 and `clinicalReview: pending`, and added both to **01-13** in placements and course chapter mapping. Added both local assets to `sw.js` precache, draft cache **b10**. Source and leader coordinates inspected; **raster rendering, actual browser loading/zoom, offline E2E and independent medical review not yet verified**.
- Readback: **27 assets / 20 local SVG**, **45/247 selected chapters** (Α 29/71, Β 5/73, Γ 5/51, Δ 6/52); **202 chapters remain without selected images**. Chapter 01-13 improved from urinary-only to urinary plus two reproductive diagrams, but remains **partial** (no full kidney anatomy, pelvic spatial relationships, anatomical variations, or independent review). No additional chapter counted as selected, and no production release claimed.
- Quality CI was still running when first checked for commit `7ea4ebf`: [workflow run 40384580359](https://github.com/6d9757cmp5-creator/ekab-spoudi/actions/runs/40384580359). Verify final results separately. No claim of a passing run until it completes.

**Next continuation:** confirm SVG/checksum CI and inspect rendered images (including Greek labels and zoom); then develop subject-specific muscular anatomy for 01-09 and new uncovered lessons, without promoting unreviewed clinical procedures. Keep PR #6 in draft pending quality gates.

**Post-batch verification (2026-10-26):** Remote readback confirmed both files, both chapter mappings and both service-worker precache paths. A source-level safety/Greek-label/ARIA check found no immediate issues. The pull-request-triggered [SAEK quality run 40384655117](https://github.com/6d9757cmp5-creator/ekab-spoudi/actions/runs/40384655117) **completed successfully** for the checkpoint commit `138b3b9`. This is not the image-audit SVG/checksum workflow and does not establish rendered-browser, zoom, offline E2E, medical review or live publication. Image-specific CI result for batch 7 remains unconfirmed.

## Batch 8 — 2026-10-26: microbe structure illustration for uncovered 04-06

- Verified PR #6 remained **open, draft, unmerged**, and read existing branch checkpoint and registry before changes. No branch reset or duplicate PR.
- Read actual chapter **04-06, «Βακτήρια, ιοί και μύκητες»** in `saek-course-04.html`. Created an original three-panel **anatomical/biological** SVG `assets/education/microbe-structures-el.svg` with specific labelled structures: a bacterial prokaryotic cell (wall, ribosomes, nucleoid DNA); one **enveloped** virion (spikes, capsid, DNA-or-RNA genome); one **budding yeast** cell (cell wall, nucleus, bud). Diagram states examples are **not to scale** and not universal to all species. No diagnostic or treatment algorithm.
- Scientific background checked against [OpenStax Microbiology §3.3](https://openstax.org/books/microbiology/pages/3-3-unique-characteristics-of-prokaryotic-cells), [§6.1](https://openstax.org/books/microbiology/pages/6-1-viruses) and [§5.3](https://openstax.org/books/microbiology/pages/5-3-fungi). The SVG is **independently drawn**, not a copy of textbook illustrations, and its original artwork is declared **CC BY 4.0**.
- Parsed local SVG XML and rasterized it with CairoSVG; inspected the rendered Greek labels and leader endpoints, **corrected the viral spike leader** so it does not cross the virion. Also rendered SVG source in local Chromium via Playwright `page.set_content` and inspected the screenshot; `file://` navigation was blocked by browser environment policy. A Chromium CSS zoom call was exercised, but **actual application zoom and offline end-to-end are not verified**. Remote GitHub readback SHA-256 matches local: `a60ee4d0140da55b663780c8fcc75fd7faa9f71b32525cfe35551ed2e308cc04`.
- Registered `microbe_structures` in audit assets, placement `04-06`, and course 4 chapter 6; added local SVG to `sw.js` precache. **Draft cache b11**, not a production version bump. The new source selection is **partial** subject coverage and `clinicalReview: pending`.
- New counts: **46/247** chapters with at least one selected source (**Α 30/71, Β 5/73, Γ 5/51, Δ 6/52**), **201** with none. **28 registered assets, 21 local SVG**. **Independent scientific approvals: 0 documented**. Main-branch registry remains **26/247** as last checked, **not evidence of live publication**.
- Remaining quality gates: full lesson adequacy (04-06 lacks mould hyphae and broader microbial variety), independent scientific review, complete real-app browser/zoom/offline tests, image-specific CI result and confirmed public deployment. **Do not merge or claim publication.**

**Next safe batch:** add specific Greek-labelled muscular anatomy to **01-09**, or choose **04-07 / 04-08** only after reviewing current official infection-prevention instructions and image licensing. Keep registry, subject adequacy, independent approval and live production counts distinct.

**Batch 8 post-commit verification:** GitHub Actions [SAEK quality run 40385553873](https://github.com/6d9757cmp5-creator/ekab-spoudi/actions/runs/40385553873) completed **successfully** for checkpoint commit `f2812a05814b46d0efdcb40d866739fe209aaaf0`. Remote registry readback: 247 chapters, 46 selected, no broken registry asset keys or course/placement mismatches, and all local image paths present in `sw.js` precache. Main registry rechecked: A10/B5/C5/D6 (26/247); production version file `27.1.68`. Image-specific GitHub Actions CI not independently confirmed for this batch; no claim of full browser app/zoom/offline E2E or published deployment.


## Batch 9: chapter 04-08 — cleaning, disinfection and sterilization (2026-10-26)

- New original Greek-labelled three-panel SVG `assets/education/clean-disinfect-sterilize-el.svg` compares the distinct objectives of cleaning, disinfection and validated sterilization. Caption explicitly distinguishes bacterial spores and warns against treating the illustration as a procedure or proof of effectiveness. Background reference: [CDC infection-control disinfection and sterilization](https://www.cdc.gov/infection-control/hcp/disinfection-sterilization/index.html); original drawing, CC BY 4.0.
- Added asset key `clean_disinfect_sterilize`, registry placement `04-08`, course 4 chapter 8 source selection; draft service-worker precache b12. **47/247** chapters selected (Α 31/71, Β 5/73, Γ 5/51, Δ 6/52), **200** without an image, **29** registered assets, **22** local SVG. Main remains last observed 26/247; publication unverified.
- **Quality gates pending:** independent clinical/scientific review, raster/browser visual inspection, actual course rendering and offline end-to-end, SHA-256 recording for this new SVG, new CI result and published app verification. `saek-visual-ui.js` currently hides draft visual panels and course diagrams, so source registration **does not** make the image visible to students. Do not merge or report as published. Other chapter 04-08 instrument risk categories and real procedures are not comprehensively illustrated.
- **Next:** complete and validate the image-specific checks for batch 9, then add Greek-labelled diagrams for additional genuinely unselected chapters; milestone notification at 50/247, not 47/247.


## Batch 10: chapter 04-09 — B-cell memory (2026-10-26)

- Created `assets/education/b-cell-memory-el.svg` original Greek-labelled cellular immunology diagram with antigen, B-cell receptor, helper T cell, plasma cell secreting antibodies, memory B cell and secondary antigen response. Moved helper-T annotation clear of the illustrated cell. SVG SHA-256 `5db766b7286cda61e864b1f37d341f128741bd57f0837d501ed66834370bd0e2` recorded in registry. Original artwork CC BY 4.0.
- Checked [OpenStax A&P 21.4](https://openstax.org/books/anatomy-and-physiology/pages/21-4-the-adaptive-immune-response-b-lymphocytes-and-antibodies), [OpenStax Microbiology 18.4](https://openstax.org/books/microbiology/pages/18-4-b-lymphocytes-and-humoral-immunity), [CDC vaccines](https://www.cdc.gov/vaccines/basics/explaining-how-vaccines-work.html) (2024). Diagram covers only T-dependent B-cell response, not all immunity or vaccination protocols.
- Added audit asset `b_cell_memory`, `04-09` placement and Α-semester course 4 lesson 9; added SVG to draft `sw.js` precache **b13**. Existing audited-image renderer reads this registry; no changes to theory, accounts, progress or sync.
- **Draft selected: 48/247 (Α 32/71, Β 5/73, Γ 5/51, Δ 6/52), 199 unselected; 30 assets, 23 local SVG.** Main last checked: 26/247 (Α10, Β5, Γ5, Δ6), **not verified production**. Version `27.1.68` unchanged.
- **Remaining gates:** independent scientific approval 0 documented, completeness partial, XML/raster/actual browser/zoom/offline E2E and published deployment unverified; container DNS prevented independent download for raster. This is a draft commit only; do not merge as clinically approved. 04-08 from prior batch is preserved.
- **Next:** validate 04-08 and 04-09 image rendering/CI, then select genuinely missing 04-07 with current official infection-prevention references. Do not treat image selection as clinical approval or public deployment.


## Batch 11: milestone 50 — 04-07 hand hygiene and 04-10 sharps safety (2026-10-26)

- Added original Greek-labelled `assets/education/hand-hygiene-hotspots-el.svg` for 04-07, showing an anatomically schematic palm and high-miss zones (thumb, fingertips, between fingers), alongside the choice of alcohol hand rub versus soap/water and the limitation of gloves. Evidence: [CDC Clinical Safety: Hand Hygiene](https://www.cdc.gov/clean-hands/hcp/clinical-safety/index.html) and [CDC core practices](https://www.cdc.gov/infection-control/hcp/core-practices/index.html), checked 2026-10-26. SHA-256: `02542b36d526f73ce1a78da2305dc2ed978ddde1834f8fca3e24264329aac871`.
- Added original Greek-labelled `assets/education/sharps-disposal-el.svg` for 04-10: syringe/needle, immediate disposal into close-by puncture-resistant container, maximum fill line and crossed-out recapping. Evidence: [CDC NIOSH Sharps Disposal (2024)](https://www.cdc.gov/niosh/healthcare/hcp/pandemic/sharps-disposal-mass-vaccination.html) and [CDC environmental control](https://www.cdc.gov/infection-control/hcp/environmental-control/summary-recommendations.html), checked 2026-10-26. SHA-256: `99b3679bd0ea7b49d577b76382aa2231692207e0365491036668d136023b1826`.
- Verified remote source readback and SHA-256 for both files. Checked SVG group nesting and basic markup structure; **full XML parser, raster/browser zoom and offline application end-to-end NOT yet verified**. Both are original diagrams, CC BY 4.0. Recorded missing SHA-256 for previous 04-08 asset: `75ced0d681cecdd18bc32f9383314efb841d160a6480936889de5f6e5bef9c69`.
- Updated audit registry, two chapter placements and `sw.js` precache to draft cache **b14**. Validated registry: **247 chapters, 50 selected, no missing asset keys or chapter-placement mismatches**. Draft selected per semester **Α 34/71, Β 5/73, Γ 5/51, Δ 6/52**, **197 unselected**, **32 assets**, **25 local original SVG**. Main registry last checked **Α10/71, Β5/73, Γ5/51, Δ6/52 = 26/247**, not verified production. App production version **27.1.68**, unchanged.
- **Critical remaining gates:** independent scientific review still **0 documented**; 04-07 is not full handwashing technique or all PPE, 04-10 not complete biological-waste policy; SVG visual review in real browser, source renderer behavior, offline E2E and public deployment remain unverified. The draft image renderer shows attributed source figures but source-selected status is **not clinical approval**. Do not merge as clinically certified.
- **Next safe batch:** add a genuinely relevant original diagram for the next unselected chapter after reviewing its content and sources; validate rendered visual appearance and end-to-end when a suitable browser and assets are accessible. Notify user at milestone 50, then next 100.


## Batch 12: prevention levels for 04-03 (2026-10-26)

- Created original Greek-labelled SVG `assets/education/prevention-levels-el.svg`, an explicit three-stage progression with anatomical/health symbols and concrete examples: primary prevention (vaccination before illness), secondary prevention (screening/early detection), tertiary prevention (rehabilitation/reducing complications). No patient-specific clinical protocol is depicted.
- Registered `prevention_levels` in `saek-image-audit-2026.json`, placement `04-03` and course 4 lesson 3. Added asset to `sw.js` precache **b15**. No unrelated app or theory changes.
- Registry structurally checked in the write operation: **247 chapters, 51 with at least one selected source** (Α35/71, Β5/73, Γ5/51, Δ6/52); **196 without selected source**, 33 registered assets. All selected chapter asset keys resolved in the audit registry.
- Main-branch registry last checked **26/247** (Α10, Β5, Γ5, Δ6), NOT evidence of live deployment. Production version **27.1.68** unchanged. PR #6 remains draft.
- **Outstanding:** independent scientific review, live verification of linked reference pages, SVG XML/raster and actual-browser/zoom/offline E2E, source renderer and public deployment. This asset is selected in draft, not certified, clinically approved, or published. Source review date and SHA-256 remain unset until independently verified.
- **Next:** run XML/raster/real-app checks for recent assets, fill remaining 04-01 or 04-04 only with specific explanatory diagrams; preserve milestone notification schedule (next 100).
