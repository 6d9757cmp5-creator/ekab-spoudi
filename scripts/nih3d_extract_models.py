#!/usr/bin/env python3
"""Anonymously extract selected NIH3D GLB originals from the durable Release packages.

Only the package that holds each wanted file is streamed; every extracted file must match the
SHA-256 and size recorded in its range RESULT.json. Writes <out>/<accession>.glb and
<out>/EXTRACTED.json. Read-only towards Releases.
"""
import argparse
import hashlib
import json
from pathlib import Path, PurePosixPath
import subprocess
import tarfile
import threading
import time

from nih3d_verify_release_restore import CHUNK, anonymous, api, group_packages

def releases():
    found = []
    for page in range(1, 11):
        batch = api(f'/releases?per_page=100&page={page}')
        found.extend(r for r in batch if r['tag_name'].startswith('ekab-nih3d-recovered-') or r['tag_name'] == 'atla-nih3d-master-2026')
        if len(batch) < 100:
            break
    return group_packages(found)

def range_of(groups, entry_id):
    for base in groups:
        first, last = (int(x) for x in base.split('-')[2:4])
        if first <= entry_id <= last:
            return base
    return None

def pack_of(result):
    """Files are packed in RESULT order, so cumulative pack counts give each file's package."""
    owner, index = {}, 0
    for pack in result.get('packs', []):
        for row in result['modelFiles'][index:index + pack['models']]:
            owner[row['archiveFilename']] = pack['name']
        index += pack['models']
    return owner

def smallest_glb(rows):
    glbs = [r for r in rows if r['originalFilename'].lower().endswith('.glb')]
    return min(glbs, key=lambda r: (r['bytes'], r['sha256'])) if glbs else None

def plan(groups, entry_ids):
    """Wanted rows grouped by package, plus ids that have no GLB in the archive."""
    by_range, jobs, absent = {}, {}, []
    for entry_id in entry_ids:
        base = range_of(groups, entry_id)
        if base is None:
            absent.append({'entryId': entry_id, 'reason': 'NO_ARCHIVED_RANGE'})
            continue
        by_range.setdefault(base, []).append(entry_id)
    for base, ids in sorted(by_range.items()):
        with anonymous(groups[base]['result']['browser_download_url']) as response:
            result = json.load(response)
        owner = pack_of(result)
        for entry_id in ids:
            row = smallest_glb([r for r in result['modelFiles'] if r['entryId'] == entry_id])
            if row is None:
                absent.append({'entryId': entry_id, 'reason': 'NO_GLB'})
                continue
            jobs.setdefault((base, owner.get(row['archiveFilename'])), []).append(row)
    return jobs, absent

def extract_part(asset, wanted, out):
    """Stream one package and write only the wanted files, verified against RESULT rows."""
    process = subprocess.Popen(['zstd', '-dcq'], stdin=subprocess.PIPE, stdout=subprocess.PIPE)
    failure = []
    def feed():
        try:
            with anonymous(asset['browser_download_url']) as response:
                while chunk := response.read(CHUNK):
                    process.stdin.write(chunk)
        except Exception as error:
            failure.append(str(error))
        finally:
            process.stdin.close()
    thread = threading.Thread(target=feed)
    thread.start()
    done = {}
    try:
        with tarfile.open(fileobj=process.stdout, mode='r|') as archive:
            for member in archive:
                row = wanted.get(PurePosixPath(member.name).name)
                if not member.isfile() or row is None:
                    continue
                target = out / (row['accession'] + '.glb')
                digest, size = hashlib.sha256(), 0
                source = archive.extractfile(member)
                with open(target, 'wb') as sink:
                    while chunk := source.read(CHUNK):
                        digest.update(chunk)
                        size += len(chunk)
                        sink.write(chunk)
                if digest.hexdigest() != row['sha256'] or size != row['bytes']:
                    target.unlink()
                    raise ValueError('Extracted file differs from RESULT: ' + member.name)
                done[member.name] = row
                if len(done) == len(wanted):
                    break
    finally:
        # Stop the download as soon as every wanted file is out.
        process.kill()
        thread.join()
        process.wait()
    # After an early stop the broken pipe is expected; otherwise a short stream is a failed download.
    if failure and len(done) < len(wanted):
        raise ValueError('Package download failed: ' + asset['name'] + ' ' + failure[0][:200])
    return list(done.values())

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('ids', help='JSON file with a list of NIH entry ids')
    parser.add_argument('--out', default='nih3d-extracted')
    parser.add_argument('--plan-only', action='store_true')
    parser.add_argument('--shard', default='0/1', help='i/n: take every n-th package starting at i')
    args = parser.parse_args()
    entry_ids = sorted(set(json.loads(Path(args.ids).read_text(encoding='utf8'))))
    groups = releases()
    jobs, absent = plan(groups, entry_ids)
    index, count = (int(x) for x in args.shard.split('/'))
    keys = sorted(jobs, key=lambda key: (key[0], key[1] or ''))
    jobs = {key: jobs[key] for key in keys[index::count]}
    # Ids with no archived GLB are reported once, by the first shard.
    absent = absent if index == 0 else []
    print('PLAN', json.dumps({'packages': len(jobs), 'files': sum(map(len, jobs.values())), 'absent': absent}), flush=True)
    if args.plan_only:
        for (base, pack), rows in sorted(jobs.items(), key=lambda kv: (kv[0][0], kv[0][1] or '')):
            print(base, pack, [r['accession'] for r in rows])
        return
    out = Path(args.out)
    out.mkdir(parents=True, exist_ok=True)
    extracted, errors = [], []
    for (base, pack), rows in sorted(jobs.items(), key=lambda kv: (kv[0][0], kv[0][1] or '')):
        parts = groups[base]['parts']
        # The mapped package first; the others only if the mapping did not hold.
        order = [p for p in parts if p['name'] == pack] + [p for p in parts if p['name'] != pack]
        wanted = {r['archiveFilename']: r for r in rows}
        for asset in order:
            for attempt in range(3):
                try:
                    got = extract_part(asset, wanted, out)
                    break
                except (ValueError, OSError, tarfile.TarError) as error:
                    got = []
                    if attempt == 2:
                        errors.append(f"{asset['name']}: {str(error)[:200]}")
                    time.sleep(20 * (attempt + 1))
            for row in got:
                wanted.pop(row['archiveFilename'])
                extracted.append({**row, 'range': base, 'tag': groups[base]['tag'], 'package': asset['name']})
            if not wanted:
                break
        absent.extend({'entryId': r['entryId'], 'reason': 'NOT_FOUND_IN_PACKAGES'} for r in wanted.values())
        print('RANGE', base, len(rows) - len(wanted), '/', len(rows), flush=True)
    report = {'extracted': sorted(extracted, key=lambda r: r['entryId']), 'absent': absent, 'errors': errors}
    (out / 'EXTRACTED.json').write_text(json.dumps(report, indent=1, ensure_ascii=False) + '\n', encoding='utf8')
    if errors:
        raise SystemExit('Extraction errors; see EXTRACTED.json')

if __name__ == '__main__':
    main()
