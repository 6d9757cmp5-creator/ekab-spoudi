#!/usr/bin/env python3
"""Independent anonymous restore proof for durable NIH3D archive packages.

Downloads each package without credentials, decompresses it as a stream and hashes every
contained file against its RESULT.json. Read-only towards Releases; writes one report file.
An upload that merely reports success is never counted as verified here.
"""
import argparse
import copy
import hashlib
import json
import os
from pathlib import Path, PurePosixPath
import re
import subprocess
import tarfile
import threading
import time
from urllib.request import Request, urlopen

REPO = os.environ.get('GITHUB_REPOSITORY', '6d9757cmp5-creator/ekab-spoudi')
API = 'https://api.github.com/repos/' + REPO
REPORT = Path('docs/ATLA_NIH3D_RESTORE_VERIFICATION_2026.json')
PREFIX = re.compile(r'^(atla-nih3d-\d{5}-\d{5})-(RESULT\.json|part-\d{3}\.tar\.zst)$')
CHUNK = 8 * 1024**2
PART_ATTEMPTS = 3
TOKEN = os.getenv('GH_TOKEN') or os.getenv('GITHUB_TOKEN')

def api(path):
    # Only the listing uses a token, for rate limits. Downloads below are anonymous on purpose.
    headers = {'Accept': 'application/vnd.github+json', 'User-Agent': 'ekab-nih3d-restore-proof'}
    if TOKEN:
        headers['Authorization'] = 'Bearer ' + TOKEN
    for attempt in range(4):
        try:
            with urlopen(Request(API + path, headers=headers), timeout=120) as r:
                return json.load(r)
        except OSError:
            if attempt == 3:
                raise
            time.sleep(2 ** attempt)

def anonymous(url):
    return urlopen(Request(url, headers={'User-Agent': 'ekab-nih3d-restore-proof'}), timeout=300)

def group_packages(releases):
    """Latest complete asset set per canonical range, recovered releases preferred over the master."""
    groups = {}
    for release in sorted(releases, key=lambda r: r['tag_name'].startswith('ekab-nih3d-recovered-')):
        found = {}
        for asset in release.get('assets', []):
            match = PREFIX.fullmatch(asset.get('name', ''))
            if match and asset.get('state') == 'uploaded':
                found.setdefault(match[1], {'tag': release['tag_name'], 'result': None, 'parts': []})
                if match[2] == 'RESULT.json':
                    found[match[1]]['result'] = asset
                else:
                    found[match[1]]['parts'].append(asset)
        for base, group in found.items():
            if group['result']:
                group['parts'].sort(key=lambda a: a['name'])
                groups[base] = group
    return groups

def expected_files(result):
    expected = {}
    for row in result.get('modelFiles', []):
        name = row['archiveFilename']
        if name in expected and expected[name]['sha256'] != row['sha256']:
            raise ValueError('Conflicting RESULT rows for ' + name)
        expected[name] = row
    return expected

def verify_tar(stream, expected, state):
    """Hash each regular file of one uncompressed tar stream against the RESULT rows."""
    with tarfile.open(fileobj=stream, mode='r|') as archive:
        for member in archive:
            if not member.isfile():
                continue
            name = PurePosixPath(member.name).name
            row = expected.get(name)
            if row is None and name == 'MANIFEST.json':
                # Each package carries its own manifest; the package hash already covers it.
                state['manifests'] = state.get('manifests', 0) + 1
                continue
            if row is None:
                state['unlisted'].append(name)
                continue
            digest = hashlib.sha256()
            size = 0
            source = archive.extractfile(member)
            while chunk := source.read(CHUNK):
                digest.update(chunk)
                size += len(chunk)
            if digest.hexdigest() != row['sha256'] or size != row['bytes']:
                state['mismatched'].append(name)
            else:
                state['seen'].add(name)
                state['bytes'] += size

def verify_part(asset, expected, state):
    process = subprocess.Popen(['zstd', '-dcq'], stdin=subprocess.PIPE, stdout=subprocess.PIPE)
    package = hashlib.sha256()
    received = [0]
    failure = []
    def feed():
        try:
            with anonymous(asset['browser_download_url']) as response:
                while chunk := response.read(CHUNK):
                    package.update(chunk)
                    received[0] += len(chunk)
                    process.stdin.write(chunk)
        except Exception as error:
            failure.append(str(error))
        finally:
            process.stdin.close()
    thread = threading.Thread(target=feed)
    thread.start()
    tar_error = None
    try:
        try:
            verify_tar(process.stdout, expected, state)
        except tarfile.TarError as error:
            tar_error = error
        while process.stdout.read(CHUNK):
            pass
    finally:
        thread.join()
        process.stdout.close()
        code = process.wait()
    # A failed download reaches tarfile as an empty stream, so the download error is the real cause.
    if failure or code:
        raise ValueError(f"Package restore failed: {asset['name']} {failure or code}")
    if tar_error:
        raise tar_error
    if received[0] != asset['size']:
        raise ValueError('Package length differs: ' + asset['name'])
    digest = asset.get('digest')
    if digest and digest.lower() != 'sha256:' + package.hexdigest():
        raise ValueError('Package SHA-256 differs: ' + asset['name'])
    return package.hexdigest()

def verify_group(base, group):
    with anonymous(group['result']['browser_download_url']) as response:
        result = json.load(response)
    expected = expected_files(result)
    state = {'seen': set(), 'mismatched': [], 'unlisted': [], 'bytes': 0}
    errors = []
    for asset in group['parts']:
        for attempt in range(PART_ATTEMPTS):
            before = copy.deepcopy(state)
            try:
                verify_part(asset, expected, state)
                break
            except (ValueError, OSError, tarfile.TarError) as error:
                state.clear()
                state.update(before)
                if attempt == PART_ATTEMPTS - 1:
                    errors.append(str(error)[:300])
                else:
                    time.sleep(30 * (attempt + 1))
    listed = {pack['name'] for pack in result.get('packs', [])}
    published = {asset['name'] for asset in group['parts']}
    missing_files = sorted(set(expected) - state['seen'])
    return summarize(base, group['tag'], len(expected), state, missing_files, sorted(listed - published), errors)

def summarize(base, tag, expected_count, state, missing_files, missing_parts, errors):
    ok = not (missing_files or missing_parts or errors or state['mismatched'] or state['unlisted'])
    return {'range': base, 'tag': tag, 'status': 'ANONYMOUS_RESTORE_VERIFIED' if ok else 'FAILED',
            'expectedFiles': expected_count, 'verifiedFiles': len(state['seen']), 'verifiedBytes': state['bytes'],
            'mismatchedFiles': state['mismatched'][:50], 'missingFiles': missing_files[:50],
            'missingFileCount': len(missing_files), 'missingParts': missing_parts,
            'unlistedFiles': state['unlisted'][:50], 'errors': errors[:10],
            'checkedAtUtc': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())}

def pending(groups, report):
    verified = {row['range'] for row in report.get('ranges', []) if row['status'] == 'ANONYMOUS_RESTORE_VERIFIED'}
    return sorted(base for base in groups if base not in verified)

def merge(report, rows, groups):
    by_range = {row['range']: row for row in report.get('ranges', [])}
    by_range.update({row['range']: row for row in rows})
    ranges = sorted(by_range.values(), key=lambda row: row['range'])
    good = [row for row in ranges if row['status'] == 'ANONYMOUS_RESTORE_VERIFIED']
    return {'schemaVersion': 1, 'scope': 'Byte identity of archived packages. Not scientific or clinical approval.',
            'counts': {'packagedRangesPublished': len(groups), 'rangesVerified': len(good),
                       'rangesFailed': sum(row['status'] == 'FAILED' for row in ranges),
                       'filesVerified': sum(row['verifiedFiles'] for row in good),
                       'bytesVerified': sum(row['verifiedBytes'] for row in good)},
            'ranges': ranges}

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--limit', type=int, default=3)
    args = parser.parse_args()
    report = json.loads(REPORT.read_text(encoding='utf8')) if REPORT.exists() else {}
    releases = []
    for page in range(1, 11):
        batch = api(f'/releases?per_page=100&page={page}')
        releases.extend(r for r in batch if r['tag_name'].startswith('ekab-nih3d-recovered-') or r['tag_name'] == 'atla-nih3d-master-2026')
        if len(batch) < 100:
            break
    groups = group_packages(releases)
    rows = []
    for base in pending(groups, report)[:args.limit]:
        row = verify_group(base, groups[base])
        print('NIH3D_RESTORE', json.dumps({k: row[k] for k in ('range', 'status', 'expectedFiles', 'verifiedFiles', 'missingFileCount', 'missingParts', 'unlistedFiles', 'mismatchedFiles', 'errors')}), flush=True)
        rows.append(row)
    # A failed range stays in the report and stops the chain, so it can never loop forever.
    remaining = len(pending(groups, merge(report, rows, groups))) if not any(row['status'] == 'FAILED' for row in rows) else 0
    if os.getenv('GITHUB_OUTPUT'):
        with open(os.environ['GITHUB_OUTPUT'], 'a') as output:
            output.write('remaining=' + str(remaining) + '\n')
    REPORT.parent.mkdir(parents=True, exist_ok=True)
    REPORT.write_text(json.dumps(merge(report, rows, groups), indent=1) + '\n', encoding='utf8')
    if any(row['status'] == 'FAILED' for row in rows):
        raise SystemExit('Restore verification found failures; see the report')

if __name__ == '__main__':
    main()
