> **Νεότερη αρχιτεκτονική (04/11/2026):** Η παρακάτω πιλοτική εξωτερική αναφορά αντικαταστάθηκε από την κοινή βιβλιοθήκη `tools/atla-ai/resources/model-library.json`. Τα μοντέλα φορτώνονται πλέον από τη δική μας υποδομή, μέσω του `tools/atla-ai/nih3d-library.mjs`, με έλεγχο SHA-256 πριν από την προβολή. Οι περιορισμοί κάθε επιφάνειας παραμένουν. Το μητρώο παράγεται από το `scripts/nih3d-build-library.mjs` και ενημερώνεται αυτόματα από το workflow `atla-nih3d-library-build.yml`. Καμία προβολή δεν συνιστά επιστημονική ή κλινική έγκριση.

# ATLA NIH 3D — contextual educational source links (pilot)

## Purpose

Use the existing NIH3D Original Archive source registry, scientific triage and proposed 3D Knowledge Graph for **relevant references only**. There must be no large model listing, unexpected popup, or automatic 3D download in a lesson.

## First verified source

NIH 3DPX-000170 *Human patella*, Public Domain: https://3d.nih.gov/entries/3DPX-000170

The original STL was independently downloaded from NIH with HTTP 200, valid format, and matching 171,884-byte length. SHA-256 `eb0587d5fef552120b1e15a200c336d80d2631513703b5461d66c717a0d32d69`. This validates **source file identity/integrity for one representation**, not clinical accuracy, not the model's anatomy, and not other NIH source files.

## Three independent learning surfaces

- **Lessons:** the matching reference appears within the existing Anatomy 3D links of SAEK course 01, chapter 2, where the actual course text discusses the patella.
- **Anatomy Lab:** the external NIH original page is shown only when the selected anatomical structure is a patella, and removed when the selection changes.
- **Exams:** the reference is never shown before an answer is revealed. The current SAEK question bank does not contain a matching patella question, so the feature remains hidden in today's exam. It is ready for a future specifically matched question.
- **Clinical Cockpit:** synthetic case titles and generic injuries never imply a patella problem. Contextual reference requires a separately confirmed, explicitly named anatomical structure; current fictional cases do not have such evidence and therefore show no NIH link.

A source reference is **not** a reviewed educational model. The source is linked externally with a clearly visible clinical-validation disclaimer. No browser-inline NIH3D model is claimed: NIH model and API endpoints did not advertise an applicable CORS header in the real probe. Only the official original source page is opened.

## Technical entrypoints

- `tools/atla-ai/nih3d-research-context.mjs`: conservative, read-only contextual matching for research-source navigation.
- `tools/atla-ai/nih3d-learning-surface.mjs`: conditional markup within existing pages. No modifications to exam grades, learner progress, or case state.
- `tools/atla-ai/nih3d-original-source-gateway.mjs`: full source catalog lookup and safe external NIH access.
- `scripts/nih3d-contextual-ui.test.mjs`: unit/static source evidence checks.
- `scripts/nih3d-contextual-browser.test.mjs`: real Chromium desktop/mobile journeys, including no premature exam hints, no fictional diagnosis inference, and link removal on subject change.

**Not done:** full scientific review of the medical catalog (1,597 automatic candidates and 12,766 manual-review entries), model-by-model teaching approvals, browser inline 3D rendering from NIH, complete integration of every medical source, and permanent binary replication of all file formats. The 15,688 NIH items and 204,346 source file references are **metadata coverage**, not stored binaries.

This pilot extends the four-stage architecture: NIH 3D Original Archive → Scientific Classification Engine → 3D Knowledge Graph → ATLA Contextual Selection → Lessons / Exams / Clinical Cockpit.
