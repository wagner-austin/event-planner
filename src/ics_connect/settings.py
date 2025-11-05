from __future__ import annotations

import os
from dataclasses import dataclass

ENV_PREFIX = "ICS_"


def _getenv(name: str) -> str | None:
    return os.environ.get(f"{ENV_PREFIX}{name}")


@dataclass(frozen=True)
class Settings:
    jwt_secret: str
    cors_origin: str | None
    cors_origins: list[str]
    rate_limit_write: int
    rate_limit_read: int
    port: int
    bot_key: str | None

    @staticmethod
    def from_env() -> Settings:
        jwt_secret = _getenv("JWT_SECRET") or "dev-secret"
        cors_origin = _getenv("CORS_ORIGIN")
        cors_origins_raw = _getenv("CORS_ORIGINS") or ""
        cors_origins = [o.strip() for o in cors_origins_raw.split(",") if o.strip()]
        rate_limit_write_raw = _getenv("RATE_LIMIT_WRITE")
        rate_limit_read_raw = _getenv("RATE_LIMIT_READ")
        port_raw = _getenv("PORT")
        return Settings(
            jwt_secret=jwt_secret,
            cors_origin=cors_origin,
            cors_origins=cors_origins,
            rate_limit_write=int(rate_limit_write_raw) if rate_limit_write_raw else 20,
            rate_limit_read=int(rate_limit_read_raw) if rate_limit_read_raw else 60,
            port=int(port_raw) if port_raw else 8000,
            bot_key=_getenv("BOT_KEY"),
        )


__all__ = ["Settings", "ENV_PREFIX"]
