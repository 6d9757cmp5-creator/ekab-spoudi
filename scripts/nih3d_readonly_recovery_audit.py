#!/usr/bin/env python3
"""Read-only NIH3D historical rescue backlog inventory.

No model downloads, Release writes, deletions, or clinical approval.
Counts RESULT markers as completion *claims*, not independent byte verification.
"""
from datetime import datetime, timezone
import json
import os
from pathlib import Path
import re
import sys

import nih3d_stream_restore as recovery

def parse_expiry(value):
    try:
        return datetime.fromisoformat(value.replace('Z','+00:00'))
    except (TypeError, ValueError, AttributeError):
        return None

def audit(artifacts, legacy_names, release_markers, now=None):
    now = now or datetime.now(timezone.utc)
    by_start = {}
    for a in artifacts:
        match = recovery.NAME.fullmatch(str(a.get('name','')))
        if not match:
            continue
        start = int(match.group(1))
        try:
            base = recovery.prefix(start)
        except ValueError:
            continue
        by_start.setdefault(start, []).append(a)

    completed, expiring, expired, unknown = [], [], [], []
    for start, options in sorted(by_start.items()):
        base = recovery.prefix(start)
        if start in release_markers or base+'-RESULT.json' in legacy_names:
            completed.append(start)
            continue
        valid = [a for a in options
                 if not a.get('expired') and a.get('id')
                 and int(a.get('size_in_bytes',0))>0
                 and (parse_expiry(a.get('expires_at')) is None
                      or parse_expiry(a.get('expires_at'))>now)]
        if valid:
            valid.sort(key=lambda a:(a.get('expires_at') or '9999',-int(a['id'])))
            a=valid[0]
            expiring.append({
                'start': start,
                'end': start+99,
                'artifact_id': a['id'],
                'size_bytes': int(a['size_in_bytes']),
                'expires_at': a.get('expires_at') or None
            })
        elif any(a.get('expired') or (parse_expiry(a.get('expires_at'))
                      and parse_expiry(a.get('expires_at'))<=now) for a in options):
            expired.append(start)
        else:
            unknown.append(start)

    # Already-durable markers may no longer have an Actions artifact.
    saved = sorted(set(completed) | set(release_markers))
    first = min((x['expires_at'] for x in expiring if x['expires_at']), default=None)
    return {
        'schema': 'nih3d-historical-recovery-inventory-v1',
        'generated_at_utc': now.isoformat(),
        'status': 'INCOMPLETE' if expiring or expired or unknown else 'NO_OUTSTANDING_LISTED_ARTIFACTS',
        'limitations': [
            'RESULT marker presence does not independently verify every Release byte',
            'Missing canonical shards cannot be inferred from current Actions artifacts alone',
            'NIH model clinical or scientific approval is not assessed',
            'This inventory does not trigger any additional recovery workflow'
        ],
        'unique_canonical_artifact_starts_seen':len(by_start),
        'durable_result_marker_starts':len(saved),
        'durable_result_marker_ids':saved,
        'already_saved_artifact_starts_seen':len(completed),
        'recoverable_artifact_starts':len(expiring),
        'recoverable_bytes':sum(x['size_bytes'] for x in expiring),
        'earliest_recoverable_expiry_utc':first,
        'expired_without_result_marker_starts':expired,
        'unknown_state_starts':unknown,
        'recoverable':expiring
    }

def workflow_health(workflow, runs):
    """Check main-branch rescue orchestration without dispatching a second run."""
    candidates = [x for x in runs
                  if x.get('head_branch')=='main'
                  and x.get('event') in ('schedule','workflow_dispatch','push')]
    candidates.sort(key=lambda x: x.get('created_at') or '', reverse=True)
    latest = candidates[0] if candidates else None
    return {
        'workflow_state':workflow.get('state','UNKNOWN'),
        'recent_main_runs_seen':len(candidates),
        'latest_main_run': ({
            'id': latest.get('id'),
            'event': latest.get('event'),
            'status': latest.get('status'),
            'conclusion': latest.get('conclusion'),
            'created_at': latest.get('created_at'),
            'html_url':latest.get('html_url')
        } if latest else None)
    }

def main():
    legacy = recovery.current_legacy_names()
    saved = recovery.completed()
    artifacts = recovery.pages('/actions/artifacts','artifacts')
    snapshot = audit(artifacts,legacy,saved)
    workflow = recovery.api('/actions/workflows/recover-nih3d-large.yml')
    runs = recovery.api('/actions/workflows/recover-nih3d-large.yml/runs?per_page=12')
    snapshot['rescue_automation'] = workflow_health(workflow,runs.get('workflow_runs',[]))
    output = Path(os.environ.get('NIH3D_AUDIT_JSON','nih3d-recovery-inventory.json'))
    output.write_text(json.dumps(snapshot,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
    print('NIH3D_READ_ONLY_RECOVERY_AUDIT',json.dumps({
        'status':snapshot['status'],
        'unique_seen':snapshot['unique_canonical_artifact_starts_seen'],
        'durable_marker_count':snapshot['durable_result_marker_starts'],
        'eligible':snapshot['recoverable_artifact_starts'],
        'eligible_bytes':snapshot['recoverable_bytes'],
        'earliest_expiry':snapshot['earliest_recoverable_expiry_utc'],
        'expired_unpreserved':len(snapshot['expired_without_result_marker_starts']),
        'unknown':len(snapshot['unknown_state_starts']),
        'rescue_automation':snapshot['rescue_automation']},sort_keys=True))

if __name__=='__main__':
    main()
