# ATLA Master Plan 2026 — Permanent NIH 3D storage (no rights bypass)

## Confirmed GitHub limitations

The first lossless NIH 3D pilot archived 113 original geometry files for source IDs 160–175 into three tar.zst archives, retaining SHA-256/source metadata. GitHub Actions run **41357774397** succeeded and created artifact `atla-nih3d-originals-160-175`, containing approximately **2.48 GB** of archived data. The artifact is **temporary** (expiration 2026-12-01), not a permanent ATLA resource library.

Attempts to create a GitHub Release returned HTTP **403** (`Resource not accessible by integration`). A GitHub Container Registry write probe returned `denied`. These are **GitHub storage authorization restrictions**, unrelated to any NIH content permission asserted by the project owner. No bypass is attempted.

## Durable storage implementation

The canonical GitHub Actions importer `.github/workflows/atla-nih3d-model-archive.yml` supports **S3-compatible object storage** (AWS S3 or a configured compatible bucket such as Cloudflare R2, Backblaze B2 S3). It uploads original model archives as **losslessly compressed tar.zst** and their per-range `RESULT.json` evidence, verifies remote ContentLength and SHA-256 object metadata, and keeps source-level checksums and attribution.

The pipeline explicitly blocks the 250-shard production import unless a **writable durable storage destination** is configured. This prevents an expensive temporary-only import with no safe permanent storage.

### Owner setup in repository settings

In GitHub repository **Settings → Secrets and variables → Actions**, configure these GitHub Actions **repository secrets**, not chat messages:

- `ATLA_S3_BUCKET`: dedicated ATLA binary resource bucket name.
- `ATLA_S3_ACCESS_KEY_ID`: scoped upload credential.
- `ATLA_S3_SECRET_ACCESS_KEY`: corresponding secret credential.
- `ATLA_S3_REGION`: bucket region (for most R2 S3 endpoints, `auto`; for AWS, actual region).
- `ATLA_S3_ENDPOINT`: HTTPS endpoint for S3-compatible services; may be empty for ordinary AWS S3.

Required minimum service-side capabilities: list/head bucket and put/head objects for the `ATLA-Master-Plan-2026/NIH3D/` prefix; disable public write and use restrictive credentials. Allow enough storage and data-transfer budget for the actual total size, which **is not yet known**. Note that cloud object storage may incur fees.

**Do not paste secrets into chat or source code.** Once configured, run the repository NIH archive workflow through Actions, or allow the catalog completion trigger to start it. Do not claim full transfer without actual object-store inventory and verified manifests.

## Compression and scientific safeguards

- `tar.zst` is lossless: original GLB/STL/OBJ/other NIH output bytes are preserved after extraction.
- Oversized packs are divided into smaller pieces without loss; reassemble in name order before unpacking.
- Original source URL, creator, license string, format, SHA-256, model ID and failure records are kept.
- Source model rights, visual/anatomical accuracy, and live activation remain separate review gates.
- User's claimed source permission is respected as their assertion; this document does not represent independent confirmation of a blanket NIH re-distribution license.

## State

- NIH metadata catalogue: scan started; full index not yet verified.
- Small binary pilot: downloaded, compressed and saved as temporary GitHub Actions artifact (verified GitHub run).
- Production binary ingest: implemented, **blocked until durable storage is connected**.
- Complete 15k+ NIH source-model transfer: **NOT VERIFIED**.

Sources:
- [Pilot Actions run](https://github.com/6d9757cmp5-creator/ekab-spoudi/actions/runs/41357774397)
- [Master catalog scan](https://github.com/6d9757cmp5-creator/ekab-spoudi/actions/runs/41355252898)
- [NIH 3D discovery](https://3d.nih.gov/discover)
