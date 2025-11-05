from __future__ import annotations

import hashlib
import os
import unittest

from ics_connect.settings import Settings


class TestSettings(unittest.TestCase):
    def test_env_overrides(self) -> None:
        os.environ["ICS_JWT_SECRET"] = hashlib.sha256(b"unit-settings").hexdigest()
        os.environ["ICS_CORS_ORIGIN"] = "https://example.test"
        os.environ["ICS_RATE_LIMIT_WRITE"] = "11"
        os.environ["ICS_RATE_LIMIT_READ"] = "22"
        os.environ["ICS_PORT"] = "9999"
        s = Settings.from_env()
        self.assertEqual(
            s.jwt_secret, hashlib.sha256(b"unit-settings").hexdigest()
        )
        self.assertEqual(s.cors_origin, "https://example.test")
        self.assertEqual(s.rate_limit_write, 11)
        self.assertEqual(s.rate_limit_read, 22)
        self.assertEqual(s.port, 9999)
