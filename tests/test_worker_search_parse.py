from __future__ import annotations

import hashlib
import unittest

from ics_worker.client import BotAPIClient
from ics_worker.config import WorkerConfig


class TestWorkerSearchParse(unittest.TestCase):
    def test_parse_search_items(self) -> None:
        cfg = WorkerConfig(
            discord_bot_token=hashlib.sha256(b"t").hexdigest(),
            discord_application_id="a",
            api_url="http://x",
            bot_key=hashlib.sha256(b"k").hexdigest(),
        )
        cli = BotAPIClient(cfg)
        text = (
            '{"events":[{"id":"e1","title":"Alpha","starts_at":"2030-01-01T10:00:00Z"},'
            '{"id":"e2","title":"Beta","starts_at":"2030-01-01T11:00:00Z"}],"total":2}'
        )
        out = cli._parse_search_items(text)
        self.assertEqual(len(out), 2)
        self.assertEqual(out[0]["id"], "e1")
        self.assertEqual(out[0]["title"], "Alpha")
