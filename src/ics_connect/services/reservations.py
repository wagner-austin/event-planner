from __future__ import annotations

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
    user_id: str | None = None


@dataclass(frozen=True)
class ReserveResult:
    reservation: Reservation
    token: str


class ReservationService:
    def __init__(self, repos: Repos) -> None:
        self._repos = repos

    def reserve(self, event: Event, data: ReserveInput) -> ReserveResult:
        # Idempotency: if the same authenticated user (or same email for anonymous)
        # already has a non-canceled reservation for this event, return it.
        if data.user_id is not None:
            existing_u = self._repos.reservations.find_active_by_event_and_user(
                event.id, data.user_id
            )
            if existing_u is not None:
                token_u = encode_token({"sub": existing_u.id, "eventId": event.id})
                return ReserveResult(reservation=existing_u, token=token_u)
        if data.user_id is None and data.email:
            existing_e = self._repos.reservations.find_active_by_event_and_email(
                event.id, data.email
            )
            if existing_e is not None:
                token_e = encode_token({"sub": existing_e.id, "eventId": event.id})
                return ReserveResult(reservation=existing_e, token=token_e)

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
            user_id=data.user_id,
            display_name=data.display_name,
            email=data.email,
            status=status,
            promoted_at=None,
        )

        try:
            self._repos.reservations.create(r)
            token = encode_token({"sub": r.id, "eventId": event.id})
            return ReserveResult(reservation=r, token=token)
        except Exception as e:
            # Handle race condition: unique constraint violation
            # If multiple requests try to create a reservation simultaneously,
            # the database constraint will reject duplicates with IntegrityError
            err_str = str(e).lower()
            is_integrity_error = (
                "unique" in err_str
                or "duplicate" in err_str
                or "integrity" in err_str
                or "constraint" in err_str
            )

            if is_integrity_error:
                # Re-query to get the existing reservation that won the race
                if data.user_id is not None:
                    existing = self._repos.reservations.find_active_by_event_and_user(
                        event.id, data.user_id
                    )
                    if existing is not None:
                        token = encode_token({"sub": existing.id, "eventId": event.id})
                        return ReserveResult(reservation=existing, token=token)

                if data.email:
                    existing = self._repos.reservations.find_active_by_event_and_email(
                        event.id, data.email
                    )
                    if existing is not None:
                        token = encode_token({"sub": existing.id, "eventId": event.id})
                        return ReserveResult(reservation=existing, token=token)

            # If not an integrity error or couldn't find existing, re-raise
            raise

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
            from ..util.time import utcnow
            nxt.promoted_at = utcnow()
            self._repos.reservations.update(nxt)
