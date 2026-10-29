#!/usr/bin/env python3
"""Verify every SAEK image byte hash and independently classify dated visual-review evidence.

A matching file SHA-256 establishes file integrity, NOT that someone visually
reviewed that exact version. Never populate visualReview.sha256 from an
unbound historic note or change clinicalReview here.
"""
import hashlib
import json
import re
import sys
from pathlib import Path, PurePosixPath

ROOT = Path(__file__).resolve().parents[1]
REGISTRY = ROOT / "saek-image-audit-2026.json"
OUTPUT = ROOT / "saek-sha-visual-evidence-report.json"
HEX64 = re.compile(r"^[0-9a-f]{64}$")


def main():
    source = json.loads(REGISTRY.read_text(encoding="utf-8"))
    assets = source.get("assets")
    errors = []
    entries = {}
    seen_paths = {}
    if not isinstance(assets, dict) or not assets:
        errors.append("Registry must contain assets")
        assets = assets if isinstance(assets, dict) else {}

    for asset_id, asset in sorted(assets.items()):
        if not isinstance(asset, dict):
            errors.append(f"{asset_id}: invalid asset object")
            continue
        name = asset.get("localPath")
        expected = asset.get("sha256")
        path = PurePosixPath(name) if isinstance(name, str) else None
        if not path or path.is_absolute() or ".." in path.parts or not str(path).startswith("assets/education/"):
            errors.append(f"{asset_id}: missing/unsafe local asset path")
            continue
        if name in seen_paths:
            errors.append(f"{asset_id}: duplicate path also used by {seen_paths[name]}")
        seen_paths[name] = asset_id
        if not isinstance(expected, str) or not HEX64.fullmatch(expected):
            errors.append(f"{asset_id}: missing/invalid recorded SHA-256")
            continue
        file_path = ROOT.joinpath(*path.parts)
        if not file_path.is_file() or file_path.is_symlink() or not file_path.resolve().is_relative_to(ROOT):
            errors.append(f"{asset_id}: local file missing or unsafe")
            continue
        raw = file_path.read_bytes()
        # Existing SVG validator normalizes CRLF (Git LF checkout is canonical).
        canonical = raw.replace(b"\r\n", b"\n") if file_path.suffix.lower() == ".svg" else raw
        actual = hashlib.sha256(canonical).hexdigest()
        file_matches = actual == expected
        if not file_matches:
            errors.append(f"{asset_id}: current file does not match manifest SHA-256")
        review = asset.get("visualReview")
        dated_review = (
            isinstance(review, dict)
            and isinstance(review.get("date"), str)
            and isinstance(review.get("scope"), str)
            and bool(review["scope"].strip())
        )
        review_sha = review.get("sha256") if isinstance(review, dict) else None
        if review_sha is not None and (not isinstance(review_sha, str) or not HEX64.fullmatch(review_sha)):
            errors.append(f"{asset_id}: malformed visualReview.sha256")
        if review_sha and review_sha != expected:
            errors.append(f"{asset_id}: visual-review evidence belongs to a different image SHA-256")
        # An explicit matching review hash plus dated/specific scope is necessary;
        # this does not independently authenticate the reviewer's actual observation.
        linked = bool(file_matches and dated_review and review_sha == actual)
        state = "linked-to-current-hash" if linked else (
            "dated-unbound" if dated_review and not review_sha else
            "stale-review-hash" if review_sha else "no-dated-visual-review"
        )
        entries[asset_id] = {
            "path": name,
            "manifest_sha256": expected,
            "current_file_sha256": actual,
            "file_hash_matches": file_matches,
            "visual_review_evidence": state,
            "visual_review_date": review.get("date") if dated_review else None,
        }

    count = lambda pred: sum(1 for item in entries.values() if pred(item))
    summary = {
        "expected_images": len(assets),
        "registry_images": len(assets),
        "files_inspected": len(entries),
        "file_hashes_matching": count(lambda r: r["file_hash_matches"]),
        "file_hashes_mismatching": count(lambda r: not r["file_hash_matches"]),
        "dated_visual_reviews_linked_to_current_sha256": count(
            lambda r: r["visual_review_evidence"] == "linked-to-current-hash"
        ),
        "dated_visual_reviews_not_sha_bound": count(
            lambda r: r["visual_review_evidence"] == "dated-unbound"
        ),
        "stale_visual_review_hashes": count(
            lambda r: r["visual_review_evidence"] == "stale-review-hash"
        ),
        "missing_dated_visual_review_evidence": count(
            lambda r: r["visual_review_evidence"] == "no-dated-visual-review"
        ),
        "errors": len(errors),
    }
    report = {
        "scope": "Current-image byte integrity and registry evidence only; NOT fresh individual visual, anatomy, clinical, rights or live-app certification",
        "summary": summary,
        "errors": errors,
        "assets": entries,
    }
    OUTPUT.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(summary, ensure_ascii=False, indent=2))
    for error in errors:
        print("ERROR:", error, file=sys.stderr)
    return 1 if errors or len(entries) != len(assets) else 0


if __name__ == "__main__":
    sys.exit(main())
