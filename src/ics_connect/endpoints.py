from __future__ import annotations

import datetime as dt
from dataclasses import dataclass
from typing import Final

from .db import Store
from .errors import AppError
from .models import Event, ReservationStatus
from .services.events import CreateEventInput, EventService
from .services.reservations import ReservationService, ReserveInput
from .types import (
    CreatedEventResponse,
    CreateEventBody,
    EventPublic,
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
        "tags": [],
        "public": ev.public,
        "capacity": ev.capacity,
        "confirmed_count": confirmed,
        "waitlist_count": waitlisted,
        "requires_join_code": ev.requires_join_code,
    }


def create_event_ep(body: CreateEventBody, store: Store) -> CreatedEventResponse:
    svc = EventService(store)
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


def get_event_ep(event_id: str, store: Store) -> EventPublic:
    ev = store.events.get(event_id)
    if ev is None:
        raise AppError("NOT_FOUND", "Event not found")
    confirmed = sum(
        1
        for r in store.reservations.values()
        if r.event_id == event_id and r.status == ReservationStatus.CONFIRMED
    )
    waitlisted = sum(
        1
        for r in store.reservations.values()
        if r.event_id == event_id and r.status == ReservationStatus.WAITLISTED
    )
    return to_public(ev, int(confirmed), int(waitlisted))


def reserve_ep(event_id: str, body: ReserveBody, store: Store) -> ReserveResponse:
    ev = store.events.get(event_id)
    if ev is None:
        raise AppError("NOT_FOUND", "Event not found")
    svc = ReservationService(store)
    result = svc.reserve(
        ev,
        ReserveInput(
            display_name=body["display_name"],
            email=body.get("email"),
            join_code=body.get("join_code"),
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


def my_reservation_ep(event_id: str, token: str, store: Store) -> ReservationOut:
    from .util.jwt import decode_token

    claims = decode_token(token)
    rid_obj = claims.get("sub")
    rid = str(rid_obj)
    r = store.reservations.get(rid)
    if r is None or r.event_id != event_id:
        raise AppError("NOT_FOUND", "Reservation not found")
    out: ReservationOut = {
        "id": r.id,
        "event_id": r.event_id,
        "display_name": r.display_name,
        "email": r.email,
        "status": r.status,
    }
    return out


def cancel_my_reservation_ep(event_id: str, token: str, store: Store) -> dict[str, str]:
    from .util.jwt import decode_token

    claims = decode_token(token)
    rid_obj = claims.get("sub")
    rid = str(rid_obj)
    svc = ReservationService(store)
    svc.cancel_and_maybe_promote(event_id, rid)
    return {"status": "canceled"}


@dataclass(frozen=True)
class SearchParams:
    q: str | None
    start: dt.datetime | None
    to: dt.datetime | None
    limit: int
    offset: int


def search_ep(params: SearchParams, store: Store) -> SearchResult:
    events = list(store.events.values())
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
