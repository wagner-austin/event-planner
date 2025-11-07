from __future__ import annotations

import datetime as dt
from dataclasses import dataclass
from typing import Final

from .errors import AppError
from .models import Event
from .repositories.protocols import Repos
from .services.events import CreateEventInput, EventService
from .services.reservations import ReservationService, ReserveInput
from .types import (
    AuthResponse,
    CreatedEventResponse,
    CreateEventBody,
    EventPublic,
    ProfileBody,
    ProfileOut,
    ReservationOut,
    ReserveBody,
    ReserveResponse,
    SearchResult,
)


def to_public(ev: Event, confirmed: int, waitlisted: int) -> EventPublic:
    return {
        "id": ev.id,
        "title": ev.title,
        "description": ev.description,
        "type": ev.type,
        "starts_at": ev.starts_at,
        "ends_at": ev.ends_at,
        "location_text": ev.location_text,
        "discord_link": ev.discord_link,
        "website_link": ev.website_link,
        "tags": [],
        "public": ev.public,
        "capacity": ev.capacity,
        "confirmed_count": confirmed,
        "waitlist_count": waitlisted,
        "requires_join_code": ev.requires_join_code,
    }


def create_event_ep(body: CreateEventBody, repos: Repos) -> CreatedEventResponse:
    svc = EventService(repos)
    created = svc.create(
        CreateEventInput(
            title=body["title"],
            description=body.get("description"),
            type=body.get("type"),
            starts_at=body["starts_at"],
            ends_at=body["ends_at"],
            location_text=body.get("location_text"),
            public=body["public"],
            requires_join_code=body["requires_join_code"],
            discord_link=body.get("discord_link"),
            website_link=body.get("website_link"),
            capacity=body["capacity"],
        )
    )
    ev = created.event
    pub = to_public(ev, 0, 0)
    resp: CreatedEventResponse = {
        "event": pub,
        "join_code": created.join_code,
        "admin_key": created.admin_key,
    }
    return resp


def get_event_ep(event_id: str, repos: Repos) -> EventPublic:
    ev = repos.events.get(event_id)
    if ev is None:
        raise AppError("NOT_FOUND", "Event not found")
    confirmed = repos.reservations.count_confirmed(event_id)
    waitlisted = repos.reservations.count_waitlisted(event_id)
    return to_public(ev, int(confirmed), int(waitlisted))


def reserve_ep(
    event_id: str,
    body: ReserveBody,
    repos: Repos,
    user_id: str | None = None,
) -> ReserveResponse:
    ev = repos.events.get(event_id)
    if ev is None:
        raise AppError("NOT_FOUND", "Event not found")
    svc = ReservationService(repos)
    result = svc.reserve(
        ev,
        ReserveInput(
            display_name=body["display_name"],
            email=body.get("email"),
            join_code=body.get("join_code"),
            user_id=user_id,
        ),
    )
    out: ReservationOut = {
        "id": result.reservation.id,
        "event_id": result.reservation.event_id,
        "display_name": result.reservation.display_name,
        "email": result.reservation.email,
        "status": result.reservation.status,
    }
    resp: ReserveResponse = {"reservation": out, "token": result.token}
    return resp


def my_reservation_ep(event_id: str, auth_token: str, repos: Repos) -> ReservationOut:
    """Get the authenticated user's reservation for a specific event.

    Args:
        event_id: The event ID to query
        auth_token: The user's authentication token (not reservation token)
        repos: Repository access

    Returns:
        The user's active reservation for this event

    Raises:
        AppError: If token is invalid or no active reservation found
    """
    from .util.jwt import decode_token

    claims = decode_token(auth_token)
    user_id_obj = claims.get("sub")
    if not isinstance(user_id_obj, str) or not user_id_obj.strip():
        raise AppError("UNAUTHORIZED", "Invalid token")
    user_id = user_id_obj.strip()

    # Find active reservation for this user on this event
    r = repos.reservations.find_active_by_event_and_user(event_id, user_id)
    if r is None:
        raise AppError("NOT_FOUND", "Reservation not found")

    out: ReservationOut = {
        "id": r.id,
        "event_id": r.event_id,
        "display_name": r.display_name,
        "email": r.email,
        "status": r.status,
    }
    return out


def cancel_my_reservation_ep(event_id: str, auth_token: str, repos: Repos) -> dict[str, str]:
    """Cancel the authenticated user's reservation for a specific event.

    Args:
        event_id: The event ID
        auth_token: The user's authentication token (not reservation token)
        repos: Repository access

    Returns:
        Status message

    Raises:
        AppError: If token is invalid or no active reservation found
    """
    from .util.jwt import decode_token

    claims = decode_token(auth_token)
    user_id_obj = claims.get("sub")
    if not isinstance(user_id_obj, str) or not user_id_obj.strip():
        raise AppError("UNAUTHORIZED", "Invalid token")
    user_id = user_id_obj.strip()

    # Find active reservation for this user on this event
    r = repos.reservations.find_active_by_event_and_user(event_id, user_id)
    if r is None:
        raise AppError("NOT_FOUND", "Reservation not found")

    svc = ReservationService(repos)
    svc.cancel_and_maybe_promote(event_id, r.id)
    return {"status": "canceled"}


@dataclass(frozen=True)
class SearchParams:
    q: str | None
    start: dt.datetime | None
    to: dt.datetime | None
    limit: int
    offset: int


def search_ep(params: SearchParams, repos: Repos) -> SearchResult:
    events = repos.events.list_all()
    if params.q:
        ql = params.q.lower()
        events = [
            e
            for e in events
            if ql in (e.title.lower()) or (e.description or "").lower().find(ql) >= 0
        ]
    if params.start is not None:
        events = [e for e in events if e.starts_at >= params.start]
    if params.to is not None:
        events = [e for e in events if e.starts_at <= params.to]
    total = len(events)
    page = events[params.offset : params.offset + params.limit]
    out: list[EventPublic] = [to_public(ev, 0, 0) for ev in page]
    result: SearchResult = {"events": out, "total": total}
    return result


OK_RESPONSE: Final[dict[str, bool]] = {"ok": True}


def health_ep() -> dict[str, bool]:
    return OK_RESPONSE


# Auth/profile (stateless)

def _profile_id_from_email(email: str) -> str:
    import uuid

    return str(uuid.uuid5(uuid.NAMESPACE_DNS, email.lower().strip()))


def login_ep(body: ProfileBody) -> AuthResponse:
    from .util.jwt import encode_token

    email = body["email"].strip()
    display_name = body["display_name"].strip()
    if "@" not in email or not display_name:
        raise AppError("INVALID_INPUT", "email and display_name required")
    # Enforce UCI domain
    if not email.lower().endswith("@uci.edu"):
        raise AppError("INVALID_INPUT", "UCI email (@uci.edu) required")
    pid = _profile_id_from_email(email)
    token = encode_token({"sub": pid, "email": email, "name": display_name})
    profile: ProfileOut = {"id": pid, "email": email, "display_name": display_name}
    return {"profile": profile, "token": token}


def me_ep(token: str) -> ProfileOut:
    from .util.jwt import decode_token

    claims = decode_token(token)
    pid_raw = claims.get("sub")
    email_raw = claims.get("email")
    name_raw = claims.get("name")
    if not isinstance(pid_raw, str) or not pid_raw.strip():
        raise AppError("UNAUTHORIZED", "Invalid token")
    if not isinstance(email_raw, str) or not email_raw.strip():
        raise AppError("UNAUTHORIZED", "Invalid token")
    if not isinstance(name_raw, str) or not name_raw.strip():
        raise AppError("UNAUTHORIZED", "Invalid token")
    return {"id": pid_raw, "email": email_raw, "display_name": name_raw}
