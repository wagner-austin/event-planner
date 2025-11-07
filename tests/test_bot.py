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
            "discord_link": None,
            "website_link": None,
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
            "discord_link": None,
            "website_link": None,
            "capacity": 1,
            "public": True,
            "requires_join_code": False,
            "tags": [],
        }
        r = self.client.post("/api/v1/bot/events", json=body, headers={"X-Bot-Key": "wrong"})
        self.assertEqual(r.status_code, 400)

    def test_bot_create_event_capacity_as_string_digit(self) -> None:
        now = dt.datetime.now(dt.UTC)
        body: dict[str, object] = {
            "title": "Bot Capacity String",
            "description": None,
            "type": None,
            "starts_at": (now + dt.timedelta(hours=1)).isoformat(),
            "ends_at": (now + dt.timedelta(hours=2)).isoformat(),
            "location_text": "ICS",
            "discord_link": None,
            "website_link": None,
            # capacity provided as a numeric string — should be parsed to int
            "capacity": "5",
            "public": True,
            "requires_join_code": False,
            "tags": ["uci"],
        }
        r = self.client.post(
            "/api/v1/bot/events",
            json=body,
            headers={"X-Bot-Key": "test-bot-key"},
        )
        self.assertEqual(r.status_code, 200)
        # Ensure parsed capacity equals integer value
        self.assertIn('"capacity":5', r.text)

    def test_bot_create_event_capacity_invalid_defaults_to_10(self) -> None:
        now = dt.datetime.now(dt.UTC)
        body: dict[str, object] = {
            "title": "Bot Capacity Default",
            "description": None,
            "type": None,
            "starts_at": (now + dt.timedelta(hours=1)).isoformat(),
            "ends_at": (now + dt.timedelta(hours=2)).isoformat(),
            "location_text": "ICS",
            "discord_link": None,
            "website_link": None,
            # invalid capacity value — should fall back to default 10
            "capacity": "not-a-number",
            "public": True,
            "requires_join_code": False,
            "tags": ["uci"],
        }
        r = self.client.post(
            "/api/v1/bot/events",
            json=body,
            headers={"X-Bot-Key": "test-bot-key"},
        )
        self.assertEqual(r.status_code, 200)
        # Ensure default capacity is applied
        self.assertIn('"capacity":10', r.text)
