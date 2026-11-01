# ATLA Clinical Cockpit — separate character assets

**Separate from the Anatomy Lab.** Existing patient simulator `tools/patient-simulator/` and its three patient GLBs are preserved without replacing anything.

Already imported: `tools/patient-simulator/assets/cc0-human-body.glb` from `UMRAM-Bilkent/supine-human-model`, CC0-1.0; source license and notice are in `assets/CC0-ASSET-NOTICE.md`. Other existing patient GLBs: `assets/patients/`.

Additional reviewed free sources:

- **MakeHuman** core exported human models: CC0, while software is AGPL and third-party garments/textures may use other licenses. https://www.makehumancommunity.org/about/license.html. **Not yet exported or imported.** Valid exports belong to `resources/makehuman/` only after source/asset validation.
- **Quaternius Universal Base Characters**: CC0 free pack, humanoid animation rig (stylized). https://quaternius.com/packs/universalbasecharacters.html. Requires downloading free pack through its official Itch.io page; stable direct free pack archive not independently verified yet. **Not yet imported.** Approved models go to `resources/quaternius/`.
- **UMRAM-Bilkent supine human**: CC0 and already present, so duplicate import is unnecessary.

No anatomical 3D atlas material is mixed into the patient simulation engine. Both tools can later be connected only by ATLA navigation/context.
