# MENTOR NEXT · Πρωτότυπος προσομοιωτής v0.1
## Scope
Original first-party MENTOR proof of concept in \`mentor-next.html\`. The existing MENTOR OS floating companion is reused, not cloned; \`mentor-live.html\` remains the classic mission.
### Delivered
- Procedurally generated **real WebGL low-poly 3D** patient scene: two figures, vehicle, rotation and multi-zone zoom with no external asset or CDN dependency. Accessible buttons and WebGL unsupported fallback.
- Two selectable synthetic patients with independent vitals, timer (manual or automated), scripted Greek dialogue and free-text keyword matching **without AI**.
- Exam, monitoring, tests, coordination, organizational actions, medication lock, local observation history and TXT export.
- Debrief: 7 educational process checklist areas (safety, communication, assessment, monitoring, coordination, reassessment, handover), deliberately **no clinical grade**.
- Standalone localStorage key; original ΕΟΠΠΕΠ, ΣΑΕΚ and other MENTOR content never modified.
- Cross-device Playwright smoke test and pure engine unit tests.

### Scientific limits
Completely synthetic values change solely with the passage of virtual time. Their time slopes are invented and **are not treatment response, verified physiology, triage, severity, clinical education guidance or patient prognosis**. The program does not model drug dosages, interventions or actual ECG. Assessment only checks educational record completion; no medical accuracy certification. 3D patient shapes are stylized models, not realistic anatomical scans or animated physiologically accurate humans.
### Provenance
The design takes high-level user workflow inspiration from publicly documented simulation tool categories but does not include Body Interact or Virtual Standardized Patient source, models, branded UI or assets. All new source is written for ΕΚΑΒ Σπουδή.
### Verification
\`node --test mentor/core/next-sim.test.mjs\`; \`node --check mentor/app/next-sim.mjs\`; \`node --check mentor/app/next-scene.mjs\`; \`node scripts/app-load-smoke.mjs\` in a Playwright environment. Test WebGL on an actual mobile device separately.
