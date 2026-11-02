import io
import json
import re
import unittest
import zipfile
from unittest.mock import patch
from urllib.error import HTTPError
import nih3d_stream_restore as s

class FakeResponse(io.BytesIO):
    def __init__(self, payload, status, headers):
        super().__init__(payload)
        self.status = status
        self.headers = headers

class RecoveryTests(unittest.TestCase):
    def test_selection_accepts_very_large_artifacts_without_duplicates(self):
        vals = [{'id': 7, 'name': 'nih3d-originals-1301', 'size_in_bytes': 24854537543, 'expired': False, 'expires_at':'2026-11-09'},
                {'id': 8, 'name': 'nih3d-originals-1301', 'size_in_bytes': 24854537543, 'expired': False, 'expires_at':'2026-11-09'},
                {'id': 9, 'name': 'nih3d-originals-1401', 'size_in_bytes': 300, 'expired': True},
                {'id':10, 'name':'unrelated-private-artifact', 'size_in_bytes':100}]
        chosen, count = s.select_artifacts(vals, set())
        self.assertEqual(count, 1)
        self.assertEqual(chosen[0]['id'], 8)
        self.assertEqual(s.select_artifacts(vals, set(), {1301})[1], 0)

    def make_zip_with_nested_paths(self):
        base = s.prefix(1301)
        binary = base + '-part-000.tar.zst'
        report_name = base + '-RESULT.json'
        raw = json.dumps({'range': {'start':1301,'end':1400}, 'packs': [{'name': binary,'bytes':4}],
                          'modelFiles': [{'sha256':'e'*64}], 'downloadedOriginalFiles': 1}).encode()
        bio = io.BytesIO()
        with zipfile.ZipFile(bio, 'w', allowZip64=True) as z:
            with z.open('subdirectory/' + binary, 'w', force_zip64=True) as f:
                f.write(b'1234')
            z.writestr('subdirectory/' + report_name, raw)
        with zipfile.ZipFile(io.BytesIO(bio.getvalue())) as z:
            names = s.indexed_members(z)
            self.assertEqual(s.validate_manifest(1301, names, json.loads(raw)), [binary, report_name])
            self.assertEqual(z.read(names[binary]), b'1234')
        return bio.getvalue()

    def test_manifest_with_nested_zip_paths(self):
        self.assertTrue(self.make_zip_with_nested_paths().startswith(b"PK"))

    def test_remote_reader_uses_range_not_full_archive(self):
        blob = self.make_zip_with_nested_paths()
        calls=[]
        def fake_request(url, *, headers=None, method='GET', **kwargs):
            if method == 'HEAD':
                return FakeResponse(b'', 200, {'Content-Length': str(len(blob))})
            rng = (headers or {}).get('Range','')
            self.assertTrue(rng.startswith('bytes='), 'Only ranged requests are permitted')
            start, end = map(int, re.fullmatch(r'bytes=(\d+)-(\d+)', rng).groups())
            calls.append((start, end))
            return FakeResponse(blob[start:end+1], 206,
                {'Content-Range':f'bytes {start}-{end}/{len(blob)}'})
        with patch.object(s, 'request', side_effect=fake_request):
            with s.RangeReader('https://sample.blob.core.windows.net/archive.zip') as src:
                with zipfile.ZipFile(src) as arc:
                    names=s.indexed_members(arc)
                    self.assertEqual(len(names), 2)
                    self.assertEqual(arc.read(names[s.prefix(1301)+'-part-000.tar.zst']), b'1234')
        self.assertTrue(calls)

    def test_signed_azure_url_refresh_after_expiry(self):
        refreshed = []
        calls = []
        def fake_request(url, *, headers=None, method='GET', **kwargs):
            if method == 'HEAD':
                return FakeResponse(b'', 200, {'Content-Length': '16'})
            calls.append(url)
            if url.endswith('/old'):
                raise HTTPError(url, 403, 'Expired token', {}, None)
            return FakeResponse(b'0123456789abcdef', 206, {'Content-Range': 'bytes 0-15/16'})
        def refresh():
            refreshed.append(True)
            return 'https://sample.blob.core.windows.net/new'
        with patch.object(s, 'request', side_effect=fake_request):
            with s.RangeReader('https://sample.blob.core.windows.net/old', refresh=refresh) as src:
                self.assertEqual(src.read(16), b'0123456789abcdef')
        self.assertEqual(len(refreshed), 1)
        self.assertEqual(len(calls), 2)

    def test_reject_bad_manifest_and_archive_names(self):
        class Member:
            def __init__(self, n): self.file_size = n
        base = s.prefix(1301)
        pack=base+'-part-000.tar.zst'
        manifest=base+'-RESULT.json'
        entries={pack:Member(4), manifest:Member(100)}
        good={'range':{'start':1301,'end':1400},'packs':[{'name':pack,'bytes':4}],
              'modelFiles': [{'sha256':'e'*64}], 'downloadedOriginalFiles':1}
        self.assertEqual(s.validate_manifest(1301,entries,good),[pack,manifest])
        self.assertRaises(ValueError, s.validate_manifest, 1301,entries,{**good,'modelFiles':[], 'downloadedOriginalFiles':0})
        self.assertRaises(ValueError, s.validate_manifest, 1301,entries,{**good,'range':{'start':0,'end':100}})
        self.assertRaises(ValueError, s.validate_manifest, 1301,entries,{**good,'packs':[{'name':pack,'bytes':42}]})
        self.assertRaises(ValueError, s.validate_manifest, 1301,{**entries,'bad.tar.zst':Member(1)},good)


    def test_recover_streams_and_reuses_verified_release_without_overwrite(self):
        payload = self.make_zip_with_nested_paths()
        url = 'https://sample.blob.core.windows.net/archive.zip'
        uploaded = {}
        created = {'value': False}
        uploads = []
        def fake_request(_url, *, headers=None, method='GET', **_):
            if method == 'HEAD':
                return FakeResponse(b'', 200, {'Content-Length': str(len(payload))})
            start, end = map(int, re.fullmatch(r'bytes=(\d+)-(\d+)', headers.get('Range','')).groups())
            return FakeResponse(payload[start:end+1], 206,
                {'Content-Range':f'bytes {start}-{end}/{len(payload)}'})
        def assets(_tag):
            return uploaded if created['value'] else None
        def fake_gh(*cmd):
            if cmd[:2] == ('release', 'create'):
                self.assertFalse(created['value'])
                created['value'] = True
            elif cmd[:2] == ('release','upload'):
                from pathlib import Path
                import hashlib
                path = Path(cmd[3]); raw = path.read_bytes()
                self.assertNotIn(path.name, uploaded)
                uploaded[path.name] = {'name':path.name,'size':len(raw),'digest':'sha256:'+hashlib.sha256(raw).hexdigest()}
                uploads.append(path.name)
            else:
                self.fail('Unexpected command: '+repr(cmd))
        with patch.object(s, 'signed_zip_url', return_value=url), \
             patch.object(s, 'request', side_effect=fake_request), \
             patch.object(s, 'release_assets', side_effect=assets), \
             patch.object(s, 'gh', side_effect=fake_gh):
            s.recover(1234, 1301)
            self.assertEqual(uploads, [s.prefix(1301)+'-part-000.tar.zst', s.prefix(1301)+'-RESULT.json'])
            s.recover(1234, 1301)
            self.assertEqual(len(uploads), 2)

if __name__ == '__main__':
    unittest.main()
