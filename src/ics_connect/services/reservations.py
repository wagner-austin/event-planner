from __future__ import annotations

import datetime as dt
from dataclasses import dataclass

from ..db import Store
from ..errors import AppError
from ..models import Event, Reservation, ReservationStatus
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
    def __init__(self, store: Store) -> None:
        self._store = store

    def reserve(self, event: Event, data: ReserveInput) -> ReserveResult:
        if event.requires_join_code and (
            not data.join_code
            or not event.join_code_hash
            or not verify_secret(data.join_code, event.join_code_hash)
        ):
            raise AppError("JOIN_CODE_REQUIRED", "Valid join code required")
        confirmed = sum(
            1
            for r in self._store.reservations.values()
            if r.event_id == event.id and r.status == ReservationStatus.CONFIRMED
        )
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
        self._store.reservations[r.id] = r
        token = encode_token({"sub": r.id, "eventId": event.id})
        return ReserveResult(reservation=r, token=token)

    def cancel_and_maybe_promote(self, event_id: str, reservation_id: str) -> None:
        res = self._store.reservations.get(reservation_id)
        if res is None:
            raise AppError("NOT_FOUND", "Reservation not found")
        if res.status != ReservationStatus.CANCELED:
            res.status = ReservationStatus.CANCELED
            self._store.reservations[res.id] = res
        # promote oldest waitlisted
        waitlisted_list: list[Reservation] = [
            r
            for r in self._store.reservations.values()
            if r.event_id == event_id and r.status == ReservationStatus.WAITLISTED
        ]
        def _res_created_at(res: Reservation) -> dt.datetime:
            return res.created_at

        nxt = sorted(waitlisted_list, key=_res_created_at)[0] if waitlisted_list else None
        if nxt is not None:
            nxt.status = ReservationStatus.CONFIRMED
            nxt.promoted_at = dt.datetime.utcnow()
            self._store.reservations[nxt.id] = nxt
