#!/usr/bin/env python3
"""Fail-closed *educational source-evidence* registry validation.

A structured declaration is NOT clinical certification, proof of source content,
or operational authorization. Never invent professional approvals.
"""
from __future__ import annotations
import json
import re
from pathlib import Path
from datetime import date
from urllib.parse import urlparse
import sys

ROOT=Path(__file__).resolve().parents[1]
REQUIRED=(
    "lesson","source_url","source_section","source_date","reviewed_at",
    "evidence","content_sha256","source_capture_sha256",
    "second_ai_review","second_review_evidence_url",
    "educational_scope","greek_scope_status"
)
HEX64=re.compile(r"^[a-f0-9]{64}$")
VALID_STATES={"pending","rejected","needs-revision","source-checked-educational"}
def https(v):
    if not isinstance(v,str):return False
    p=urlparse(v)
    return p.scheme=="https" and bool(p.netloc) and not p.username and not p.password

def valid_date(v):
    try:
        return isinstance(v,str) and date.fromisoformat(v)==date.fromisoformat(v[:10])
    except (ValueError,TypeError):return False

def validate(data):
    errors=[]
    if not isinstance(data,dict) or data.get("schemaVersion")!=1 or not isinstance(data.get("items"),dict):
        return ["invalid registry schema"]
    for key,item in data["items"].items():
        if not isinstance(item,dict):
            errors.append(f"{key}: invalid entry")
            continue
        state=item.get("status")
        if state not in VALID_STATES:
            errors.append(f"{key}: unsupported status; no clinical certification via educational registry")
            continue
        if state!="source-checked-educational":continue
        missing=[k for k in REQUIRED if not isinstance(item.get(k),str) or not item[k].strip()]
        if missing:errors.append(f"{key}: source-checked entry missing {', '.join(missing)}")
        for k in ("source_url","second_review_evidence_url"):
            if not https(item.get(k)):errors.append(f"{key}: invalid {k} HTTPS URL")
        for k in ("source_date","reviewed_at"):
            if not valid_date(item.get(k)):errors.append(f"{key}: invalid {k}")
        for k in ("content_sha256","source_capture_sha256"):
            if not HEX64.fullmatch(str(item.get(k,""))):errors.append(f"{key}: invalid {k}")
        if item.get("second_ai_review")!="passed":
            errors.append(f"{key}: independent second source review did not pass")
        if item.get("educational_scope")!="educational-only":
            errors.append(f"{key}: content may not be declared operational or clinically certified")
        if item.get("greek_scope_status") not in ("law-crosschecked","not-operational"):
            errors.append(f"{key}: Greek scope not safely declared")
        if item.get("greek_scope_status")=="not-operational" and len(str(item.get("scope_notice","")).strip())<25:
            errors.append(f"{key}: missing visible non-operational limitation")
        if item.get("clinical_use_approved") is not False:
            errors.append(f"{key}: no automatic clinical-use authority")
        if item.get("current_sop_verified") is True and not https(item.get("sop_original_url")):
            errors.append(f"{key}: SOP cannot be marked verified without original")
        if len(str(item.get("evidence","")).strip())<40:
            errors.append(f"{key}: insufficient concrete source excerpt/claim evidence")
    return errors

def main():
    path=ROOT/"clinical-review.json"
    data=json.loads(path.read_text(encoding="utf-8"))
    errors=validate(data)
    for err in errors:print("FAIL:",err)
    if errors:return 1
    print(f"PASS: educational evidence registry schema ({len(data.get('items',{}))} entries)")
    print("NOT CERTIFIED: source accuracy, clinical authorization and final deployment require separate verification")
    return 0

if __name__=="__main__":sys.exit(main())
