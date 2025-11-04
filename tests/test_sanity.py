from __future__ import annotations

import unittest

import ics_connect

EXPECTED_SUM: int = 2


class TestSanity(unittest.TestCase):
    def test_math(self) -> None:
        self.assertEqual(1 + 1, EXPECTED_SUM)

    def test_pkg_version_str(self) -> None:
        # Ensure package imports for coverage and has a version string.
        self.assertIsInstance(ics_connect.__version__, str)