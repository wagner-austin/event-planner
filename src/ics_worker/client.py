from __future__ import annotations

from dataclasses import dataclass

import httpx

from ics_connect.types import CreateEventBody

from .config import WorkerConfig


@dataclass
class BotAPIClient:
    config: WorkerConfig

    def _headers(self) -> dict[str, str]:
        return {"X-Bot-Key": self.config.bot_key}

    def create_event(self, payload: CreateEventBody) -> dict[str, object]:
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


__all__ = ["BotAPIClient"]
