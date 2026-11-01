# ATLA Anatomy Lab — licensed model resource intake

Catalog: `catalog.json` (54 HRA GLB objects, 15 approved imports pinned to exact upstream Git SHA). Importer: `scripts/import-approved-3d-assets.mjs` verifies source blob hash, GLB schema, SHA-256 and stores the models in regional subfolders.

Only HRA/HuBMAP CC BY 4.0 objects are marked approved for direct import. Original attribution: HuBMAP CCF 3D Reference Object Library, Browne et al. (2022). BodyParts3D (official 2025 CC BY 4.0) is currently already referenced in the 3D viewer; imported MIT helper source lives in `tools/anatomy-3d/vendor/open-anatomy-atlas/`. Z-Anatomy mixes BY-SA and NC assets, so full archive is not approved. NIH 3D needs per-model license verification. Assets are not clinically validated solely by a license or successful download.

Do not place virtual patient assets here. They belong to `tools/patient-simulator/resources/`.
