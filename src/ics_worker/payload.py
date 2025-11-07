from __future__ import annotations

import datetime as dt
from dataclasses import dataclass

from ics_connect.types import CreateEventBody
from ics_connect.validation import (
    get_optional_str,
    parse_datetime,
    parse_string_list,
    require_bool,
    require_int,
    require_str,
)


@dataclass(frozen=True)
class EventCreateOptions:
    title: str
    starts_at: str
    ends_at: str
    description: str | None
    type: str | None
    location_text: str | None
    capacity: int
    public: bool
    requires_join_code: bool
    tags: list[str]


def build_create_payload(data: dict[str, object]) -> CreateEventBody:
    """Strictly build CreateEventBody from raw dict-like inputs.

    This mirrors API-side validation to ensure parity and type safety.
    """
    starts_at_raw = require_str(data, "starts_at")
    ends_at_raw = require_str(data, "ends_at")
    payload: CreateEventBody = {
        "title": require_str(data, "title"),
        "description": get_optional_str(data, "description"),
        "type": get_optional_str(data, "type"),
        "starts_at": parse_datetime(starts_at_raw, "starts_at"),
        "ends_at": parse_datetime(ends_at_raw, "ends_at"),
        "location_text": get_optional_str(data, "location_text"),
        "discord_link": get_optional_str(data, "discord_link"),
        "website_link": get_optional_str(data, "website_link"),
        "capacity": require_int(data, "capacity"),
        "public": require_bool(data, "public"),
        "requires_join_code": require_bool(data, "requires_join_code"),
        "tags": parse_string_list(data, "tags"),
    }
    return payload


def iso_now_plus(hours: int) -> str:
    now = dt.datetime.now(dt.UTC)
    return (now + dt.timedelta(hours=hours)).isoformat()


def to_json_create_payload(payload: CreateEventBody) -> dict[str, object]:
    """Convert a typed CreateEventBody (with datetimes) into a JSON-serializable dict.

    Ensures no datetime objects are sent over the wire.
    """
    return {
        "title": payload["title"],
        "description": payload["description"],
        "type": payload["type"],
        "starts_at": payload["starts_at"].isoformat(),
        "ends_at": payload["ends_at"].isoformat(),
        "location_text": payload["location_text"],
        "discord_link": payload["discord_link"],
        "website_link": payload["website_link"],
        "capacity": payload["capacity"],
        "public": payload["public"],
        "requires_join_code": payload["requires_join_code"],
        "tags": payload["tags"],
    }


__all__ = [
    "EventCreateOptions",
    "build_create_payload",
    "iso_now_plus",
    "to_json_create_payload",
]
