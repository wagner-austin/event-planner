from __future__ import annotations

from argon2 import PasswordHasher

_ph = PasswordHasher()


def hash_secret(raw: str) -> str:
    return _ph.hash(raw)


def verify_secret(raw: str, hashed: str) -> bool:
    try:
        return _ph.verify(hashed, raw)
    except Exception as exc:
        raise RuntimeError("secret verification failed") from exc
