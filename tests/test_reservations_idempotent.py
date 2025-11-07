from __future__ import annotations

import datetime as dt
import unittest

from ics_connect.db import Store
from ics_connect.repositories.inmemory import InMemoryRepos
from ics_connect.services.events import CreateEventInput, EventService
from ics_connect.services.reservations import ReservationService, ReserveInput


class TestReservationsIdempotent(unittest.TestCase):
    def setUp(self) -> None:
        self.store = Store()
        self.repos = InMemoryRepos(self.store)
        now = dt.datetime.now(dt.UTC)
        self.ev = EventService(self.repos).create(
            CreateEventInput(
                title="Alpha",
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

    def test_same_user_id_reserve_is_idempotent(self) -> None:
        svc = ReservationService(self.repos)
        r1 = svc.reserve(
            self.ev,
            ReserveInput(
                display_name="A", email=None, join_code=None, user_id="user-1"
            ),
        )
        r2 = svc.reserve(
            self.ev,
            ReserveInput(
                display_name="A2", email=None, join_code=None, user_id="user-1"
            ),
        )
        self.assertEqual(r1.reservation.id, r2.reservation.id)
        # Only one confirmed reservation should exist for the event
        self.assertEqual(self.repos.reservations.count_confirmed(self.ev.id), 1)

    def test_same_email_reserve_is_idempotent_when_anonymous(self) -> None:
        svc = ReservationService(self.repos)
        r1 = svc.reserve(
            self.ev,
            ReserveInput(
                display_name="B", email="b@uci.edu", join_code=None, user_id=None
            ),
        )
        r2 = svc.reserve(
            self.ev,
            ReserveInput(
                display_name="B2", email="B@uci.edu", join_code=None, user_id=None
            ),
        )
        self.assertEqual(r1.reservation.id, r2.reservation.id)
        self.assertEqual(self.repos.reservations.count_confirmed(self.ev.id), 1)

    def test_find_active_by_event_and_email_with_null_email_reservation(self) -> None:
        """Test that find_active_by_event_and_email returns None for reservations with null email.

        This covers the branch in inmemory.py line 81->80 where r.email is None.
        """
        svc = ReservationService(self.repos)
        # Create reservation with null email (authenticated user, no email provided)
        svc.reserve(
            self.ev,
            ReserveInput(
                display_name="User", email=None, join_code=None, user_id="user-auth"
            ),
        )
        # Try to find by email - should return None because the reservation has null email
        found = self.repos.reservations.find_active_by_event_and_email(
            self.ev.id, "someuser@uci.edu"
        )
        self.assertIsNone(found)
