from __future__ import annotations

import datetime as dt
from dataclasses import dataclass, field


@dataclass
class Event:
    id: str
    title: str
    description: str | None
    type: str | None
    starts_at: dt.datetime
    ends_at: dt.datetime
    location_text: str | None
    tags_json: str
    public: bool
    requires_join_code: bool
    join_code_hash: str | None
    admin_key_hash: str
    capacity: int
    waitlist_enabled: bool
    created_at: dt.datetime = field(default_factory=dt.datetime.utcnow)


class ReservationStatus:
    CONFIRMED = "confirmed"
    WAITLISTED = "waitlisted"
    CANCELED = "canceled"


@dataclass
class Reservation:
    id: str
    event_id: str
    user_id: str | None
    display_name: str
    email: str | None
    status: str
    promoted_at: dt.datetime | None
    created_at: dt.datetime = field(default_factory=dt.datetime.utcnow)
