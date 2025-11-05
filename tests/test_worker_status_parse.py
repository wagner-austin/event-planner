from __future__ import annotations

import hashlib
import unittest

from ics_worker.client import BotAPIClient
from ics_worker.config import WorkerConfig


class TestWorkerStatusParse(unittest.TestCase):
    def test_parse_counts(self) -> None:
        token = hashlib.sha256(b"x").hexdigest()
        key = hashlib.sha256(b"z").hexdigest()
        cfg = WorkerConfig(
            discord_bot_token=token,
            discord_application_id="y",
            api_url="http://example",
            bot_key=key,
        )
        cli = BotAPIClient(cfg)
        sample = (
            '{"id":"e1","title":"T","confirmed_count":2,"waitlist_count":3,"public":true}'
        )
        out = cli._parse_event_counts(sample)
        self.assertEqual(out["confirmed"], 2)
        self.assertEqual(out["waitlisted"], 3)
