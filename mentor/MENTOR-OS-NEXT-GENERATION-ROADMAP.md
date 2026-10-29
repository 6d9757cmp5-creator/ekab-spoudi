# MENTOR OS — Next-generation training roadmap

Status: design specification, NOT implemented or medically approved. Scope: Mentor only; no changes to legacy grades, lessons, progress, or other PRs.

## Product objective
Build a coherent paramedic training environment, not a list of static quizzes. Each lab should have clear learning objectives, interactive state, reproducible scenarios, feedback, source provenance, accessibility and independent review.

## Modules and acceptance criteria

1. **EKAB Live**: authored branching dispatch-to-handover missions, evolving observations driven by reviewed fixtures, time and team communication; replayable event log; no invented clinical outcomes.
2. **3D Anatomy**: interactive model layers, search, Greek-first terminology, side and numbered structures, clinical links; unresolved labels visibly marked pending; preserve separate terminology review workflow (PR #97).
3. **ECG Intelligence Lab**: annotated rhythm examples with provenance, zoom and measurement tools, step-by-step interpretation and explanation; no unsupported diagnosis claims.
4. **AI clinical teaching team**: distinct tutor roles, source-backed answers, uncertainty, escalation and explicit simulation-only guardrails; no unreviewed AI advice presented as protocol.
5. **Mass-casualty lab**: scene safety, count and tracking of every casualty, resource allocation and repeated reassessment; triage algorithms only after approval of a named current protocol.
6. **Equipment lab**: model-specific AED, BVM, oxygen, airway, suction, stretcher and monitoring simulations with manufacturer manuals and reviewer approval before operational instruction.
7. **Skills Academy**: modular skill trees for BLS/AED, ABCDE, SAMPLE/OPQRST, AVPU/GCS, airway, hemorrhage, trauma, immobilization, cardiac, respiratory, neurologic, pediatric, obstetric, geriatric emergencies, communications and teamwork. Each skill: objectives, prerequisites, reviewed content, guided practice, simulated assessment and remediation.
8. **Oral exams / OSCE**: explicit rubrics and examiner feedback in isolated Mentor-only records, without altering legacy grading.
9. **Personal medical academy**: SAΕΚ, EOPPEP and seminars study pathways, spaced practice based on Mentor-only events, weak-skill review, user-controlled export/delete.

## Engineering delivery stages

- **Stage A — Foundation**: audit current modules, identify gaps, define shared scenario and skill schemas, design UI navigation and mobile accessibility. Add tests for state replay, isolation and non-regression.
- **Stage B — Skills Academy**: ship a browsable skill catalog, practice sessions and mastery indicators using Mentor-only storage; initial content explicitly draft until reviewed.
- **Stage C — Scenario engine**: deterministic branching, vitals timeline from approved fixtures, scenario editor with validation, playback and explanatory feedback.
- **Stage D — Specialist labs**: integrate 3D anatomy, ECG, mass-casualty and equipment one at a time, with provenance and clinical gates.
- **Stage E — Tutor and OSCE**: grounded teaching assistant, oral examinations and rubric-based practice with privacy safeguards.
- **Stage F — Release**: independent medical signoff, AGENTS.md asset register, unit/integration/browser tests, iPhone Safari and offline checks, security, migration, rollback, CI and deployment verification.

## Non-negotiable gates

- Never modify legacy scoring, lesson content, progress or sync keys.
- No clinical content or assets published without documented license, provenance, independent expert review and AGENTS.md approval.
- Distinguish prototype, automated-check-passed, human-review-pending and approved-for-publication states.
- No claim of real patient simulation, live dispatch, validated clinical decisions or approved protocols unless demonstrated.
- Keep PR #97 and other ongoing PRs isolated. Existing Mentor draft PR #85 is not to be merged until all required gates pass.
