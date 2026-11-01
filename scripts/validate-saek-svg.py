#!/usr/bin/env python3
"""Structural SVG and checksum audit; NOT a visual or clinical certification."""
import base64
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
    if path.suffix.lower() == ".png":
        if len(raw) < 24 or raw[:8] != bytes((137, 80, 78, 71, 13, 10, 26, 10)) or raw[12:16] != b"IHDR":
            errors.append(f"{key}: invalid PNG signature or header")
        elif int.from_bytes(raw[16:20], "big") < 1 or int.from_bytes(raw[20:24], "big") < 1:
            errors.append(f"{key}: invalid PNG dimensions")
        if hashlib.sha256(raw).hexdigest() != asset.get("sha256"):
            errors.append(f"{key}: SHA-256 mismatch")
        continue
    if path.suffix.lower() in (".jpg", ".jpeg"):
        if len(raw) < 4 or raw[:3] != bytes((255, 216, 255)) or raw[-2:] != bytes((255, 217)):
            errors.append(f"{key}: invalid JPEG signature or end marker")
        if hashlib.sha256(raw).hexdigest() != asset.get("sha256"):
            errors.append(f"{key}: SHA-256 mismatch")
        continue
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
        # Embedded CSS can fetch remote resources even when SVG attributes look safe.
        if el.tag == svg_ns + "style":
            css = "".join(el.itertext())
            if re.search(r"@import\b", css, re.I):
                errors.append(f"{key}: CSS import in SVG")
            for raw_ref in re.findall(r"url\(\s*([^)]+?)\s*\)", css, re.I):
                ref = raw_ref.strip().strip("\"'")
                if not ref.startswith("#") or ref[1:] not in ids:
                    errors.append(f"{key}: unsafe or missing CSS url reference")
        for attr, value in el.attrib.items():
            if attr.lower().startswith("on"):
                errors.append(f"{key}: event handler {attr}")
            if attr.endswith("href"):
                href = value.strip()
                if href.startswith("data:"):
                    prefix = "data:image/png;base64,"
                    try:
                        payload = "".join(href[len(prefix):].split())
                        embedded = base64.b64decode(payload, validate=True) if href.startswith(prefix) and el.tag == svg_ns + "image" else b""
                    except (ValueError, base64.binascii.Error):
                        embedded = b""
                    if not embedded.startswith(bytes((137, 80, 78, 71, 13, 10, 26, 10))):
                        errors.append(f"{key}: invalid embedded PNG")
                elif href.startswith("#"):
                    if href[1:] not in ids:
                        errors.append(f"{key}: missing local href id {href}")
                else:
                    errors.append(f"{key}: disallowed non-local href {href[:60]}")
            for raw_ref in re.findall(r"url\(\s*([^)]+?)\s*\)", value, re.I):
                ref = raw_ref.strip().strip("\"'")
                if not ref.startswith("#") or ref[1:] not in ids:
                    errors.append(f"{key}: unsafe or missing url() reference")

print(f"Local image structural audit: {checked} local assets, {len(errors)} errors")
for error in errors:
    print("ERROR:", error, file=sys.stderr)
sys.exit(1 if errors else 0)
