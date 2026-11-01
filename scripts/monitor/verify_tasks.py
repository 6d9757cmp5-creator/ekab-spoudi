#!/usr/bin/env python3
"""Fail-closed verification: never equate CI completion with task completion."""
import fnmatch
import hashlib
import json
import os
from pathlib import Path
import sys
import urllib.request
import urllib.error

ROOT = Path(__file__).resolve().parents[2]
MANIFEST = ROOT / "monitoring" / "verification-tasks.json"
API = "https://api.github.com"

def github(method, path, payload=None):
    token = os.getenv("GITHUB_TOKEN", "")
    if not token:
        raise RuntimeError("Missing GITHUB_TOKEN")
    body = json.dumps(payload).encode() if payload is not None else None
    request = urllib.request.Request(API + path, data=body, method=method, headers={
        "Authorization": f"Bearer {token}", "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28", "User-Agent": "atla-verification",
        "Content-Type": "application/json",
    })
    with urllib.request.urlopen(request, timeout=25) as res:
        return json.load(res)

def telegram(message):
    token = os.getenv("TELEGRAM_BOT_TOKEN")
    chat = os.getenv("TELEGRAM_CHAT_ID")
    if not token or not chat:
        raise RuntimeError("Telegram secrets missing; task not marked as notified")
    data = json.dumps({"chat_id": chat, "text": message}).encode()
    req = urllib.request.Request(f"https://api.telegram.org/bot{token}/sendMessage",
                                 data=data, headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=25) as res:
        response = json.load(res)
    if not response.get("ok"):
        raise RuntimeError("Telegram did not accept notification")

def verify(task):
    if task.get("status") != "ready_for_verification":
        return False, "not ready"
    expected = task.get("files")
    if not isinstance(expected, list) or not expected:
        return False, "no expected files"
    seen = set()
    for entry in expected:
        name, digest = entry.get("path"), entry.get("sha256")
        if not isinstance(name, str) or not isinstance(digest, str) or len(digest) != 64:
            return False, "invalid path or sha256"
        path = (ROOT / name).resolve()
        if not path.is_relative_to(ROOT.resolve()) or not path.is_file() or path.is_symlink():
            return False, f"missing/unsafe file: {name}"
        if name in seen:
            return False, "duplicate file"
        seen.add(name)
        if hashlib.sha256(path.read_bytes()).hexdigest() != digest.lower():
            return False, f"hash mismatch: {name}"
    # An exact file inventory prevents extra/unaccounted files passing unnoticed.
    inventory = task.get("inventory")
    if not isinstance(inventory, dict) or not isinstance(inventory.get("glob"), str) or not isinstance(inventory.get("expected_count"), int):
        return False, "exact inventory required"
    pattern = inventory["glob"]
    if pattern.startswith("/") or ".." in Path(pattern).parts:
        return False, "unsafe inventory pattern"
    actual = {p.relative_to(ROOT).as_posix() for p in ROOT.glob(pattern) if p.is_file()}
    if len(actual) != inventory["expected_count"] or actual != seen:
        return False, f"inventory mismatch: expected {inventory['expected_count']}, got {len(actual)}"
    return True, "all exact files and hashes verified"

def main():
    repo = os.environ["GITHUB_REPOSITORY"]
    tasks = json.loads(MANIFEST.read_text(encoding="utf-8"))["tasks"]
    ids = [t.get("id") for t in tasks]
    if len(ids) != len(set(ids)):
        raise RuntimeError("Duplicate task IDs")
    for task in tasks:
        task_id = task["id"]
        if not task_id or not all(c.isalnum() or c in "-_" for c in task_id):
            raise RuntimeError("Invalid task ID")
        ok, reason = verify(task)
        print(f"{task_id}: {'VERIFIED' if ok else 'PENDING'}: {reason}")
        if not ok:
            continue
        title = f"[ATLA VERIFIED] {task_id}"
        query = urllib.parse.quote(f'repo:{repo} in:title "{title}"')
        existing = github("GET", f"/search/issues?q={query}&per_page=30")
        if any(i.get("title") == title for i in existing.get("items", [])):
            print("Already notified; skipping")
            continue
        telegram(f"✅ ATLA — ΕΠΑΛΗΘΕΥΤΗΚΕ ΠΛΗΡΩΣ\nΕργασία: {task_id}\nΈλεγχος: {reason}\nRepo: {repo}")
        github("POST", f"/repos/{repo}/issues", {"title": title, "body": f"Verification passed for task `{task_id}`. Exact file inventory and SHA-256 hashes matched. Telegram delivery was accepted. This confirms ONLY the declared evidence, not unrelated project work."})
        print("Telegram accepted and audit issue created")

if __name__ == "__main__":
    import urllib.parse
    main()
