#!/usr/bin/env python3
"""Verify SHA-pinned anatomy sources from the real CDN before merge.
Scientific review and visual browser QA are separate gates."""
import gzip
import json
import re
import struct
import urllib.request
from pathlib import Path
from urllib.parse import urlparse

text = Path(__file__).with_name("hires-anatomy.js").read_text()
roots = re.findall(r"root:'(https://cdn\.jsdelivr\.net/gh/[^']+/public/models/)'", text)
expected = re.findall(r"expectedParts:(\d+)", text)
assert len(roots) == 2 and expected == ["2234", "3004"], (roots, expected)

def fetch(url):
    req = urllib.request.Request(url, headers={"User-Agent": "ekab-spoudi-anatomy-source-integrity/1.0"})
    with urllib.request.urlopen(req, timeout=40) as resp:
        assert resp.status == 200, (url, resp.status)
        return resp.read()

for body, root, count in zip(("male", "female"), roots, map(int, expected)):
    assert urlparse(root).hostname == "cdn.jsdelivr.net"
    obj = json.loads(fetch(root + "atlas.json"))
    parts = obj["parts"]
    chunks = obj["chunks"]
    assert len(parts) == count, (body, len(parts), count)
    assert len(set(p["id"] for p in parts)) == count
    assert len(chunks) >= 10
    for p in parts:
        assert p["chunk"] < len(chunks)
        assert p["vertexCount"] > 0 and p["indexCount"] >= 3
        assert p["positions"] >= 0 and p["normals"] >= 0 and p["indices"] >= 0
        assert p["system"] and p["name"] and p["id"]
    sample = chunks[0]
    name = sample.get("gzip", sample["url"] + ".gz").split("/")[-1]
    assert name.endswith(".bin.gz") and "/" not in name
    data = fetch(root + name)
    raw = gzip.decompress(data) if data[:2] == b"\x1f\x8b" else data
    assert len(raw) == sample["bytes"], (body, len(raw), sample["bytes"])
    sample_parts = [p for p in parts if p["chunk"] == 0]
    assert sample_parts
    for p in sample_parts:
        assert p["positions"] + p["vertexCount"] * 12 <= len(raw)
        assert p["normals"] + p["vertexCount"] * 6 <= len(raw)
        assert p["indices"] + p["indexCount"] * 4 <= len(raw)
        idx = struct.unpack_from("<I", raw, p["indices"])[0]
        assert idx < p["vertexCount"]
    systems = set(p["system"] for p in parts)
    assert {"skeletal", "reproductive", "digestive", "respiratory"} <= systems
    print(f"PASS {body}: {count} unique structures, {len(systems)} systems, {len(chunks)} valid chunk references, CDN gzip sample checked")
print("PASS SHA-pinned asset transport and binary layout (does not verify morphology).")
