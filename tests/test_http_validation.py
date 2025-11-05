from __future__ import annotations

import datetime as dt
import unittest

from fastapi.testclient import TestClient

from ics_connect.main import app


class TestHTTPValidation(unittest.TestCase):
    def setUp(self) -> None:
        self.client = TestClient(app)

    def test_create_event_invalid_types(self) -> None:
        now = dt.datetime.utcnow()
        # capacity wrong type -> int required
        payload: dict[str, object] = {
            "title": "Bad",
            "description": None,
            "type": None,
            "starts_at": (now + dt.timedelta(hours=1)).isoformat(),
            "ends_at": (now + dt.timedelta(hours=2)).isoformat(),
            "location_text": None,
            "capacity": "10",
            "public": True,
            "requires_join_code": False,
            "tags": ["ok"],
        }
        r = self.client.post("/api/v1/events", json=payload)
        self.assertEqual(r.status_code, 400)

        # public wrong type -> bool required
        payload2: dict[str, object] = dict(payload)
        payload2["capacity"] = 10
        payload2["public"] = "true"
        r2 = self.client.post("/api/v1/events", json=payload2)
        self.assertEqual(r2.status_code, 400)

        # starts_at invalid format
        payload3: dict[str, object] = dict(payload2)
        payload3["public"] = True
        payload3["starts_at"] = "not-a-date"
        r3 = self.client.post("/api/v1/events", json=payload3)
        self.assertEqual(r3.status_code, 400)

        # tags wrong type
        payload4: dict[str, object] = dict(payload)
        payload4["capacity"] = 5
        payload4["tags"] = [1, 2]
        r4 = self.client.post("/api/v1/events", json=payload4)
        self.assertEqual(r4.status_code, 400)

        # tags omitted should default to [] and succeed
        payload5: dict[str, object] = dict(payload)
        payload5.pop("tags", None)
        payload5["capacity"] = 3
        payload5["public"] = True
        r5 = self.client.post("/api/v1/events", json=payload5)
        self.assertEqual(r5.status_code, 200)

    def test_reserve_invalid_join_code_type(self) -> None:
        now = dt.datetime.utcnow()
        # First create a valid event
        payload: dict[str, object] = {
            "title": "Alpha",
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
        r1 = self.client.post("/api/v1/events", json=payload)
        self.assertEqual(r1.status_code, 200)
        # Extract id
        start = r1.text.find('"id":"')
        self.assertGreaterEqual(start, 0)
        start += len('"id":"')
        end = r1.text.find('"', start)
        event_id = r1.text[start:end]

        bad_body: dict[str, object] = {"display_name": "A", "email": None, "join_code": 123}
        r2 = self.client.post(f"/api/v1/events/{event_id}/reserve", json=bad_body)
        self.assertEqual(r2.status_code, 400)
