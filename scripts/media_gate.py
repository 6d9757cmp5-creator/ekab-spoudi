#!/usr/bin/env python3
"""Fail closed on new or modified media without explicit per-file review."""
import json, os, pathlib, subprocess, sys, hashlib
ROOT=pathlib.Path(__file__).resolve().parents[1]
EXT={'.svg','.png','.jpg','.jpeg','.webp','.gif','.avif','.mp4','.mov','.webm','.m4v','.mp3','.wav','.ogg','.m4a','.pdf','.doc','.docx','.ppt','.pptx','.xls','.xlsx'}
MAX=100*1024*1024
def git(*args):
    return subprocess.check_output(['git',*args],cwd=ROOT,text=True).strip()
def main():
    base=os.environ.get('MEDIA_GATE_BASE','')
    if not base:
        print('FAIL: MEDIA_GATE_BASE must be an existing base commit',file=sys.stderr);return 2
    try:
        git('cat-file','-e',base+'^{commit}')
        changed=git('diff','--name-only','--diff-filter=ACMR',base,'HEAD').splitlines()
    except (subprocess.CalledProcessError,ValueError) as exc:
        print('FAIL: cannot calculate changed files:',exc,file=sys.stderr);return 2
    media=[p for p in changed if pathlib.PurePosixPath(p).suffix.lower() in EXT]
    if not media:
        print('PASS: no changed media');return 0
    manifest=ROOT/'media-review.json'
    if not manifest.is_file():
        print('FAIL: media-review.json missing');return 1
    try:
        entries=json.loads(manifest.read_text(encoding='utf-8'))['files']
        if not isinstance(entries,dict): raise TypeError('files must be an object')
    except (ValueError,KeyError,TypeError) as exc:
        print('FAIL: invalid review manifest:',exc);return 1
    errors=[]
    for rel in media:
        path=ROOT/rel
        try:
            if not path.is_file() or path.is_symlink() or not path.resolve().is_relative_to(ROOT):
                raise ValueError('file missing, symlinked or outside repository')
            data=path.read_bytes()
            if len(data)>MAX: raise ValueError('file larger than 100 MiB')
            if not data: raise ValueError('empty file')
            if path.suffix.lower()=='.svg':
                s=data.decode('utf-8').lower()
                if any(t in s for t in ('<script','onload=','onerror=','javascript:','<foreignobject','<iframe','<!entity','<!doctype','<image href="http','<use href="http')):
                    raise ValueError('SVG contains potentially active/external content')
            item=entries.get(rel)
            if not isinstance(item,dict):raise ValueError('missing manifest entry')
            required=['sha256','type','lesson','source','author','license','description_el','reviewer','reviewed_at','scientific_source','visual_check','safety_check','rights_check','status']
            missing=[k for k in required if not isinstance(item.get(k),str) or not item[k].strip()]
            if missing:raise ValueError('missing fields: '+', '.join(missing))
            if item['sha256']!=hashlib.sha256(data).hexdigest():raise ValueError('SHA-256 mismatch')
            if item['status']!='approved-for-publication':raise ValueError('not approved for publication')
            for k in ('visual_check','safety_check','rights_check'):
                if item[k]!='passed':raise ValueError(k+' must be passed')
            if path.suffix.lower() in ('.mp4','.mov','.webm','.m4v') and item.get('full_video_review')!='passed':
                raise ValueError('full_video_review must be passed')
        except (OSError,UnicodeError,ValueError,KeyError,TypeError) as exc:
            errors.append(f'{rel}: {exc}')
    for e in errors:print('BLOCK:',e)
    if errors:return 1
    print(f'PASS: {len(media)} changed media files have matching review records')
    return 0
if __name__=='__main__':sys.exit(main())
