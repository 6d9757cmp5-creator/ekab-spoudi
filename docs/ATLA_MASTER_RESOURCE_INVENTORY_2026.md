# ATLA Master Plan 2026 - Resource Inventory

Anatomy Lab and Clinical Cockpit share resource discovery, not their engines or patient data.
The figures below are DIFFERENT UNITS and must not be summed as one model total.

| Source | Destination | Count | Unit | State |
|---|---|---:|---|---|
| HRA / HuBMAP 3D | anatomy-lab | 54 | model files | stored in repository |
| Z-Anatomy | anatomy-lab | 5 | research model files | stored - research isolation |
| MakeHuman | clinical-cockpit | 10 | geometry, rig and animation files | stored - not patient validation |
| Quaternius | clinical-cockpit | 2 | model and animation files | stored - research |
| BodyParts3D 4.0 | anatomy-lab | 1259 | anatomical meshes | compiled atlas in repository |
| BodyParts3D 4.3 | anatomy-lab | 3210 | anatomical meshes | compiled atlas in repository |
| NIH 3D anatomical | anatomy-lab | 691 | source metadata entries | catalogued; not automatically downloaded or enabled |
| NIH 3D clinical devices | clinical-cockpit | 1895 | source metadata entries | catalogued; candidates only |
| NIH 3D other scientific | atla-ai | 13102 | source metadata entries | catalogued; candidates only |

- Verified newly stored non-NIH source files: **71**.
- BodyParts3D counts are meshes reported by the verified intake document, not separate downloads.
- 36 MIT Open Anatomy Atlas code files are tools/software, not 3D meshes (see docs/ATLA_3D_ASSET_INTAKE_VERIFIED.md).
- NIH catalog: **15688** published metadata entries across three possible destination modules.
- NIH binary release audit: **2/250** canonical groups, **3400** original files across **87** NIH entries. Status: **PARTIAL_OR_UNVERIFIED**.

Source manifests: tools/atla-ai/resources/master-resource-index.json and each dataset manifest above.
New resources require per-file provenance, format/scale/coordinate checks and educational relevance before activation.
