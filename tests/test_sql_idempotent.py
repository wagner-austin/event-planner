from __future__ import annotations

import datetime as dt
import os
import unittest

from ics_connect.di import provide_repos
from ics_connect.repositories.protocols import Repos
from ics_connect.services.events import CreateEventInput, EventService
from ics_connect.services.reservations import ReservationService, ReserveInput


class TestSQLIdempotent(unittest.TestCase):
    def setUp(self) -> None:
        os.environ["DATABASE_URL"] = "sqlite:///:memory:"

    def test_idempotent_reserve_user_and_email(self) -> None:
        repos: Repos = next(provide_repos())
        now = dt.datetime.now(dt.UTC)
        ev = EventService(repos).create(
            CreateEventInput(
                title="SQL Idem",
                starts_at=now + dt.timedelta(hours=1),
                ends_at=now + dt.timedelta(hours=2),
                description=None,
                type=None,
                location_text=None,
                discord_link=None,
                website_link=None,
                public=True,
                requires_join_code=False,
                capacity=5,
            )
        ).event
        svc = ReservationService(repos)
        # user-id based idempotency
        r1 = svc.reserve(
            ev,
            ReserveInput(display_name="U1", email=None, join_code=None, user_id="u-1"),
        )
        r2 = svc.reserve(
            ev,
            ReserveInput(display_name="U2", email=None, join_code=None, user_id="u-1"),
        )
        self.assertEqual(r1.reservation.id, r2.reservation.id)
        self.assertEqual(repos.reservations.count_confirmed(ev.id), 1)
        # email based idempotency (anonymous)
        r3 = svc.reserve(
            ev,
            ReserveInput(
                display_name="E1", email="e@uci.edu", join_code=None, user_id=None
            ),
        )
        r4 = svc.reserve(
            ev,
            ReserveInput(
                display_name="E2", email="E@uci.edu", join_code=None, user_id=None
            ),
        )
        self.assertEqual(r3.reservation.id, r4.reservation.id)
        self.assertEqual(repos.reservations.count_confirmed(ev.id), 2)

    def test_database_constraint_prevents_duplicate_reservations(self) -> None:
        """Test that the database unique constraint prevents duplicate active reservations.

        This simulates spam-clicking: the service layer check-then-create has a race condition,
        but the database constraint should prevent duplicates from being committed.
        """
        from sqlalchemy.exc import IntegrityError

        from ics_connect.models import Reservation, ReservationStatus
        from ics_connect.util.ids import new_uuid
        from ics_connect.util.time import utcnow

        repos: Repos = next(provide_repos())
        now = dt.datetime.now(dt.UTC)
        ev = EventService(repos).create(
            CreateEventInput(
                title="Constraint Test",
                starts_at=now + dt.timedelta(hours=1),
                ends_at=now + dt.timedelta(hours=2),
                description=None,
                type=None,
                location_text=None,
                discord_link=None,
                website_link=None,
                public=True,
                requires_join_code=False,
                capacity=5,
            )
        ).event

        # Create first reservation directly in database
        user_id = "user-duplicate-test"
        r1 = Reservation(
            id=new_uuid(),
            event_id=ev.id,
            user_id=user_id,
            display_name="First",
            email="test@uci.edu",
            status=ReservationStatus.CONFIRMED,
            promoted_at=None,
            created_at=utcnow(),
        )
        repos.reservations.create(r1)

        # Try to create duplicate - should raise IntegrityError
        r2 = Reservation(
            id=new_uuid(),
            event_id=ev.id,
            user_id=user_id,
            display_name="Duplicate",
            email="test@uci.edu",
            status=ReservationStatus.CONFIRMED,
            promoted_at=None,
            created_at=utcnow(),
        )

        with self.assertRaises(IntegrityError):
            repos.reservations.create(r2)

        # After IntegrityError, rollback the session to continue testing
        from ics_connect.repositories.sql import SQLRepos

        if isinstance(repos, SQLRepos):
            repos.session.rollback()

        # Verify only one reservation exists (constraint worked!)
        self.assertEqual(repos.reservations.count_confirmed(ev.id), 1)
