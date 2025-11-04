from __future__ import annotations

import hashlib
import os
import unittest

from ics_connect.util.jwt import decode_token, encode_token


class TestJWT(unittest.TestCase):
    def setUp(self) -> None:
        # Generate a non-literal test secret to satisfy linters
        os.environ["ICS_JWT_SECRET"] = hashlib.sha256(b"unit").hexdigest()

    def test_encode_decode(self) -> None:
        tok = encode_token({"sub": "abc"}, ttl_seconds=10)
        claims = decode_token(tok)
        self.assertEqual(claims.get("sub"), "abc")

    def test_invalid_format(self) -> None:
        with self.assertRaises(ValueError):
            decode_token("a.b")

    def test_signature_mismatch(self) -> None:
        tok = encode_token({"x": 1}, ttl_seconds=10)
        tampered = tok.rsplit(".", 1)[0] + ".WRONG"
        with self.assertRaises(ValueError):
            decode_token(tampered)

    def test_signature_mismatch_via_header_change(self) -> None:
        tok = encode_token({"x": 2}, ttl_seconds=10)
        h, p, s = tok.split(".")
        # Flip a character in header to keep base64url safe
        new_h = ("A" if h[0] != "A" else "B") + h[1:]
        tampered = ".".join([new_h, p, s])
        with self.assertRaises(ValueError):
            decode_token(tampered)

    def test_expired(self) -> None:
        tok = encode_token({"u": 1}, ttl_seconds=-1)
        with self.assertRaises(ValueError):
            decode_token(tok)

    def test_default_secret_used_when_env_missing(self) -> None:
        # Remove env to exercise default secret branch
        if "ICS_JWT_SECRET" in os.environ:
            del os.environ["ICS_JWT_SECRET"]
        tok = encode_token({"k": "v"}, ttl_seconds=5)
        claims = decode_token(tok)
        self.assertEqual(claims.get("k"), "v")
