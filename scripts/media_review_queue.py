#!/usr/bin/env python3
"""Build an inspectable pending media review queue. Never auto-approve publication."""
import hashlib
import json
import os
import pathlib
import subprocess
import sys
from collections import Counter

ROOT = pathlib.Path(__file__).resolve().parents[1]
EXT = {".svg", ".png", ".jpg", ".jpeg", ".webp", ".gif", ".avif", ".mp4",
       ".mov", ".webm", ".m4v", ".mp3", ".wav", ".ogg", ".m4a", ".pdf",
       ".doc", ".docx", ".ppt", ".pptx", ".xls", ".xlsx"}
OUT = ROOT / "media-review-queue.json"


def main():
    base = os.environ.get("MEDIA_GATE_BASE", "")
    if not base:
        print("ERROR: MEDIA_GATE_BASE missing; cannot create reliable queue", file=sys.stderr)
        return 2
    changed = subprocess.check_output(
        ["git", "diff", "--name-only", "--diff-filter=ACMR", base, "HEAD"],
        text=True, cwd=ROOT,
    ).splitlines()
    media = sorted(p for p in changed if pathlib.PurePosixPath(p).suffix.lower() in EXT)
    source = json.loads((ROOT / "saek-image-audit-2026.json").read_text(encoding="utf-8"))
    review = json.loads((ROOT / "media-review.json").read_text(encoding="utf-8"))
    by_path = {}
    duplicate_paths = set()
    for asset_id, asset in source["assets"].items():
        path = asset.get("localPath")
        if not path:
            continue
        if path in by_path:
            duplicate_paths.add(path)
        by_path[path] = (asset_id, asset)

    rows = []
    for rel in media:
        file_path = ROOT / rel
        if not file_path.is_file() or file_path.is_symlink() or not file_path.resolve().is_relative_to(ROOT):
            rows.append({"path": rel, "status": "file-missing-or-unsafe"})
            continue
        raw = file_path.read_bytes()
        actual = hashlib.sha256(raw.replace(b"\r\n", b"\n") if file_path.suffix.lower() == ".svg" else raw).hexdigest()
        record = review.get("files", {}).get(rel, {})
        approved = record.get("status") == "approved-for-publication"
        item = {
            "path": rel,
            "sha256": actual,
            "publication_review_recorded": bool(record),
            "publication_status": record.get("status", "pending"),
            "approved_by_media_gate": approved,
        }
        if rel in by_path:
            asset_id, asset = by_path[rel]
            visual = asset.get("visualReview") or {}
            dated = isinstance(visual, dict) and bool(visual.get("date") and visual.get("scope"))
            item.update({
                "asset_id": asset_id,
                "registry_sha256_matches": actual == asset.get("sha256"),
                "visual_review_dated": dated,
                "visual_review_matches_current_sha256": bool(
                    dated and visual.get("sha256") == actual
                ),
                "clinical_review": asset.get("clinicalReview", "not-recorded"),
                "original_artwork": asset.get("originalArtwork") is True,
                "license": asset.get("license"),
                "provenance_page_recorded": bool(asset.get("page")),
                "duplicate_registry_path": rel in duplicate_paths,
            })
        else:
            item.update({
                "asset_id": None,
                "registry_sha256_matches": False,
                "visual_review_dated": False,
                "visual_review_matches_current_sha256": False,
                "clinical_review": "not-recorded",
                "original_artwork": False,
                "license": None,
                "provenance_page_recorded": False,
                "duplicate_registry_path": False,
            })
        rows.append(item)

    count = lambda key: sum(1 for r in rows if r.get(key) is True)
    summary = {
        "changed_media_files": len(media),
        "registered_educational_images": sum(bool(r.get("asset_id")) for r in rows),
        "registered_image_hashes_matching": count("registry_sha256_matches"),
        "visual_reviews_bound_to_current_hash": count("visual_review_matches_current_sha256"),
        "not_tracked_in_educational_registry": sum(not r.get("asset_id") for r in rows),
        "explicit_publication_approvals": count("approved_by_media_gate"),
        "clinical_review_states": dict(Counter(r.get("clinical_review") for r in rows)),
        "publication_review_pending": sum(r.get("publication_status") != "approved-for-publication" for r in rows),
    }
    OUT.write_text(json.dumps({
        "scope": "Evidence queue, not a publication authorization or clinical review",
        "summary": summary,
        "media": rows,
    }, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(summary, ensure_ascii=False, indent=2))
    print("Queue: media-review-queue.json; pending entries remain blocked by media_gate.py")
    return 0


if __name__ == "__main__":
    sys.exit(main())
