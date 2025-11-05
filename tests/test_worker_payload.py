from __future__ import annotations

import datetime as dt
import unittest

from ics_worker.payload import build_create_payload, iso_now_plus, to_json_create_payload


class TestWorkerPayload(unittest.TestCase):
    def test_build_payload_valid(self) -> None:
        now = dt.datetime.now(dt.UTC)
        body: dict[str, object] = {
            "title": "T",
            "description": None,
            "type": None,
            "starts_at": (now + dt.timedelta(hours=1)).isoformat(),
            "ends_at": (now + dt.timedelta(hours=2)).isoformat(),
            "location_text": None,
            "capacity": 3,
            "public": True,
            "requires_join_code": False,
            "tags": ["a", "b"],
        }
        payload = build_create_payload(body)
        jsonp = to_json_create_payload(payload)
        self.assertEqual(jsonp["title"], "T")
        self.assertIsInstance(jsonp["starts_at"], str)

    def test_iso_now_plus(self) -> None:
        iso = iso_now_plus(1)
        self.assertIn("T", iso)
