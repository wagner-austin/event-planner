from __future__ import annotations

import time
from dataclasses import dataclass
from typing import Final

from fastapi import Request
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.responses import Response
from starlette.types import ASGIApp

from ..errors import error_envelope


@dataclass
class _Bucket:
    capacity: int
    tokens: float
    refill_rate_per_sec: float
    last_refill: float

    def try_consume(self) -> bool:
        now = time.time()
        elapsed = now - self.last_refill
        self.last_refill = now
        self.tokens = min(self.capacity, self.tokens + elapsed * self.refill_rate_per_sec)
        if self.tokens >= 1.0:
            self.tokens -= 1.0
            return True
        return False


class RateLimiter:
    def __init__(self, read_limit_per_min: int, write_limit_per_min: int) -> None:
        self._read_capacity: Final[int] = max(1, read_limit_per_min)
        self._write_capacity: Final[int] = max(1, write_limit_per_min)
        self._read_refill: Final[float] = self._read_capacity / 60.0
        self._write_refill: Final[float] = self._write_capacity / 60.0
        self._buckets: dict[tuple[str, str], _Bucket] = {}

    def _key(self, ip: str, scope: str) -> tuple[str, str]:
        return (ip, scope)

    def _get_bucket(self, ip: str, scope: str) -> _Bucket:
        key = self._key(ip, scope)
        if key in self._buckets:
            return self._buckets[key]
        cap = self._read_capacity if scope == "read" else self._write_capacity
        ref = self._read_refill if scope == "read" else self._write_refill
        b = _Bucket(
            capacity=cap,
            tokens=float(cap),
            refill_rate_per_sec=ref,
            last_refill=time.time(),
        )
        self._buckets[key] = b
        return b

    def allow(self, ip: str, write: bool) -> bool:
        bucket = self._get_bucket(ip, "write" if write else "read")
        return bucket.try_consume()


class RateLimitMiddleware(BaseHTTPMiddleware):
    def __init__(self, app: ASGIApp, limiter: RateLimiter) -> None:
        super().__init__(app)
        self._limiter = limiter

    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        client_ip = request.client.host if request.client else "unknown"
        method = request.method.upper()
        is_write = method in {"POST", "PUT", "PATCH", "DELETE"}
        allowed = self._limiter.allow(client_ip, is_write)
        if not allowed:
            env = error_envelope("RATE_LIMITED", "Too Many Requests")
            return JSONResponse(env, status_code=429)
        return await call_next(request)
