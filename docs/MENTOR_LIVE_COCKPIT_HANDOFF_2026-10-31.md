# MENTOR Live Simulation Cockpit — handoff (31 Οκτωβρίου 2026)

## What ships
- A self-contained, original prehospital *educational* cockpit inside the existing MENTOR OS; no additional agent.
- One two-person synthetic road-incident session with deterministic observations and patient-focused scripted conversations.
- Scene overview or focus per person, a static synthetic HR trend chart (not ECG), monitoring, exam scope, communication exercise, case briefing, pause, tool reset and persisted local records.
- The same scenario's decisions and observations are displayed together in **MENTOR Live Debrief**, exportable to UTF-8 text. This replaces the misleading link to the unrelated Protocol Lab debrief.
- No changes to SAEK/EOPPEP grades or the separate historical MENTOR session keys; legacy sessions lacking observations remain readable.

## Explicit non-features
- No licensed Body Interact code, screenshots, assets or proprietary physiological algorithms were copied.
- No interactive 3D patient, clinical diagnosis, pharmacology, treatment effect, actual physiological model, patient positioning intervention, remote calls, ECG trace or genuine diagnostic exams.
- Fake/counterfeit clinical findings are NOT presented as verified. Drug and intervention menus remain locked pending independent clinical and legal role review.
- Synthetic figures and feedback cannot establish clinical competence. AI remains disabled.
- Do not advertise this as a clinical-grade equivalent to Body Interact.

## Manual release checks
1. Open `mentor-live.html` on phone and desktop; check scene, views, 8 tool tabs, monitoring and safe locked menus.
2. Choose patient, ask a scripted question, complete first organizational decision, refresh page. Patient observation and stage are both still in local memory.
3. Follow **Φάκελος → MENTOR DEBRIEF**. Verify the same encounter's decision and observation, then export the .txt.
4. Pause, confirm decisions are disabled. Resume; reset and confirm the intended session only is cleared.
5. Inspect responsive layout and browser console. Run `node --test mentor/core/live-sim.test.mjs mentor/core/live-debrief.test.mjs`.
6. Run `node scripts/app-load-smoke.mjs` with Playwright available (automatically in the **App loads on mobile and desktop** workflow).
7. Do not confuse unrelated repository-wide failures with cockpit validation. Resolve baseline suite regressions before calling the *entire application* release-ready.

## Public source inspiration
- https://help.bodyinteract.com/body-interact-simulator-app/using-the-simulation/simulation-interface-overview/
The external page provided a UX menu inspiration only; the implementation and responses here are original.
