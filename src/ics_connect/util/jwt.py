from __future__ import annotations

import base64
import hashlib
import hmac
import json
import os
import time
from collections.abc import Mapping


def _b64url(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode("ascii")


def _b64url_decode(data: str) -> bytes:
    pad = "=" * ((4 - (len(data) % 4)) % 4)
    return base64.urlsafe_b64decode((data + pad).encode("ascii"))


def encode_token(claims: Mapping[str, object], ttl_seconds: int = 30 * 24 * 60 * 60) -> str:
    now = int(time.time())
    payload: dict[str, object] = {"iat": now, "exp": now + ttl_seconds}
    payload.update(claims)
    header = {"alg": "HS256", "typ": "JWT"}
    header_b64 = _b64url(json.dumps(header, separators=(",", ":")).encode("utf-8"))
    payload_b64 = _b64url(json.dumps(payload, separators=(",", ":")).encode("utf-8"))
    signing_input = f"{header_b64}.{payload_b64}".encode("ascii")
    secret_value = os.environ.get("ICS_JWT_SECRET", "dev-secret")
    secret = secret_value.encode("utf-8")
    sig = hmac.new(secret, signing_input, hashlib.sha256).digest()
    sig_b64 = _b64url(sig)
    return f"{header_b64}.{payload_b64}.{sig_b64}"


JWT_PARTS: int = 3


def decode_token(token: str) -> dict[str, object]:
    parts = token.split(".")
    if len(parts) != JWT_PARTS:
        raise ValueError("Invalid token format")
    header_b64, payload_b64, sig_b64 = parts
    signing_input = f"{header_b64}.{payload_b64}".encode("ascii")
    secret_value = os.environ.get("ICS_JWT_SECRET", "dev-secret")
    secret = secret_value.encode("utf-8")
    expected_sig = hmac.new(secret, signing_input, hashlib.sha256).digest()
    if not hmac.compare_digest(expected_sig, _b64url_decode(sig_b64)):
        raise ValueError("Signature verification failed")
    payload_json = _b64url_decode(payload_b64)
    payload: dict[str, object] = json.loads(payload_json.decode("utf-8"))
    now = int(time.time())
    exp = payload.get("exp")
    if isinstance(exp, int) and now > exp:
        raise ValueError("Token expired")
    return payload
