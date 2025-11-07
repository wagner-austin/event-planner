from __future__ import annotations

import datetime as dt

from typing_extensions import TypedDict


class Envelope(TypedDict):
    data: object


class CreateEventBody(TypedDict):
    title: str
    description: str | None
    type: str | None
    starts_at: dt.datetime
    ends_at: dt.datetime
    location_text: str | None
    capacity: int
    public: bool
    requires_join_code: bool
    discord_link: str | None
    website_link: str | None
    tags: list[str]


class EventPublic(TypedDict):
    id: str
    title: str
    description: str | None
    type: str | None
    starts_at: dt.datetime
    ends_at: dt.datetime
    location_text: str | None
    discord_link: str | None
    website_link: str | None
    tags: list[str]
    public: bool
    capacity: int
    confirmed_count: int
    waitlist_count: int
    requires_join_code: bool


class CreatedEventResponse(TypedDict):
    event: EventPublic
    join_code: str | None
    admin_key: str


class ReserveBody(TypedDict):
    display_name: str
    email: str | None
    join_code: str | None


class ReservationOut(TypedDict):
    id: str
    event_id: str
    display_name: str
    email: str | None
    status: str


class ReserveResponse(TypedDict):
    reservation: ReservationOut
    token: str


class SearchResult(TypedDict):
    events: list[EventPublic]
    total: int


# Auth/profile

class ProfileBody(TypedDict):
    email: str
    display_name: str


class ProfileOut(TypedDict):
    id: str
    email: str
    display_name: str


class AuthResponse(TypedDict):
    profile: ProfileOut
    token: str
