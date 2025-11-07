from __future__ import annotations

from sqlalchemy import Select, func, select
from sqlalchemy.engine import ScalarResult
from sqlalchemy.orm import Session

from ..models import Event, Reservation
from .protocols import EventRepository, Repos, ReservationRepository
from .sql_models import EventRow, ReservationRow


def _to_event_row(e: Event) -> EventRow:
    return EventRow(
        id=e.id,
        title=e.title,
        description=e.description,
        type=e.type,
        starts_at=e.starts_at,
        ends_at=e.ends_at,
        location_text=e.location_text,
        discord_link=e.discord_link,
        website_link=e.website_link,
        tags_json=e.tags_json,
        public=e.public,
        requires_join_code=e.requires_join_code,
        join_code_hash=e.join_code_hash,
        admin_key_hash=e.admin_key_hash,
        capacity=e.capacity,
        waitlist_enabled=e.waitlist_enabled,
        created_at=e.created_at,
    )


def _from_event_row(r: EventRow) -> Event:
    return Event(
        id=r.id,
        title=r.title,
        description=r.description,
        type=r.type,
        starts_at=r.starts_at,
        ends_at=r.ends_at,
        location_text=r.location_text,
        discord_link=r.discord_link,
        website_link=r.website_link,
        tags_json=r.tags_json,
        public=r.public,
        requires_join_code=r.requires_join_code,
        join_code_hash=r.join_code_hash,
        admin_key_hash=r.admin_key_hash,
        capacity=r.capacity,
        waitlist_enabled=r.waitlist_enabled,
        created_at=r.created_at,
    )


def _to_res_row(r: Reservation) -> ReservationRow:
    return ReservationRow(
        id=r.id,
        event_id=r.event_id,
        user_id=r.user_id,
        display_name=r.display_name,
        email=r.email,
        status=r.status,
        promoted_at=r.promoted_at,
        created_at=r.created_at,
    )


def _from_res_row(r: ReservationRow) -> Reservation:
    return Reservation(
        id=r.id,
        event_id=r.event_id,
        user_id=r.user_id,
        display_name=r.display_name,
        email=r.email,
        status=r.status,
        promoted_at=r.promoted_at,
        created_at=r.created_at,
    )


class _SQLEventRepo(EventRepository):
    def __init__(self, session: Session) -> None:
        self._s = session

    def get(self, event_id: str) -> Event | None:
        stmt: Select[tuple[EventRow]] = select(EventRow).where(EventRow.id == event_id)
        sr: ScalarResult[EventRow] = self._s.execute(stmt).scalars()
        row: EventRow | None = sr.first()
        return _from_event_row(row) if row else None

    def create(self, event: Event) -> None:
        self._s.add(_to_event_row(event))
        self._s.commit()

    def list_all(self) -> list[Event]:
        stmt: Select[tuple[EventRow]] = select(EventRow)
        sr: ScalarResult[EventRow] = self._s.execute(stmt).scalars()
        rows: list[EventRow] = list(sr)
        return [_from_event_row(r) for r in rows]


class _SQLReservationRepo(ReservationRepository):
    def __init__(self, session: Session) -> None:
        self._s = session

    def get(self, reservation_id: str) -> Reservation | None:
        stmt: Select[tuple[ReservationRow]] = select(ReservationRow).where(
            ReservationRow.id == reservation_id
        )
        sr: ScalarResult[ReservationRow] = self._s.execute(stmt).scalars()
        row: ReservationRow | None = sr.first()
        return _from_res_row(row) if row else None

    def create(self, reservation: Reservation) -> None:
        self._s.add(_to_res_row(reservation))
        self._s.commit()

    def update(self, reservation: Reservation) -> None:
        stmt: Select[tuple[ReservationRow]] = select(ReservationRow).where(
            ReservationRow.id == reservation.id
        )
        sr: ScalarResult[ReservationRow] = self._s.execute(stmt).scalars()
        row = sr.first()
        if row is None:
            return
        row.status = reservation.status
        row.promoted_at = reservation.promoted_at
        self._s.add(row)
        self._s.commit()

    def count_confirmed(self, event_id: str) -> int:
        stmt: Select[tuple[int]] = (
            select(func.count())
            .select_from(ReservationRow)
            .where(ReservationRow.event_id == event_id, ReservationRow.status == "confirmed")
        )
        return int(self._s.execute(stmt).scalar_one())

    def count_waitlisted(self, event_id: str) -> int:
        stmt: Select[tuple[int]] = (
            select(func.count())
            .select_from(ReservationRow)
            .where(ReservationRow.event_id == event_id, ReservationRow.status == "waitlisted")
        )
        return int(self._s.execute(stmt).scalar_one())

    def find_oldest_waitlisted(self, event_id: str) -> Reservation | None:
        stmt: Select[tuple[ReservationRow]] = (
            select(ReservationRow)
            .where(ReservationRow.event_id == event_id, ReservationRow.status == "waitlisted")
            .order_by(ReservationRow.created_at.asc())
            .limit(1)
        )
        sr: ScalarResult[ReservationRow] = self._s.execute(stmt).scalars()
        row = sr.first()
        return _from_res_row(row) if row else None

    def find_active_by_event_and_user(self, event_id: str, user_id: str) -> Reservation | None:
        stmt: Select[tuple[ReservationRow]] = (
            select(ReservationRow)
            .where(
                ReservationRow.event_id == event_id,
                ReservationRow.user_id == user_id,
                ReservationRow.status != "canceled",
            )
            .limit(1)
        )
        sr: ScalarResult[ReservationRow] = self._s.execute(stmt).scalars()
        row = sr.first()
        return _from_res_row(row) if row else None

    def find_active_by_event_and_email(self, event_id: str, email: str) -> Reservation | None:
        email_l = email.strip().lower()
        stmt: Select[tuple[ReservationRow]] = (
            select(ReservationRow)
            .where(
                ReservationRow.event_id == event_id,
                ReservationRow.email.is_not(None),
                func.lower(ReservationRow.email) == email_l,
                ReservationRow.status != "canceled",
            )
            .limit(1)
        )
        sr: ScalarResult[ReservationRow] = self._s.execute(stmt).scalars()
        row = sr.first()
        return _from_res_row(row) if row else None


class SQLRepos(Repos):
    def __init__(self, session: Session) -> None:
        self._session = session
        self._events = _SQLEventRepo(session)
        self._res = _SQLReservationRepo(session)

    @property
    def events(self) -> EventRepository:
        return self._events

    @property
    def reservations(self) -> ReservationRepository:
        return self._res

    @property
    def session(self) -> Session:
        """Expose session for transaction management (rollback after errors)."""
        return self._session


__all__ = ["SQLRepos"]
