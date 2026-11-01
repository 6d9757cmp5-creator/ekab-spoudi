# MENTOR NEXT — έτοιμα 3D assets για πραγματική αναβάθμιση
Επαληθεύτηκαν οι σελίδες πηγής, η δηλωμένη άδεια CC0, τα μεγέθη και το περιεχόμενο περιγραφών στις 2026-11-01. **Δεν έχει γίνει ακόμη τοπική λήψη, επιθεώρηση των bytes ή εισαγωγή αυτών των συγκεκριμένων μοντέλων.** Κανένα μοντέλο δεν έχει αξιολογηθεί ως κλινικά ακριβές.

## Προτεινόμενο επιλεγμένο σύνολο (όλα CC0, GLB)
| Ρόλος | Αρχείο | Δηλωμένο μέγεθος | Rig/κίνηση | Επαληθευμένη επίσημη σελίδα |
| --- | --- | ---: | --- | --- |
| Ασθενής ξαπλωμένος | Daniel - lying flat | 8.2 MB | Static mesh, no armature | https://www.innerscene.com/tools/library/3d-parts/daniel-3d-person-lying-flat-820f78f4 |
| Ίδιος ασθενής ημικαθιστός | Daniel - reclined in bed | 8.2 MB | Static mesh, no armature | https://www.innerscene.com/tools/library/3d-parts/daniel-3d-person-reclined-in-bed-e0e35ab7 |
| Ασθενής καθιστή στο κρεβάτι | Amara - sitting up in bed | 6.5 MB | Static mesh, no armature | https://www.innerscene.com/tools/library/3d-parts/amara-3d-person-sitting-up-in-bed-3427c39e |
| Άνδρας σε στάση ύπτια | Carlos - lying flat | 7.1 MB | Static mesh, no armature | https://www.innerscene.com/tools/library/3d-parts/carlos-3d-person-lying-flat-85f45ccb |
| Καθιστή ασθενής με ιατρική ρόμπα | Nora - patient in seated gown | 17.4 MB | Rig/animation not established; inspect GLB | https://www.innerscene.com/tools/library/3d-parts/nora-3d-person-patient-in-a-seated-gown-dfc1217d |
| Διασώστης με σακίδιο | Drew - paramedic with response bag | 14.5 MB | Rig/animation not established; inspect GLB | https://www.innerscene.com/tools/library/3d-parts/drew-3d-person-paramedic-with-response-bag-c90b16a3 |
| Βάση για κινούμενους ασθενείς | Human base mesh with editable 53-bone rig | 4.8 MB | 53-bone skeleton+skin weights; no animations | https://www.innerscene.com/tools/library/3d-parts/human-base-mesh-with-editable-53-bone-rig-8e7c8ab1 |
| Φορείο | Patient transport stretcher | 611 KB | Static | https://www.innerscene.com/tools/library/3d-parts/patient-transport-stretcher-3ff4d512 |
| Ασθενοφόρο | Box-body ambulance | 6.6 MB | Static | https://www.innerscene.com/tools/library/3d-parts/box-body-ambulance-dc8d7b19 |

## Λειτουργική απόφαση
1. Για **οπτικό αποτέλεσμα** γρήγορα: Daniel lying + Amara seated + Drew + stretcher + real room; all are actual source GLBs, not shader spheres. On mobile, start with one patient loaded at a time, lazy-load and compress heavy embedded textures.
2. Για **κίνηση** (breathing, looking, sitting and lifting arms) use a single rigged 53-bone CC0 model that can have skin+clothes attached and animations. The above static posed models must not be described as animated, or treated as dynamically poseable.
3. For original, reproducible realistic patient builds with CC0 assets, consider MakeHuman / MPFB: https://www.makehumancommunity.org/mpfb/faq/can_i_sell_models.html ; asset outputs CC0, but the application source is GPL/AGPL. Third-party MakeHuman asset packs can have distinct licenses.
4. For animation authoring use rig + Blender Action / Three.js AnimationMixer. Mixamo is Adobe royalty-free for creative works but **do not redistribute raw Mixamo characters or animations** in the open-source repo. Verify terms: https://helpx.adobe.com/creative-cloud/faq/mixamo-faq.html
5. **Critical runtime**: existing `mentor/app/next-patient-mesh.mjs` supports a tiny static GLB subset, single-mesh untextured shader. These assets have embedded textures and multi-node structure and the 53-bone model has skinned rig. Replace the mini parser/renderer for new assets with a glTF 2.0-compliant loader (Three.js GLTFLoader or equivalent), AnimationMixer for skinned assets, materials+texture loading and GLB validation. Do not pretend a file is integrated by merely placing it in GitHub.
6. Before shipping: verify all source files and licenses locally, glTF structure, animation clips/rigging, material fidelity, 2-patient alignment with stretcher and equipment, draw calls/memory, stable 30fps target on actual iPhone, keyboard/touch controls, accessibility and mobile+desktop regression tests. Document screenshots from actual renderer; do not use stock examples as preview of delivered assets.

## Clinical limitation
None of these model assets supplies an algorithm for physiologic responses, a clinical validated trauma patient, appropriate medication, CPR, ventilation, diagnostic outcome or clinical grading. Do not declare Body Interact equivalence until independent scientific and functional verification.
