from __future__ import annotations

import asyncio
import unittest

from fastapi import Request

from ics_connect.errors import app_error_handler


class TestErrorsNonApp(unittest.TestCase):
    def test_app_error_handler_with_non_app_error(self) -> None:
        scope_typed: dict[str, object] = {
            "type": "http",
            "asgi": {"version": "3.0"},
            "http_version": "1.1",
            "method": "GET",
            "path": "/",
            "raw_path": b"/",
            "query_string": b"",
            "headers": [],
        }
        req = Request(scope_typed)
        loop = asyncio.get_event_loop()
        resp = loop.run_until_complete(app_error_handler(req, Exception("oops")))
        self.assertEqual(resp.status_code, 400)
