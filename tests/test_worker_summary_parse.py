from __future__ import annotations

import hashlib
import unittest

from ics_worker.client import BotAPIClient
from ics_worker.config import WorkerConfig


class TestWorkerSummaryParse(unittest.TestCase):
    def test_parse_event_summary(self) -> None:
        cfg = WorkerConfig(
            discord_bot_token=hashlib.sha256(b"t").hexdigest(),
            discord_application_id="a",
            api_url="http://x",
            bot_key=hashlib.sha256(b"k").hexdigest(),
        )
        cli = BotAPIClient(cfg)
        text = (
            '{"id":"e1","title":"Alpha","starts_at":"2030-01-01T10:00:00Z",'
            '"ends_at":"2030-01-01T11:00:00Z","location_text":null,"capacity":5,'
            '"public":true,"requires_join_code":false,"confirmed_count":2,"waitlist_count":1}'
        )
        out = cli._parse_event_summary(text)
        self.assertEqual(out["event_id"], "e1")
        self.assertEqual(out["title"], "Alpha")
        self.assertEqual(out["capacity"], 5)
