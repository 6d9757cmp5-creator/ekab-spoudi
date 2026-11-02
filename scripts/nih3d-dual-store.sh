#!/usr/bin/env bash
# Upload one completed NIH3D shard to TWO independent S3-compatible buckets.
# Do not mark durable until both HEAD metadata and lengths match local bytes.
set -Eeuo pipefail
shopt -s nullglob
: "${NIH3D_SHARD_DIR:?set directory with RESULT.json and tar.zst parts}"
: "${ATLA_R2_BUCKET:?}" "${ATLA_R2_ENDPOINT:?}" "${ATLA_R2_ACCESS_KEY_ID:?}" "${ATLA_R2_SECRET_ACCESS_KEY:?}"
: "${ATLA_B2_BUCKET:?}" "${ATLA_B2_ENDPOINT:?}" "${ATLA_B2_REGION:?}" "${ATLA_B2_ACCESS_KEY_ID:?}" "${ATLA_B2_SECRET_ACCESS_KEY:?}"
command -v aws >/dev/null
command -v sha256sum >/dev/null
prefix="ATLA-Master-Plan-2026/NIH3D"
files=("$NIH3D_SHARD_DIR"/*.tar.zst* "$NIH3D_SHARD_DIR"/*-RESULT.json)
(("${#files[@]}" > 1)) || { echo "Missing archive parts or RESULT.json" >&2; exit 1; }
for f in "${files[@]}"; do
  [[ -s "$f" ]] || exit 1
done
upload_verify() {
  local provider="$1" bucket="$2" endpoint="$3" region="$4" access="$5" secret="$6"
  local f name sha size got_sha got_size
  export AWS_ACCESS_KEY_ID="$access" AWS_SECRET_ACCESS_KEY="$secret" AWS_DEFAULT_REGION="$region"
  for f in "${files[@]}"; do
    name="${f##*/}"
    sha="$(sha256sum "$f" | cut -d' ' -f1)"
    size="$(stat -c%s "$f")"
    aws --endpoint-url "$endpoint" s3api put-object --bucket "$bucket" --key "$prefix/$name" --body "$f" --metadata "sha256=$sha" >/dev/null
    got_sha="$(aws --endpoint-url "$endpoint" s3api head-object --bucket "$bucket" --key "$prefix/$name" --query 'Metadata.sha256' --output text)"
    got_size="$(aws --endpoint-url "$endpoint" s3api head-object --bucket "$bucket" --key "$prefix/$name" --query 'ContentLength' --output text)"
    [[ "$got_sha" == "$sha" && "$got_size" == "$size" ]] || { echo "Remote metadata/size mismatch: $provider $name" >&2; return 1; }
    echo "Verified remote HEAD metadata/size: $provider $name ($size bytes)"
  done
}
upload_verify R2 "$ATLA_R2_BUCKET" "$ATLA_R2_ENDPOINT" auto "$ATLA_R2_ACCESS_KEY_ID" "$ATLA_R2_SECRET_ACCESS_KEY"
upload_verify B2 "$ATLA_B2_BUCKET" "$ATLA_B2_ENDPOINT" "$ATLA_B2_REGION" "$ATLA_B2_ACCESS_KEY_ID" "$ATLA_B2_SECRET_ACCESS_KEY"
echo "Both providers have matching size and recorded SHA-256 metadata; full read-back SHA-256 is STILL REQUIRED before final certification."
