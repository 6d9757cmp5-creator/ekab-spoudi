# MENTOR OS — Clinical Intelligence Library

## Confirmed actual import
**Seven complete textbooks/manuals have been extracted as text**, placed in `corpus/*.json` in the isolated `feature/mentor-clinical-library` branch. **They are not merely links.** See `corpus/manifest.json` and `catalog.json` for exact counts, original publisher URLs and file SHA-256 hashes.

Texts included:
1. Emergency Medical Responder — WisTech Open (CC BY 4.0, third-party exceptions).
2. Health Alterations — Open RN / WisTech Open (CC BY 4.0, third-party exceptions).
3. Nursing Skills 2e — Open RN (CC BY 4.0, third-party exceptions).
4. Nursing Pharmacology 2e — Open RN (CC BY 4.0, third-party exceptions).
5. Nursing Advanced Skills — Open RN (CC BY 4.0, third-party exceptions).
6. WHO-ICRC Basic Emergency Care Participant Workbook — WHO/ICRC (CC BY-NC-SA 3.0 IGO, **noncommercial only**, no WHO endorsement; share-alike).
7. Medical-Surgical Nursing — source PDF at assets.openstax.org, linked from UOTI (the book PDF states CC BY 4.0; verify any current AI-specific restrictions before deployment).

**Only text** has been imported: figures, images and PDF layouts have **not** been approved or imported. Scientific and third-party-rights review pending on all seven. The extracted English-language sources have NOT been translated, fact-checked, used to train a model or enabled in the production Mentor.

## Source attribution / review
The text files preserve `source_id`, `source_url`, `section`, `id`, `review_status: draft` and manifest hashes. Each imported passage must pass medical review and be changed to `human-reviewed` only after documented review. Production retrieval only returns human-reviewed passages. The existing answer grader and live EKAB Spoudi app are unchanged.

## Verification
- `node mentor/library/validate-corpus.mjs` checks the real book files, lengths, counts, hashes and license metadata.
- `node --test mentor/library/corpus.test.mjs mentor/library/retrieval.test.mjs` checks filtering.
- `node mentor/library/search-books.mjs "shock"` searches the draft books for human review, without claiming clinical approval.

## Architecture
The Mentor is an educational AI tutor with evidence-backed, source-linked clinical reasoning in emergency and prehospital medicine, not a qualified clinician. Future work: Greek terminology, medical source review, secure deployment and dedicated retrieval gateway; never silently alter existing grades or student progress. Exclude molecular/basic research unrelated to emergencies.

**IMPORTANT**: This is a public review branch. Do not merge into `main` or deploy a user-facing AI that relies on unreviewed text. Keep edition, original publisher credit and license conditions in downstream use.
