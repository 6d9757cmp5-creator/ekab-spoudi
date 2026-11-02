# ATLA — Clinical Evidence Review Dossiers (research-only)

**Status: 2026-11-03 — external clinical appraisal NOT DONE.**

Every PubMed candidate has a separate, inspectable template built by `review-dossiers.mjs`. This is a handoff packet for qualified independent clinical reviewers, not a score, clinical validation, diagnosis, or medical recommendation.

## Workflow
1. Generate dossiers with `node tools/atla-ai/knowledge-refresh/review-dossiers.mjs > review-dossiers.json` locally, or inspect the GitHub CI artifact. This reads the existing pending bibliography but writes NO repository files or secrets.
2. For each article, independently obtain authorized full text. Record the specific PICO, relevant patient group, method, outcome findings and DOI/PMID. An abstract alone is insufficient.
3. Assess systematic review methods with an appropriate tool, e.g. AMSTAR 2 (critical-domain appraisal; do not invent numeric total score). For clinical decisions assess certainty with GRADE **per outcome**.
4. Verify publication status, corrections, conflicts/funding, rights and Greek EMS scope of practice and course objectives.
5. Obtain separate, real, qualified human reviewers and resolve disagreements. Never attribute a review to ChatGPT, an invented identity, or a script.
6. Keep medical material **disabled** until a separate audited, authenticated clinical approval-and-publication process exists. A filled JSON record is never a sufficient authorization.

## Evidence standards
- Cochrane GRADE chapter: https://www.cochrane.org/authors/handbooks-and-manuals/handbook/current/chapter-14
- AMSTAR 2 methodological appraisal: https://www.bmj.com/content/358/bmj.j4008
- NLM linked retractions and expressions of concern: https://www.nlm.nih.gov/bsd/policy/errata.html

## Current constraints
Scientific QA can create a structured review **worklist** for the full PubMed queue with no paid AI credits. It cannot manufacture licensed full text, real GRADE judgements, reviewer credentials, copyright permissions, or independent certification. Data remains research-only; learner-facing retrieval is never enabled by this step.
