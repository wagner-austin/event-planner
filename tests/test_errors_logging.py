from __future__ import annotations

import asyncio
import logging
import unittest

from fastapi import Request
from starlette.responses import JSONResponse, Response

from ics_connect.errors import AppError, app_error_handler, error_envelope, unhandled_error_handler
from ics_connect.logging import JsonFormatter, RequestLoggingMiddleware, get_logger, setup_logging


class TestErrorsLogging(unittest.TestCase):
    def test_error_envelope_and_app_error(self) -> None:
        env = error_envelope("CODE", "msg", {"k": "v"})
        self.assertIn("error", env)
        err = AppError("E", "boom", {"x": 1})
        self.assertEqual(err.code, "E")

    def test_exception_handlers(self) -> None:
        scope_typed: dict[str, object] = {}
        scope_typed["type"] = "http"
        scope_typed["asgi"] = {"version": "3.0"}
        scope_typed["http_version"] = "1.1"
        scope_typed["method"] = "GET"
        scope_typed["path"] = "/"
        scope_typed["raw_path"] = b"/"
        scope_typed["query_string"] = b""
        scope_typed["headers"] = []
        req = Request(scope_typed)  # minimal scope
        loop = asyncio.get_event_loop()
        res1: JSONResponse = loop.run_until_complete(app_error_handler(req, AppError("E", "oops")))
        self.assertEqual(res1.status_code, 400)
        res2: JSONResponse = loop.run_until_complete(unhandled_error_handler(req, Exception("x")))
        self.assertEqual(res2.status_code, 500)

    def test_logging_formatter_and_middleware(self) -> None:
        setup_logging(logging.INFO)
        logger = get_logger("t")
        fmt = JsonFormatter()
        rec = logger.makeRecord("t", logging.INFO, __file__, 1, "hello", args=(), exc_info=None)
        _ = fmt.format(rec)

        # Middleware dispatch path
        async def call_next(_request: Request) -> Response:
            payload: dict[str, bool] = {"ok": True}
            return JSONResponse(payload, status_code=200)

        # Dummy ASGI app for BaseHTTPMiddleware init
        from collections.abc import Awaitable, Callable, MutableMapping

        class DummyApp:
            async def __call__(
                self,
                _scope: MutableMapping[str, object],
                _receive: Callable[[], Awaitable[MutableMapping[str, object]]],
                _send: Callable[[MutableMapping[str, object]], Awaitable[None]],
            ) -> None:
                return None

        mdl = RequestLoggingMiddleware(DummyApp())
        scope2: dict[str, object] = {}
        scope2["type"] = "http"
        scope2["asgi"] = {"version": "3.0"}
        scope2["http_version"] = "1.1"
        scope2["method"] = "GET"
        scope2["path"] = "/x"
        scope2["raw_path"] = b"/x"
        scope2["query_string"] = b""
        scope2["headers"] = []
        req = Request(scope2)
        resp = asyncio.get_event_loop().run_until_complete(mdl.dispatch(req, call_next))
        self.assertEqual(resp.status_code, 200)
