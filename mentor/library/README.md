# MENTOR OS — Clinical Intelligence Library

This is a **source inventory**, not a downloaded medical corpus or trained AI model. The production app and existing AI answer grader remain untouched.

## Mission
Emergency-physician-depth medical education focused on emergency departments, prehospital care, triage, critical care and clinical reasoning. Exclude unrelated molecular/basic research. Teach each learner at their verified level and do not imply clinician accreditation or authorize out-of-scope procedures.

## Source statuses
All 13 sources are currently **source-identified**. `fulltext_ingested:false` means no full book text has been uploaded. Do not claim that links have trained a model.

## Safe ingestion workflow
1. Confirm per-edition source URL and content, provenance, licensing, and third-party images.
2. Fetch the permitted official EPUB/PDF/HTML text to an authorized ingestion workspace (not automatically into the public Pages repository).
3. Validate completeness, checksum, chapter structure, citation and document version; sanitize embedded media.
4. Extract into source-linked passages; prepare searchable index with citation, edition, language and expiry/update metadata.
5. Map concepts to Greek clinical vocabulary, SAEK/EOPPEP topics and role-scoped learning objectives.
6. Independent clinical review before high-stakes clinical prompts, drug doses or protocol recommendations.
7. Connect the Mentor's separate server-side retrieval gateway only after access control, budget limits, privacy and simulation tests.

Do not commit a multi-gigabyte unvalidated corpus or secrets to GitHub Pages. GitHub is for the catalog, code and versioned manifests; large authorized book files belong in controlled storage. This source catalog is not a certification of completeness or clinical accuracy.

Source of license for WisTech EMR: https://wtcs.pressbooks.pub/emergencymedtech/front-matter/preface/ (CC BY 4.0, except otherwise noted).
