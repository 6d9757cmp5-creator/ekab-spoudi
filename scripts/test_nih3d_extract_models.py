import unittest

from nih3d_extract_models import pack_of, smallest_glb

class ExtractPlanTest(unittest.TestCase):
    def test_files_map_to_packages_in_result_order(self):
        result = {'packs': [{'name': 'p0', 'models': 2}, {'name': 'p1', 'models': 1}],
                  'modelFiles': [{'archiveFilename': 'a'}, {'archiveFilename': 'b'}, {'archiveFilename': 'c'}]}
        self.assertEqual(pack_of(result), {'a': 'p0', 'b': 'p0', 'c': 'p1'})

    def test_smallest_glb_ignores_other_formats(self):
        rows = [{'originalFilename': 'x.stl', 'bytes': 1, 'sha256': 'a'},
                {'originalFilename': 'x.GLB', 'bytes': 9, 'sha256': 'b'},
                {'originalFilename': 'y.glb', 'bytes': 5, 'sha256': 'c'}]
        self.assertEqual(smallest_glb(rows)['sha256'], 'c')
        self.assertIsNone(smallest_glb(rows[:1]))

if __name__ == '__main__':
    unittest.main()
