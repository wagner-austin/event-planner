from __future__ import annotations

from typing import Protocol

from ..models import Event, Reservation


class EventRepository(Protocol):
    def get(self, event_id: str) -> Event | None:  # pragma: no cover - protocol
        raise NotImplementedError

    def create(self, event: Event) -> None:  # pragma: no cover - protocol
        raise NotImplementedError

    def list_all(self) -> list[Event]:  # pragma: no cover - protocol
        raise NotImplementedError


class ReservationRepository(Protocol):
    def get(self, reservation_id: str) -> Reservation | None:  # pragma: no cover
        raise NotImplementedError

    def create(self, reservation: Reservation) -> None:  # pragma: no cover
        raise NotImplementedError

    def update(self, reservation: Reservation) -> None:  # pragma: no cover
        raise NotImplementedError

    def count_confirmed(self, event_id: str) -> int:  # pragma: no cover
        raise NotImplementedError

    def count_waitlisted(self, event_id: str) -> int:  # pragma: no cover
        raise NotImplementedError

    def find_oldest_waitlisted(self, event_id: str) -> Reservation | None:  # pragma: no cover
        raise NotImplementedError


class Repos(Protocol):
    @property
    def events(self) -> EventRepository:  # pragma: no cover
        raise NotImplementedError

    @property
    def reservations(self) -> ReservationRepository:  # pragma: no cover
        raise NotImplementedError


__all__ = ["EventRepository", "ReservationRepository", "Repos"]

