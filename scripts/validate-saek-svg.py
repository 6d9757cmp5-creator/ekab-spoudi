#!/usr/bin/env python3
"""Structural SVG and checksum audit; NOT a visual or clinical certification."""
import hashlib
import json
import re
import sys
import xml.etree.ElementTree as ET
from pathlib import Path

registry = json.loads(Path("saek-image-audit-2026.json").read_text(encoding="utf-8"))
errors = []
checked = 0
svg_ns = "{http://www.w3.org/2000/svg}"

for key, asset in registry.get("assets", {}).items():
    path_string = asset.get("localPath")
    if not path_string:
        continue
    checked += 1
    path = Path(path_string)
    if not path.is_file():
        errors.append(f"{key}: missing {path}")
        continue
    raw = path.read_bytes()
    # Git stores these text SVGs with LF; normalize Windows CRLF before checking the blob hash.
    canonical = raw.replace(bytes((13, 10)), bytes((10,)))
    if hashlib.sha256(canonical).hexdigest() != asset.get("sha256"):
        errors.append(f"{key}: SHA-256 mismatch")
    try:
        root = ET.fromstring(raw)
    except ET.ParseError as exc:
        errors.append(f"{key}: XML parse error: {exc}")
        continue
    if root.tag != svg_ns + "svg":
        errors.append(f"{key}: root is not SVG")
    if not root.get("viewBox") or root.get("role") != "img":
        errors.append(f"{key}: missing viewBox or role=img")
    ids = {el.get("id") for el in root.iter() if el.get("id")}
    labelled = root.get("aria-labelledby", "").split()
    if not labelled or any(label not in ids for label in labelled):
        errors.append(f"{key}: broken aria-labelledby")
    title = root.find(svg_ns + "title")
    desc = root.find(svg_ns + "desc")
    if title is None or not "".join(title.itertext()).strip():
        errors.append(f"{key}: missing SVG title")
    if desc is None or not "".join(desc.itertext()).strip():
        errors.append(f"{key}: missing SVG description")
    labels = " ".join("".join(el.itertext()) for el in root.iter() if el.tag == svg_ns + "text")
    if not re.search(r"[Α-Ωα-ωάέήίόύώϊϋΐΰ]", labels):
        errors.append(f"{key}: missing visible Greek text")
    for el in root.iter():
        if el.tag in (svg_ns + "script", svg_ns + "foreignObject"):
            errors.append(f"{key}: unsafe embedded element")
        for attr, value in el.attrib.items():
            if attr.lower().startswith("on"):
                errors.append(f"{key}: event handler {attr}")
            if attr.endswith("href") and (value.startswith(("http:", "https:", "//", "data:"))):
                errors.append(f"{key}: external or inline href")
            for ref in re.findall(r"url\(#([^)]*)\)", value):
                if ref not in ids:
                    errors.append(f"{key}: missing referenced id {ref}")

print(f"SVG structural audit: {checked} local assets, {len(errors)} errors")
for error in errors:
    print("ERROR:", error, file=sys.stderr)
sys.exit(1 if errors else 0)
