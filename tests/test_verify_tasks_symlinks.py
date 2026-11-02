"""Regression tests for the ATLA verifier's fail-closed file checks."""
import hashlib
import importlib.util
from pathlib import Path
import tempfile
import unittest

SCRIPT = Path(__file__).resolve().parents[1] / "scripts" / "monitor" / "verify_tasks.py"
spec = importlib.util.spec_from_file_location("verify_tasks", SCRIPT)
verifier = importlib.util.module_from_spec(spec)
spec.loader.exec_module(verifier)


class FileSafetyTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        verifier.ROOT = self.root
        (self.root / "good.txt").write_text("known content", encoding="utf-8")
        self.digest = hashlib.sha256(b"known content").hexdigest()

    def task(self, name="good.txt", glob="good.txt", count=1):
        return {"status": "ready_for_verification",
                "files": [{"path": name, "sha256": self.digest}],
                "inventory": {"glob": glob, "expected_count": count}}

    def test_valid_file_passes(self):
        ok, reason = verifier.verify(self.task())
        self.assertTrue(ok, reason)

    def test_direct_symlink_rejected(self):
        (self.root / "alias.txt").symlink_to("good.txt")
        ok, _ = verifier.verify(self.task(name="alias.txt", glob="alias.txt"))
        self.assertFalse(ok)

    def test_symlink_parent_rejected(self):
        (self.root / "real").mkdir()
        (self.root / "real" / "good.txt").write_text("known content")
        (self.root / "alias_dir").symlink_to("real", target_is_directory=True)
        ok, _ = verifier.verify(self.task(name="alias_dir/good.txt", glob="alias_dir/good.txt"))
        self.assertFalse(ok)

    def test_symlink_inventory_rejected(self):
        (self.root / "alias.txt").symlink_to("good.txt")
        ok, _ = verifier.verify(self.task(glob="*.txt", count=2))
        self.assertFalse(ok)

    def test_absolute_path_rejected(self):
        ok, _ = verifier.verify(self.task(name=str(self.root / "good.txt")))
        self.assertFalse(ok)

    def test_parent_traversal_rejected(self):
        ok, _ = verifier.verify(self.task(name="../good.txt"))
        self.assertFalse(ok)


if __name__ == "__main__":
    unittest.main()
