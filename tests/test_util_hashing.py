from __future__ import annotations

import unittest

from ics_connect.util.hashing import hash_secret, verify_secret


class TestHashing(unittest.TestCase):
    def test_hash_and_verify(self) -> None:
        h = hash_secret("s3cr3t")
        self.assertTrue(verify_secret("s3cr3t", h))

    def test_verify_wrong_raises(self) -> None:
        h = hash_secret("abc")
        with self.assertRaises(RuntimeError):
            verify_secret("wrong", h)

