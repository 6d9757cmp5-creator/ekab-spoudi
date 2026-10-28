#!/usr/bin/env python3
"""Fail-closed validation of a structured clinical review registry."""
import json
from pathlib import Path
import sys

root=Path(__file__).resolve().parents[1]
data=json.loads((root/"clinical-review.json").read_text(encoding="utf-8"))
errors=[]
if data.get("schemaVersion")!=1 or not isinstance(data.get("items"),dict):
    errors.append("invalid registry schema")
for key,item in data.get("items",{}).items():
    if not isinstance(item,dict):
        errors.append(f"{key}: invalid entry");continue
    if item.get("status")=="approved-for-publication":
        required=("lesson","source_url","source_date","reviewed_at","human_reviewer","evidence","content_sha256","second_ai_review")
        missing=[k for k in required if not isinstance(item.get(k),str) or not item[k].strip()]
        if missing:errors.append(f"{key}: approved entry missing {', '.join(missing)}")
        if item.get("second_ai_review")!="passed":errors.append(f"{key}: independent AI check not passed")
        if len(str(item.get("content_sha256","")))!=64:errors.append(f"{key}: invalid SHA-256")
    elif item.get("status") not in ("pending","rejected","needs-revision"):
        errors.append(f"{key}: invalid status")
for err in errors:print("FAIL:",err)
if errors:sys.exit(1)
print(f"PASS: clinical review registry schema checked ({len(data.get('items',{}))} entries)")
print("NOT VERIFIED: reviewer identity, source content, actual clinical correctness")
