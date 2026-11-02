# NIH3D R2 + B2 durable storage staging

Status: **staging only; not deployed, not verified for production**.

This branch adds `scripts/nih3d-dual-store.sh` and a manual syntax-check workflow. It does not modify the active 250-shard importer and does not pretend to migrate existing GitHub Release or expiring Actions artifact data.

Required GitHub Actions secrets (set through repository Settings, never in chat): `ATLA_R2_BUCKET`, `ATLA_R2_ENDPOINT`, `ATLA_R2_ACCESS_KEY_ID`, `ATLA_R2_SECRET_ACCESS_KEY`, `ATLA_B2_BUCKET`, `ATLA_B2_ENDPOINT`, `ATLA_B2_REGION`, `ATLA_B2_ACCESS_KEY_ID`, `ATLA_B2_SECRET_ACCESS_KEY`.

Use private buckets, least-privilege scoped credentials, object versioning, B2 Object Lock retention, and cost/budget alerts. Confirm NIH license eligibility per source. For actual transfers, feed completed shard directories from a durable job or verified download, not from a vanished GitHub-hosted runner.

Uploader checks local non-empty files, calculates SHA-256, uploads to R2 and B2, then checks remote object length and stored SHA metadata. **HEAD metadata is not a full content read-back.** Production acceptance must additionally download/re-hash each object from both stores, check every split part and RESULT.json, compare the live NIH inventory and license/format coverage, and ensure 250 canonical shards with no missing or failed downloads. Add resume/idempotency, multipart strategy, cost quotas, inventory reports, and failure alerts before enabling bulk transfer.

Do not announce successful permanent transfer until all these conditions are independently verified.
