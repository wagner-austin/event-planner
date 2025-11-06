from __future__ import annotations

import datetime as dt
import re
import unittest

from fastapi.testclient import TestClient

from ics_connect.main import app
from ics_connect.routers.events import _parse_reserve_body
from ics_connect.util.jwt import encode_token


class TestHTTPReserveAuth(unittest.TestCase):
    def setUp(self) -> None:
        self.client = TestClient(app)

    def _mk_event(self) -> str:
        now = dt.datetime.now(dt.UTC)
        payload: dict[str, object] = {
            "title": "AuthAlpha",
            "description": None,
            "type": None,
            "starts_at": (now + dt.timedelta(hours=1)).isoformat(),
            "ends_at": (now + dt.timedelta(hours=2)).isoformat(),
            "location_text": None,
            "capacity": 1,
            "public": True,
            "requires_join_code": False,
            "tags": [],
        }
        r = self.client.post("/api/v1/events", json=payload)
        self.assertEqual(r.status_code, 200)
        m = re.search(r'"id":"([^"]+)"', r.text)
        self.assertIsNotNone(m)
        return m.group(1) if m else ""

    def test_reserve_invalid_token_claims(self) -> None:
        event_id = self._mk_event()
        # Token without email claim should be rejected
        bad_token = encode_token({"sub": "uid-1", "name": "X"})
        bbody: dict[str, object] = {"display_name": "X", "email": None, "join_code": None}
        r = self.client.post(
            f"/api/v1/events/{event_id}/reserve",
            json=bbody,
            headers={"Authorization": f"Bearer {bad_token}"},
        )
        self.assertEqual(r.status_code, 400)

    def test_parse_reserve_body_legacy(self) -> None:
        body: dict[str, object] = {"display_name": "X", "email": None, "join_code": None}
        parsed = _parse_reserve_body(body)
        self.assertEqual(parsed["display_name"], "X")
        self.assertIsNone(parsed["email"])
