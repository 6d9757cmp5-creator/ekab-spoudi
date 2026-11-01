# ATLA Anatomy Lab — licensed model resource intake

Catalog: `catalog.json` (54 HRA GLB objects, all 54 verified imported pinned to exact upstream Git SHA). Importer: `scripts/import-approved-3d-assets.mjs` verifies source blob hash, GLB schema, SHA-256 and stores the models in regional subfolders.

Only HRA/HuBMAP CC BY 4.0 objects are marked approved for direct import. Original attribution: HuBMAP CCF 3D Reference Object Library, Browne et al. (2022). BodyParts3D (official 2025 CC BY 4.0) is currently already referenced in the 3D viewer; imported MIT helper source lives in `tools/anatomy-3d/vendor/open-anatomy-atlas/`. Z-Anatomy mixes BY-SA and NC assets, so full archive is not approved. NIH 3D needs per-model license verification. Assets are not clinically validated solely by a license or successful download.

Do not place virtual patient assets here. They belong to `tools/patient-simulator/resources/`.

## Verified current inventory

- 54 HRA GLBs divided by anatomy system/region (CC BY 4.0; SHA256 recorded).
- 5 Z-Anatomy GLBs isolated in NC-SA research module, with all original notices.
- BodyParts3D 4.0 official atlas: 1259 meshes and 2017 named structures, full source plus compact index and binary.
- BodyParts3D 4.3 high-res: 3210 meshes and 3954 named structures; persistent compiled data in `bp3d43/compiled-shards/` (manifest + four binary shards); original upstream 65 raw batches archived in GitHub Actions.
- Open Anatomy Atlas original MIT 3D viewer, converter, and tests in `../vendor/open-anatomy-atlas/` (36 files).

See `docs/ATLA_3D_ASSET_INTAKE_VERIFIED.md` for exact file paths, provenance and the distinction between imported research assets and clinically validated/live UI features.
