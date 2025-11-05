from __future__ import annotations

import re
from dataclasses import dataclass

import httpx

from .config import WorkerConfig


@dataclass
class BotAPIClient:
    config: WorkerConfig

    def _headers(self) -> dict[str, str]:
        return {"X-Bot-Key": self.config.bot_key}

    def create_event(self, payload: dict[str, object]) -> dict[str, object]:
        url = f"{self.config.api_url}/bot/events"
        with httpx.Client(timeout=10.0) as client:
            r = client.post(url, headers=self._headers(), json=payload)
            if r.status_code != httpx.codes.OK:
                raise RuntimeError(f"API error {r.status_code}: {r.text}")
            text = r.text
            # Extract event id in a typed-safe way (no JSON Any usage)
            import re

            m = re.search(r'"id":"([^"]+)"', text)
            event_id = m.group(1) if m else ""
            result: dict[str, object] = {"raw": text, "event_id": event_id}
            return result

    @staticmethod
    def _parse_event_counts(text: str) -> dict[str, int]:
        mc = re.search(r'"confirmed_count"\s*:\s*(\d+)', text)
        mw = re.search(r'"waitlist_count"\s*:\s*(\d+)', text)
        confirmed = int(mc.group(1)) if mc else 0
        waitlisted = int(mw.group(1)) if mw else 0
        return {"confirmed": confirmed, "waitlisted": waitlisted}

    def get_event_counts(self, event_id: str) -> dict[str, int]:
        url = f"{self.config.api_url}/events/{event_id}"
        with httpx.Client(timeout=10.0) as client:
            r = client.get(url, headers=self._headers())
            if r.status_code != httpx.codes.OK:
                raise RuntimeError(f"API error {r.status_code}: {r.text}")
            return self._parse_event_counts(r.text)


__all__ = ["BotAPIClient"]
