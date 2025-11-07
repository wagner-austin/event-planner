from __future__ import annotations

import datetime as dt
import re
import unittest

from fastapi.testclient import TestClient

from ics_connect.main import app


class TestHTTPAPI(unittest.TestCase):
    def setUp(self) -> None:
        self.client = TestClient(app)

    def test_http_create_get_reserve_cancel_flow(self) -> None:
        now = dt.datetime.now(dt.UTC)
        payload = {
            "title": "HTTP Alpha",
            "description": "Bring snacks",
            "type": "meetup",
            "starts_at": (now + dt.timedelta(hours=1)).isoformat(),
            "ends_at": (now + dt.timedelta(hours=2)).isoformat(),
            "location_text": "ICS 101",
            "discord_link": None,
            "website_link": None,
            "capacity": 1,
            "public": True,
            "requires_join_code": False,
            "tags": ["uci"],
        }
        r1 = self.client.post("/api/v1/events", json=payload)
        self.assertEqual(r1.status_code, 200)
        # Extract ID using a regex without JSON parsing to avoid Any
        m = re.search(r'"id":"([^"]+)"', r1.text)
        self.assertIsNotNone(m)
        event_id = m.group(1) if m else ""

        # GET the event
        r2 = self.client.get(f"/api/v1/events/{event_id}")
        self.assertEqual(r2.status_code, 200)

        # Reserve requires login now
        # Attempt without auth -> 400
        rb = {"display_name": "Ana", "email": "ana@uci.edu", "join_code": None}
        r3 = self.client.post(f"/api/v1/events/{event_id}/reserve", json=rb)
        self.assertEqual(r3.status_code, 400)
        # Perform a login
        login_body: dict[str, object] = {"email": "ana@uci.edu", "display_name": "Ana"}
        rlogin = self.client.post("/api/v1/auth/login", json=login_body)
        self.assertEqual(rlogin.status_code, 200)
        m2 = re.search(r'"token":"([^"]+)"', rlogin.text)
        self.assertIsNotNone(m2)
        token = m2.group(1) if m2 else ""
        # Reserve with Authorization
        r3b = self.client.post(
            f"/api/v1/events/{event_id}/reserve",
            json=rb,
            headers={"Authorization": f"Bearer {token}"},
        )
        self.assertEqual(r3b.status_code, 200)
        # Response contains reservation token, but /mine and /cancel use auth token now

        # My reservation via Authorization bearer (using auth token, not reservation token)
        r4 = self.client.get(
            f"/api/v1/events/{event_id}/mine", headers={"Authorization": f"Bearer {token}"}
        )
        self.assertEqual(r4.status_code, 200)

        # Cancel mine (using auth token, not reservation token)
        r5 = self.client.post(
            f"/api/v1/events/{event_id}/cancel", headers={"Authorization": f"Bearer {token}"}
        )
        self.assertEqual(r5.status_code, 200)

        # Reserve with Authorization header from login, to cover profile-linked path
        login_body2: dict[str, object] = {"email": "test@uci.edu", "display_name": "Tester"}
        rlogin2 = self.client.post("/api/v1/auth/login", json=login_body2)
        self.assertEqual(rlogin2.status_code, 200)
        m3 = re.search(r'"token":"([^"]+)"', rlogin2.text)
        self.assertIsNotNone(m3)
        utok = m3.group(1) if m3 else ""
        # Make a new event and reserve with Authorization: Bearer <user token>
        r6 = self.client.post("/api/v1/events", json=payload)
        self.assertEqual(r6.status_code, 200)
        m4 = re.search(r'"id":"([^"]+)"', r6.text)
        self.assertIsNotNone(m4)
        event2 = m4.group(1) if m4 else ""
        rb2: dict[str, object] = {
            "display_name": "Tester",
            "email": "test@uci.edu",
            "join_code": None,
        }
        r7 = self.client.post(
            f"/api/v1/events/{event2}/reserve",
            json=rb2,
            headers={"Authorization": f"Bearer {utok}"},
        )
        self.assertEqual(r7.status_code, 200)

    def test_http_search_and_health(self) -> None:
        rs = self.client.get("/api/v1/search")
        self.assertEqual(rs.status_code, 200)
        rh = self.client.get("/api/v1/health")
        self.assertEqual(rh.status_code, 200)
        self.assertIn('"ok":', rh.text)

    def test_http_errors_and_auth_guard(self) -> None:
        # Not found event
        r1 = self.client.get("/api/v1/events/missing")
        self.assertEqual(r1.status_code, 400)
        self.assertIn('"error"', r1.text)

        # Missing Authorization header
        r2 = self.client.get("/api/v1/events/missing/mine")
        self.assertEqual(r2.status_code, 400)

        # Wrong prefix
        r3 = self.client.get(
            "/api/v1/events/missing/mine", headers={"Authorization": "Token abc"}
        )
        self.assertEqual(r3.status_code, 400)
