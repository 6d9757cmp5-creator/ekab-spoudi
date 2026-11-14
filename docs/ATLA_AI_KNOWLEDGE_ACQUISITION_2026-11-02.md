# ATLA AI Knowledge Acquisition Engine — replacement 2026-11-02

## Scope
Replaces the old daily-knowledge-refresh scheduled GitHub Actions workflow, retaining its trusted-source discovery helpers, existing registries, historical documents, books, and all user progress.
Does not merge, deploy, change the curriculum, or touch ATLA PR #147/#148.

## Flow
1. Run existing curated-source and PubMed discovery to produce pending bibliography.
2. Download up to four NCBI PubMed abstracts transiently. Store only their SHA-256 digests, not full texts.
3. OPTIONAL paid AI classifies relevance, possible methodological caveats and contradictions. The abstract and its metadata are treated as untrusted data.
4. Persist only queue/ai-research-review.json with clinical_approval:false, learner_visible:false, and atla_ai_retrieval_enabled:false.
5. Independent clinical-scientific review, rights check, latest version/retraction check and Greek protocol applicability are mandatory before any approved knowledge publication.

## Cost and activation
AI is off by default. Enable only AFTER verified provider spending cap and explicit owner approval:
GitHub Actions variables ATLA_RESEARCH_AI_ENABLED=true and ATLA_RESEARCH_SPENDING_APPROVED=true; secret ATLA_RESEARCH_ANTHROPIC_API_KEY.
At most four AI calls per daily run; this is not a provider-level billing guarantee. Without credentials the discovery and candidate staging still function.

## Limitations
No full-text appraisal, no verified retraction cross-check, no automatic clinical approval, no RAG import, no learner-facing knowledge updates, and no verified live AI until independently configured and tested.
The workflow is a draft replacement; old schedule remains active on main until a reviewed merge.

## Tests
node --test tools/atla-ai/knowledge-refresh/scan.test.mjs tools/atla-ai/knowledge-refresh/pipeline.test.mjs

## Next validation (AI credits remain zero)
- The scanner stages all metadata and candidates *read-only* first; only after the research-only gate can review files be written.
- The new full-network PR smoke job exercises the actual curated-source registry and all PubMed topics using `write:false` and `env:{}`. Paid model requests are impossible in this test.
- A complete PubMed outage or an empty source registry now fails closed instead of generating an apparently successful empty research queue. Partial failures are reported without inventing evidence.
- Run locally, read-only and credit-free: `node tools/atla-ai/knowledge-refresh/pipeline.mjs --dry-run`.
- AI response testing remains pending until cost and owner-approved activation. No change to clinical/learner publishing safeguards.

## Owner decision — AI credits remain protected
The owner confirmed that paid AI answer validation must remain OFF for now to preserve credits. This is explicitly **not a blocker** for deterministic tests, source integrity checks, real read-only NCBI tests or validating pending queues. The live paid-provider test remains an open acceptance item; never enable AI credentials or call the model for this PR without separate approval. `--dry-run` explicitly injects an empty AI environment.

## Source-rights checkpoint — official publisher terms (2026-11-02)

This is a **partial, publisher-level rights audit** of sources already on the ATLA watchlist, not a blanket license clearance of individual works. Source discovery, titles, URLs, and citation metadata are distinct from reproducing abstracts, chapters, figures, algorithms, or educational adaptations. No license is inferred merely because an item is online or indexed in PubMed.

| Existing source | Publisher evidence | Consequence for ATLA |
| --- | --- | --- |
| WHO publications | [WHO copyright policy](https://www.who.int/about/policies/publishing/copyright): many WHO publications use CC BY-NC-SA 3.0 IGO; third-party material can have separate rights; commercial reuse requires permission | Continue metadata-only monitoring. Check the license and any third-party credits **per document**, plus attribution, noncommercial and share-alike obligations before any reproduction, translation or adaptation. Do not imply WHO endorsement or reuse its logo. |
| OpenStax *Anatomy and Physiology 2e* | [Book preface](https://openstax.org/books/anatomy-and-physiology-2e/pages/preface): CC BY-NC-SA 4.0 | Monitoring/linking only by this pipeline. Any proposed reuse must check noncommercial status, attribution, share-alike and individual art credits. No automatic copy into lessons. |
| OpenStax *Microbiology* | [Book preface](https://openstax.org/books/microbiology/pages/preface): CC BY-NC-SA 4.0, with art-specific attribution notes | Same review requirements; do not assume every figure has identical reuse conditions. |
| American Heart Association CPR/ECC guidelines | [AHA legal position](https://www.heart.org/en/about-us/statements-and-policies/aha-legal-position) and [copyright request policy](https://www.heart.org/en/about-us/statements-and-policies/copyright-request-form): permissions and additional restrictions apply, including to electronic ECC algorithms and translations | **Do not embed/reproduce ECC algorithms or translated AHA materials** without appropriate rights/approvals. Keep links and metadata only. |
| PubMed-indexed journal articles | [NLM PubMed help](https://www.nlm.nih.gov/databases/download/pubmed_medline.html) and [NLM Bookshelf copyright notice](https://www.ncbi.nlm.nih.gov/sites/books/NBK554842/): NLM indexes publisher works and does not grant reproduction rights or endorse individual studies | PMID, citation and ephemeral research-only processing do **not** imply permission to republish an abstract/full text or use it for learner-facing RAG. Review the specific publisher/license before reuse. |

**Outstanding before rights criterion can be completed:** per-work licenses for every selected publication and all third-party assets; intended commercial/noncommercial use; any required permissions; translation/adaptation terms; Greek clinical applicability; independent scientific review. The remaining curated publishers (including ERC/ILCOR/Cochrane/ECDC, commercial textbook publishers, and other watchlist domains) have **not** been cleared by this checkpoint. AI remains OFF; this audit authorizes no ingestion, clinical publication, deployment or merge.
