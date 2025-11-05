from __future__ import annotations

import datetime as dt
from dataclasses import dataclass

from ..errors import AppError
from ..models import Event, Reservation, ReservationStatus
from ..repositories.protocols import Repos
from ..util.hashing import verify_secret
from ..util.ids import new_uuid
from ..util.jwt import encode_token


@dataclass(frozen=True)
class ReserveInput:
    display_name: str
    email: str | None
    join_code: str | None


@dataclass(frozen=True)
class ReserveResult:
    reservation: Reservation
    token: str


class ReservationService:
    def __init__(self, repos: Repos) -> None:
        self._repos = repos

    def reserve(self, event: Event, data: ReserveInput) -> ReserveResult:
        if event.requires_join_code and (
            not data.join_code
            or not event.join_code_hash
            or not verify_secret(data.join_code, event.join_code_hash)
        ):
            raise AppError("JOIN_CODE_REQUIRED", "Valid join code required")
        confirmed = self._repos.reservations.count_confirmed(event.id)
        status = (
            ReservationStatus.CONFIRMED
            if confirmed < event.capacity
            else (ReservationStatus.WAITLISTED if event.waitlist_enabled else None)
        )
        if status is None:
            raise AppError("EVENT_FULL", "Capacity reached")
        r = Reservation(
            id=new_uuid(),
            event_id=event.id,
            user_id=None,
            display_name=data.display_name,
            email=data.email,
            status=status,
            promoted_at=None,
        )
        self._repos.reservations.create(r)
        token = encode_token({"sub": r.id, "eventId": event.id})
        return ReserveResult(reservation=r, token=token)

    def cancel_and_maybe_promote(self, event_id: str, reservation_id: str) -> None:
        res = self._repos.reservations.get(reservation_id)
        if res is None:
            raise AppError("NOT_FOUND", "Reservation not found")
        if res.status != ReservationStatus.CANCELED:
            res.status = ReservationStatus.CANCELED
            self._repos.reservations.update(res)
        nxt = self._repos.reservations.find_oldest_waitlisted(event_id)
        if nxt is not None:
            nxt.status = ReservationStatus.CONFIRMED
            nxt.promoted_at = dt.datetime.utcnow()
            self._repos.reservations.update(nxt)
