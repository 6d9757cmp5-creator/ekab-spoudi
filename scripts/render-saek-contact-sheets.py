#!/usr/bin/env python3
"""Render contact sheets for inspection. Automated rendering != scientific approval."""
import io
import json
import re
import sys
from collections import Counter, defaultdict
from pathlib import Path
import xml.etree.ElementTree as ET

import cairosvg
from PIL import Image, ImageDraw, ImageFont

data = json.loads(Path("saek-image-audit-2026.json").read_text(encoding="utf-8"))
output = Path("image-contact-sheets")
output.mkdir(exist_ok=True)
semester = {key: c["semester"] for c in data["courses"]
            for ch in c["chapters"] for key in ch.get("images", [])}
cards = defaultdict(list)
records = []
errors = []
try:
    label_font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 13)
except OSError:
    label_font = ImageFont.load_default()
for key, item in sorted(data["assets"].items()):
    local = item.get("localPath")
    group = semester.get(key, "OTHER")
    card = Image.new("RGB", (400, 285), "white")
    painter = ImageDraw.Draw(card)
    painter.text((9, 6), key[:48], font=label_font, fill="#111827")
    entry = {"asset": key, "semester": group, "rendered": False,
             "external_unverified": not bool(local), "text_candidates": [],
             "clinical_review": item.get("clinicalReview", "not-stated")}
    if local:
        try:
            path = Path(local)
            source = path.read_bytes()
            if source.startswith(b"\x89PNG\r\n\x1a\n"):
                raster = source
            else:
                root = ET.fromstring(source)
                strings = [" ".join("".join(e.itertext()).split())
                           for e in root.iter()
                           if e.tag == "{http://www.w3.org/2000/svg}text"]
                entry["text_candidates"] = [s for s in strings if len(s) > 82 or
                    re.search("δεν αποτελεί|εκπαιδευτική απεικόνιση|συμβουλεύσου", s, re.I)]
                raster = cairosvg.svg2png(bytestring=source, output_width=380)
            with Image.open(io.BytesIO(raster)) as rendered:
                rendered.thumbnail((382, 225))
                converted = rendered.convert("RGBA")
                card.paste(converted, ((400-converted.width)//2, 30), converted)
            entry["rendered"] = True
        except Exception as ex:
            errors.append({"asset": key, "error": str(ex)})
            painter.text((10, 130), "RENDER ERROR", font=label_font, fill="#b91c1c")
    else:
        painter.text((10, 130), "EXTERNAL / NOT VERIFIED", font=label_font, fill="#a16207")
    painter.text((9, 267),
                 "TEXT REVIEW" if entry["text_candidates"] else
                 "RENDERED" if entry["rendered"] else "REVIEW REQUIRED",
                 font=label_font, fill="#92400e" if entry["text_candidates"] else "#166534")
    cards[group].append(card)
    records.append(entry)
pages = []
for group, group_cards in sorted(cards.items()):
    for start in range(0, len(group_cards), 20):
        page = Image.new("RGB", (2000, 1140), "#e5e7eb")
        for n, card in enumerate(group_cards[start:start+20]):
            page.paste(card, ((n%5)*400, (n//5)*285))
        name = f"{group}-sheet-{start//20+1:02d}.jpg"
        page.save(output/name, "JPEG", quality=82, optimize=True)
        pages.append(name)
report = {"total": len(records), "rendered_local": sum(r["rendered"] for r in records),
          "external_not_verified": sum(r["external_unverified"] for r in records),
          "possible_text_overlays": sum(bool(r["text_candidates"]) for r in records),
          "clinical_review": dict(Counter(r["clinical_review"] for r in records)),
          "render_errors": errors, "sheets": pages, "records": records,
          "scope": "render and overlay-triage only; not visual or medical certification"}
(output/"review-report.json").write_text(json.dumps(report, ensure_ascii=False, indent=2),
                                         encoding="utf-8")
print("Image contact sheets:", len(pages), "; entries:", len(records),
      "; rendered:", report["rendered_local"], "; external:", report["external_not_verified"],
      "; errors:", len(errors), "; text candidates:", report["possible_text_overlays"])
sys.exit(1 if errors or len(records) != 649 else 0)
