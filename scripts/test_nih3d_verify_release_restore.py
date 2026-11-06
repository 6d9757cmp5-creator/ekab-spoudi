import hashlib
import io
import json
import subprocess
import sys
import tarfile
import unittest
from unittest.mock import patch

import nih3d_verify_release_restore as verify


def tar_bytes(files):
    buffer = io.BytesIO()
    with tarfile.open(fileobj=buffer, mode='w') as archive:
        for name, data in files.items():
            info = tarfile.TarInfo(name)
            info.size = len(data)
            archive.addfile(info, io.BytesIO(data))
    buffer.seek(0)
    return buffer


def row(name, data):
    return {'archiveFilename': name, 'sha256': hashlib.sha256(data).hexdigest(), 'bytes': len(data)}


def state():
    return {'seen': set(), 'mismatched': [], 'unlisted': [], 'bytes': 0}


class PartRetryTests(unittest.TestCase):
    def run_group(self, verify_part):
        result = io.BytesIO(json.dumps({'packs': [{'name': 'p'}], 'modelFiles': []}).encode())
        group = {'tag': 't', 'result': {'browser_download_url': 'u'}, 'parts': [{'name': 'p'}]}
        with patch.object(verify, 'anonymous', return_value=result), patch.object(verify, 'verify_part', side_effect=verify_part),              patch.object(verify.time, 'sleep'):
            return verify.verify_group('atla-nih3d-00001-00100', group)

    def test_failed_download_is_retried_without_double_counting(self):
        calls = []
        def flaky(asset, expected, state):
            calls.append(1)
            state['bytes'] += 5
            if len(calls) == 1:
                raise ValueError('Package restore failed: p [timeout]')
        row = self.run_group(flaky)
        self.assertEqual((len(calls), row['verifiedBytes'], row['errors']), (2, 5, []))

    def test_persistent_failure_reports_the_real_error(self):
        def broken(asset, expected, state):
            raise ValueError('Package restore failed: p [HTTP 503]')
        row = self.run_group(broken)
        self.assertEqual(row['status'], 'FAILED')
        self.assertEqual(row['errors'], ['Package restore failed: p [HTTP 503]'])

    def test_download_error_is_not_hidden_behind_empty_file(self):
        # Stands in for zstd, which the test step does not install: empty input gives empty output.
        passthrough = [sys.executable, '-c', 'import shutil,sys;shutil.copyfileobj(sys.stdin.buffer,sys.stdout.buffer)']
        popen = subprocess.Popen
        with patch.object(verify, 'anonymous', side_effect=OSError('HTTP 503')),              patch.object(verify.subprocess, 'Popen', side_effect=lambda cmd, **kw: popen(passthrough, **kw)):
            with self.assertRaisesRegex(ValueError, 'HTTP 503'):
                verify.verify_part({'name': 'p', 'browser_download_url': 'u', 'size': 1}, {}, state())

class VerifyTests(unittest.TestCase):
    def test_all_files_verified(self):
        s = state()
        verify.verify_tar(tar_bytes({'originals/a.stl': b'aaa'}), {'a.stl': row('a.stl', b'aaa')}, s)
        self.assertEqual(s['seen'], {'a.stl'})
        self.assertEqual(s['bytes'], 3)

    def test_altered_bytes_are_mismatched(self):
        s = state()
        verify.verify_tar(tar_bytes({'a.stl': b'xxx'}), {'a.stl': row('a.stl', b'aaa')}, s)
        self.assertEqual(s['mismatched'], ['a.stl'])
        self.assertEqual(s['seen'], set())

    def test_unlisted_file_fails_the_range(self):
        s = state()
        verify.verify_tar(tar_bytes({'b.stl': b'x'}), {}, s)
        self.assertEqual(verify.summarize('r', 't', 0, s, [], [], [])['status'], 'FAILED')

    def test_package_manifest_is_metadata_not_an_unlisted_file(self):
        s = state()
        verify.verify_tar(tar_bytes({'MANIFEST.json': b'{}', 'a.stl': b'aaa'}), {'a.stl': row('a.stl', b'aaa')}, s)
        self.assertEqual(s['unlisted'], [])
        self.assertEqual(verify.summarize('r', 't', 1, s, [], [], [])['status'], 'ANONYMOUS_RESTORE_VERIFIED')

    def test_missing_file_or_part_or_error_fails(self):
        for missing_files, missing_parts, errors in ((['a'], [], []), ([], ['p'], []), ([], [], ['e'])):
            out = verify.summarize('r', 't', 1, state(), missing_files, missing_parts, errors)
            self.assertEqual(out['status'], 'FAILED')

    def test_complete_range_verified(self):
        s = state()
        s['seen'].add('a')
        self.assertEqual(verify.summarize('r', 't', 1, s, [], [], [])['status'], 'ANONYMOUS_RESTORE_VERIFIED')

    def test_conflicting_result_rows_rejected(self):
        with self.assertRaises(ValueError):
            verify.expected_files({'modelFiles': [row('a', b'1'), row('a', b'2')]})

    def test_grouping_ignores_incomplete_uploads_and_prefers_recovered(self):
        def asset(name, status='uploaded'):
            return {'name': name, 'state': status, 'size': 1}
        groups = verify.group_packages([
            {'tag_name': 'ekab-nih3d-recovered-00001-00100', 'assets': [
                asset('atla-nih3d-00001-00100-RESULT.json'), asset('atla-nih3d-00001-00100-part-000.tar.zst'),
                asset('atla-nih3d-00001-00100-part-001.tar.zst', 'starter')]},
            {'tag_name': 'atla-nih3d-master-2026', 'assets': [
                asset('atla-nih3d-00001-00100-RESULT.json'), asset('atla-nih3d-00101-00200-part-000.tar.zst')]}])
        self.assertEqual(groups['atla-nih3d-00001-00100']['tag'], 'ekab-nih3d-recovered-00001-00100')
        self.assertEqual(len(groups['atla-nih3d-00001-00100']['parts']), 1)
        self.assertNotIn('atla-nih3d-00101-00200', groups)

    def test_only_unverified_ranges_are_pending(self):
        report = {'ranges': [{'range': 'a', 'status': 'ANONYMOUS_RESTORE_VERIFIED'}, {'range': 'b', 'status': 'FAILED'}]}
        self.assertEqual(verify.pending({'a': {}, 'b': {}, 'c': {}}, report), ['b', 'c'])


if __name__ == '__main__':
    unittest.main()
