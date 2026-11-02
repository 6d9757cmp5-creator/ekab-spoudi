#!/usr/bin/env python3
"""Recover large *historical* NIH 3D GitHub Actions artifacts via bounded HTTP ranges.

Only archive files documented in canonical RESULT.json are published. Every artifact
file is read and CRC-checked independently; each published asset is SHA256 checked.
Never rewrites an existing asset, deletes an artifact, or touches student data.
"""
from __future__ import annotations
import argparse
import hashlib
import io
import json
import os
from pathlib import Path, PurePosixPath
import re
import shutil
import subprocess
import tempfile
import time
from urllib.parse import urlparse
from urllib.request import Request, urlopen
from urllib.error import HTTPError, URLError
from zipfile import ZipFile

REPO = os.getenv('GITHUB_REPOSITORY', '6d9757cmp5-creator/ekab-spoudi')
API = 'https://api.github.com/repos/' + REPO
TOKEN = os.getenv('GH_TOKEN') or os.getenv('GITHUB_TOKEN')
LEGACY_TAG = 'atla-nih3d-master-2026'
ART = re.compile(r'^nih3d-originals-(\d+)$')
SIZE_LIMIT = 1950 * 1024**2
CHUNK = 8 * 1024**2


def request(url: str, *, headers=None, method='GET', timeout=90, redirects=True):
    """Return urllib response. Redirects must be handled by caller for artifact ZIP."""
    hdr = {'Accept': 'application/vnd.github+json', 'User-Agent': 'ekab-nih3d-historical-recovery', **(headers or {})}
    if url.startswith('https://api.github.com/'):
        if not TOKEN:
            raise RuntimeError('Missing GitHub Actions token')
        hdr['Authorization'] = 'Bearer ' + TOKEN
    req = Request(url, headers=hdr, method=method)
    if not redirects:
        from urllib.request import build_opener, HTTPRedirectHandler
        class StopRedirect(HTTPRedirectHandler):
            def redirect_request(self, req, fp, code, msg, headers, newurl):
                return None
        try:
            return build_opener(StopRedirect()).open(req, timeout=timeout)
        except HTTPError as exc:
            if exc.code in (301, 302, 303, 307, 308):
                return exc
            raise
    return urlopen(req, timeout=timeout)


def api_json(path: str):
    with request(API + path) as r:
        return json.load(r)


def pages(path: str, key: str | None = None):
    collected = []
    for page in range(1, 101):
        separator = '&' if '?' in path else '?'
        data = api_json(f'{path}{separator}per_page=100&page={page}')
        batch = data[key] if key else data
        if not isinstance(batch, list):
            raise ValueError('GitHub API response is not a list')
        collected.extend(batch)
        if len(batch) < 100:
            break
    return collected


def valid_start(start):
    return type(start) is int and start in range(1, 24902, 100)


def prefix(start):
    if not valid_start(start):
        raise ValueError('Non-canonical NIH shard start')
    return f'atla-nih3d-{start:05d}-{start + 99:05d}'


def recovery_tag(start):
    return 'ekab-nih3d-recovered-' + f'{start:05d}-{start+99:05d}'


def select_artifacts(artifacts, legacy_names, recovered_starts=frozenset(), max_count=2):
    candidates = []
    for a in artifacts:
        m = ART.fullmatch(a.get('name') or '')
        if not m or a.get('expired') or not a.get('id'):
            continue
        start = int(m[1])
        if not valid_start(start) or start in recovered_starts or prefix(start) + '-RESULT.json' in legacy_names:
            continue
        if a.get('size_in_bytes', 0) <= 0:
            continue
        candidates.append({'id': a['id'], 'start': start, 'bytes': a['size_in_bytes'],
                           'expires_at': a.get('expires_at') or '', 'run_id': (a.get('workflow_run') or {}).get('id')})
    candidates.sort(key=lambda x: (x['expires_at'], -x['id']))
    unique, seen = [], set()
    for item in candidates:
        if item['start'] not in seen:
            unique.append(item)
            seen.add(item['start'])
    return unique[:max_count], len(unique)


def legacy_asset_names():
    try:
        release = api_json('/releases/tags/' + LEGACY_TAG)
    except HTTPError as e:
        if e.code == 404:
            return set()
        raise
    return {x['name'] for x in pages('/releases/' + str(release['id']) + '/assets')}


def recovered_starts():
    # Complete canonical RESULT.json is uploaded last and acts as the sole checkpoint.
    starts = set()
    for release in pages('/releases'):
        tag = str(release.get('tag_name') or '')
        m = re.fullmatch(r'ekab-nih3d-recovered-(\d{5})-(\d{5})', tag)
        if not m:
            continue
        start, end = int(m[1]), int(m[2])
        if not valid_start(start) or end != start + 99:
            continue
        names = {a['name'] for a in pages('/releases/' + str(release['id']) + '/assets')}
        if prefix(start) + '-RESULT.json' in names:
            starts.add(start)
    return starts


def signed_zip_url(artifact_id):
    """GitHub returns a 302 to an Azure blob with a short-lived signed URL."""
    resp = request(API + f'/actions/artifacts/{artifact_id}/zip', redirects=False)
    try:
        if resp.code != 302:
            raise RuntimeError('Expected 302 artifact archive redirect; got ' + str(resp.code))
        loc = resp.headers.get('Location', '')
    finally:
        resp.close()
    u = urlparse(loc)
    if u.scheme != 'https' or not (u.hostname and u.hostname.endswith('.blob.core.windows.net')):
        raise RuntimeError('Artifact redirect did not point to an Azure HTTPS blob')
    return loc


class RangeReader(io.RawIOBase):
    """Seekable remote ZIP reader; strict 206 + streaming read, no complete download."""
    def __init__(self, signed_url: str, refresh=None):
        self.url = signed_url
        self.refresh = refresh
        u = urlparse(signed_url)
        if u.scheme != 'https' or not u.hostname.endswith('.blob.core.windows.net'):
            raise ValueError('Untrusted artifact blob URL')
        with request(signed_url, method='HEAD') as h:
            self.length = int(h.headers['Content-Length'])
        if self.length <= 0:
            raise RuntimeError('Empty artifact')
        self.position = 0
        self.stream = None
        self.end = 0

    def readable(self):
        return True

    def seekable(self):
        return True

    def tell(self):
        return self.position

    def seek(self, pos, whence=0):
        base = 0 if whence == 0 else self.position if whence == 1 else self.length if whence == 2 else None
        if base is None or base + pos < 0:
            raise ValueError('Invalid seek')
        new = base + pos
        if self.stream and new != self.position:
            self.stream.close()
            self.stream = None
        self.position = new
        return new

    def read(self, size=-1):
        if size is None or size < 0:
            raise ValueError('Refusing unbounded read from large artifact')
        if not size or self.position >= self.length:
            return b''
        size = min(size, self.length - self.position)
        if self.stream is None:
            end = min(self.length - 1, self.position + max(size, CHUNK) - 1)
            for attempt in range(3):
                try:
                    self.stream = request(self.url, headers={'Range': f'bytes={self.position}-{end}'}, timeout=150)
                    if self.stream.status != 206:
                        raise RuntimeError(f'Server ignored Range request: {self.stream.status}')
                    cr = self.stream.headers.get('Content-Range', '')
                    if not cr.startswith(f'bytes {self.position}-{end}/'):
                        raise RuntimeError('Unexpected Content-Range ' + cr)
                    self.end = end + 1
                    break
                except (URLError, TimeoutError, HTTPError) as exc:
                    if isinstance(exc, HTTPError) and exc.code in (401, 403) and self.refresh:
                        self.url = self.refresh()
                        u = urlparse(self.url)
                        if u.scheme != 'https' or not u.hostname.endswith('.blob.core.windows.net'):
                            raise RuntimeError('Refreshed artifact URL is untrusted')
                    elif isinstance(exc, HTTPError) and exc.code not in (408, 429, 500, 502, 503, 504):
                        raise
                    if attempt == 2:
                        raise
                    time.sleep(2 ** attempt)
        remaining = min(size, self.end - self.position)
        out = self.stream.read(remaining)
        if len(out) != remaining:
            raise OSError('Unexpected short read (refuse potentially corrupt ZIP)')
        self.position += len(out)
        if self.position == self.end:
            self.stream.close()
            self.stream = None
        return out

    def close(self):
        if self.stream:
            self.stream.close()
            self.stream = None
        super().close()


def indexed_members(zip_obj):
    names = {}
    for info in zip_obj.infolist():
        if info.is_dir():
            continue
        name = PurePosixPath(info.filename).name
        if name in names:
            raise ValueError('Duplicate ZIP basename ' + name)
        if name in ('', '.', '..') or '/' in name or '\\' in info.filename:
            raise ValueError('Unsafe ZIP path')
        names[name] = info
    return names


def validate_manifest(start, members, data):
    base = prefix(start)
    if data.get('range') != {'start': start, 'end': start + 99}:
        raise ValueError('Canonical range mismatch')
    packs, models = data.get('packs'), data.get('modelFiles')
    if not isinstance(packs, list) or not isinstance(models, list) or not packs or not models or data.get('downloadedOriginalFiles') != len(models):
        raise ValueError('Malformed archive manifest')
    if any(not re.fullmatch('[0-9a-fA-F]{64}', str(m.get('sha256', ''))) for m in models):
        raise ValueError('Original source SHA256 evidence missing')
    expected = []
    for p in packs:
        names = p.get('split') or [p.get('name')]
        if not isinstance(names, list) or not names or type(p.get('bytes')) is not int or p['bytes'] <= 0:
            raise ValueError('Malformed pack')
        total = 0
        for name in names:
            if not isinstance(name, str) or not re.fullmatch(re.escape(base) + r'-part-\d{3}\.tar\.zst(?:\.part-\d{3})?', name):
                raise ValueError('Invalid pack filename')
            if name not in members or not 0 < members[name].file_size < SIZE_LIMIT:
                raise ValueError('Missing/oversized pack ' + name)
            total += members[name].file_size
            expected.append(name)
        if total != p['bytes']:
            raise ValueError('Pack byte count mismatch')
    report = base + '-RESULT.json'
    if report not in members or members[report].file_size > 50 * 1024**2:
        raise ValueError('Missing or oversized manifest')
    if len(expected) != len(set(expected)):
        raise ValueError('Duplicate pack parts')
    for name in members:
        if '.tar.zst' in name and name not in expected:
            raise ValueError('Unlisted binary archive in ZIP: ' + name)
    return expected + [report] # Manifest is always last: a completion marker.


def retrieve_member(artifact_id, name, output):
    """Refresh short-lived Azure signed URL per archive member; verify ZIP CRC."""
    signed = signed_zip_url(artifact_id)
    with RangeReader(signed, refresh=lambda: signed_zip_url(artifact_id)) as remote:
        with ZipFile(remote, 'r', allowZip64=True) as archive:
            info = indexed_members(archive).get(name)
            if info is None:
                raise ValueError('Member missing on re-open: ' + name)
            digest = hashlib.sha256()
            count = 0
            with archive.open(info) as source, open(output, 'xb') as dest:
                while True:
                    chunk = source.read(CHUNK)
                    if not chunk:
                        break
                    count += len(chunk)
                    if count > SIZE_LIMIT:
                        raise ValueError('Oversized member expansion')
                    digest.update(chunk)
                    dest.write(chunk)
            if count != info.file_size:
                raise ValueError('Extracted member length mismatch')
            return count, digest.hexdigest()


def release_assets(tag):
    try:
        r = api_json('/releases/tags/' + tag)
    except HTTPError as e:
        if e.code == 404:
            return None
        raise
    return {a['name']: a for a in pages('/releases/' + str(r['id']) + '/assets')}


def gh(*cmd):
    if not TOKEN:
        raise RuntimeError('GH_TOKEN is missing')
    subprocess.run(['gh', *cmd], check=True, env={**os.environ, 'GH_TOKEN': TOKEN}, timeout=1800)


def recover(artifact_id, start):
    tag = recovery_tag(start)
    with RangeReader(signed_zip_url(artifact_id), refresh=lambda: signed_zip_url(artifact_id)) as remote:
        with ZipFile(remote, 'r', allowZip64=True) as archive:
            entries = indexed_members(archive)
            manifest_name = prefix(start) + '-RESULT.json'
            info = entries.get(manifest_name)
            if not info or info.file_size > 50 * 1024**2:
                raise ValueError('No canonical RESULT manifest inside artifact')
            with archive.open(info) as f:
                report = json.loads(f.read(50 * 1024**2 + 1))
            names = validate_manifest(start, entries, report)
    existing = release_assets(tag)
    if existing is None:
        gh('release', 'create', tag, '--repo', REPO, '--target', os.getenv('GITHUB_SHA', 'main'), '--title', 'EKAB NIH3D historical recovery ' + prefix(start),
           '--notes', f'Historical original-binary recovery from immutable artifact ID {artifact_id}; release is not scientific or clinical approval.')
        existing = release_assets(tag)
        if existing is None:
            raise RuntimeError('New release not visible')
    for index, name in enumerate(names, 1):
        if name in existing:
            item = existing[name]
            if not str(item.get('digest', '')).startswith('sha256:'):
                raise ValueError('Existing release asset has no SHA256: ' + name)
            # Existing SHA256 is checked below against freshly streamed original.
        with tempfile.TemporaryDirectory(prefix='nih3d-rescue-') as td:
            file = Path(td) / name
            if shutil.disk_usage(td).free < SIZE_LIMIT + 512 * 1024**2:
                raise OSError('Insufficient free disk for one bounded ZIP member')
            count, sha = retrieve_member(artifact_id, name, file)
            if shutil.disk_usage(td).free < 512 * 1024**2:
                raise OSError('Insufficient runner space')
            if name in existing:
                if existing[name].get('size') != count or existing[name]['digest'].lower() != 'sha256:' + sha:
                    raise ValueError('Existing release asset mismatch, overwrite prohibited: ' + name)
                print('VERIFIED_EXISTING', name, count, flush=True)
                continue
            gh('release', 'upload', tag, str(file), '--repo', REPO)
            item = None
            for check in range(5):
                item = (release_assets(tag) or {}).get(name)
                if item: break
                time.sleep(2)
            if not item or item.get('size') != count or item.get('digest', '').lower() != 'sha256:' + sha:
                raise RuntimeError('Release asset verification failure: ' + name)
            existing[name] = item
            print(f'PUBLISHED_VERIFIED {index}/{len(names)} {name} {count}', flush=True)
    print('RESCUED_CANONICAL_SHARD', prefix(start), tag, flush=True)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('mode', choices=('plan', 'recover'))
    ap.add_argument('--artifact', type=int)
    ap.add_argument('--start', type=int)
    args = ap.parse_args()
    if args.mode == 'plan':
        selected, count = select_artifacts(pages('/actions/artifacts', 'artifacts'), legacy_asset_names(), recovered_starts(), max_count=2)
        print('NIH3D_RECOVERY_PLAN', json.dumps({'include': selected, 'eligible': count}), flush=True)
        if os.getenv('GITHUB_OUTPUT'):
            with open(os.environ['GITHUB_OUTPUT'], 'a', encoding='utf-8') as f:
                f.write('matrix=' + json.dumps({'include': selected}, separators=(',', ':')) + '\n')
                f.write('count=' + str(len(selected)) + '\n')
    else:
        if not args.artifact or not valid_start(args.start):
            ap.error('recover requires --artifact <id> --start <canonical start>')
        recover(args.artifact, args.start)


if __name__ == '__main__':
    main()
