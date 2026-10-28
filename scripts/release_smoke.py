#!/usr/bin/env python3
"""Dependency-free release smoke checks; does not claim clinical validation."""
import json
from pathlib import Path
import re
import sys

ROOT = Path(__file__).resolve().parents[1]
REQUIRED = ["index.html", "theory.html", "eoppep.html", "saek-course-01.html",
            "saek-course-02.html", "saek-course-03.html", "saek-course-04.html",
            "manifest.webmanifest", "sw.js", "AGENTS.md",
            "docs/QUALITY-RULES-2026-10-28.md"]
errors = []
for name in REQUIRED:
    path = ROOT / name
    if not path.is_file() or not path.stat().st_size:
        errors.append(f"missing/empty required file: {name}")
for name in ["index.html", "theory.html", "eoppep.html"] + [f"saek-course-{n:02}.html" for n in range(1, 5)]:
    path = ROOT / name
    if not path.is_file():
        continue
    content = path.read_text(encoding="utf-8")
    if not re.search(r'<html[^>]*lang=["\']el["\']', content, re.I):
        errors.append(f"{name}: missing Greek html lang")
    if not re.search(r'<meta[^>]+charset\s*=\s*["\']?utf-8', content, re.I):
        errors.append(f"{name}: missing UTF-8 declaration")
try:
    manifest = json.loads((ROOT / "manifest.webmanifest").read_text(encoding="utf-8"))
    if not manifest.get("name") or not manifest.get("start_url"):
        errors.append("manifest: missing name/start_url")
except (OSError, ValueError) as exc:
    errors.append(f"invalid web manifest: {exc}")
try:
    review = json.loads((ROOT / "media-review.json").read_text(encoding="utf-8"))
    if not isinstance(review.get("files"), dict):
        errors.append("media-review.json: files must be an object")
except (OSError, ValueError) as exc:
    errors.append(f"invalid media review registry: {exc}")
for error in errors:
    print("FAIL:", error)
if errors:
    sys.exit(1)
print(f"PASS: {len(REQUIRED)} required files, 7 Greek HTML pages, web manifest and media registry checked")
print("NOT TESTED: clinical accuracy, accessibility interaction, user privacy on Appwrite, live devices")
