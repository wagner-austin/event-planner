from __future__ import annotations

import re
from dataclasses import dataclass
from urllib.parse import quote_plus

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
            # Extract summary in a typed-safe way (no JSON Any usage)
            result = self._parse_event_summary(text)
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

    @staticmethod
    def _parse_event_summary(text: str) -> dict[str, object]:
        def _m(pat: str) -> str:
            m = re.search(pat, text)
            return m.group(1) if m else ""

        def _mb(pat: str) -> bool:
            val = _m(pat)
            return val == "true"

        def _mi(pat: str) -> int:
            m = re.search(pat, text)
            return int(m.group(1)) if m else 0

        event_id = _m(r'"id":"([^"]+)"')
        title = _m(r'"title":"([^"]+)"')
        starts = _m(r'"starts_at":"([^"]+)"')
        ends = _m(r'"ends_at":"([^"]+)"')
        loc = _m(r'"location_text":(?:null|"([^"]*)")')
        capacity = _mi(r'"capacity":(\d+)')
        public = _mb(r'"public":(true|false)')
        rjc = _mb(r'"requires_join_code":(true|false)')
        out: dict[str, object] = {
            "event_id": event_id,
            "title": title,
            "starts_at": starts,
            "ends_at": ends,
            "location_text": loc,
            "capacity": capacity,
            "public": public,
            "requires_join_code": rjc,
        }
        return out

    @staticmethod
    def _parse_search_items(text: str) -> list[dict[str, str]]:
        items: list[dict[str, str]] = []
        for m in re.finditer(
            r'\{[^}]*?"id":"([^"]+)"[^}]*?"title":"([^"]+)"[^}]*?"starts_at":"([^"]+)"',
            text,
            re.DOTALL,
        ):
            eid = m.group(1)
            title = m.group(2)
            start = m.group(3)
            items.append({"id": eid, "title": title, "starts_at": start})
        return items

    def search_events(self, q: str) -> list[dict[str, str]]:
        url = f"{self.config.api_url}/search?q={quote_plus(q)}"
        with httpx.Client(timeout=10.0) as client:
            r = client.get(url, headers=self._headers())
            if r.status_code != httpx.codes.OK:
                raise RuntimeError(f"API error {r.status_code}: {r.text}")
            return self._parse_search_items(r.text)[:10]


__all__ = ["BotAPIClient"]
