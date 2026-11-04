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
    def test_six_shards_prioritized_by_expiry(self):
        starts=[1301,1501,1601,1701,1801,1901,2001,2101]
        artifacts=[{'name':f'nih3d-originals-{start}','id':i+1,
                    'expired':False,'size_in_bytes':1000+i,
                    'expires_at':f'2026-11-{10+i//4:02d}T{10+i%4:02d}:00:00Z'}
                   for i,start in enumerate(starts)]
        selected,total=s.plan(list(reversed(artifacts)),set(),set(),count=6)
        self.assertEqual(total,8)
        self.assertEqual([a['start'] for a in selected],starts[:6])
        self.assertEqual(len(selected),6)
        selected,total=s.plan(artifacts,set(),{1301,1501})
        self.assertEqual(total,6)
        self.assertEqual(len(selected),6)

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

    def test_http_release_retry_classification(self):
        from subprocess import CalledProcessError
        for status in (404,408,429,500,502,503,504):
            x=CalledProcessError(1,['gh'],stderr=f'HTTP {status}: temporary')
            self.assertTrue(s.retryable_release_error(x),f'Expected retry for {status}')
        for status in (401,403,422):
            x=CalledProcessError(1,['gh'],stderr=f'HTTP {status}: prohibited')
            self.assertFalse(s.retryable_release_error(x),f'Unexpected retry for {status}')

    def test_release_create_500_retries_and_rechecks(self):
        from subprocess import CalledProcessError
        with patch.object(s,'release_assets',side_effect=[None,None,None,{}]) as assets, \
             patch.object(s,'gh',side_effect=[CalledProcessError(1,['gh'],stderr='HTTP 500'),None]) as gh, \
             patch.object(s.time,'sleep') as sleep:
            self.assertEqual(s.create_recovery_release('tag',1301),{})
        self.assertEqual(gh.call_count,2)
        self.assertEqual(assets.call_count,4)
        self.assertEqual(sleep.call_count,1)

    def test_release_create_403_fails_closed(self):
        from subprocess import CalledProcessError
        with patch.object(s,'release_assets',return_value=None), \
             patch.object(s,'gh',side_effect=CalledProcessError(1,['gh'],stderr='HTTP 403')) as gh, \
             patch.object(s.time,'sleep') as sleep:
            with self.assertRaises(CalledProcessError):
                s.create_recovery_release('tag',1301)
        self.assertEqual(gh.call_count,1)
        sleep.assert_not_called()

    def test_release_upload_404_retries_with_sha256_validation(self):
        from subprocess import CalledProcessError
        asset={'size':4,'digest':'sha256:'+'a'*64}
        name='fixture.tar.zst'
        with patch.object(s,'release_assets',side_effect=[{}, {}, {}, {name:asset}]), \
             patch.object(s,'gh',side_effect=[CalledProcessError(1,['gh'],stderr='HTTP 404'),None]) as gh, \
             patch.object(s.time,'sleep') as sleep:
            self.assertEqual(s.publish_verified_part('tag',name,'/tmp/file',4,'a'*64),asset)
        self.assertEqual(gh.call_count,2)
        self.assertEqual(sleep.call_count,1)

    def test_release_upload_500_already_succeeded_no_reupload(self):
        from subprocess import CalledProcessError
        asset={'size':4,'digest':'sha256:'+'a'*64}
        with patch.object(s,'release_assets',side_effect=[{}, {'fixture':asset}]), \
             patch.object(s,'gh',side_effect=CalledProcessError(1,['gh'],stderr='HTTP 500')) as gh, \
             patch.object(s.time,'sleep') as sleep:
            self.assertEqual(s.publish_verified_part('tag','fixture','/tmp/file',4,'a'*64),asset)
        self.assertEqual(gh.call_count,1)
        sleep.assert_not_called()

    def test_release_upload_conflicting_remote_digest_forbids_overwrite(self):
        asset={'size':4,'digest':'sha256:'+'b'*64}
        with patch.object(s,'release_assets',return_value={'fixture':asset}), \
             patch.object(s,'gh') as gh:
            with self.assertRaisesRegex(ValueError,'Remote conflict'):
                s.publish_verified_part('tag','fixture','/tmp/file',4,'a'*64)
        gh.assert_not_called()

    def test_api_get_transient_500_retries_bounded(self):
        from urllib.error import HTTPError
        payload=json.dumps({'ok':True}).encode()
        with patch.object(s,'http',side_effect=[
             HTTPError('https://api.github.com/',500,'server',{},None),
             FakeResponse(payload,200,{})]) as conn, \
             patch.object(s.time,'sleep') as sleep:
            self.assertEqual(s.api('/test'),{'ok':True})
        self.assertEqual(conn.call_count,2)
        self.assertEqual(sleep.call_count,1)

    def test_null_release_digest_reads_back_real_sha256_stream(self):
        payload=b'1234'
        name='atla-nih3d-01301-01400-part-000.tar.zst'
        asset={'size':4,'digest':None,
               'browser_download_url':'https://github.com/6d9757cmp5-creator/ekab-spoudi/releases/download/ekab-nih3d-recovered-01301-01400/'+name}
        with patch.object(s,'http',return_value=FakeResponse(payload,200,{'Content-Type':'application/octet-stream'})) as request:
            s.check_remote_asset(asset,name,len(payload),s.hashlib.sha256(payload).hexdigest())
        self.assertEqual(request.call_count,1)

    def test_null_release_digest_wrong_bytes_fails_closed(self):
        payload=b'bad!'
        name='atla-nih3d-01301-01400-part-000.tar.zst'
        asset={'size':4,'digest':None,
               'browser_download_url':'https://github.com/6d9757cmp5-creator/ekab-spoudi/releases/download/ekab-nih3d-recovered-01301-01400/'+name}
        with patch.object(s,'http',return_value=FakeResponse(payload,200,{'Content-Type':'application/octet-stream'})):
            with self.assertRaisesRegex(ValueError,'Remote conflict'):
                s.check_remote_asset(asset,name,4,s.hashlib.sha256(b'1234').hexdigest())

    def test_null_release_digest_missing_or_untrusted_url_fails_closed(self):
        for url in (None,'https://other.example.net/release/asset',
                    'http://github.com/6d9757cmp5-creator/ekab-spoudi/releases/download/ekab-nih3d-recovered-01301-01400/test'):
            asset={'size':4,'digest':None,'browser_download_url':url}
            with patch.object(s,'http') as request:
                with self.assertRaisesRegex(ValueError,'Cannot safely verify'):
                    s.check_remote_asset(asset,'test',4,s.hashlib.sha256(b'1234').hexdigest())
            request.assert_not_called()

    def test_null_release_digest_short_download_fails_closed(self):
        name='atla-nih3d-01301-01400-part-000.tar.zst'
        asset={'size':4,'digest':None,
               'browser_download_url':'https://github.com/6d9757cmp5-creator/ekab-spoudi/releases/download/ekab-nih3d-recovered-01301-01400/'+name}
        with patch.object(s,'http',return_value=FakeResponse(b'123',200,{'Content-Type':'application/octet-stream'})):
            with self.assertRaisesRegex(ValueError,'Remote conflict'):
                s.check_remote_asset(asset,name,4,s.hashlib.sha256(b'1234').hexdigest())

    def test_incomplete_upload_placeholder_is_replaced(self):
        name='fixture.tar.zst'
        starter={'id':7,'name':name,'state':'starter','size':2,'digest':None}
        good={'id':8,'name':name,'state':'uploaded','size':4,'digest':'sha256:'+'a'*64}
        with patch.object(s,'release_assets',side_effect=[{name:starter},{name:good}]), \
             patch.object(s,'api',return_value=starter), \
             patch.object(s,'http',return_value=FakeResponse(b'',204,{})) as request, \
             patch.object(s,'gh') as gh:
            self.assertEqual(s.publish_verified_part('tag',name,'/tmp/file',4,'a'*64),good)
        self.assertEqual(gh.call_count,1)
        self.assertEqual(request.call_args.kwargs['method'],'DELETE')
        self.assertTrue(request.call_args.args[0].endswith('/releases/assets/7'))

    def test_upload_failure_leaving_placeholder_retries(self):
        from subprocess import CalledProcessError
        name='fixture.tar.zst'
        starter={'id':7,'name':name,'state':'starter','size':2,'digest':None}
        good={'id':8,'name':name,'state':'uploaded','size':4,'digest':'sha256:'+'a'*64}
        with patch.object(s,'release_assets',side_effect=[{},{name:starter},{name:starter},{name:good}]), \
             patch.object(s,'api',return_value=starter), \
             patch.object(s,'http',return_value=FakeResponse(b'',204,{})), \
             patch.object(s,'gh',side_effect=[CalledProcessError(1,['gh'],stderr='HTTP 422 already_exists'),None]) as gh, \
             patch.object(s.time,'sleep'):
            self.assertEqual(s.publish_verified_part('tag',name,'/tmp/file',4,'a'*64),good)
        self.assertEqual(gh.call_count,2)

    def test_placeholder_removal_refuses_uploaded_asset(self):
        name='fixture.tar.zst'
        stale={'id':7,'name':name,'state':'starter'}
        with patch.object(s,'api',return_value={'id':7,'name':name,'state':'uploaded'}), \
             patch.object(s,'http') as request:
            with self.assertRaisesRegex(ValueError,'non-placeholder'):
                s.remove_incomplete_upload(stale,name)
        request.assert_not_called()

    def test_uploaded_asset_with_wrong_digest_is_never_deleted(self):
        name='fixture.tar.zst'
        asset={'id':7,'name':name,'state':'uploaded','size':4,'digest':'sha256:'+'b'*64}
        with patch.object(s,'release_assets',return_value={name:asset}), \
             patch.object(s,'http') as request, patch.object(s,'gh') as gh:
            with self.assertRaisesRegex(ValueError,'Remote conflict'):
                s.publish_verified_part('tag',name,'/tmp/file',4,'a'*64)
        request.assert_not_called();gh.assert_not_called()

    def test_placeholder_result_does_not_mark_shard_complete(self):
        base=s.prefix(1301)
        release={'id':1,'tag_name':s.recovery_tag(1301)}
        def fake(path,key=None):
            if path=='/releases':return [release]
            return [{'name':base+'-RESULT.json','state':'starter'}]
        with patch.object(s,'pages',side_effect=fake):
            self.assertEqual(s.completed(),set())

if __name__=='__main__':unittest.main()
