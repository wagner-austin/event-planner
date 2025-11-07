from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, Header

from ..di import provide_repos
from ..endpoints import (
    cancel_my_reservation_ep,
    create_event_ep,
    get_event_ep,
    my_reservation_ep,
    reserve_ep,
)
from ..errors import AppError
from ..repositories.protocols import Repos
from ..types import (
    CreatedEventResponse as CreatedEventResponseTD,
)
from ..types import (
    CreateEventBody,
    EventPublic,
    ReservationOut,
    ReserveBody,
)
from ..types import (
    ReserveResponse as ReserveResponseTD,
)
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
AuthHeader = Annotated[str | None, Header(convert_underscores=False)]


def create_event(body: dict[str, object], store: StoreDep) -> CreatedEventResponseTD:
    payload = _parse_create_event_body(body)
    return create_event_ep(payload, store)


def get_event(event_id: str, store: StoreDep) -> EventPublic:
    return get_event_ep(event_id, store)


def reserve(
    event_id: str,
    body: dict[str, object],
    store: StoreDep,
    authorization: AuthHeader = None,
) -> ReserveResponseTD:
    token = _parse_bearer_token(authorization)
    from ..util.jwt import decode_token

    claims = decode_token(token)
    sub = claims.get("sub")
    name_raw = claims.get("name")
    email_raw = claims.get("email")
    user_id = str(sub) if isinstance(sub, str) and sub else None
    if user_id is None or not isinstance(email_raw, str) or not email_raw.strip():
        raise AppError("UNAUTHORIZED", "Invalid token")
    display_name = name_raw if isinstance(name_raw, str) else ""
    # Only join_code is taken from the body; name/email come from the token
    join_code = get_optional_str(body, "join_code")
    payload: ReserveBody = {
        "display_name": display_name,
        "email": email_raw.strip(),
        "join_code": join_code,
    }
    return reserve_ep(event_id, payload, store, user_id)


def _parse_bearer_token(authorization: str | None) -> str:
    if authorization is None:
        raise AppError("UNAUTHORIZED", "Missing Authorization header")
    prefix = "Bearer "
    if not authorization.startswith(prefix):
        raise AppError("UNAUTHORIZED", "Authorization must be Bearer token")
    return authorization[len(prefix) :]


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
        "discord_link": get_optional_str(data, "discord_link"),
        "website_link": get_optional_str(data, "website_link"),
        "tags": parse_string_list(data, "tags"),
    }
    return payload


def _parse_reserve_body(data: dict[str, object]) -> ReserveBody:
    # Legacy parser retained for completeness; not used by HTTP now that
    # Authorization is required. Kept to avoid breaking imports elsewhere.
    display_name = require_str(data, "display_name")
    email = get_optional_str(data, "email")
    join_code = get_optional_str(data, "join_code")
    return {"display_name": display_name, "email": email, "join_code": join_code}


def my_reservation(
    event_id: str,
    store: StoreDep,
    authorization: AuthHeader = None,
) -> ReservationOut:
    token = _parse_bearer_token(authorization)
    return my_reservation_ep(event_id, token, store)


def cancel_my_reservation(
    event_id: str,
    store: StoreDep,
    authorization: AuthHeader = None,
) -> dict[str, str]:
    token = _parse_bearer_token(authorization)
    return cancel_my_reservation_ep(event_id, token, store)


__all__ = ["router"]

router.add_api_route("/events", create_event, methods=["POST"])
router.add_api_route("/events/{event_id}", get_event, methods=["GET"])
router.add_api_route(
    "/events/{event_id}/reserve",
    reserve,
    methods=["POST"],
)
router.add_api_route(
    "/events/{event_id}/mine",
    my_reservation,
    methods=["GET"],
)
router.add_api_route(
    "/events/{event_id}/cancel",
    cancel_my_reservation,
    methods=["POST"],
)
