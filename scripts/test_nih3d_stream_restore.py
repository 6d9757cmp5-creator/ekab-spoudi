import io
import json
import unittest
from unittest.mock import patch
import zipfile
from urllib.error import HTTPError
import nih3d_stream_restore as s

class FakeResponse(io.BytesIO):
    def __init__(self, body, code, headers):
        super().__init__(body)
        self.status=code
        self.headers=headers

class RangeRecoveryTests(unittest.TestCase):
    def artifact(self):
        b=s.prefix(1301)
        pack=b+'-part-000.tar.zst'
        manifest=b+'-RESULT.json'
        data=json.dumps({'range':{'start':1301,'end':1400},'packs':[{'name':pack,'bytes':4}],
            'modelFiles':[{'sha256':'a'*64}],'downloadedOriginalFiles':1}).encode()
        out=io.BytesIO()
        with zipfile.ZipFile(out,'w',allowZip64=True) as z:
            with z.open('nested/'+pack,'w',force_zip64=True) as f:f.write(b'1234')
            z.writestr('nested/'+manifest,data)
        return out.getvalue(),pack,manifest
    def test_large_artifact_selection(self):
        arr=[{'name':'nih3d-originals-1301','id':1,'expired':False,'size_in_bytes':24854537543,'expires_at':'2026-11-09'},
             {'name':'nih3d-originals-1301','id':2,'expired':False,'size_in_bytes':24854537543,'expires_at':'2026-11-09'},
             {'name':'other','id':3,'expired':False,'size_in_bytes':100}]
        picked,count=s.plan(arr,set(),set())
        self.assertEqual(count,1)
        self.assertEqual(picked[0]['id'],2)
        self.assertEqual(s.plan(arr,set(),{1301})[1],0)
    def test_zip64_nested_manifest(self):
        blob,pack,manifest=self.artifact()
        with zipfile.ZipFile(io.BytesIO(blob)) as z:
            index=s.members(z)
            report=json.loads(z.read(index[manifest]))
            self.assertEqual(s.validate(1301,index,report),[pack,manifest])
    def test_strict_http_ranges(self):
        blob,pack,manifest=self.artifact()
        spans=[]
        def fake(url,*,method='GET',headers=None,follow=True):
            if method=='HEAD':return FakeResponse(b'',200,{'Content-Length':str(len(blob))})
            rng=(headers or {}).get('Range')
            self.assertTrue(rng)
            left,right=map(int,rng.split('=')[1].split('-'))
            spans.append((left,right))
            return FakeResponse(blob[left:right+1],206,{'Content-Range':f'bytes {left}-{right}/{len(blob)}'})
        with patch.object(s,'http',side_effect=fake):
            with s.RangeReader('https://fake.blob.core.windows.net/a.zip') as r:
                with zipfile.ZipFile(r) as z:
                    self.assertEqual(z.read(s.members(z)[pack]),b'1234')
        self.assertTrue(spans)
    def test_refresh_expired_signed_link(self):
        visits=[]
        def fake(url,*,method='GET',headers=None,follow=True):
            if method=='HEAD':return FakeResponse(b'',200,{'Content-Length':'10'})
            visits.append(url)
            if url.endswith('/old'):
                raise HTTPError(url,403,'expired',{},None)
            return FakeResponse(b'0123456789',206,{'Content-Range':'bytes 0-9/10'})
        with patch.object(s,'http',side_effect=fake):
            with s.RangeReader('https://fake.blob.core.windows.net/old',
                refresh=lambda:'https://fake.blob.core.windows.net/new') as reader:
                self.assertEqual(reader.read(10),b'0123456789')
        self.assertEqual(len(visits),2)
    def test_manifest_rejects_missing_sha256(self):
        blob,pack,manifest=self.artifact()
        with zipfile.ZipFile(io.BytesIO(blob)) as z:
            idx=s.members(z)
            report=json.loads(z.read(idx[manifest]))
            report['modelFiles'][0]['sha256']='invalid'
            with self.assertRaises(ValueError):s.validate(1301,idx,report)
    def test_manifest_rejects_unlisted_archive(self):
        blob,pack,manifest=self.artifact()
        with zipfile.ZipFile(io.BytesIO(blob)) as z:
            idx=s.members(z)
            idx[s.prefix(1301)+'-part-001.tar.zst']=idx[pack]
            report=json.loads(z.read(idx[manifest]))
            with self.assertRaises(ValueError):s.validate(1301,idx,report)

if __name__=='__main__':unittest.main()
