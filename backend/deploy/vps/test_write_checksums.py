"""Exercise real streaming checksum generation with mocked file handles."""
from pathlib import Path
import unittest
from unittest.mock import MagicMock

from bundle_helpers import write_checksums


class WriteChecksumsTest(unittest.TestCase):
    def setUp(self):
        self.directory = MagicMock(spec=Path)
        self.manifest = MagicMock(spec=Path)
        self.manifest.name = "SHA256SUMS"
        self.image = MagicMock(spec=Path)
        self.image.name = "images.tar"
        self.directory.__truediv__.return_value = self.manifest
        self.directory.iterdir.return_value = [self.image, self.manifest]
        for path in (self.image, self.manifest):
            path.__lt__.side_effect = lambda other, path=path: path.name < other.name
        self.reader = self.image.open.return_value.__enter__.return_value
        self.writer = self.manifest.open.return_value.__enter__.return_value

    def test_hashes_all_chunks_and_excludes_checksum_manifest(self):
        self.reader.read.side_effect = [b"a", b"bc", b""]
        write_checksums(self.directory)
        self.directory.__truediv__.assert_called_once_with("SHA256SUMS")
        self.manifest.open.assert_called_once_with("w")
        self.image.open.assert_called_once_with("rb")
        self.writer.write.assert_called_once_with(
            "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad  images.tar\n"
        )
        self.assertEqual(self.reader.read.call_count, 3)
        self.reader.read.assert_called_with(1024 * 1024)

    def test_empty_file_gets_the_standard_empty_sha256_digest(self):
        self.reader.read.return_value = b""
        write_checksums(self.directory)
        self.writer.write.assert_called_once_with(
            "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855  images.tar\n"
        )

    def test_read_failure_does_not_record_a_successful_digest(self):
        self.reader.read.side_effect = OSError("mock read failure")
        with self.assertRaises(OSError):
            write_checksums(self.directory)
        self.writer.write.assert_not_called()
