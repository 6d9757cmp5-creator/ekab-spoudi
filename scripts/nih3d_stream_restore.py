#!/usr/bin/env python3
"""Bounded streaming recovery of historical NIH3D GitHub Actions ZIP64 artifacts.

Never deletes or overwrites. Publishes only canonical manifests and listed parts.
The final RESULT.json is an integrity-verified completion marker.
"""
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
from urllib.request import Request, urlopen, build_opener, HTTPRedirectHandler
from urllib.error import HTTPError, URLError
from zipfile import ZipFile

REPO = os.environ.get('GITHUB_REPOSITORY', '6d9757cmp5-creator/ekab-spoudi')
API = 'https://api.github.com/repos/' + REPO
TOKEN = os.getenv('GH_TOKEN') or os.getenv('GITHUB_TOKEN')
TAG = 'atla-nih3d-master-2026'
CHUNK = 8 * 1024**2
MAX_PART = 1950 * 1024**2
NAME = re.compile(r'^nih3d-originals-(\d+)$')

def prefix(start):
    if type(start) is not int or start < 1 or start > 24901 or (start-1)%100:
        raise ValueError('Noncanonical shard start')
    return f'atla-nih3d-{start:05d}-{start+99:05d}'

def recovery_tag(start):
    return 'ekab-nih3d-recovered-' + f'{start:05d}-{start+99:05d}'

def http(url, *, method='GET', headers=None, follow=True):
    h={'Accept':'application/vnd.github+json','User-Agent':'ekab-nih3d-recovery'}
    h.update(headers or {})
    if url.startswith('https://api.github.com/'):
        if not TOKEN: raise RuntimeError('Missing GH_TOKEN')
        h['Authorization']='Bearer '+TOKEN
    req=Request(url,headers=h,method=method)
    if follow: return urlopen(req,timeout=180)
    class NoRedirect(HTTPRedirectHandler):
        def redirect_request(self,*args): return None
    try: return build_opener(NoRedirect()).open(req,timeout=180)
    except HTTPError as e:
        if e.code in (301,302,303,307,308): return e
        raise

def api(path):
    # Transient REST errors must not abort an expiry-bound recovery batch.
    for attempt in range(4):
        try:
            with http(API+path) as r: return json.load(r)
        except (HTTPError, URLError, TimeoutError) as error:
            if isinstance(error, HTTPError) and error.code not in (408, 429, 500, 502, 503, 504):
                raise
            if attempt == 3:
                raise
            time.sleep(2 ** attempt)

def pages(path,key=None):
    output=[]
    for i in range(1,101):
        delim='&' if '?' in path else '?'
        raw=api(path+f'{delim}per_page=100&page={i}')
        a=raw[key] if key else raw
        if not isinstance(a,list): raise ValueError('Malformed GitHub pagination')
        output.extend(a)
        if len(a)<100: break
    return output

def current_legacy_names():
    try: rel=api('/releases/tags/'+TAG)
    except HTTPError as e:
        if e.code==404: return set()
        raise
    return {a['name'] for a in pages('/releases/'+str(rel['id'])+'/assets')}

def completed():
    done=set()
    for r in pages('/releases'):
        tag=r.get('tag_name','')
        m=re.fullmatch(r'ekab-nih3d-recovered-(\d{5})-(\d{5})',tag)
        if not m: continue
        s,e=map(int,m.groups())
        try: base=prefix(s)
        except ValueError: continue
        if e!=s+99: continue
        if base+'-RESULT.json' in {a['name'] for a in pages('/releases/'+str(r['id'])+'/assets')}:
            done.add(s)
    return done

def plan(artifacts, legacy, done, count=6):
    selected=[]
    for a in artifacts:
        m=NAME.fullmatch(a.get('name',''))
        if not m or a.get('expired') or not a.get('id') or int(a.get('size_in_bytes',0))<=0: continue
        s=int(m[1])
        try: base=prefix(s)
        except ValueError: continue
        if s in done or base+'-RESULT.json' in legacy: continue
        selected.append({'id':a['id'],'start':s,'bytes':a['size_in_bytes'],
                         'expires_at':a.get('expires_at','') or ''})
    selected.sort(key=lambda a:(a['expires_at'],-a['id']))
    unique={}; 
    for a in selected:
        if a['start'] not in unique:unique[a['start']]=a
    return list(unique.values())[:count],len(unique)

def signed_url(artifact_id):
    r=http(API+f'/actions/artifacts/{artifact_id}/zip', follow=False)
    try:
        if r.code!=302:raise ValueError('Artifact endpoint did not redirect to archive')
        url=r.headers.get('Location','')
    finally:r.close()
    trusted_blob(url)
    return url

def trusted_blob(url):
    u=urlparse(url)
    if u.scheme!='https' or not u.hostname or not u.hostname.endswith('.blob.core.windows.net'):
        raise ValueError('Untrusted artifact archive URL')

class RangeReader(io.RawIOBase):
    def __init__(self,url,refresh=None):
        trusted_blob(url)
        self.url=url;self.refresh=refresh
        with http(url,method='HEAD') as r:
            self.length=int(r.headers['Content-Length'])
        if self.length<=0:raise ValueError('Empty artifact')
        self.position=0;self.end=0;self.stream=None
    def readable(self):return True
    def seekable(self):return True
    def tell(self):return self.position
    def seek(self,delta,whence=0):
        base=0 if whence==0 else self.position if whence==1 else self.length if whence==2 else None
        if base is None or base+delta<0:raise ValueError('Invalid ZIP seek')
        nxt=base+delta
        if nxt!=self.position and self.stream:
            self.stream.close();self.stream=None
        self.position=nxt
        return nxt
    def read(self,n=-1):
        if n is None or n<0:raise ValueError('Refuse unbounded ZIP read')
        if not n or self.position>=self.length:return b''
        n=min(n,self.length-self.position)
        if self.stream is None:
            end=min(self.length-1,self.position+max(n,CHUNK)-1)
            for attempt in range(3):
                try:
                    self.stream=http(self.url,headers={'Range':f'bytes={self.position}-{end}'})
                    if self.stream.status!=206:raise ValueError('HTTP Range ignored')
                    cr=self.stream.headers.get('Content-Range','')
                    if not cr.startswith(f'bytes {self.position}-{end}/'):raise ValueError('Wrong byte range')
                    self.end=end+1
                    break
                except (HTTPError,URLError,TimeoutError) as e:
                    if isinstance(e,HTTPError) and e.code in (401,403) and self.refresh:
                        self.url=self.refresh();trusted_blob(self.url)
                    elif isinstance(e,HTTPError) and e.code not in (408,429,500,502,503,504):
                        raise
                    if attempt==2:raise
                    time.sleep(2**attempt)
        length=min(n,self.end-self.position)
        data=self.stream.read(length)
        if len(data)!=length:raise IOError('Short ranged read')
        self.position+=length
        if self.position==self.end:self.stream.close();self.stream=None
        return data
    def close(self):
        if self.stream:self.stream.close();self.stream=None
        super().close()

def members(archive):
    out={}
    for info in archive.infolist():
        if info.is_dir():continue
        p=PurePosixPath(info.filename)
        name=p.name
        if not name or name in ('.','..') or '\\' in info.filename or name in out:
            raise ValueError('Unsafe/duplicate ZIP member')
        out[name]=info
    return out

def validate(start,index,report):
    base=prefix(start)
    if report.get('range')!={'start':start,'end':start+99}:raise ValueError('Range mismatch')
    packs=report.get('packs');models=report.get('modelFiles')
    if not isinstance(packs,list) or not packs or not isinstance(models,list) or not models or report.get('downloadedOriginalFiles')!=len(models):
        raise ValueError('Invalid manifest')
    if any(not isinstance(m,dict) or not re.fullmatch(r'[a-fA-F0-9]{64}',str(m.get('sha256',''))) for m in models):
        raise ValueError('Missing source SHA256')
    included=[]
    for p in packs:
        files=p.get('split') or [p.get('name')]
        if type(p.get('bytes')) is not int or p['bytes']<=0 or not isinstance(files,list) or not files:
            raise ValueError('Invalid pack inventory')
        size=0
        for fn in files:
            if not isinstance(fn,str) or not re.fullmatch(re.escape(base)+r'-part-\d{3}\.tar\.zst(?:\.part-\d{3})?',fn):
                raise ValueError('Unexpected part filename')
            if fn not in index or not 0<index[fn].file_size<MAX_PART:
                raise ValueError('Missing/oversized part')
            size+=index[fn].file_size;included.append(fn)
        if size!=p['bytes']:raise ValueError('Incorrect pack byte count')
    result=base+'-RESULT.json'
    if result not in index or index[result].file_size>50*1024**2:raise ValueError('Missing RESULT manifest')
    if len(included)!=len(set(included)):raise ValueError('Duplicate part')
    if any('.tar.zst' in n and n not in included for n in index):raise ValueError('Unlisted archive')
    return included+[result]

def release_assets(tag):
    try:r=api('/releases/tags/'+tag)
    except HTTPError as e:
        if e.code==404:return None
        raise
    return {a['name']:a for a in pages('/releases/'+str(r['id'])+'/assets')}

def gh(*args):
    if not TOKEN:raise RuntimeError('Missing GH_TOKEN')
    cmd=['gh',*args]
    proc=subprocess.run(cmd,check=False,env={**os.environ,'GH_TOKEN':TOKEN},
                        stdout=subprocess.PIPE,stderr=subprocess.PIPE,
                        text=True,timeout=1800)
    if proc.returncode:
        raise subprocess.CalledProcessError(proc.returncode,cmd,output=proc.stdout,stderr=proc.stderr)

def retryable_release_error(error):
    message=(getattr(error,'stderr','') or '')+' '+(getattr(error,'output','') or '')
    return bool(re.search(r'HTTP (?:404|408|429|500|502|503|504)\b',message)) or any(
        phrase in message.lower() for phrase in ('connection reset','timeout','temporarily unavailable','eof'))

def verify_asset_without_api_digest(asset, name, size, sha):
    """Read back the real Release bytes when GitHub reports digest: null.

    This is bounded streaming verification, not a second upload, overwrite,
    or blind acceptance of a missing API checksum.
    """
    from urllib.parse import unquote
    url=asset.get('browser_download_url')
    parsed=urlparse(url or '')
    segments=unquote(parsed.path).split('/')
    owner, repo=REPO.split('/')
    if (parsed.scheme!='https' or parsed.hostname!='github.com'
            or parsed.username or parsed.password or parsed.fragment
            or len(segments)!=7 or segments[1:5]!=[owner,repo,'releases','download']
            or not re.fullmatch(r'ekab-nih3d-recovered-\d{5}-\d{5}',segments[5])
            or segments[6]!=name):
        raise ValueError('Cannot safely verify missing remote digest: '+name)
    for attempt in range(3):
        try:
            h=hashlib.sha256();received=0
            with http(url, headers={'Accept':'application/octet-stream'}) as response:
                if response.status!=200 or 'json' in response.headers.get('Content-Type','').lower():
                    raise ValueError('Release asset did not return verified binary bytes: '+name)
                while True:
                    chunk=response.read(min(CHUNK, size-received+1))
                    if not chunk:break
                    received+=len(chunk)
                    if received>size:raise ValueError('Remote asset exceeds expected size: '+name)
                    h.update(chunk)
            if received!=size or h.hexdigest().lower()!=sha.lower():
                raise ValueError('Remote conflict; overwrites forbidden: '+name)
            print('REMOTE_STREAM_SHA256_VERIFIED',name,size,flush=True)
            return
        except (HTTPError,URLError,TimeoutError) as error:
            if isinstance(error,HTTPError) and error.code not in (404,408,429,500,502,503,504):
                raise
            if attempt==2:raise
            time.sleep(2**attempt)

def check_remote_asset(asset, name, size, sha):
    if asset.get('size')!=size:
        raise ValueError('Remote conflict; overwrites forbidden: '+name)
    digest=asset.get('digest')
    if digest is None:
        verify_asset_without_api_digest(asset,name,size,sha)
    elif not isinstance(digest,str) or digest.lower()!='sha256:'+sha.lower():
        raise ValueError('Remote conflict; overwrites forbidden: '+name)

def create_recovery_release(tag, start, artifact_id=None, attempts=5):
    for attempt in range(attempts):
        already=release_assets(tag)
        if already is not None:
            return already
        try:
            gh('release','create',tag,'--repo',REPO,'--target',os.getenv('GITHUB_SHA','main'),
               '--title','EKAB NIH3D historical recovery '+prefix(start),
               '--notes','Historical NIH3D fallback package from GitHub artifact '+str(artifact_id)+'; not clinical approval.')
        except subprocess.CalledProcessError as exc:
            # The upload may have succeeded even when CLI exits nonzero.
            already=release_assets(tag)
            if already is not None:
                return already
            if not retryable_release_error(exc) or attempt==attempts-1:
                raise
            print('RETRY_TRANSIENT_RELEASE_CREATE',tag,attempt+1,flush=True)
            time.sleep(min(2 ** attempt,16))
        else:
            already=release_assets(tag)
            if already is None:
                raise RuntimeError('Release creation not confirmed')
            return already
    raise RuntimeError('Release retry budget exhausted')

def publish_verified_part(tag, name, path, size, sha, attempts=5):
    for attempt in range(attempts):
        existing=release_assets(tag) or {}
        if name in existing:
            check_remote_asset(existing[name],name,size,sha)
            print('VERIFIED_EXISTING',name,flush=True)
            return existing[name]
        try:
            gh('release','upload',tag,str(path),'--repo',REPO)
        except subprocess.CalledProcessError as exc:
            # Refresh before retry: an HTTP 500/404 may still have saved the asset.
            existing=release_assets(tag) or {}
            if name in existing:
                check_remote_asset(existing[name],name,size,sha)
                print('VERIFIED_AFTER_UPLOAD_ERROR',name,flush=True)
                return existing[name]
            if not retryable_release_error(exc) or attempt==attempts-1:
                raise
            print('RETRY_TRANSIENT_RELEASE_UPLOAD',name,attempt+1,flush=True)
            time.sleep(min(2 ** attempt,16))
            continue
        for poll in range(6):
            found=(release_assets(tag) or {}).get(name)
            if found is not None:
                check_remote_asset(found,name,size,sha)
                return found
            time.sleep(2)
        raise RuntimeError('Uploaded Release asset not visible for SHA256 verification: '+name)
    raise RuntimeError('Release upload retry budget exhausted: '+name)

def download_part(artifact_id,name,target):
    with RangeReader(signed_url(artifact_id),refresh=lambda:signed_url(artifact_id)) as reader:
        with ZipFile(reader) as z:
            info=members(z).get(name)
            if not info:raise ValueError('Part vanished')
            h=hashlib.sha256();size=0
            with z.open(info) as source,open(target,'xb') as output:
                while True:
                    chunk=source.read(CHUNK)
                    if not chunk:break
                    size+=len(chunk)
                    if size>MAX_PART:raise ValueError('Oversized part')
                    h.update(chunk);output.write(chunk)
            if size!=info.file_size:raise ValueError('Part length mismatch')
            return size,h.hexdigest()

def recover(artifact_id,start):
    with RangeReader(signed_url(artifact_id),refresh=lambda:signed_url(artifact_id)) as reader:
        with ZipFile(reader) as z:
            idx=members(z)
            fn=prefix(start)+'-RESULT.json'
            if fn not in idx or idx[fn].file_size>50*1024**2:raise ValueError('Missing report')
            with z.open(idx[fn]) as f:report=json.loads(f.read(50*1024**2+1))
            filenames=validate(start,idx,report)
    tag=recovery_tag(start)
    existing=release_assets(tag)
    if existing is None:
        existing=create_recovery_release(tag,start,artifact_id)
    for i,filename in enumerate(filenames,1):
        with tempfile.TemporaryDirectory(prefix='nih3d-range-') as td:
            if shutil.disk_usage(td).free<MAX_PART+512*1024**2:raise RuntimeError('Insufficient disk for one part')
            path=Path(td)/filename
            size,sha=download_part(artifact_id,filename,path)
            if filename in existing:
                check_remote_asset(existing[filename],filename,size,sha)
                print('VERIFIED_EXISTING',filename,flush=True)
                continue
            existing[filename]=publish_verified_part(tag,filename,path,size,sha)
            print('PUBLISHED_VERIFIED',i,len(filenames),filename,size,flush=True)
    print('RECOVERY_SUCCESS',prefix(start),tag,flush=True)

def main():
    a=argparse.ArgumentParser()
    a.add_argument('mode',choices=('plan','recover'))
    a.add_argument('--artifact',type=int);a.add_argument('--start',type=int)
    x=a.parse_args()
    if x.mode=='plan':
        selected,total=plan(pages('/actions/artifacts','artifacts'),current_legacy_names(),completed())
        print('NIH3D_RECOVERY_PLAN',json.dumps({'include':selected,'eligible':total}))
        if os.getenv('GITHUB_OUTPUT'):
            with open(os.environ['GITHUB_OUTPUT'],'a') as f:
                f.write('matrix='+json.dumps({'include':selected},separators=(',',':'))+'\n')
                f.write('count='+str(len(selected))+'\n')
    else:
        if not x.artifact or x.start is None: a.error('recover requires --artifact and --start')
        recover(x.artifact,x.start)

if __name__=='__main__':main()
