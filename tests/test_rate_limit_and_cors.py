from __future__ import annotations

import unittest

from fastapi import FastAPI
from fastapi.testclient import TestClient

from ics_connect.logging import RequestLoggingMiddleware
from ics_connect.main import app as global_app
from ics_connect.middleware.rate_limit import RateLimiter, RateLimitMiddleware


class TestRateLimitAndCORS(unittest.TestCase):
    def test_request_id_header_present(self) -> None:
        client = TestClient(global_app)
        r = client.get("/api/v1/health")
        self.assertEqual(r.status_code, 200)
        self.assertIn("X-Request-Id", r.headers)

    def test_rate_limit_read_and_write(self) -> None:
        # Build a tiny app to exercise limiter deterministically
        a = FastAPI()

        def ping() -> dict[str, bool]:
            return {"ok": True}
        a.add_api_route("/ping", ping, methods=["GET"]) 

        def write() -> dict[str, bool]:
            return {"ok": True}
        a.add_api_route("/write", write, methods=["POST"]) 

        a.add_middleware(RequestLoggingMiddleware)
        limiter = RateLimiter(read_limit_per_min=2, write_limit_per_min=1)
        a.add_middleware(RateLimitMiddleware, limiter=limiter)
        c = TestClient(a)
        # 2 reads allowed, 3rd should be limited
        self.assertEqual(c.get("/ping").status_code, 200)
        self.assertEqual(c.get("/ping").status_code, 200)
        self.assertEqual(c.get("/ping").status_code, 429)
        # 1 write allowed, 2nd limited
        self.assertEqual(c.post("/write").status_code, 200)
        self.assertEqual(c.post("/write").status_code, 429)

    def test_cors_header_present(self) -> None:
        # Using the global app; default allows * in dev
        client = TestClient(global_app)
        r = client.get("/api/v1/health", headers={"Origin": "http://example.com"})
        # Starlette CORSMiddleware sets header when Origin present
        headers_l = {k.lower(): v for k, v in r.headers.items()}
        self.assertIn("access-control-allow-origin", headers_l)
