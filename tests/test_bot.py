from __future__ import annotations

import datetime as dt
import os
import unittest

from fastapi.testclient import TestClient

from ics_connect.main import app


class TestBot(unittest.TestCase):
    def setUp(self) -> None:
        # Ensure a bot key exists for these tests
        os.environ["ICS_BOT_KEY"] = "test-bot-key"
        self.client = TestClient(app)

    def test_bot_create_event_success(self) -> None:
        now = dt.datetime.now(dt.UTC)
        body: dict[str, object] = {
            "title": "Bot Alpha",
            "description": None,
            "type": None,
            "starts_at": (now + dt.timedelta(hours=1)).isoformat(),
            "ends_at": (now + dt.timedelta(hours=2)).isoformat(),
            "location_text": "ICS",
            "capacity": 2,
            "public": True,
            "requires_join_code": False,
            "tags": ["uci"],
        }
        r = self.client.post("/api/v1/bot/events", json=body, headers={"X-Bot-Key": "test-bot-key"})
        self.assertEqual(r.status_code, 200)
        self.assertIn("\"event\":", r.text)

    def test_bot_create_event_invalid_key(self) -> None:
        now = dt.datetime.now(dt.UTC)
        body: dict[str, object] = {
            "title": "Bot Bad",
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
        r = self.client.post("/api/v1/bot/events", json=body, headers={"X-Bot-Key": "wrong"})
        self.assertEqual(r.status_code, 400)

