from __future__ import annotations

import unittest

from fastapi.testclient import TestClient

from ics_connect.main import create_app
from ics_connect.util.jwt import encode_token


class TestAuth(unittest.TestCase):
    def setUp(self) -> None:
        self.client = TestClient(create_app())

    def test_auth_me_missing_header(self) -> None:
        r = self.client.get("/api/v1/auth/me")
        self.assertEqual(r.status_code, 400)

    def test_auth_me_invalid_claims(self) -> None:
        # Token missing required "name" claim
        token = encode_token({"sub": "user-1", "email": "u@example.com"})
        r = self.client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
        self.assertEqual(r.status_code, 400)

    def test_auth_me_missing_sub(self) -> None:
        token = encode_token({"email": "u@example.com", "name": "User"})
        r = self.client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
        self.assertEqual(r.status_code, 400)

    def test_auth_me_missing_email(self) -> None:
        token = encode_token({"sub": "user-1", "name": "User"})
        r = self.client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
        self.assertEqual(r.status_code, 400)

    def test_auth_login_routes(self) -> None:
        # Valid login
        ok_body: dict[str, object] = {"email": "u@uci.edu", "display_name": "User"}
        r1 = self.client.post("/api/v1/auth/login", json=ok_body)
        self.assertEqual(r1.status_code, 200)
        self.assertIn("\"token\":", r1.text)

        # Invalid email format
        bad_body1: dict[str, object] = {"email": "userexample.com", "display_name": "User"}
        r2 = self.client.post("/api/v1/auth/login", json=bad_body1)
        self.assertEqual(r2.status_code, 400)
        # Invalid domain
        bad_body2: dict[str, object] = {"email": "user@example.com", "display_name": "User"}
        r3 = self.client.post("/api/v1/auth/login", json=bad_body2)
        self.assertEqual(r3.status_code, 400)

    def test_auth_me_success(self) -> None:
        token = encode_token({"sub": "user-1", "email": "u@example.com", "name": "User"})
        r = self.client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
        self.assertEqual(r.status_code, 200)
