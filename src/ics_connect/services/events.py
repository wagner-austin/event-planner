from __future__ import annotations

import datetime as dt
from dataclasses import dataclass

from ..db import Store
from ..models import Event
from ..util.hashing import hash_secret
from ..util.ids import new_uuid


@dataclass(frozen=True)
class CreateEventInput:
    title: str
    starts_at: dt.datetime
    ends_at: dt.datetime
    description: str | None
    type: str | None
    location_text: str | None
    public: bool
    requires_join_code: bool
    capacity: int


@dataclass(frozen=True)
class CreatedEvent:
    event: Event
    join_code: str | None
    admin_key: str


class EventService:
    def __init__(self, store: Store) -> None:
        self._store = store

    def create(self, data: CreateEventInput) -> CreatedEvent:
        admin_key_raw = new_uuid().replace("-", "")
        join_code_raw: str | None = None
        if data.requires_join_code:
            join_code_raw = new_uuid().split("-")[0].upper()
        ev = Event(
            id=new_uuid(),
            title=data.title,
            description=data.description,
            type=data.type,
            starts_at=data.starts_at,
            ends_at=data.ends_at,
            location_text=data.location_text,
            tags_json="[]",
            public=data.public,
            requires_join_code=data.requires_join_code,
            join_code_hash=hash_secret(join_code_raw) if join_code_raw else None,
            admin_key_hash=hash_secret(admin_key_raw),
            capacity=data.capacity,
            waitlist_enabled=True,
        )
        self._store.events[ev.id] = ev
        return CreatedEvent(event=ev, join_code=join_code_raw, admin_key=admin_key_raw)
