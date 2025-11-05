from __future__ import annotations

import unittest

from fastapi.testclient import TestClient

from ics_connect.main import app


class TestAuth(unittest.TestCase):
    def setUp(self) -> None:
        self.client = TestClient(app)

    def test_login_and_me(self) -> None:
        body: dict[str, str] = {"email": "user@uci.edu", "display_name": "User"}
        r = self.client.post("/api/v1/auth/login", json=body)
        self.assertEqual(r.status_code, 200)
        self.assertIn("\"token\"", r.text)
        token_start = r.text.find('"token":"')
        self.assertGreaterEqual(token_start, 0)
        token_start += len('"token":"')
        token_end = r.text.find('"', token_start)
        token = r.text[token_start:token_end]
        r2 = self.client.get(
            "/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"}
        )
        self.assertEqual(r2.status_code, 200)

    def test_login_invalid(self) -> None:
        bad: dict[str, str] = {"email": "no-at", "display_name": ""}
        r = self.client.post("/api/v1/auth/login", json=bad)
        self.assertEqual(r.status_code, 400)

