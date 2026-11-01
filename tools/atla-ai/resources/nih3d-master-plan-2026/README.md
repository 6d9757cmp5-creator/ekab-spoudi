# ATLA Master Plan 2026 — NIH 3D resources

**Official source:** https://3d.nih.gov/discover  
**Licensing:** https://3d.nih.gov/terms

## Purpose

Source-linked registry for the full NIH 3D discovery catalog (current official search result count: 15,646 models on 2026-11-01). NIH numeric record IDs are sparse; the importer scans ID 1–25,000 and records only published, actually returned entries.

## Status

The initial full-range metadata scan was launched via [GitHub Actions](https://github.com/6d9757cmp5-creator/ekab-spoudi/actions/runs/41355252898). **Do not assume it has finished.** When finished, inspect `catalog-index.json` for real scanned coverage, errors and number of records. `PARTIAL` means the registry is incomplete.

## Storage and ownership

- `segments/` — source metadata per range, including title, original NIH model link, author, category, exact contributor-selected license, file formats and original download references.
- `catalog-index.json` — created by the aggregator from actual fetched shards; must not be invented.
- Clinical/anatomical review and 3D ingestion are separate.
- Models with unclear or restrictive licenses are **external references only**, not redistributed.
- Anatomy → Anatomy Lab resources; equipment/prosthetics → Clinical Cockpit research; remaining molecular/cellular material → ATLA AI knowledge resources.
- Existing imported NIH 3D assets remain in their corresponding independent tool directories; this catalog does not duplicate binaries or mix the viewer engines.

This does **not** imply the complete NIH 3D site, its 15,646 model binaries, or its clinical validity has been copied or approved.
