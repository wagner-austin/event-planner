from __future__ import annotations

import datetime as dt

from ..db import Store
from ..models import Event, Reservation, ReservationStatus
from .protocols import EventRepository, Repos, ReservationRepository


class _EventRepo(EventRepository):
    def __init__(self, store: Store) -> None:
        self._store = store

    def get(self, event_id: str) -> Event | None:
        return self._store.events.get(event_id)

    def create(self, event: Event) -> None:
        self._store.events[event.id] = event

    def list_all(self) -> list[Event]:
        return list(self._store.events.values())


class _ReservationRepo(ReservationRepository):
    def __init__(self, store: Store) -> None:
        self._store = store

    def get(self, reservation_id: str) -> Reservation | None:
        return self._store.reservations.get(reservation_id)

    def create(self, reservation: Reservation) -> None:
        self._store.reservations[reservation.id] = reservation

    def update(self, reservation: Reservation) -> None:
        self._store.reservations[reservation.id] = reservation

    def count_confirmed(self, event_id: str) -> int:
        return int(
            sum(
                1
                for r in self._store.reservations.values()
                if r.event_id == event_id and r.status == ReservationStatus.CONFIRMED
            )
        )

    def count_waitlisted(self, event_id: str) -> int:
        return int(
            sum(
                1
                for r in self._store.reservations.values()
                if r.event_id == event_id and r.status == ReservationStatus.WAITLISTED
            )
        )

    def find_oldest_waitlisted(self, event_id: str) -> Reservation | None:
        waitlisted_list = [
            r
            for r in self._store.reservations.values()
            if r.event_id == event_id and r.status == ReservationStatus.WAITLISTED
        ]
        def _created_at(res: Reservation) -> dt.datetime:
            return res.created_at
        waitlisted_sorted = sorted(waitlisted_list, key=_created_at)
        return waitlisted_sorted[0] if waitlisted_sorted else None

    def find_active_by_event_and_user(
        self, event_id: str, user_id: str
    ) -> Reservation | None:
        for r in self._store.reservations.values():
            if (
                r.event_id == event_id
                and r.user_id == user_id
                and r.status != ReservationStatus.CANCELED
            ):
                return r
        return None

    def find_active_by_event_and_email(self, event_id: str, email: str) -> Reservation | None:
        email_l = email.strip().lower()
        for r in self._store.reservations.values():
            if (
                r.event_id == event_id
                and r.email is not None
                and r.email.strip().lower() == email_l
                and r.status != ReservationStatus.CANCELED
            ):
                return r
        return None


class InMemoryRepos(Repos):
    def __init__(self, store: Store) -> None:
        self._events = _EventRepo(store)
        self._res = _ReservationRepo(store)

    @property
    def events(self) -> EventRepository:
        return self._events

    @property
    def reservations(self) -> ReservationRepository:
        return self._res


__all__ = ["InMemoryRepos"]
