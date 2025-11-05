from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, Header

from ..di import provide_repos
from ..endpoints import create_event_ep
from ..errors import AppError
from ..repositories.protocols import Repos
from ..settings import Settings
from ..types import CreatedEventResponse as CreatedEventResponseTD
from ..types import CreateEventBody
from ..validation import (
    get_optional_str,
    parse_datetime,
    parse_string_list,
    require_bool,
    require_int,
    require_str,
)

router = APIRouter()

StoreDep = Annotated[Repos, Depends(provide_repos)]
BotKeyHeader = Annotated[str | None, Header(alias="X-Bot-Key", convert_underscores=False)]


def _require_bot(key: BotKeyHeader) -> None:
    settings = Settings.from_env()
    expected = settings.bot_key
    if expected is None or key is None or key != expected:
        raise AppError("UNAUTHORIZED", "Invalid bot key")


BotGuard = Annotated[None, Depends(_require_bot)]


def _parse_create_event_body(data: dict[str, object]) -> CreateEventBody:
    starts_at_raw = require_str(data, "starts_at")
    ends_at_raw = require_str(data, "ends_at")
    payload: CreateEventBody = {
        "title": require_str(data, "title"),
        "description": get_optional_str(data, "description"),
        "type": get_optional_str(data, "type"),
        "starts_at": parse_datetime(starts_at_raw, "starts_at"),
        "ends_at": parse_datetime(ends_at_raw, "ends_at"),
        "location_text": get_optional_str(data, "location_text"),
        "capacity": require_int(data, "capacity"),
        "public": require_bool(data, "public"),
        "requires_join_code": require_bool(data, "requires_join_code"),
        "tags": parse_string_list(data, "tags"),
    }
    return payload


def bot_create_event(
    body: dict[str, object], _guard: BotGuard, store: StoreDep
) -> CreatedEventResponseTD:
    payload = _parse_create_event_body(body)
    return create_event_ep(payload, store)


router.add_api_route("/bot/events", bot_create_event, methods=["POST"])

__all__ = ["router"]
